import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, X, ImagePlus, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

export function PhotosStep() {
  const { control, setValue, register, trigger } = useFormContext();
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const photos = useWatch({ control, name: "photos" }) || {};

  useEffect(() => {
    register("photos");
  }, [register]);

  // Only revoke blob URLs on component unmount
  useEffect(() => {
    return () => {
      Object.values(previewUrls).forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCamera = (photoId: string) => {
    const input = fileInputRefs.current[photoId];
    if (!input) return;

    // Reset before opening to ensure onChange fires even if camera returns same filename
    input.value = "";
    input.click();
  };

  const handlePhotoCapture = async (photoId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size === 0) {
      toast({
        title: "קובץ לא תקין",
        description: "התמונה שצולמה ריקה. נסה לצלם שוב.",
        variant: "destructive",
      });
      return;
    }

    setProcessingPhoto(photoId);

    try {
      const nextPhotos = { ...photos, [photoId]: file };
      setValue("photos", nextPhotos, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      await trigger("photos");

      setPreviewUrls((prev) => {
        const prevUrl = prev[photoId];
        if (prevUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(prevUrl);
        }

        return {
          ...prev,
          [photoId]: URL.createObjectURL(file),
        };
      });
    } catch (error) {
      console.error("Error handling camera photo:", error);
      toast({
        title: "שגיאה בהעלאת התמונה",
        description: "לא הצלחנו לקלוט את התמונה. נסה לצלם שוב.",
        variant: "destructive",
      });
    } finally {
      setProcessingPhoto(null);
      event.target.value = "";
    }
  };

  const removePhoto = async (photoId: string) => {
    setPreviewUrls((prev) => {
      const next = { ...prev };
      const previewToRevoke = next[photoId];
      if (previewToRevoke?.startsWith("blob:")) {
        URL.revokeObjectURL(previewToRevoke);
      }
      delete next[photoId];
      return next;
    });

    const currentPhotos = { ...photos };
    delete currentPhotos[photoId];

    setValue("photos", currentPhotos, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    await trigger("photos");
  };

  const getPreviewSrc = (photoId: string): string | undefined => {
    const value = photos[photoId];
    if (typeof value === "string") return value;
    return previewUrls[photoId];
  };

  const completedPhotos = VEHICLE_PHOTOS.filter((p) => Boolean(photos[p.id])).length;
  const allPhotosCompleted = completedPhotos === VEHICLE_PHOTOS.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
          <Camera className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 5 מתוך 5</span>
        </div>
        <h2 className="mb-3 text-3xl font-black text-foreground">תמונות הרכב</h2>
        <p className="text-muted-foreground">צלם את הרכב מכל הזוויות הנדרשות</p>

        <div
          className={cn(
            "mt-5 inline-flex items-center gap-3 rounded-full border px-5 py-2.5",
            allPhotosCompleted
              ? "border-primary/20 bg-primary/10 text-primary"
              : "border-primary/20 bg-primary/5 text-primary"
          )}
        >
          {allPhotosCompleted && <Sparkles className="h-4 w-4" />}
          <span className="font-bold">
            {completedPhotos} / {VEHICLE_PHOTOS.length}
          </span>
          <span className="text-muted-foreground">תמונות הועלו</span>
          {allPhotosCompleted && <Check className="h-4 w-4" />}
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
        <div className="h-3 overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              "h-full transition-all duration-500",
              allPhotosCompleted
                ? "bg-gradient-to-r from-primary to-accent"
                : "bg-gradient-to-r from-primary to-accent"
            )}
            style={{ width: `${(completedPhotos / VEHICLE_PHOTOS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VEHICLE_PHOTOS.map((photo, index) => {
          const hasPhoto = Boolean(photos[photo.id]);
          const isProcessing = processingPhoto === photo.id;
          const previewSrc = getPreviewSrc(photo.id);

          return (
            <div
              key={photo.id}
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <button
                type="button"
                onClick={() => openCamera(photo.id)}
                disabled={isProcessing}
                className={cn(
                  "block aspect-square w-full overflow-hidden rounded-2xl border-2 transition-all duration-300",
                  hasPhoto
                    ? "border-primary shadow-lg"
                    : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5",
                  isProcessing && "cursor-wait"
                )}
              >
                {isProcessing ? (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 p-4 text-center">
                    <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    <span className="text-sm font-medium text-muted-foreground">מעבד תמונה...</span>
                  </div>
                ) : hasPhoto && previewSrc ? (
                  <img src={previewSrc} alt={photo.label} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
                      <ImagePlus className="h-7 w-7 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-foreground">{photo.label}</span>
                  </div>
                )}
              </button>

              <input
                ref={(el) => {
                  fileInputRefs.current[photo.id] = el;
                }}
                type="file"
                accept="image/*,image/heic,image/heif"
                capture="environment"
                disabled={isProcessing}
                onChange={(e) => handlePhotoCapture(photo.id, e)}
                className="hidden"
              />

              {hasPhoto && (
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -left-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
                >
                  <X className="h-5 w-5" />
                </button>
              )}

              {hasPhoto && (
                <div className="absolute -right-2 -top-2 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-scale-in">
                  <Check className="h-5 w-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-foreground">הערות או בעיות ברכב</h3>
            <p className="text-sm text-muted-foreground">אופציונלי - תאר בעיות שנמצאו</p>
          </div>
        </div>
        <Textarea
          {...register("vehicleNotes")}
          placeholder="לדוגמה: שריטה בדלת ימנית, נורת אזהרה דולקת..."
          className="min-h-[100px] resize-none rounded-xl border-border bg-muted/30"
        />
      </div>
    </div>
  );
}
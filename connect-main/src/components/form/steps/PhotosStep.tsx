import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { PhotoCaptureCard } from "./photos/PhotoCaptureCard";

type ShiftPhotoValue = string | File;
type ShiftPhotos = Record<string, ShiftPhotoValue | undefined>;

interface FilePreviewMeta {
  fingerprint: string;
  url: string;
}

const buildFileFingerprint = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

const hasPhotoValue = (value: ShiftPhotoValue | undefined) =>
  value instanceof File || (typeof value === "string" && value.trim().length > 0);

export function PhotosStep() {
  const { control, setValue, register, getValues } = useFormContext();
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const filePreviewCacheRef = useRef<Record<string, FilePreviewMeta>>({});

  const photos = (useWatch({ control, name: "photos" }) || {}) as ShiftPhotos;

  useEffect(() => {
    const revokeUrl = (url: string | undefined) => {
      if (url?.startsWith("blob:")) {
        URL.revokeObjectURL(url);
      }
    };

    const nextPreviews: Record<string, string> = {};
    const nextFileCache: Record<string, FilePreviewMeta> = {};

    for (const { id } of VEHICLE_PHOTOS) {
      const value = photos[id];
      const cached = filePreviewCacheRef.current[id];

      if (value instanceof File) {
        const fingerprint = buildFileFingerprint(value);

        if (cached && cached.fingerprint === fingerprint) {
          nextPreviews[id] = cached.url;
          nextFileCache[id] = cached;
          continue;
        }

        revokeUrl(cached?.url);

        const blobUrl = URL.createObjectURL(value);
        nextPreviews[id] = blobUrl;
        nextFileCache[id] = { fingerprint, url: blobUrl };
        continue;
      }

      revokeUrl(cached?.url);

      if (typeof value === "string" && value.trim().length > 0) {
        nextPreviews[id] = value;
      }
    }

    filePreviewCacheRef.current = nextFileCache;
    setPreviewUrls(nextPreviews);
  }, [photos]);

  useEffect(() => {
    return () => {
      Object.values(filePreviewCacheRef.current).forEach(({ url }) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const handlePhotoCapture = async (photoId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        title: "קובץ לא תקין",
        description: "יש לבחור תמונה מהמצלמה בלבד.",
        variant: "destructive",
      });
      event.currentTarget.value = "";
      return;
    }

    if (file.size === 0) {
      toast({
        title: "קובץ לא תקין",
        description: "התמונה שצולמה ריקה. נסה לצלם שוב.",
        variant: "destructive",
      });
      event.currentTarget.value = "";
      return;
    }

    setProcessingPhoto(photoId);

    try {
      const currentPhotos = (getValues("photos") || {}) as ShiftPhotos;
      const nextPhotos: ShiftPhotos = { ...currentPhotos, [photoId]: file };

      setValue("photos", nextPhotos, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
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
      event.currentTarget.value = "";
    }
  };

  const removePhoto = (photoId: string) => {
    const currentPhotos = (getValues("photos") || {}) as ShiftPhotos;
    const nextPhotos: ShiftPhotos = { ...currentPhotos };
    delete nextPhotos[photoId];

    setValue("photos", nextPhotos, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const completedPhotos = VEHICLE_PHOTOS.filter((photo) => hasPhotoValue(photos[photo.id])).length;
  const allPhotosCompleted = completedPhotos === VEHICLE_PHOTOS.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
          <Camera className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 5 מתוך 5</span>
        </div>
        <h2 className="mb-3 text-3xl font-black text-foreground">תמונות הרכב</h2>
        <p className="text-muted-foreground">צלם את הרכב מכל הזוויות הנדרשות (מצלמה בלבד)</p>

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
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{ width: `${(completedPhotos / VEHICLE_PHOTOS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VEHICLE_PHOTOS.map((photo, index) => {
          const hasPhoto = hasPhotoValue(photos[photo.id]);
          const isProcessing = processingPhoto === photo.id;
          const previewSrc = previewUrls[photo.id];

          return (
            <PhotoCaptureCard
              key={photo.id}
              photoId={photo.id}
              label={photo.label}
              hasPhoto={hasPhoto}
              isProcessing={isProcessing}
              previewSrc={previewSrc}
              disabled={Boolean(processingPhoto) && !isProcessing}
              animationDelayMs={index * 80}
              onPhotoChange={(event) => handlePhotoCapture(photo.id, event)}
              onRemove={() => removePhoto(photo.id)}
            />
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
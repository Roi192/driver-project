import { useEffect } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { PhotoCaptureCard } from "./photos/PhotoCaptureCard";

const PHOTO_FIELD_NAMES = VEHICLE_PHOTOS.map((photo) => `photos.${photo.id}`);

export function PhotosStep() {
  const { control, setValue, register } = useFormContext();

  const watchedPhotoValues = useWatch({
    control,
    name: PHOTO_FIELD_NAMES,
  }) as Array<string | undefined>;

  useEffect(() => {
    PHOTO_FIELD_NAMES.forEach((fieldName) => {
      register(fieldName);
    });
  }, [register]);

  const handlePhotoUploaded = (photoId: string, storagePath: string) => {
    setValue(`photos.${photoId}`, storagePath, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const handlePhotoRemoved = (photoId: string) => {
    setValue(`photos.${photoId}`, undefined, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const getStoredPath = (index: number) => {
    const value = watchedPhotoValues?.[index];
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  };

  const completedPhotos =
    watchedPhotoValues?.filter((value) => typeof value === "string" && value.trim().length > 0).length ?? 0;
  const allPhotosCompleted = completedPhotos === VEHICLE_PHOTOS.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
          <Camera className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 5 מתוך 5</span>
        </div>
        <h2 className="mb-3 text-3xl font-black text-foreground">תמונות הרכב</h2>
        <p className="text-muted-foreground">צלם את כל תמונות הרכב מהמצלמה</p>

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
        {VEHICLE_PHOTOS.map((photo, index) => (
          <PhotoCaptureCard
            key={photo.id}
            photoId={photo.id}
            label={photo.label}
            storedPath={getStoredPath(index)}
            disabled={false}
            animationDelayMs={index * 80}
            onUploaded={handlePhotoUploaded}
            onRemoved={handlePhotoRemoved}
          />
        ))}
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
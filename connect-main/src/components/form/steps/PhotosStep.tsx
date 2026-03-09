import { useEffect, useMemo, useState } from "react";
import { useFormContext } from "react-hook-form";
import { Camera, Check, MessageSquare, Sparkles } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { PhotoCaptureCard } from "./photos/PhotoCaptureCard";

const PHOTO_FIELD_NAMES = VEHICLE_PHOTOS.map((photo) => `photos.${photo.id}`);

export function PhotosStep() {
  const { register, setValue, getValues } = useFormContext();
  const [, forceRender] = useState(0);

  useEffect(() => {
    PHOTO_FIELD_NAMES.forEach((fieldName) => {
      register(fieldName, { required: false });
    });
  }, [register]);

  const getStoredPath = (photoId: string) => {
    const value = getValues(`photos.${photoId}`);
    return typeof value === "string" && value.trim().length > 0 ? value : undefined;
  };

  const handlePhotoUploaded = (photoId: string, storagePath: string) => {
    setValue(`photos.${photoId}`, storagePath, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    setTimeout(() => {
      setValue(`photos.${photoId}`, storagePath, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });
      forceRender((prev) => prev + 1);
    }, 50);
  };

  const handlePhotoRemoved = (photoId: string) => {
    setValue(`photos.${photoId}`, undefined, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    setTimeout(() => {
      forceRender((prev) => prev + 1);
    }, 50);
  };

  const completedPhotos = useMemo(() => {
    return VEHICLE_PHOTOS.filter((photo) => {
      const value = getValues(`photos.${photo.id}`);
      return typeof value === "string" && value.trim().length > 0;
    }).length;
  }, [getValues]);

  const allPhotosCompleted = completedPhotos === VEHICLE_PHOTOS.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="mb-8 text-center">
        <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">שלב 5 מתוך 5</span>
        </div>

        <h2 className="mb-3 text-3xl font-bold tracking-tight">תמונות הרכב</h2>

        <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
          צלם את כל תמונות הרכב מהמצלמה. רק תמונות שהועלו בהצלחה ייחשבו כהשלמה
          של השלב.
        </p>
      </div>

      <div
        className={cn(
          "rounded-2xl border px-4 py-3 shadow-sm",
          allPhotosCompleted
            ? "border-emerald-500/30 bg-emerald-500/5"
            : "border-border bg-card"
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {allPhotosCompleted ? (
              <Check className="h-5 w-5 text-emerald-600" />
            ) : (
              <Camera className="h-5 w-5 text-primary" />
            )}

            <span className="text-sm font-medium">
              {completedPhotos} / {VEHICLE_PHOTOS.length} תמונות הועלו
            </span>
          </div>

          {allPhotosCompleted && (
            <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
              הושלם
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {VEHICLE_PHOTOS.map((photo, index) => (
          <PhotoCaptureCard
            key={`${photo.id}-${getStoredPath(photo.id) ?? "empty"}`}
            photoId={photo.id}
            label={photo.label}
            storedPath={getStoredPath(photo.id)}
            animationDelayMs={index * 60}
            onUploaded={handlePhotoUploaded}
            onRemoved={handlePhotoRemoved}
          />
        ))}
      </div>

      <div className="rounded-2xl border bg-card p-4 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          <h3 className="text-base font-semibold">הערות או בעיות ברכב</h3>
        </div>

        <Textarea
          dir="rtl"
          placeholder="אופציונלי - תאר בעיות שנמצאו"
          className="min-h-[110px]"
          {...register("vehicleNotes")}
        />
      </div>
    </div>
  );
}
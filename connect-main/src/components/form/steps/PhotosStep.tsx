import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useFormContext, useWatch } from "react-hook-form";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { PhotoCaptureCard } from "./photos/PhotoCaptureCard";
import { supabase } from "@/integrations/supabase/client";

type PhotosFormValue = Record<string, string>;

async function uploadVehiclePhoto(file: File, photoId: string): Promise<string> {
  const fileExt = file.name.split(".").pop() || "jpg";
  const safePhotoId = photoId.replace(/\s+/g, "-").toLowerCase();
  const fileName = `${Date.now()}-${safePhotoId}.${fileExt}`;
  const filePath = `vehicle-photos/${fileName}`;

  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError) {
    console.error("getUser error:", userError);
    throw new Error("שגיאה בזיהוי המשתמש המחובר");
  }

  if (!userData?.user) {
    throw new Error("אין משתמש מחובר למערכת");
  }

  const { error: uploadError } = await supabase.storage
    .from("shift-photos")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type || "image/jpeg",
      cacheControl: "3600",
    });

  if (uploadError) {
    console.error("upload error:", uploadError);
    throw new Error(uploadError.message || "שגיאה בהעלאת התמונה");
  }

  const { data: publicUrlData } = supabase.storage
    .from("shift-photos")
    .getPublicUrl(filePath);

  if (!publicUrlData?.publicUrl) {
    throw new Error("התמונה עלתה אך לא התקבל קישור");
  }

  return publicUrlData.publicUrl;
}

export function PhotosStep() {
  const { control, setValue, register, trigger, getValues } = useFormContext();
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null);

  const photos = (useWatch({ control, name: "photos" }) || {}) as PhotosFormValue;

  useEffect(() => {
    register("photos");
  }, [register]);

  const photoPreviews = useMemo(() => {
    const previews: Record<string, string> = {};

    for (const photo of VEHICLE_PHOTOS) {
      const value = photos[photo.id];
      if (typeof value === "string" && value.trim().length > 0) {
        previews[photo.id] = value;
      }
    }

    return previews;
  }, [photos]);

  const handlePhotoCapture = async (
    photoId: string,
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    console.log("onChange fired");
    console.log("file:", file);
    console.log("files:", event.target.files);
    console.log("size:", file?.size);
    console.log("type:", file?.type);
    console.log("name:", file?.name);

    if (!file) {
      toast({
        title: "לא נבחרה תמונה",
        description: "נסה לצלם שוב.",
        variant: "destructive",
      });
      return;
    }

    if (file.size <= 0) {
      toast({
        title: "התמונה לא נקלטה",
        description: "נסה לצלם שוב.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    if (file.type && !file.type.includes("image")) {
      toast({
        title: "קובץ לא תקין",
        description: "יש לבחור תמונה תקינה.",
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    setProcessingPhoto(photoId);

    try {
      const uploadedUrl = await uploadVehiclePhoto(file, photoId);

      const currentPhotos = (getValues("photos") || {}) as PhotosFormValue;
      const nextPhotos: PhotosFormValue = {
        ...currentPhotos,
        [photoId]: uploadedUrl,
      };

      setValue("photos", nextPhotos, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      });

      await trigger("photos");

      toast({
        title: "התמונה הועלתה",
        description: "התמונה נשמרה בהצלחה.",
      });
    } catch (error: any) {
      console.error("Error uploading camera photo:", error);
      console.error("Error message:", error?.message);

      toast({
        title: "שגיאה בהעלאת התמונה",
        description: error?.message || "לא הצלחנו להעלות את התמונה. נסה שוב.",
        variant: "destructive",
      });
    } finally {
      setProcessingPhoto(null);
      event.target.value = "";
    }
  };

  const removePhoto = async (photoId: string) => {
    const currentPhotos = (getValues("photos") || {}) as PhotosFormValue;
    const nextPhotos: PhotosFormValue = { ...currentPhotos };

    delete nextPhotos[photoId];

    setValue("photos", nextPhotos, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });

    await trigger("photos");
  };

  const completedPhotos = VEHICLE_PHOTOS.filter(
    (photo) => Boolean(photos[photo.id])
  ).length;

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
            className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
            style={{
              width: `${(completedPhotos / VEHICLE_PHOTOS.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VEHICLE_PHOTOS.map((photo, index) => {
          const hasPhoto = Boolean(photos[photo.id]);
          const isProcessing = processingPhoto === photo.id;
          const previewSrc = photoPreviews[photo.id];

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
            <p className="text-sm text-muted-foreground">
              אופציונלי - תאר בעיות שנמצאו
            </p>
          </div>
        </div>

        <Textarea
          {...register("vehicleNotes")}
          placeholder="לדוגמה: שריטה בדלת ימנית, נורת אזהרה דולקת."
          className="min-h-[100px] resize-none rounded-xl border-border bg-muted/30"
        />
      </div>
    </div>
  );
}
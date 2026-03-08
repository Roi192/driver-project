import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, X } from "lucide-react";
import { StorageImage } from "@/components/shared/StorageImage";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { uploadShiftPhoto, deleteShiftPhoto } from "@/lib/shift-photo-storage";

interface PhotoCaptureCardProps {
  photoId: string;
  label: string;
  storedPath?: string;
  disabled?: boolean;
  animationDelayMs?: number;
  onUploaded: (photoId: string, storagePath: string) => void;
  onRemoved: (photoId: string) => void;
}

export function PhotoCaptureCard({
  photoId,
  label,
  storedPath,
  disabled,
  animationDelayMs = 0,
  onUploaded,
  onRemoved,
}: PhotoCaptureCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const inputId = `shift-photo-${photoId}`;

  useEffect(() => {
    if (storedPath && localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
  }, [storedPath, localPreview]);

  useEffect(() => {
    return () => {
      if (localPreview) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const hasPhoto = Boolean(storedPath) || Boolean(localPreview);
  const previewSrc = localPreview ?? storedPath ?? undefined;

  const openCamera = () => {
    if (disabled || uploading) return;
    if (!inputRef.current) return;
    inputRef.current.value = "";
    inputRef.current.click();
  };

  const handleChange = async () => {
    const file = inputRef.current?.files?.[0];
    if (!file) return;

    if (file.size === 0) {
      toast({
        title: "קובץ לא תקין",
        description: "התמונה שצולמה ריקה. נסה לצלם שוב.",
        variant: "destructive",
      });
      return;
    }

    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }

    const blobUrl = URL.createObjectURL(file);
    setLocalPreview(blobUrl);
    setUploading(true);

    try {
      if (storedPath) {
        await deleteShiftPhoto(storedPath).catch(() => {});
      }

      const path = await uploadShiftPhoto({ file, photoId });
      onUploaded(photoId, path);

      toast({
        title: "✅ התמונה הועלתה בהצלחה",
        description: label,
      });
    } catch (error) {
      URL.revokeObjectURL(blobUrl);
      setLocalPreview((currentPreview) => (currentPreview === blobUrl ? null : currentPreview));

      const message = error instanceof Error ? error.message : "אירעה שגיאה";
      toast({
        title: "❌ העלאת התמונה נכשלה",
        description: `${label} - ${message}`,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (localPreview) {
      URL.revokeObjectURL(localPreview);
      setLocalPreview(null);
    }
    if (storedPath) {
      await deleteShiftPhoto(storedPath).catch(() => {});
    }
    onRemoved(photoId);
  };

  return (
    <div className="relative animate-fade-in" style={{ animationDelay: `${animationDelayMs}ms` }}>
      <button
        type="button"
        onClick={openCamera}
        aria-label={label}
        disabled={disabled || uploading}
        className={cn(
          "relative block aspect-square w-full overflow-hidden rounded-2xl border-2 text-right transition-all duration-300",
          hasPhoto
            ? "border-primary shadow-lg"
            : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5",
          (disabled || uploading) && "cursor-not-allowed opacity-90"
        )}
      >
        {uploading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 p-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">מעלה תמונה...</span>
          </div>
        ) : hasPhoto && previewSrc ? (
          previewSrc.startsWith("blob:") ? (
            <img src={previewSrc} alt={label} className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <StorageImage
              src={previewSrc}
              bucket="shift-photos"
              alt={label}
              className="h-full w-full object-cover"
              loading="lazy"
              showLoader={false}
              fallback={<div className="h-full w-full bg-muted" />}
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-primary/20 bg-primary/10">
              <ImagePlus className="h-7 w-7 text-primary" />
            </div>
            <span className="text-sm font-bold text-foreground">{label}</span>
            <span className="text-xs font-medium text-muted-foreground">צילום מהמצלמה בלבד</span>
          </div>
        )}

        {hasPhoto && !uploading && (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-lg border border-primary/20 bg-card/85 px-2 py-1 text-center text-xs font-medium text-primary backdrop-blur-sm">
            לחץ לצילום מחדש
          </div>
        )}

        {!hasPhoto && !uploading && (
          <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full border border-primary/20 bg-card/85 px-2 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <Camera className="mr-1 inline h-3.5 w-3.5" />
            מצלמה
          </div>
        )}
      </button>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept="image/*,.heic,.heif"
        capture="environment"
        disabled={disabled || uploading}
        onChange={handleChange}
        className="sr-only"
        aria-label={`צלם ${label}`}
      />

      {hasPhoto && !uploading && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            handleRemove();
          }}
          className="absolute -left-2 -top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
          aria-label={`הסר ${label}`}
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {hasPhoto && !uploading && (
        <div className="absolute -right-2 -top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-scale-in">
          <Check className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
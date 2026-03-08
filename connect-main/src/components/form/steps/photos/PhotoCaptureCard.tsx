import { type ChangeEvent } from "react";
import { Camera, Check, ImagePlus, Loader2, X } from "lucide-react";
import { StorageImage } from "@/components/shared/StorageImage";
import { cn } from "@/lib/utils";

interface PhotoCaptureCardProps {
  photoId: string;
  label: string;
  hasPhoto: boolean;
  isProcessing: boolean;
  previewSrc?: string;
  disabled?: boolean;
  animationDelayMs?: number;
  onPhotoChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
}

export function PhotoCaptureCard({
  photoId,
  label,
  hasPhoto,
  isProcessing,
  previewSrc,
  disabled,
  animationDelayMs = 0,
  onPhotoChange,
  onRemove,
}: PhotoCaptureCardProps) {
  const inputId = `shift-photo-${photoId}`;

  return (
    <div className="relative animate-fade-in" style={{ animationDelay: `${animationDelayMs}ms` }}>
      <div
        aria-label={label}
        aria-disabled={disabled || isProcessing}
        className={cn(
          "relative block aspect-square w-full overflow-hidden rounded-2xl border-2 text-right transition-all duration-300",
          hasPhoto
            ? "border-primary shadow-lg"
            : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5",
          (disabled || isProcessing) && "cursor-not-allowed opacity-90"
        )}
      >
        {isProcessing ? (
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
            <span className="text-sm font-medium text-foreground">{label}</span>
            <span className="text-xs text-muted-foreground">צילום מהמצלמה בלבד</span>
          </div>
        )}

        {hasPhoto && !isProcessing && (
          <div className="pointer-events-none absolute inset-x-2 bottom-2 z-10 rounded-lg border border-primary/20 bg-card/85 px-2 py-1 text-center text-xs font-medium text-primary backdrop-blur-sm">
            לחץ לצילום מחדש
          </div>
        )}

        {!hasPhoto && !isProcessing && (
          <div className="pointer-events-none absolute left-2 top-2 z-10 rounded-full border border-primary/20 bg-card/85 px-2 py-1 text-xs font-medium text-primary backdrop-blur-sm">
            <Camera className="mr-1 inline h-3.5 w-3.5" />
            מצלמה
          </div>
        )}

        <input
          id={inputId}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          disabled={disabled || isProcessing}
          onChange={onPhotoChange}
          className="absolute inset-0 z-20 h-full w-full cursor-pointer opacity-0"
          aria-label={`צלם ${label}`}
        />
      </div>

      {hasPhoto && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="absolute -left-2 -top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
          aria-label={`הסר ${label}`}
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {hasPhoto && (
        <div className="absolute -right-2 -top-2 z-30 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-scale-in">
          <Check className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
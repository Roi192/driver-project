import { useRef, type ChangeEvent, type MouseEvent } from "react";
import { Camera, Check, ImagePlus, Loader2, X } from "lucide-react";
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenCamera = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();

    if (disabled || isProcessing) return;

    const input = fileInputRef.current;
    if (!input) return;

    // Reset value so choosing the same file still triggers onChange
    input.value = "";

    // CRITICAL: direct user gesture → camera capture (mobile browser requirement)
    input.click();
  };

  return (
    <div className="relative animate-fade-in" style={{ animationDelay: `${animationDelayMs}ms` }}>
      <button
        type="button"
        onClick={handleOpenCamera}
        disabled={disabled || isProcessing}
        className={cn(
          "relative aspect-square w-full overflow-hidden rounded-2xl border-2 text-right transition-all duration-300",
          hasPhoto
            ? "border-primary shadow-lg"
            : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5",
          (disabled || isProcessing) && "cursor-wait"
        )}
        aria-label={label}
      >
        {isProcessing ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 p-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">מעבד תמונה...</span>
          </div>
        ) : hasPhoto && previewSrc ? (
          <img src={previewSrc} alt={label} className="h-full w-full object-cover" loading="lazy" />
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
      </button>

      <input
        ref={fileInputRef}
        id={`shift-photo-${photoId}`}
        type="file"
        accept="image/*"
        capture="environment"
        disabled={disabled || isProcessing}
        onChange={onPhotoChange}
        className="sr-only"
      />

      {hasPhoto && (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove();
          }}
          className="absolute -left-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-lg transition-transform hover:scale-110"
          aria-label={`הסר ${label}`}
        >
          <X className="h-5 w-5" />
        </button>
      )}

      {hasPhoto && (
        <div className="absolute -right-2 -top-2 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg animate-scale-in">
          <Check className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
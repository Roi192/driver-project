import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, X } from "lucide-react";
import { StorageImage } from "@/components/shared/StorageImage";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { uploadShiftPhoto, deleteShiftPhoto } from "@/lib/shift-photo-storage";
import { isNativePlatform, takePhotoNative } from "@/lib/capacitor-camera";

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
  const processingRef = useRef(false);
  const awaitingCaptureRef = useRef(false);
  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const isNative = isNativePlatform();

  useEffect(() => {
    return () => {
      if (localPreview && localPreview.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const hasPhoto = Boolean(storedPath) || Boolean(localPreview);
  const previewSrc = localPreview ?? storedPath ?? undefined;

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const processFile = useCallback(
    async (file: File | null | undefined) => {
      if (processingRef.current || uploading) return;
      if (!file) return;

      processingRef.current = true;

      console.log("[PhotoCapture] file selected", {
        photoId,
        name: file.name,
        type: file.type,
        size: file.size,
        isNative,
      });

      const isImage =
        file.type?.startsWith("image/") ||
        /\.(heic|heif|jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name || "");

      if (!isImage) {
        toast({
          title: "קובץ לא תקין",
          description: "הקובץ שנבחר אינו תמונה תקינה.",
          variant: "destructive",
        });
        resetInput();
        processingRef.current = false;
        return;
      }

      if (file.size === 0) {
        toast({
          title: "קובץ לא תקין",
          description: "התמונה שצולמה ריקה. נסה לצלם שוב.",
          variant: "destructive",
        });
        resetInput();
        processingRef.current = false;
        return;
      }

      // Revoke old blob preview
      if (localPreview && localPreview.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }

      // Generate preview via FileReader (stable on all mobile browsers)
      try {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          console.log("[PhotoCapture] preview ready for", photoId);
          setLocalPreview(dataUrl);
        };
        reader.onerror = () => {
          console.error("[PhotoCapture] FileReader preview failed for", photoId);
          setLocalPreview(null);
        };
        reader.readAsDataURL(file);
      } catch {
        console.error("[PhotoCapture] FileReader exception for", photoId);
        setLocalPreview(null);
      }

      // Upload immediately
      setUploading(true);

      try {
        const previousStoredPath = storedPath;
        const path = await uploadShiftPhoto({ file, photoId });

        console.log("[PhotoCapture] upload success", photoId, path);
        onUploaded(photoId, path);

        if (previousStoredPath && previousStoredPath !== path) {
          await deleteShiftPhoto(previousStoredPath).catch(() => {});
        }

        toast({ title: "✅ התמונה הועלתה בהצלחה", description: label });
      } catch (error) {
        setLocalPreview(null);
        const message = error instanceof Error ? error.message : "אירעה שגיאה";
        console.error("[PhotoCapture] upload failed", photoId, message);
        toast({
          title: "❌ העלאת התמונה נכשלה",
          description: `${label} - ${message}`,
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        resetInput();
        processingRef.current = false;
      }
    },
    [label, localPreview, onUploaded, photoId, resetInput, storedPath, uploading, isNative]
  );

  // --- Capacitor native camera flow ---
  const openNativeCamera = useCallback(async () => {
    if (disabled || uploading || processingRef.current) return;

    try {
      const file = await takePhotoNative();
      if (file) {
        await processFile(file);
      }
    } catch (error) {
      console.error("[PhotoCapture] native camera error", error);
      toast({
        title: "שגיאה במצלמה",
        description: "לא ניתן לפתוח את המצלמה. נסה שוב.",
        variant: "destructive",
      });
    }
  }, [disabled, uploading, processFile]);

  // --- Web file input flow ---
  const processSelectedFileFromInput = useCallback(async (): Promise<boolean> => {
    const selectedFile = inputRef.current?.files?.[0];
    if (!selectedFile) return false;
    awaitingCaptureRef.current = false;
    await processFile(selectedFile);
    return true;
  }, [processFile]);

  // Fallback for Android browsers that don't fire onChange
  useEffect(() => {
    if (isNative) return; // Skip for Capacitor native

    const handleVisible = () => {
      if (!awaitingCaptureRef.current) return;
      window.setTimeout(() => {
        void processSelectedFileFromInput().then((processed) => {
          if (processed || document.visibilityState === "visible") {
            awaitingCaptureRef.current = false;
          }
        });
      }, 120);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") handleVisible();
    };

    window.addEventListener("focus", handleVisible);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", handleVisible);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [processSelectedFileFromInput, isNative]);

  const openWebFilePicker = useCallback(() => {
    if (disabled || uploading) return;
    const input = inputRef.current;
    if (!input) return;

    resetInput();
    awaitingCaptureRef.current = true;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
      } else {
        input.click();
      }
    } catch {
      input.click();
    }

    window.setTimeout(() => {
      if (!awaitingCaptureRef.current) return;
      void processSelectedFileFromInput().then((processed) => {
        if (!processed) awaitingCaptureRef.current = false;
      });
    }, 1400);
  }, [disabled, processSelectedFileFromInput, resetInput, uploading]);

  const handleCardClick = useCallback(() => {
    if (disabled || uploading) return;

    if (isNative) {
      void openNativeCamera();
    } else {
      openWebFilePicker();
    }
  }, [disabled, uploading, isNative, openNativeCamera, openWebFilePicker]);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    awaitingCaptureRef.current = false;
    await processFile(event.currentTarget.files?.[0] ?? inputRef.current?.files?.[0]);
  };

  const handleInput = async (event: React.FormEvent<HTMLInputElement>) => {
    awaitingCaptureRef.current = false;
    await processFile(event.currentTarget.files?.[0] ?? inputRef.current?.files?.[0]);
  };

  const handleRemove = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (localPreview) {
      if (localPreview.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
      setLocalPreview(null);
    }
    if (storedPath) {
      await deleteShiftPhoto(storedPath).catch(() => {});
    }
    onRemoved(photoId);
  };

  const isDisabled = disabled || uploading;

  return (
    <div className="relative animate-fade-in" style={{ animationDelay: `${animationDelayMs}ms` }}>
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        aria-label={label}
        onClick={handleCardClick}
        onKeyDown={(event) => {
          if (isDisabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCardClick();
          }
        }}
        className={cn(
          "relative block aspect-square w-full overflow-hidden rounded-2xl border-2 text-right transition-all duration-300 cursor-pointer",
          hasPhoto
            ? "border-primary shadow-lg"
            : "border-dashed border-border bg-card hover:border-primary/40 hover:bg-primary/5",
          isDisabled && "cursor-not-allowed opacity-90"
        )}
      >
        {uploading ? (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/50 p-4 text-center">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <span className="text-sm font-medium text-muted-foreground">מעלה תמונה...</span>
          </div>
        ) : hasPhoto && previewSrc ? (
          previewSrc.startsWith("blob:") || previewSrc.startsWith("data:") ? (
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
            <span className="text-xs font-medium text-muted-foreground">
              {isNative ? "לחץ לצילום" : "צילום מהמצלמה בלבד"}
            </span>
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
      </div>

      {/* Web fallback input - only used when NOT native */}
      {!isNative && (
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          capture="environment"
          disabled={isDisabled}
          onInput={handleInput}
          onChange={handleChange}
          className="hidden"
          aria-label={`צלם ${label}`}
        />
      )}

      {hasPhoto && !uploading && (
        <button
          type="button"
          onClick={handleRemove}
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
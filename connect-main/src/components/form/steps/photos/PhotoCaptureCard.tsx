import { useCallback, useMemo, useRef, useState } from "react";
import { Camera, Check, ImagePlus, Loader2, RefreshCcw, X } from "lucide-react";

import { StorageImage } from "@/components/shared/StorageImage";
import { toast } from "@/hooks/use-toast";
import { deleteShiftPhoto, uploadShiftPhoto } from "@/lib/shift-photo-storage";
import { cn } from "@/lib/utils";

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
  const inputRef = useRef<HTMLInputElement | null>(null);
  const processingRef = useRef(false);

  const [uploading, setUploading] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const hasLocalPreview = Boolean(localPreview);
  const hasStoredPhoto = Boolean(storedPath);
  const hasPhoto = hasLocalPreview || hasStoredPhoto;

  const previewSrc = useMemo(() => {
    return localPreview ?? storedPath ?? undefined;
  }, [localPreview, storedPath]);

  const resetInput = useCallback(() => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  const createPreviewFromFile = useCallback(async (file: File) => {
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => {
        const result = reader.result;
        if (typeof result === "string" && result.length > 0) {
          resolve(result);
        } else {
          reject(new Error("PREVIEW_EMPTY"));
        }
      };

      reader.onerror = () => reject(new Error("PREVIEW_READ_FAILED"));
      reader.readAsDataURL(file);
    });
  }, []);

  const validateSelectedFile = useCallback((file: File | null | undefined) => {
    if (!file) {
      return { ok: false, message: "לא נבחרה תמונה." };
    }

    const isImage =
      file.type?.startsWith("image/") ||
      /\.(heic|heif|jpg|jpeg|png|webp|bmp|gif)$/i.test(file.name || "");

    if (!isImage) {
      return { ok: false, message: "הקובץ שנבחר אינו תמונה תקינה." };
    }

    if (file.size === 0) {
      return { ok: false, message: "התמונה שצולמה ריקה. נסה לצלם שוב." };
    }

    return { ok: true as const };
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setUploadError(null);

      try {
        const previousStoredPath = storedPath;
        const path = await uploadShiftPhoto({ file, photoId });

        onUploaded(photoId, path);

        if (previousStoredPath && previousStoredPath !== path) {
          await deleteShiftPhoto(previousStoredPath).catch(() => {});
        }

        toast({
          title: "✅ התמונה הועלתה בהצלחה",
          description: label,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "אירעה שגיאה";
        setUploadError(message);

        toast({
          title: "❌ העלאת התמונה נכשלה",
          description: `${label} - ${message}`,
          variant: "destructive",
        });
      } finally {
        setUploading(false);
        resetInput();
      }
    },
    [label, onUploaded, photoId, resetInput, storedPath]
  );

  const processSelectedFile = useCallback(
    async (file: File | null | undefined) => {
      if (processingRef.current || uploading) return;

      const validation = validateSelectedFile(file);
      if (!validation.ok) {
        toast({
          title: "קובץ לא תקין",
          description: validation.message,
          variant: "destructive",
        });
        resetInput();
        return;
      }

      processingRef.current = true;

      try {
        setSelectedFile(file);
        setUploadError(null);

        const preview = await createPreviewFromFile(file);
        setLocalPreview(preview);

        await uploadFile(file);
      } finally {
        processingRef.current = false;
      }
    },
    [createPreviewFromFile, resetInput, uploadFile, uploading, validateSelectedFile]
  );

  const openFilePicker = useCallback(() => {
    if (disabled || uploading) return;
    resetInput();
    inputRef.current?.click();
  }, [disabled, resetInput, uploading]);

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0] ?? null;
    await processSelectedFile(file);
  };

  const handleRetry = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (uploading || !selectedFile) return;
    await uploadFile(selectedFile);
  };

  const handleRemove = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      if (storedPath) {
        await deleteShiftPhoto(storedPath).catch(() => {});
      }
    } finally {
      setSelectedFile(null);
      setUploadError(null);
      setLocalPreview(null);
      onRemoved(photoId);
      resetInput();
    }
  };

  const isDisabled = disabled || uploading;

  return (
    <div
      className="animate-fade-in"
      style={{ animationDelay: `${animationDelayMs}ms` }}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleChange}
        disabled={isDisabled}
      />

      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        onClick={() => {
          if (!isDisabled) openFilePicker();
        }}
        onKeyDown={(event) => {
          if (isDisabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFilePicker();
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
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/30 p-4 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <div className="text-sm font-medium">מעלה תמונה...</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        ) : hasPhoto && previewSrc ? (
          previewSrc.startsWith("data:") || previewSrc.startsWith("blob:") ? (
            <img
              src={previewSrc}
              alt={label}
              className="h-full w-full object-cover"
            />
          ) : (
            <StorageImage
              src={previewSrc}
              bucket="shift-photos"
              alt={label}
              className="h-full w-full object-cover"
            />
          )
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4 text-center">
            <div className="rounded-full bg-primary/10 p-3">
              <Camera className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold">{label}</div>
              <div className="text-xs text-muted-foreground">צילום מהמצלמה בלבד</div>
            </div>
          </div>
        )}

        {hasPhoto && !uploading && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 text-white">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 flex-col text-right">
                <span className="truncate text-xs font-medium">{label}</span>
                <span className="text-[11px] opacity-90">
                  {uploadError
                    ? "התמונה צולמה, ההעלאה נכשלה"
                    : hasStoredPhoto
                    ? "הועלה בהצלחה"
                    : "התמונה צולמה מקומית"}
                </span>
              </div>

              {!uploadError ? (
                <div className="rounded-full bg-emerald-500/90 p-1.5">
                  <Check className="h-4 w-4" />
                </div>
              ) : (
                <div className="rounded-full bg-amber-500/90 p-1.5">
                  <ImagePlus className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>
        )}

        {uploadError && !uploading && (
          <div className="absolute inset-x-2 top-2 rounded-xl border border-destructive/30 bg-background/95 p-2 text-right shadow-lg">
            <div className="text-xs font-semibold text-destructive">העלאת התמונה נכשלה</div>
            <div className="mt-1 line-clamp-3 text-[11px] text-muted-foreground">
              {uploadError}
            </div>

            <div className="mt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleRetry}
                className="inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium hover:bg-muted"
              >
                <RefreshCcw className="h-3.5 w-3.5" />
                נסה שוב
              </button>
            </div>
          </div>
        )}

        {hasPhoto && !uploading && (
          <button
            type="button"
            onClick={handleRemove}
            className="absolute left-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-white shadow transition hover:bg-black/85"
            aria-label={`הסר תמונה - ${label}`}
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-2 flex min-h-5 items-center justify-between px-1">
        <span className="text-xs text-muted-foreground">
          {uploading
            ? "מעלה לשרת..."
            : uploadError
            ? "התמונה נשמרה מקומית בלבד"
            : hasStoredPhoto
            ? "נשמר בשרת"
            : hasLocalPreview
            ? "צולם וממתין להעלאה"
            : "טרם צולם"}
        </span>

        {hasPhoto && !uploading && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              openFilePicker();
            }}
            className="text-xs font-medium text-primary hover:underline"
          >
            לחץ לצילום מחדש
          </button>
        )}
      </div>
    </div>
  );
}
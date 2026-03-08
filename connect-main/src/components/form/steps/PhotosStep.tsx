import { useState, type ChangeEvent } from "react";
import { useFormContext } from "react-hook-form";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, X, ImagePlus, Sparkles, MessageSquare, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";

const readBlobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });

const canvasToCompressedDataUrl = async (canvas: HTMLCanvasElement, quality: number): Promise<string> => {
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) throw new Error("Canvas toBlob returned null");
  return readBlobAsDataUrl(blob);
};

// Robust image compression for mobile cameras with cross-browser fallbacks
const compressImage = async (file: File, maxWidth = 800, quality = 0.6): Promise<string> => {
  const drawToCanvas = (
    width: number,
    height: number,
    draw: (ctx: CanvasRenderingContext2D, targetW: number, targetH: number) => void
  ) => {
    const ratio = Math.min(1, maxWidth / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * ratio));
    const targetH = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;

    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not get canvas context");

    draw(ctx, targetW, targetH);
    return canvas;
  };

  try {
    if (typeof createImageBitmap === "function") {
      const bitmap = await createImageBitmap(file);
      const canvas = drawToCanvas(bitmap.width, bitmap.height, (ctx, targetW, targetH) => {
        ctx.drawImage(bitmap, 0, 0, targetW, targetH);
      });
      bitmap.close?.();
      return await canvasToCompressedDataUrl(canvas, quality);
    }
  } catch (err) {
    console.warn("createImageBitmap compression failed, trying img fallback:", err);
  }

  // iOS / older webview fallback
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("Image decode failed"));
      image.src = objectUrl;
    });

    const canvas = drawToCanvas(img.naturalWidth, img.naturalHeight, (ctx, targetW, targetH) => {
      ctx.drawImage(img, 0, 0, targetW, targetH);
    });

    return await canvasToCompressedDataUrl(canvas, quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

export function PhotosStep() {
  const { setValue, watch, register } = useFormContext();
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null);
  const photos = watch("photos") || {};
  
  const handlePhotoCapture = async (photoId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setProcessingPhoto(photoId);
    try {
      const compressedDataUrl = await compressImage(file, 800, 0.6);
      const currentPhotos = watch("photos") || {};
      setValue("photos", { ...currentPhotos, [photoId]: compressedDataUrl }, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    } catch (error) {
      console.error("Error processing image:", error);
      toast({
        title: "שגיאה בהעלאת התמונה",
        description: "לא הצלחנו לעבד את התמונה. נסה לצלם שוב.",
        variant: "destructive",
      });
    } finally {
      event.target.value = "";
      setProcessingPhoto(null);
    }
  };

  const removePhoto = (photoId: string) => {
    const currentPhotos = { ...photos };
    delete currentPhotos[photoId];
    setValue("photos", currentPhotos, { shouldDirty: true, shouldTouch: true });
  };

  const completedPhotos = VEHICLE_PHOTOS.filter((p) => photos[p.id]).length;
  const allPhotosCompleted = completedPhotos === VEHICLE_PHOTOS.length;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Camera className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 5 מתוך 5</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-slate-800">תמונות הרכב</h2>
        <p className="text-slate-500">צלם את הרכב מכל הזוויות הנדרשות</p>
        
        {/* Progress indicator */}
        <div className={`mt-5 inline-flex items-center gap-3 px-5 py-2.5 rounded-full border ${
          allPhotosCompleted 
            ? "bg-green-50 border-green-200 text-green-600" 
            : "bg-primary/5 border-primary/20 text-primary"
        }`}>
          {allPhotosCompleted && <Sparkles className="w-4 h-4" />}
          <span className="font-bold">{completedPhotos} / {VEHICLE_PHOTOS.length}</span>
          <span className="text-slate-500">תמונות הועלו</span>
          {allPhotosCompleted && <Check className="w-4 h-4" />}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm mb-6">
        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              allPhotosCompleted 
                ? "bg-gradient-to-r from-green-500 to-primary" 
                : "bg-gradient-to-r from-primary to-accent"
            }`}
            style={{ width: `${(completedPhotos / VEHICLE_PHOTOS.length) * 100}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {VEHICLE_PHOTOS.map((photo, index) => {
          const hasPhoto = photos[photo.id];
          const isProcessing = processingPhoto === photo.id;
          return (
            <div 
              key={photo.id} 
              className="relative animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <label
                className={cn(
                  "block aspect-square rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 border-2",
                  hasPhoto 
                    ? "border-green-400 shadow-lg" 
                    : "bg-white border-dashed border-slate-300 hover:border-primary/30 hover:bg-primary/5"
                )}
              >
                {isProcessing ? (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center gap-3 bg-muted/50">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    <span className="text-sm font-medium text-muted-foreground">מעבד תמונה...</span>
                  </div>
                ) : hasPhoto ? (
                  <img
                    src={photos[photo.id]}
                    alt={photo.label}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
                      <ImagePlus className="w-7 h-7 text-primary" />
                    </div>
                    <span className="text-sm font-medium text-slate-600">{photo.label}</span>
                  </div>
                )}
                
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
                  capture="environment"
                  disabled={isProcessing}
                  onChange={(e) => handlePhotoCapture(photo.id, e)}
                  className="hidden"
                />
              </label>

              {hasPhoto && (
                <button
                  type="button"
                  onClick={() => removePhoto(photo.id)}
                  className="absolute -top-2 -left-2 w-9 h-9 rounded-full bg-red-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-110"
                >
                  <X className="w-5 h-5" />
                </button>
              )}

              {hasPhoto && (
                <div className="absolute -top-2 -right-2 w-9 h-9 rounded-full bg-green-500 text-white flex items-center justify-center shadow-lg animate-scale-in">
                  <Check className="w-5 h-5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Vehicle Notes Section */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mt-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center border border-orange-200">
            <MessageSquare className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">הערות או בעיות ברכב</h3>
            <p className="text-sm text-slate-500">אופציונלי - תאר בעיות שנמצאו</p>
          </div>
        </div>
        <Textarea
          {...register("vehicleNotes")}
          placeholder="לדוגמה: שריטה בדלת ימנית, נורת אזהרה דולקת..."
          className="min-h-[100px] bg-slate-50 border-slate-200 resize-none rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>
    </div>
  );
}
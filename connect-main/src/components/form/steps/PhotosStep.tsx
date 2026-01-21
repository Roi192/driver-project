import { useFormContext } from "react-hook-form";
import { VEHICLE_PHOTOS } from "@/lib/constants";
import { Camera, Check, X, ImagePlus, Sparkles, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// Image compression utility
const compressImage = (file: File, maxWidth = 800, quality = 0.6): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to compressed JPEG
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

export function PhotosStep() {
  const { setValue, watch, register } = useFormContext();
  const photos = watch("photos") || {};
  
  const handlePhotoCapture = async (photoId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        // Compress the image before storing
        const compressedDataUrl = await compressImage(file, 800, 0.6);
        setValue(`photos.${photoId}`, compressedDataUrl);
      } catch (error) {
        console.error('Error compressing image:', error);
        // Fallback to original if compression fails
        const reader = new FileReader();
        reader.onload = (e) => {
          setValue(`photos.${photoId}`, e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removePhoto = (photoId: string) => {
    setValue(`photos.${photoId}`, undefined);
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
                {hasPhoto ? (
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
                  accept="image/*"
                  capture="environment"
                  onClick={(e) => {
                    // Reset value to allow re-selecting same file and enforce camera
                    (e.target as HTMLInputElement).value = '';
                  }}
                  onInput={(e) => {
                    // On mobile, capture="environment" should force camera
                    // This is the standard way to enforce camera-only on mobile
                  }}
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
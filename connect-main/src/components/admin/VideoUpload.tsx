import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Video, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VideoUploadProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
}

export function VideoUpload({ 
  value, 
  onChange, 
  bucket = "content-images", 
  folder = "videos" 
}: VideoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string>(value || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo'];
    if (!validTypes.includes(file.type)) {
      toast.error("יש להעלות קובץ וידאו בלבד (MP4, WebM, OGG, MOV, AVI)");
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      toast.error("גודל הקובץ המקסימלי הוא 100MB");
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from(bucket)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      setPreview(urlData.publicUrl);
      onChange(urlData.publicUrl);
      toast.success("הסרטון הועלה בהצלחה");
    } catch (error) {
      console.error('Error uploading video:', error);
      toast.error("שגיאה בהעלאת הסרטון");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview("");
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isVideoFile = (url: string) => {
    if (!url) return false;
    const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
    return videoExtensions.some(ext => url.toLowerCase().includes(ext));
  };

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {preview && isVideoFile(preview) ? (
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-secondary/20">
          <video 
            src={preview} 
            controls 
            className="w-full max-h-48 object-contain"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 w-8 h-8 rounded-full"
            onClick={handleRemove}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : preview ? (
        <div className="relative rounded-xl overflow-hidden border border-border/50 bg-secondary/20 p-4">
          <div className="flex items-center gap-3">
            <Video className="w-8 h-8 text-primary" />
            <span className="text-sm truncate flex-1">{preview}</span>
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="w-8 h-8 rounded-full"
              onClick={handleRemove}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "border-2 border-dashed border-border/50 rounded-xl p-6 text-center",
            "hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer"
          )}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Video className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              לחץ להעלאת קובץ וידאו
            </p>
            <p className="text-xs text-muted-foreground/70">
              MP4, WebM, MOV • עד 100MB
            </p>
          </div>
        </div>
      )}

      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
            מעלה סרטון...
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 ml-2" />
            {preview ? "החלף סרטון" : "העלה סרטון"}
          </>
        )}
      </Button>
    </div>
  );
}
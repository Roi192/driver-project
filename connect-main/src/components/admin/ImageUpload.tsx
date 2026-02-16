import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { getSignedUrl } from "@/lib/storage-utils";
import { resumableUpload } from "@/lib/resumable-upload";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
}

export function ImageUpload({ 
  value, 
  onChange, 
  bucket = "content-images",
  folder = "uploads"
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate signed URL for preview when value changes
  useEffect(() => {
    let mounted = true;
    
    async function loadPreview() {
      if (!value) {
        setPreview(null);
        return;
      }
      
      const signedUrl = await getSignedUrl(value, bucket);
      if (mounted && signedUrl) {
        setPreview(signedUrl);
      }
    }
    
    loadPreview();
    
    return () => {
      mounted = false;
    };
  }, [value, bucket]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("אנא בחר קובץ תמונה");
      return;
    }


    setUploading(true);

    try {
      const result = await resumableUpload({
        bucket,
        folder,
        file,
      });

      setPreview(result.signedUrl);
      // Store the file path (not the signed URL) so we can regenerate URLs later
      onChange(result.path);
      toast.success("התמונה הועלתה בהצלחה");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "שגיאה בהעלאת התמונה");
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {preview ? (
        <div className="relative rounded-lg overflow-hidden border border-border">
          <img 
            src={preview} 
            alt="Preview" 
            className="w-full h-40 object-cover"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-8 w-8"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">מעלה תמונה...</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <div className="p-3 bg-primary/10 rounded-full">
                <ImageIcon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-sm font-medium">לחץ להעלאת תמונה</span>
              <span className="text-xs text-muted-foreground">PNG, JPG</span>
            </div>
          )}
        </div>
      )}
      
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 ml-2 animate-spin" />
        ) : (
          <Upload className="h-4 w-4 ml-2" />
        )}
        {preview ? "החלף תמונה" : "העלה תמונה"}
      </Button>
    </div>
  );
}
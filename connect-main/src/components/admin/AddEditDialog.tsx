import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Sparkles, MapPin, Crosshair } from "lucide-react";
import { ImageUpload } from "./ImageUpload";
import { VideoUpload } from "./VideoUpload";
import { MediaUpload } from "./MediaUpload";
import { toast } from "sonner";

export interface FieldConfig {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "select" | "number" | "image" | "video" | "media" | "location";
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  mediaTypes?: ("video" | "youtube" | "pdf" | "file")[];
  // For location type - names of lat/lng fields to update
  latField?: string;
  lngField?: string;
}

interface AddEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  fields: FieldConfig[];
  initialData?: Record<string, any>;
  onSubmit: (data: Record<string, any>) => Promise<void>;
  isLoading?: boolean;
}

export function AddEditDialog({
  open,
  onOpenChange,
  title,
  fields,
  initialData,
  onSubmit,
  isLoading,
}: AddEditDialogProps) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [gettingLocation, setGettingLocation] = useState(false);
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      const defaultData: Record<string, any> = {};
      fields.forEach((field) => {
        defaultData[field.name] = "";
      });
      setFormData(defaultData);
    }
  }, [initialData, fields, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getCurrentLocation = (latField: string, lngField: string) => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            [latField]: position.coords.latitude.toFixed(6),
            [lngField]: position.coords.longitude.toFixed(6),
          }));
          toast.success("המיקום נקלט בהצלחה!");
          setGettingLocation(false);
        },
        (error) => {
          console.error("Location error:", error);
          toast.error("לא ניתן לקבל מיקום. אנא בדוק את הרשאות המיקום.");
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      toast.error("הדפדפן אינו תומך במיקום");
      setGettingLocation(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto bg-gradient-to-br from-card via-card/98 to-primary/5 border-2 border-primary/20 shadow-2xl rounded-3xl">
        <DialogHeader className="pb-4 border-b border-border/30">
          <DialogTitle className="text-2xl font-black flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            {title}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {fields.map((field, index) => (
            <div 
              key={field.name} 
              className="space-y-2 animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <Label htmlFor={field.name} className="text-base font-bold text-foreground">
                {field.label}
                {field.required && <span className="text-destructive mr-1">*</span>}
              </Label>
              {field.type === "textarea" ? (
                <Textarea
                  id={field.name}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="min-h-[100px] bg-background/60 border-2 border-border/50 focus:border-primary/50 rounded-xl transition-all resize-none"
                />
              ) : field.type === "select" ? (
                <Select
                  value={formData[field.name] || ""}
                  onValueChange={(value) => handleChange(field.name, value)}
                >
                  <SelectTrigger className="h-12 bg-background/60 border-2 border-border/50 focus:border-primary/50 rounded-xl">
                    <SelectValue placeholder={field.placeholder || "בחר..."} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-2 border-border/50 rounded-xl">
                    {field.options?.map((option) => (
                      <SelectItem key={option.value} value={option.value} className="rounded-lg">
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === "image" ? (
                <ImageUpload
                  value={formData[field.name] || ""}
                  onChange={(url) => handleChange(field.name, url)}
                />
              ) : field.type === "video" ? (
                <VideoUpload
                  value={formData[field.name] || ""}
                  onChange={(url) => handleChange(field.name, url)}
                />
              ) : field.type === "media" ? (
                <MediaUpload
                  value={formData[field.name] || ""}
                  onChange={(url) => handleChange(field.name, url)}
                  allowedTypes={field.mediaTypes || ["video", "youtube"]}
                />
              ) : field.type === "location" ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={gettingLocation}
                  onClick={() => getCurrentLocation(field.latField || "latitude", field.lngField || "longitude")}
                  className="w-full h-12 rounded-xl border-2 border-dashed border-primary/50 hover:border-primary hover:bg-primary/10 gap-2 font-bold"
                >
                  {gettingLocation ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Crosshair className="w-5 h-5" />
                  )}
                  {gettingLocation ? "מקבל מיקום..." : "הוסף מיקום בזמן אמת"}
                </Button>
              ) : (
                <Input
                  id={field.name}
                  type={field.type === "number" ? "number" : "text"}
                  placeholder={field.placeholder}
                  value={formData[field.name] || ""}
                  onChange={(e) => handleChange(field.name, e.target.value)}
                  required={field.required}
                  className="h-12 bg-background/60 border-2 border-border/50 focus:border-primary/50 rounded-xl transition-all"
                />
              )}
            </div>
          ))}
          <DialogFooter className="pt-4 border-t border-border/30 gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 h-12 rounded-xl border-2 font-bold hover:bg-muted/50"
            >
              ביטול
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl font-bold bg-gradient-to-r from-primary to-accent shadow-lg hover:shadow-xl transition-all"
            >
              {isLoading && <Loader2 className="w-5 h-5 ml-2 animate-spin" />}
              {initialData ? "עדכון" : "הוספה"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
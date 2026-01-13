import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Camera, Upload, CheckCircle, AlertCircle, Sparkles, ImageIcon, Info, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { OUTPOSTS } from "@/lib/constants";
import { format } from "date-fns";
import { he } from "date-fns/locale";

const DAY_OPTIONS = [
  { value: "monday", label: "יום שני", deadline: "12:00", responsibility: "נהג משמרת צהריים של יום ראשון" },
  { value: "wednesday", label: "יום רביעי", deadline: "11:00", responsibility: "נהג משמרת צהריים של יום שלישי" },
  { value: "saturday_night", label: "מוצאי שבת", deadline: "22:00", responsibility: "נהג משמרת בוקר של שבת" },
];

interface ExamplePhoto {
  id: string;
  outpost: string;
  description: string;
  image_url: string;
  display_order: number;
}

interface Highlight {
  id: string;
  title: string;
  display_order: number;
}

export default function CleaningParades() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedOutpost, setSelectedOutpost] = useState("");
  const [selectedDay, setSelectedDay] = useState("");
  const [responsibleDriver, setResponsibleDriver] = useState("");
  const [photos, setPhotos] = useState<{ description: string; url: string }[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState<string | null>(null);
  const [examplePhotos, setExamplePhotos] = useState<ExamplePhoto[]>([]);
  const [loadingExamples, setLoadingExamples] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loadingHighlights, setLoadingHighlights] = useState(true);

  const currentDate = format(new Date(), "yyyy-MM-dd");
  const currentTime = format(new Date(), "HH:mm");

  // Fetch highlights on mount
  useEffect(() => {
    fetchHighlights();
  }, []);

  const fetchHighlights = async () => {
    try {
      const { data, error } = await supabase
        .from('cleaning_parade_highlights')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setHighlights(data || []);
    } catch (error: any) {
      console.error('Error fetching highlights:', error);
    } finally {
      setLoadingHighlights(false);
    }
  };

  const selectedDayInfo = DAY_OPTIONS.find(d => d.value === selectedDay);

  // Fetch example photos when outpost changes
  useEffect(() => {
    if (selectedOutpost) {
      fetchExamplePhotos(selectedOutpost);
    } else {
      setExamplePhotos([]);
      setPhotos([]);
    }
  }, [selectedOutpost]);

  const fetchExamplePhotos = async (outpost: string) => {
    setLoadingExamples(true);
    try {
      const { data, error } = await supabase
        .from('cleaning_parade_examples')
        .select('*')
        .eq('outpost', outpost)
        .order('display_order', { ascending: true });

      if (error) throw error;
      setExamplePhotos(data || []);
      // Initialize photos array with empty slots for each example
      setPhotos((data || []).map(ex => ({ description: ex.description, url: "" })));
    } catch (error: any) {
      console.error('Error fetching example photos:', error);
    } finally {
      setLoadingExamples(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, index: number, description: string) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("אנא בחר קובץ תמונה");
      return;
    }

    // Validate file size (max 10MB for camera photos)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("גודל הקובץ חייב להיות עד 10MB");
      return;
    }

    setUploadingPhoto(description);
    try {
      // Get file extension from name or type
      let fileExt = file.name.split('.').pop()?.toLowerCase();
      
      // If no extension or it's a blob, use type to determine extension
      if (!fileExt || fileExt === file.name || file.name.startsWith('image')) {
        const mimeToExt: Record<string, string> = {
          'image/jpeg': 'jpg',
          'image/jpg': 'jpg',
          'image/png': 'png',
          'image/gif': 'gif',
          'image/webp': 'webp',
          'image/heic': 'jpg', // Convert HEIC to jpg in filename
          'image/heif': 'jpg',
        };
        fileExt = mimeToExt[file.type] || 'jpg';
      }
      
      const fileName = `${user.id}/${Date.now()}_${index}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('cleaning-parades')
        .upload(fileName, file, {
          contentType: file.type || 'image/jpeg',
        });

      if (uploadError) throw uploadError;

      // Get signed URL for secure access (1 year validity)
      const { data: signedUrlData, error: signedError } = await supabase.storage
        .from('cleaning-parades')
        .createSignedUrl(fileName, 60 * 60 * 24 * 365); // 1 year

      if (signedError || !signedUrlData?.signedUrl) {
        throw signedError || new Error('Failed to generate signed URL');
      }
      const signedUrl = signedUrlData.signedUrl;

      setPhotos(prev => {
        const newPhotos = [...prev];
        newPhotos[index] = { description, url: signedUrl };
        return newPhotos;
      });
      toast.success("התמונה הועלתה בהצלחה");
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || "שגיאה בהעלאת התמונה");
    } finally {
      setUploadingPhoto(null);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => {
      const newPhotos = [...prev];
      newPhotos[index] = { ...newPhotos[index], url: "" };
      return newPhotos;
    });
  };

  const allPhotosUploaded = examplePhotos.length > 0 && photos.every(p => p.url !== "");

  const handleSubmit = async () => {
    if (!user || !selectedOutpost || !selectedDay || !responsibleDriver) {
      toast.error("נא למלא את כל השדות");
      return;
    }

    if (examplePhotos.length > 0 && !allPhotosUploaded) {
      toast.error("נא להעלות את כל התמונות הנדרשות");
      return;
    }

    if (examplePhotos.length === 0) {
      toast.error("אין תמונות דוגמא מוגדרות למוצב זה. פנה למנהל.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('cleaning_parades')
        .insert({
          user_id: user.id,
          outpost: selectedOutpost,
          day_of_week: selectedDay,
          responsible_driver: responsibleDriver,
          photos: photos.map(p => p.url),
        });

      if (error) throw error;

      toast.success("מסדר הניקיון נשמר בהצלחה!");
      // Reset form
      setSelectedOutpost("");
      setSelectedDay("");
      setResponsibleDriver("");
      setPhotos([]);
      setExamplePhotos([]);
    } catch (error: any) {
      console.error('Error submitting parade:', error);
      const message =
        error?.message ||
        error?.error_description ||
        (typeof error === 'string' ? error : null) ||
        "שגיאה בשמירת המסדר";
      const details = error?.details || error?.hint;
      toast.error(details ? `${message} (${details})` : message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Header */}
          <PageHeader
            icon={Sparkles}
            title="מסדרי ניקיון"
            subtitle="דיווח על ביצוע מסדר ניקיון"
            badge="מסדרי ניקיון"
          />

          {/* Current Date/Time Display */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-primary/10 rounded-xl">
                  <p className="text-xs text-slate-500">תאריך</p>
                  <p className="font-bold text-lg text-primary">{format(new Date(), "dd/MM/yyyy", { locale: he })}</p>
                </div>
                <div className="text-center p-3 bg-accent/10 rounded-xl">
                  <p className="text-xs text-slate-500">שעה</p>
                  <p className="font-bold text-lg text-accent">{currentTime}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Highlights Section */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="w-5 h-5 text-primary" />
                דגשים למסדר ניקיון
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {loadingHighlights ? (
                <div className="flex items-center justify-center py-4">
                  <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : highlights.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-4">אין דגשים מוגדרים</p>
              ) : (
                <ul className="space-y-2">
                  {highlights.map((highlight, index) => (
                    <li key={highlight.id} className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-200">
                      <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-sm flex items-center justify-center font-bold flex-shrink-0">
                        {index + 1}
                      </span>
                      <span className="text-sm text-amber-800 font-medium">{highlight.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Form */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <Label>מוצב</Label>
                <Select value={selectedOutpost} onValueChange={setSelectedOutpost}>
                  <SelectTrigger className="bg-white text-slate-900">
                    <SelectValue placeholder="בחר מוצב" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {OUTPOSTS.map(outpost => (
                      <SelectItem key={outpost} value={outpost} className="text-slate-900">{outpost}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>יום בשבוע</Label>
                <Select value={selectedDay} onValueChange={setSelectedDay}>
                  <SelectTrigger className="bg-white text-slate-900">
                    <SelectValue placeholder="בחר יום" />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    {DAY_OPTIONS.map(day => (
                      <SelectItem key={day.value} value={day.value} className="text-slate-900">
                        {day.label} - עד {day.deadline}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDayInfo && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-700">
                    <strong>אחריות:</strong> {selectedDayInfo.responsibility}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    <strong>זמן הגשה:</strong> עד {selectedDayInfo.deadline}
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label>אחראי מסדר (שם הנהג)</Label>
                <Input 
                  value={responsibleDriver}
                  onChange={(e) => setResponsibleDriver(e.target.value)}
                  placeholder="הזן את שמך"
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Example Photos Section */}
          {selectedOutpost && (
            <Card className="border-slate-200/60 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-primary" />
                  תמונות דוגמא - כך צריך להיראות
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                {loadingExamples ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : examplePhotos.length === 0 ? (
                  <div className="text-center py-8 bg-amber-50 rounded-xl border border-amber-200">
                    <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
                    <p className="text-amber-700 font-medium">אין תמונות דוגמא מוגדרות למוצב זה</p>
                    <p className="text-amber-600 text-sm mt-1">פנה למנהל להוספת תמונות דוגמא</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="p-3 bg-green-50 rounded-xl border border-green-200 flex items-start gap-2">
                      <Info className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-green-700">
                        להלן תמונות הדוגמא. עליך לצלם ולהעלות תמונה תואמת לכל אחת מהדוגמאות.
                      </p>
                    </div>

                    {examplePhotos.map((example, index) => (
                      <div key={example.id} className="border border-slate-200 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-primary text-white text-sm flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <span className="font-medium text-slate-700">{example.description}</span>
                          {photos[index]?.url && (
                            <CheckCircle className="w-5 h-5 text-green-500 mr-auto" />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          {/* Example Photo */}
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 text-center">דוגמא</p>
                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-primary/30 bg-slate-100">
                              <img 
                                src={example.image_url} 
                                alt={example.description} 
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>

                          {/* User Photo Upload */}
                          <div className="space-y-2">
                            <p className="text-xs text-slate-500 text-center">התמונה שלך</p>
                            {photos[index]?.url ? (
                              <div className="relative aspect-square rounded-xl overflow-hidden border-2 border-green-400 bg-slate-100">
                                <img 
                                  src={photos[index].url} 
                                  alt={`צילום ${index + 1}`} 
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={() => removePhoto(index)}
                                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center shadow-lg"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:bg-slate-50 transition-colors">
                                <input
                                  type="file"
                                  accept="image/*"
                                  capture="environment"
                                  onChange={(e) => handlePhotoUpload(e, index, example.description)}
                                  className="hidden"
                                  disabled={uploadingPhoto !== null}
                                />
                                {uploadingPhoto === example.description ? (
                                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <>
                                    <Camera className="w-8 h-8 text-slate-400 mb-1" />
                                    <span className="text-xs text-slate-500">צלם</span>
                                  </>
                                )}
                              </label>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Submit Button */}
          {selectedOutpost && examplePhotos.length > 0 && (
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedOutpost || !selectedDay || !responsibleDriver || !allPhotosUploaded}
              className="w-full h-14 text-lg font-bold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
            >
              {isSubmitting ? (
                <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <Upload className="w-5 h-5 ml-2" />
                  שלח מסדר ניקיון
                  {!allPhotosUploaded && ` (${photos.filter(p => p.url).length}/${examplePhotos.length})`}
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
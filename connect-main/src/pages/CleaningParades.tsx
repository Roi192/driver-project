import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Camera, CheckCircle, AlertCircle, Sparkles, ListChecks, Image, Play, ArrowLeft, MapPin, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { format, startOfWeek } from "date-fns";
import { he } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

const DAY_OPTIONS = [
  { value: "monday", label: "יום שני", deadline: "12:00" },
  { value: "wednesday", label: "יום רביעי", deadline: "11:00" },
  { value: "saturday_night", label: "מוצאי שבת", deadline: "22:00" },
];

interface Highlight {
  id: string;
  title: string;
  display_order: number;
  area_id: string | null;
}

interface ResponsibilityArea {
  id: string;
  outpost: string;
  area_name: string;
  description: string | null;
  display_order: number | null;
}

interface ExamplePhoto {
  id: string;
  outpost: string | null;
  description: string;
  image_url: string;
  area_id: string | null;
}

interface MyAssignment {
  day_of_week: string;
  area: ResponsibilityArea;
  is_completed?: boolean;
}

type Step = "my-tasks" | "parade" | "completed";

export default function CleaningParades() {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [examples, setExamples] = useState<ExamplePhoto[]>([]);
  const [myArea, setMyArea] = useState<ResponsibilityArea | null>(null);
  const [loadingArea, setLoadingArea] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [myWeeklyAssignments, setMyWeeklyAssignments] = useState<MyAssignment[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link current auth user -> soldiers table (by personal_number)
  const [soldierId, setSoldierId] = useState<string | null>(null);

  // User selection state
  const [selectedDay, setSelectedDay] = useState<string>("");
  const [currentStep, setCurrentStep] = useState<Step>("my-tasks");

  const currentDate = format(new Date(), "yyyy-MM-dd");
  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');

  useEffect(() => {
    fetchUserContextAndAssignments();
  }, [user]);

  const fetchUserContextAndAssignments = async () => {
    if (!user) return;

    setLoadingAssignments(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('personal_number')
        .eq('user_id', user.id)
        .maybeSingle();

      const personalNumber = profile?.personal_number ?? user.user_metadata?.personal_number ?? null;

      if (!personalNumber) {
        setSoldierId(null);
        setLoadingAssignments(false);
        return;
      }

      const { data: soldier } = await supabase
        .from('soldiers')
        .select('id')
        .eq('personal_number', personalNumber)
        .maybeSingle();

      if (!soldier?.id) {
        setSoldierId(null);
        setLoadingAssignments(false);
        return;
      }

      setSoldierId(soldier.id);

      // Fetch weekly assignments
      const { data: assignments } = await supabase
        .from('cleaning_weekly_assignments')
        .select('*, cleaning_responsibility_areas(*)')
        .eq('soldier_id', soldier.id)
        .eq('week_start_date', currentWeekStart);

      if (assignments && assignments.length > 0) {
        // Check which are completed
        const { data: completedParades } = await supabase
          .from('cleaning_parade_assignments')
          .select('day_of_week')
          .eq('soldier_id', soldier.id)
          .eq('parade_date', currentDate)
          .eq('is_completed', true);

        const completedDays = new Set(completedParades?.map(p => p.day_of_week) || []);

        const myAssignments: MyAssignment[] = assignments
          .filter(a => a.cleaning_responsibility_areas)
          .map(a => ({
            day_of_week: a.day_of_week,
            area: a.cleaning_responsibility_areas as ResponsibilityArea,
            is_completed: completedDays.has(a.day_of_week),
          }));

        setMyWeeklyAssignments(myAssignments);
      } else {
        setMyWeeklyAssignments([]);
      }

      // Set default day based on current day
      const day = new Date().getDay();
      if (day === 1) setSelectedDay("monday");
      else if (day === 3) setSelectedDay("wednesday");
      else if (day === 6 || day === 0) setSelectedDay("saturday_night");
      else if (day <= 2) setSelectedDay("monday");
      else if (day <= 4) setSelectedDay("wednesday");
      else setSelectedDay("saturday_night");

    } catch (error) {
      console.error('Error fetching user context:', error);
    } finally {
      setLoadingAssignments(false);
    }
  };

  const startParadeForDay = async (dayOfWeek: string, area: ResponsibilityArea) => {
    if (!soldierId) {
      toast.error("המשתמש לא מקושר לחייל בטבלת השליטה");
      return;
    }

    setSelectedDay(dayOfWeek);
    setMyArea(area);
    setLoadingArea(true);

    try {
      // Check if already completed today
      const { data: existingParade } = await supabase
        .from('cleaning_parade_assignments')
        .select('*')
        .eq('soldier_id', soldierId)
        .eq('parade_date', currentDate)
        .eq('day_of_week', dayOfWeek)
        .eq('is_completed', true)
        .maybeSingle();

      if (existingParade) {
        setPhotoUrl(existingParade.photo_url);
        setCurrentStep("completed");
        setLoadingArea(false);
        return;
      }

      // Fetch highlights and examples for this area
      await fetchHighlightsAndExamples(area.id);
      setCurrentStep("parade");
    } catch (error) {
      console.error('Error starting parade:', error);
      toast.error("שגיאה בטעינת נתונים");
    } finally {
      setLoadingArea(false);
    }
  };

  const fetchHighlightsAndExamples = async (areaId: string) => {
    const [highlightsRes, examplesRes] = await Promise.all([
      supabase
        .from('cleaning_parade_highlights')
        .select('*')
        .eq('area_id', areaId)
        .eq('is_active', true)
        .order('display_order'),
      supabase
        .from('cleaning_parade_examples')
        .select('*')
        .eq('area_id', areaId)
        .order('display_order'),
    ]);
    
    setHighlights(highlightsRes.data || []);
    setExamples(examplesRes.data || []);
  };

  const handleCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !myArea) return;

    if (!file.type.startsWith("image/")) {
      toast.error("אנא צלם תמונה");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("גודל התמונה חייב להיות עד 10MB");
      return;
    }

    setUploading(true);
    try {
      const mimeToExt: Record<string, string> = {
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/png': 'png',
        'image/gif': 'gif',
        'image/webp': 'webp',
        'image/heic': 'jpg',
        'image/heif': 'jpg',
      };
      const fileExt = mimeToExt[file.type] || 'jpg';
      const fileName = `${user.id}/${currentDate}/${myArea.id}_${Date.now()}.${fileExt}`;
      
      await supabase.storage.from('cleaning-parades').upload(fileName, file, { contentType: file.type || 'image/jpeg' });

      // 7 days validity for operational cleaning parade photos
      const { data: signedUrlData } = await supabase.storage
        .from('cleaning-parades')
        .createSignedUrl(fileName, 60 * 60 * 24 * 7);

      setPhotoUrl(signedUrlData?.signedUrl || null);
      toast.success("התמונה הועלתה בהצלחה");
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error("שגיאה בהעלאת התמונה");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!user || !myArea || !photoUrl || !soldierId) {
      toast.error("נא להעלות תמונה של תחום האחריות שלך");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: paradeData, error: paradeError } = await supabase
        .from('cleaning_parades')
        .insert({
          user_id: user.id,
          outpost: myArea.outpost,
          day_of_week: selectedDay,
          responsible_driver: user.user_metadata?.full_name || "לא ידוע",
          photos: [photoUrl],
          parade_date: currentDate,
        })
        .select()
        .single();

      if (paradeError) throw paradeError;

      await supabase.from('cleaning_parade_assignments').insert({
        parade_id: paradeData.id,
        soldier_id: soldierId,
        area_id: myArea.id,
        parade_date: currentDate,
        day_of_week: selectedDay,
        outpost: myArea.outpost,
        is_completed: true,
        photo_url: photoUrl,
      });

      toast.success("המסדר נשמר בהצלחה!");
      setCurrentStep("completed");
    } catch (error: any) {
      console.error('Error submitting parade:', error);
      toast.error("שגיאה בשמירת המסדר");
    } finally {
      setIsSubmitting(false);
    }
  };

  const goBack = () => {
    setCurrentStep("my-tasks");
    setMyArea(null);
    setPhotoUrl(null);
    setHighlights([]);
    setExamples([]);
  };

  const goToStart = () => {
    setCurrentStep("my-tasks");
    setMyArea(null);
    setPhotoUrl(null);
    setHighlights([]);
    setExamples([]);
    fetchUserContextAndAssignments();
  };

  const currentDayInfo = DAY_OPTIONS.find(d => d.value === selectedDay);

  // Get unique outposts from assignments
  const assignedOutposts = [...new Set(myWeeklyAssignments.map(a => a.area.outpost))];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          <PageHeader
            icon={Sparkles}
            title="מסדר ניקיון"
            subtitle={currentStep === "my-tasks" ? "המשימות שלי לשבוע הנוכחי" : currentStep === "parade" ? "צלם את תחום האחריות" : "המסדר הושלם"}
            badge={format(new Date(), "dd/MM", { locale: he })}
          />

          {/* Step: My Weekly Tasks */}
          {currentStep === "my-tasks" && (
            <div className="space-y-4">
              {/* Date Info */}
              <Card className="border-slate-200/60 shadow-lg bg-gradient-to-r from-primary/5 to-accent/5">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">שבוע החל מ-</p>
                      <p className="font-bold text-lg text-slate-800">{format(new Date(currentWeekStart), "dd/MM/yyyy", { locale: he })}</p>
                    </div>
                    <div className="text-left">
                      <p className="text-sm text-slate-500">היום</p>
                      <p className="font-bold text-lg text-primary">{format(new Date(), "EEEE", { locale: he })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Loading State */}
              {loadingAssignments ? (
                <Card className="border-slate-200/60 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-slate-600">טוען את המשימות שלך...</p>
                  </CardContent>
                </Card>
              ) : !soldierId ? (
                <Card className="border-amber-200 shadow-lg bg-amber-50">
                  <CardContent className="p-6 text-center">
                    <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                    <p className="text-amber-800 font-medium">המשתמש לא מקושר לחייל</p>
                    <p className="text-sm text-amber-600 mt-1">פנה למפקד לעדכון המספר האישי בפרופיל</p>
                  </CardContent>
                </Card>
              ) : myWeeklyAssignments.length === 0 ? (
                <Card className="border-slate-200/60 shadow-lg">
                  <CardContent className="p-8 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">אין לך שיבוצים לשבוע זה</p>
                    <p className="text-sm text-slate-400 mt-1">פנה למפקד לשיבוץ במסדרי ניקיון</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Assigned Outposts Badge */}
                  {assignedOutposts.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="text-sm text-slate-600">משובץ ב:</span>
                      {assignedOutposts.map(outpost => (
                        <Badge key={outpost} variant="secondary" className="bg-primary/10 text-primary">
                          {outpost}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Tasks List */}
                  <Card className="border-slate-200/60 shadow-lg">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-primary" />
                        המשימות שלי
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {DAY_OPTIONS.map((day) => {
                        const assignment = myWeeklyAssignments.find(a => a.day_of_week === day.value);
                        return (
                          <div 
                            key={day.value} 
                            className={`p-4 rounded-xl border transition-all ${
                              assignment 
                                ? 'bg-white border-slate-200 hover:border-primary/30 hover:shadow-md' 
                                : 'bg-slate-50/50 border-slate-100'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-semibold text-slate-800">{day.label}</p>
                                  <Badge variant="outline" className="text-xs text-slate-400">
                                    עד {day.deadline}
                                  </Badge>
                                </div>
                                {assignment ? (
                                  <div className="space-y-1">
                                    <p className="text-sm text-primary font-medium">{assignment.area.area_name}</p>
                                    <div className="flex items-center gap-1 text-xs text-slate-400">
                                      <MapPin className="w-3 h-3" />
                                      {assignment.area.outpost}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-slate-400">לא משובץ</p>
                                )}
                              </div>
                              {assignment && (
                                assignment.is_completed ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 px-3 py-1.5">
                                    <CheckCircle className="w-4 h-4 ml-1" />
                                    בוצע
                                  </Badge>
                                ) : (
                                  <Button 
                                    size="sm"
                                    onClick={() => startParadeForDay(day.value, assignment.area)}
                                    disabled={loadingArea}
                                    className="bg-gradient-to-r from-primary to-accent"
                                  >
                                    <Play className="w-4 h-4 ml-1" />
                                    התחל מסדר
                                  </Button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* Step: Parade */}
          {currentStep === "parade" && (
            <div className="space-y-4">
              <Button variant="ghost" onClick={goBack} className="text-slate-500">
                <ArrowLeft className="w-4 h-4 ml-2" />
                חזרה לרשימת המשימות
              </Button>

              {/* My Responsibility Area */}
              <Card className="border-slate-200/60 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    תחום האחריות שלי
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="bg-primary/20 text-primary">{myArea?.outpost}</Badge>
                      <Badge variant="outline" className="text-slate-500">
                        {DAY_OPTIONS.find(d => d.value === selectedDay)?.label}
                      </Badge>
                    </div>
                    <p className="text-xl font-bold text-slate-800">{myArea?.area_name}</p>
                    {myArea?.description && (
                      <p className="text-sm text-slate-600 mt-1">{myArea.description}</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Highlights Section */}
              {highlights.length > 0 && (
                <Card className="border-slate-200/60 shadow-lg">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ListChecks className="w-5 h-5 text-amber-500" />
                      דגשים לתחום זה
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-4">
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
                  </CardContent>
                </Card>
              )}

              {/* Photo Comparison Section - Example + User Photo Side by Side */}
              <Card className="border-slate-200/60 shadow-lg">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Camera className="w-5 h-5 text-emerald-500" />
                    צילום תחום האחריות
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                  {/* Side by Side Photos */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Example Photo */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Image className="w-3 h-3" />
                        תמונה לדוגמא
                      </div>
                      {examples.length > 0 ? (
                        <div className="rounded-xl overflow-hidden border-2 border-blue-200 bg-blue-50">
                          <img 
                            src={examples[0].image_url} 
                            alt={examples[0].description} 
                            className="w-full h-40 object-cover"
                          />
                          <p className="text-xs text-blue-700 p-2 text-center font-medium">{examples[0].description}</p>
                        </div>
                      ) : (
                        <div className="h-40 bg-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
                          <p className="text-xs text-slate-400 text-center px-2">אין תמונה לדוגמא</p>
                        </div>
                      )}
                    </div>

                    {/* User Photo */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
                        <Camera className="w-3 h-3" />
                        התמונה שלך
                      </div>
                      {photoUrl ? (
                        <div className="rounded-xl overflow-hidden border-2 border-emerald-200 bg-emerald-50">
                          <img 
                            src={photoUrl} 
                            alt="תמונה שהועלתה" 
                            className="w-full h-40 object-cover"
                          />
                          <button 
                            onClick={() => {
                              setPhotoUrl(null);
                              if (fileInputRef.current) fileInputRef.current.value = "";
                            }}
                            className="w-full text-xs text-emerald-700 p-2 text-center font-medium hover:bg-emerald-100 transition-colors"
                          >
                            לחץ לצילום מחדש
                          </button>
                        </div>
                      ) : (
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="h-40 bg-slate-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-emerald-300 cursor-pointer hover:bg-emerald-50 hover:border-emerald-400 transition-colors"
                        >
                          {uploading ? (
                            <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <>
                              <Camera className="w-8 h-8 text-emerald-400 mb-2" />
                              <p className="text-xs text-emerald-600 text-center font-medium">לחץ לצילום</p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Additional Example Photos */}
                  {examples.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-xs text-slate-500 font-medium">תמונות נוספות לדוגמא:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {examples.slice(1).map((example) => (
                          <div key={example.id} className="rounded-lg overflow-hidden border border-slate-200">
                            <img 
                              src={example.image_url} 
                              alt={example.description} 
                              className="w-full h-20 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Camera Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handleCameraCapture}
                    className="hidden"
                  />

                  {/* Capture Button - Only show if no photo yet */}
                  {!photoUrl && (
                    <Button 
                      className="w-full h-12 bg-gradient-to-r from-emerald-500 to-emerald-600"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Camera className="w-5 h-5 ml-2" />
                          פתח מצלמה וצלם
                        </>
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Submit Button */}
              <Button 
                onClick={handleSubmit} 
                disabled={!photoUrl || isSubmitting}
                className="w-full h-14 bg-gradient-to-r from-primary to-accent text-lg font-bold"
              >
                {isSubmitting ? (
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 ml-2" />
                    שמור מסדר
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Step: Completed */}
          {currentStep === "completed" && (
            <div className="space-y-4">
              <Card className="border-emerald-200 shadow-lg bg-gradient-to-br from-emerald-50 to-white">
                <CardContent className="p-6 text-center">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-10 h-10 text-emerald-600" />
                  </div>
                  <h2 className="text-xl font-bold text-emerald-800 mb-2">המסדר הושלם בהצלחה!</h2>
                  <div className="flex items-center justify-center gap-2 text-emerald-600 mb-4">
                    <Badge className="bg-emerald-100 text-emerald-700">{myArea?.outpost}</Badge>
                    <span>•</span>
                    <span>{myArea?.area_name}</span>
                    <span>•</span>
                    <span>{DAY_OPTIONS.find(d => d.value === selectedDay)?.label}</span>
                  </div>
                  {photoUrl && (
                    <img src={photoUrl} alt="תמונה שהועלתה" className="w-full h-48 object-cover rounded-xl mb-4" />
                  )}
                  <Button 
                    onClick={goToStart}
                    variant="outline"
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    חזור לרשימת המשימות
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
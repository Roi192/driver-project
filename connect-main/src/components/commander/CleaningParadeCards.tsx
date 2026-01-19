import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { OUTPOSTS } from "@/lib/constants";
import { CheckCircle, XCircle, Sparkles, ChevronLeft, ImageIcon, History, Clock, User, MapPin, Camera, Calendar } from "lucide-react";
import { format, startOfWeek, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface CleaningAssignment {
  id: string;
  soldier_id: string;
  area_id: string;
  parade_date: string;
  day_of_week: string;
  outpost: string;
  is_completed: boolean;
  photo_url: string | null;
  created_at: string;
  notes: string | null;
  soldiers?: {
    full_name: string;
    personal_number: string;
  };
  cleaning_responsibility_areas?: {
    area_name: string;
    description: string | null;
  };
}

interface CompletedParade {
  outpost: string;
  day_of_week: string;
  area_name: string;
  soldier_name: string;
  photo_url: string | null;
  created_at: string;
  parade_date: string;
}

const DAY_OPTIONS = [
  { value: "monday", label: "יום שני", deadline: "12:00" },
  { value: "wednesday", label: "יום רביעי", deadline: "11:00" },
  { value: "saturday_night", label: "מוצאי שבת", deadline: "22:00" },
];

export function CleaningParadeCards() {
  const [completedParades, setCompletedParades] = useState<CompletedParade[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<CompletedParade | null>(null);
  const [showAllParades, setShowAllParades] = useState(false);
  const [loading, setLoading] = useState(true);

  const currentWeekStart = format(startOfWeek(new Date(), { weekStartsOn: 0 }), 'yyyy-MM-dd');

  useEffect(() => {
    fetchCompletedParades();
  }, []);

  const fetchCompletedParades = async () => {
    setLoading(true);
    try {
      // Fetch completed assignments for this week with soldier and area info
      const { data, error } = await supabase
        .from("cleaning_parade_assignments")
        .select(`
          *,
          soldiers(full_name, personal_number),
          cleaning_responsibility_areas(area_name, description)
        `)
        .eq("is_completed", true)
        .gte("parade_date", currentWeekStart)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching assignments:", error);
        return;
      }

      const parades: CompletedParade[] = (data || []).map((a: CleaningAssignment) => ({
        outpost: a.outpost,
        day_of_week: a.day_of_week,
        area_name: a.cleaning_responsibility_areas?.area_name || "לא ידוע",
        soldier_name: a.soldiers?.full_name || "לא ידוע",
        photo_url: a.photo_url,
        created_at: a.created_at,
        parade_date: a.parade_date,
      }));

      setCompletedParades(parades);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getParadesForDay = (day: string) => {
    return completedParades.filter(p => p.day_of_week === day);
  };

  const getParadesForOutpost = (outpost: string, day: string) => {
    return completedParades.filter(p => p.outpost === outpost && p.day_of_week === day);
  };

  const getDayStats = (day: string) => {
    const dayParades = getParadesForDay(day);
    const uniqueOutposts = [...new Set(dayParades.map(p => p.outpost))];
    return {
      completed: uniqueOutposts.length,
      total: OUTPOSTS.length,
      parades: dayParades.length,
    };
  };

  const getDayInfo = (dayValue: string) => {
    return DAY_OPTIONS.find(d => d.value === dayValue);
  };

  // Get recent parades for quick view
  const recentParades = completedParades.slice(0, 6);

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-800">מסדרי ניקיון</h2>
            <p className="text-sm text-slate-500">סטטוס ביצוע שבועי</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowAllParades(true)} className="text-primary">
          <History className="w-4 h-4 ml-1" />
          הכל
        </Button>
      </div>

      {/* Day Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {DAY_OPTIONS.map(day => {
          const stats = getDayStats(day.value);
          const percentage = Math.round((stats.completed / stats.total) * 100);
          const isComplete = stats.completed === stats.total;
          
          return (
            <Card
              key={day.value}
              className={cn(
                "cursor-pointer transition-all duration-300 hover:scale-[1.02]",
                isComplete ? "bg-emerald-50 border-emerald-200" : "bg-white border-slate-200"
              )}
              onClick={() => setSelectedDay(day.value)}
            >
              <CardContent className="p-3 text-center">
                <div className={cn(
                  "text-2xl font-black mb-1",
                  isComplete ? "text-emerald-600" : "text-slate-600"
                )}>
                  {stats.completed}/{stats.total}
                </div>
                <p className="text-xs font-bold text-slate-600">{day.label}</p>
                <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", isComplete ? "bg-emerald-500" : "bg-primary")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Parades Quick View */}
      {recentParades.length > 0 && (
        <Card className="border-slate-200/60 shadow-sm">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-primary" />
              מסדרים אחרונים
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 pt-0">
            <div className="space-y-2">
              {recentParades.slice(0, 4).map((parade, idx) => (
                <div 
                  key={idx}
                  onClick={() => parade.photo_url && setSelectedPhoto(parade)}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-xl border transition-all",
                    parade.photo_url 
                      ? "bg-white border-slate-200 cursor-pointer hover:border-primary/30 hover:shadow-sm" 
                      : "bg-slate-50 border-slate-100"
                  )}
                >
                  {/* Photo Thumbnail */}
                  <div className="flex-shrink-0">
                    {parade.photo_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200">
                        <img 
                          src={parade.photo_url} 
                          alt="מסדר" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center">
                        <Camera className="w-5 h-5 text-slate-400" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="secondary" className="text-xs bg-primary/10 text-primary px-1.5 py-0">
                        {parade.outpost}
                      </Badge>
                      <span className="text-xs text-slate-400">
                        {getDayInfo(parade.day_of_week)?.label}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 truncate">{parade.area_name}</p>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      {parade.soldier_name}
                    </div>
                  </div>

                  {/* Time */}
                  <div className="flex-shrink-0 text-left">
                    <p className="text-xs text-slate-400">
                      {format(parseISO(parade.created_at), "HH:mm")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 bg-white">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Calendar className="w-5 h-5 text-primary" />
              מסדרי {getDayInfo(selectedDay || "")?.label}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-3">
              {OUTPOSTS.map(outpost => {
                const outpostParades = selectedDay ? getParadesForOutpost(outpost, selectedDay) : [];
                const isCompleted = outpostParades.length > 0;
                
                return (
                  <div
                    key={outpost}
                    className={cn(
                      "rounded-xl border overflow-hidden",
                      isCompleted ? "bg-white border-emerald-200" : "bg-red-50/50 border-red-200"
                    )}
                  >
                    {/* Outpost Header */}
                    <div className={cn(
                      "p-3 flex items-center gap-3",
                      isCompleted ? "bg-emerald-50" : "bg-red-50"
                    )}>
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500" />
                      )}
                      <div className="flex-1">
                        <p className="font-bold text-slate-800">{outpost}</p>
                        <p className="text-xs text-slate-500">
                          {isCompleted ? `${outpostParades.length} תחומי אחריות בוצעו` : "טרם בוצע"}
                        </p>
                      </div>
                    </div>

                    {/* Parades List */}
                    {outpostParades.length > 0 && (
                      <div className="divide-y divide-slate-100">
                        {outpostParades.map((parade, idx) => (
                          <div 
                            key={idx}
                            onClick={() => parade.photo_url && setSelectedPhoto(parade)}
                            className={cn(
                              "p-3 flex items-center gap-3",
                              parade.photo_url && "cursor-pointer hover:bg-slate-50"
                            )}
                          >
                            {/* Photo */}
                            {parade.photo_url ? (
                              <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                                <img 
                                  src={parade.photo_url} 
                                  alt="מסדר" 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                                <Camera className="w-6 h-6 text-slate-400" />
                              </div>
                            )}

                            {/* Details */}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800">{parade.area_name}</p>
                              <div className="flex items-center gap-1 text-sm text-slate-500">
                                <User className="w-3.5 h-3.5" />
                                {parade.soldier_name}
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                {format(parseISO(parade.created_at), "dd/MM HH:mm")}
                              </p>
                            </div>

                            {parade.photo_url && (
                              <ChevronLeft className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Photo Detail Dialog */}
      <Dialog open={!!selectedPhoto} onOpenChange={() => setSelectedPhoto(null)}>
        <DialogContent className="max-w-lg p-0 bg-white overflow-hidden">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <ImageIcon className="w-5 h-5 text-primary" />
              תמונת מסדר
            </DialogTitle>
          </DialogHeader>
          
          {selectedPhoto && (
            <div className="space-y-0">
              {/* Info Bar */}
              <div className="p-4 bg-slate-50 border-b border-slate-100">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">מוצב</p>
                    <p className="font-bold text-slate-800">{selectedPhoto.outpost}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">תחום אחריות</p>
                    <p className="font-bold text-slate-800">{selectedPhoto.area_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">ביצע</p>
                    <p className="font-bold text-slate-800">{selectedPhoto.soldier_name}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">תאריך ושעה</p>
                    <p className="font-bold text-slate-800">
                      {format(parseISO(selectedPhoto.created_at), "dd/MM/yyyy HH:mm", { locale: he })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Photo */}
              {selectedPhoto.photo_url && (
                <a 
                  href={selectedPhoto.photo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img 
                    src={selectedPhoto.photo_url} 
                    alt="תמונת מסדר" 
                    className="w-full max-h-[50vh] object-contain bg-slate-900"
                  />
                </a>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* All Parades Dialog */}
      <Dialog open={showAllParades} onOpenChange={setShowAllParades}>
        <DialogContent className="max-w-lg max-h-[85vh] p-0 bg-white">
          <DialogHeader className="p-4 pb-2 border-b border-slate-100">
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <History className="w-5 h-5 text-primary" />
              כל המסדרים השבוע
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4 space-y-2">
              {completedParades.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  אין מסדרים שבוצעו השבוע
                </div>
              ) : (
                completedParades.map((parade, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      if (parade.photo_url) {
                        setSelectedPhoto(parade);
                        setShowAllParades(false);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-xl border transition-all",
                      parade.photo_url 
                        ? "bg-white border-slate-200 cursor-pointer hover:border-primary/30 hover:shadow-sm" 
                        : "bg-slate-50 border-slate-100"
                    )}
                  >
                    {/* Photo */}
                    {parade.photo_url ? (
                      <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 flex-shrink-0">
                        <img 
                          src={parade.photo_url} 
                          alt="מסדר" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                        <Camera className="w-6 h-6 text-slate-400" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="secondary" className="text-xs bg-primary/10 text-primary">
                          {parade.outpost}
                        </Badge>
                        <span className="text-xs text-slate-400">
                          {getDayInfo(parade.day_of_week)?.label}
                        </span>
                      </div>
                      <p className="font-medium text-slate-800 truncate">{parade.area_name}</p>
                      <div className="flex items-center gap-1 text-sm text-slate-500">
                        <User className="w-3.5 h-3.5" />
                        {parade.soldier_name}
                      </div>
                    </div>

                    {/* Time */}
                    <div className="flex-shrink-0 text-left">
                      <p className="text-sm font-medium text-slate-700">
                        {format(parseISO(parade.parade_date), "dd/MM")}
                      </p>
                      <p className="text-xs text-slate-400">
                        {format(parseISO(parade.created_at), "HH:mm")}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { OUTPOSTS } from "@/lib/constants";
import { CheckCircle, XCircle, Sparkles, ChevronLeft, ImageIcon, History, Clock } from "lucide-react";
import { format, startOfWeek, addDays, isAfter, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface CleaningParade {
  id: string;
  outpost: string;
  day_of_week: string;
  responsible_driver: string;
  parade_date: string;
  parade_time: string;
  photos: string[];
  created_at: string;
}

const DAY_OPTIONS = [
  { value: "monday", label: "יום שני", deadline: "12:00" },
  { value: "wednesday", label: "יום רביעי", deadline: "11:00" },
  { value: "saturday_night", label: "מוצאי שבת", deadline: "22:00" },
];

export function CleaningParadeCards() {
  const [parades, setParades] = useState<CleaningParade[]>([]);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedOutpost, setSelectedOutpost] = useState<string | null>(null);
  const [selectedParade, setSelectedParade] = useState<CleaningParade | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [historyParades, setHistoryParades] = useState<CleaningParade[]>([]);

  // Get the start of the current week (Sunday)
  const getWeekStart = () => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    // If it's Tuesday or later, count from last Tuesday (reset day)
    const isTuesday = dayOfWeek === 2;
    const resetDay = isTuesday ? today : startOfWeek(today, { weekStartsOn: 2 });
    return resetDay;
  };

  useEffect(() => {
    fetchParades();
  }, []);

  const fetchParades = async () => {
    const weekStart = getWeekStart();
    const weekStartStr = format(weekStart, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("cleaning_parades")
      .select("*")
      .gte("parade_date", weekStartStr)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching parades:", error);
      return;
    }

    setParades(data || []);
  };

  const fetchHistory = async () => {
    const { data, error } = await supabase
      .from("cleaning_parades")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      console.error("Error fetching history:", error);
      return;
    }

    setHistoryParades(data || []);
    setShowHistory(true);
  };

  const getParadesForDay = (day: string) => {
    return parades.filter(p => p.day_of_week === day);
  };

  const getOutpostStatus = (day: string, outpost: string) => {
    return parades.find(p => p.day_of_week === day && p.outpost === outpost);
  };

  const getDayStats = (day: string) => {
    const dayParades = getParadesForDay(day);
    const completedOutposts = [...new Set(dayParades.map(p => p.outpost))];
    return {
      completed: completedOutposts.length,
      total: OUTPOSTS.length,
    };
  };

  const getDayInfo = (dayValue: string) => {
    return DAY_OPTIONS.find(d => d.value === dayValue);
  };

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
        <Button variant="ghost" size="sm" onClick={fetchHistory} className="text-primary">
          <History className="w-4 h-4 ml-1" />
          היסטוריה
        </Button>
      </div>

      {/* Day Cards */}
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
                isComplete ? "bg-green-50 border-green-200" : "bg-white border-slate-200"
              )}
              onClick={() => setSelectedDay(day.value)}
            >
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black mb-1" style={{ color: isComplete ? '#22c55e' : '#64748b' }}>
                  {stats.completed}/{stats.total}
                </div>
                <p className="text-sm font-bold text-slate-600">{day.label}</p>
                <p className="text-xs text-slate-400">עד {day.deadline}</p>
                <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className={cn("h-full transition-all", isComplete ? "bg-green-500" : "bg-primary")}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Day Detail Dialog */}
      <Dialog open={!!selectedDay && !selectedOutpost} onOpenChange={() => setSelectedDay(null)}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Sparkles className="w-5 h-5 text-primary" />
              מסדרי {getDayInfo(selectedDay || "")?.label}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2">
            {OUTPOSTS.map(outpost => {
              const parade = selectedDay ? getOutpostStatus(selectedDay, outpost) : null;
              const isCompleted = !!parade;
              
              return (
                <div
                  key={outpost}
                  onClick={() => parade && setSelectedParade(parade)}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between transition-all",
                    isCompleted 
                      ? "bg-green-50 border-green-200 cursor-pointer hover:bg-green-100" 
                      : "bg-red-50 border-red-200"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-500" />
                    )}
                    <div>
                      <p className="font-bold text-slate-800">{outpost}</p>
                      {parade && (
                        <p className="text-xs text-slate-500">
                          {parade.responsible_driver} • {format(parseISO(parade.created_at), "HH:mm")}
                        </p>
                      )}
                    </div>
                  </div>
                  {isCompleted && (
                    <ChevronLeft className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Parade Detail Dialog (Photos) */}
      <Dialog open={!!selectedParade} onOpenChange={() => setSelectedParade(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <ImageIcon className="w-5 h-5 text-primary" />
              תמונות מסדר - {selectedParade?.outpost}
            </DialogTitle>
          </DialogHeader>
          
          {selectedParade && (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-700"><strong className="text-slate-900">אחראי:</strong> {selectedParade.responsible_driver}</p>
                <p className="text-sm text-slate-700"><strong className="text-slate-900">תאריך:</strong> {format(parseISO(selectedParade.parade_date), "dd/MM/yyyy", { locale: he })}</p>
                <p className="text-sm text-slate-700"><strong className="text-slate-900">שעה:</strong> {selectedParade.parade_time}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                {selectedParade.photos.map((photo, index) => (
                  <a
                    key={index}
                    href={photo}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aspect-square rounded-xl overflow-hidden border border-slate-200 hover:border-primary transition-colors"
                  >
                    <img src={photo} alt={`תמונה ${index + 1}`} className="w-full h-full object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto bg-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <History className="w-5 h-5 text-primary" />
              היסטוריית מסדרים
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-2">
            {historyParades.map(parade => (
              <div
                key={parade.id}
                onClick={() => {
                  setSelectedParade(parade);
                  setShowHistory(false);
                }}
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800">{parade.outpost}</p>
                    <p className="text-sm text-slate-500">
                      {getDayInfo(parade.day_of_week)?.label} • {parade.responsible_driver}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-slate-700">{format(parseISO(parade.parade_date), "dd/MM/yyyy")}</p>
                    <p className="text-xs text-slate-400">{parade.parade_time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
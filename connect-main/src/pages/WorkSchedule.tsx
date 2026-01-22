import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, startOfWeek, addDays, addWeeks, subWeeks } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Calendar, 
  ChevronRight, 
  ChevronLeft, 
  Save, 
  Clock, 
  Sun, 
  Sunset, 
  Moon,
  Users,
  MapPin,
  Phone,
  MessageSquare,
  Loader2,
  ArrowRight,
  Bell
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";

interface Soldier {
  id: string;
  personal_number: string;
  full_name: string;
  outpost: string | null;
  phone: string | null;
  is_active: boolean;
}

interface WorkScheduleEntry {
  id?: string;
  outpost: string;
  day_of_week: number;
  week_start_date: string;
  morning_soldier_id: string | null;
  afternoon_soldier_id: string | null;
  evening_soldier_id: string | null;
}

const OUTPOSTS = [
  "כוכב יעקב",
  "רמה",
  "ענתות",
  "בית אל",
  "עפרה",
  'מבו"ש',
  "עטרת",
  "חורש יערון",
  "נווה יאיר",
  "רנטיס",
  "מכבים",
  "חשמונאים"
];

const DAYS = [
  { value: 0, label: "ראשון" },
  { value: 1, label: "שני" },
  { value: 2, label: "שלישי" },
  { value: 3, label: "רביעי" },
  { value: 4, label: "חמישי" },
  { value: 5, label: "שישי" },
  { value: 6, label: "שבת" }
];

const SHIFTS = [
  { key: "morning", label: "בוקר", time: "06:00", icon: Sun, color: "bg-amber-500" },
  { key: "afternoon", label: "צהריים", time: "14:00", icon: Sunset, color: "bg-orange-500" },
  { key: "evening", label: "ערב", time: "22:00", icon: Moon, color: "bg-indigo-500" }
];

export default function WorkSchedule() {
  const navigate = useNavigate();
  const { role, loading: authLoading } = useAuth();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [schedule, setSchedule] = useState<Record<string, WorkScheduleEntry>>({});
  const [selectedOutpost, setSelectedOutpost] = useState<string>(OUTPOSTS[0]);
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [sendingSms, setSendingSms] = useState<string | null>(null);

  const canEdit = role === 'admin' || role === 'platoon_commander';
  const canView = canEdit || role === 'battalion_admin';

  useEffect(() => {
    if (!authLoading && !canView) {
      navigate('/');
    }
  }, [authLoading, canView, navigate]);

  useEffect(() => {
    fetchSoldiers();
  }, []);

  useEffect(() => {
    if (selectedOutpost && weekStart) {
      fetchSchedule();
    }
  }, [selectedOutpost, weekStart]);

  const fetchSoldiers = async () => {
    const { data, error } = await supabase
      .from('soldiers')
      .select('id, personal_number, full_name, outpost, phone, is_active')
      .eq('is_active', true)
      .order('full_name');
    
    if (error) {
      console.error('Error fetching soldiers:', error);
      toast.error('שגיאה בטעינת רשימת החיילים');
      return;
    }
    
    setSoldiers(data || []);
  };

  const fetchSchedule = async () => {
    setLoading(true);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    const { data, error } = await supabase
      .from('work_schedule')
      .select('*')
      .eq('outpost', selectedOutpost)
      .eq('week_start_date', weekStartStr);
    
    if (error) {
      console.error('Error fetching schedule:', error);
      toast.error('שגיאה בטעינת סידור העבודה');
      setLoading(false);
      return;
    }
    
    const scheduleMap: Record<string, WorkScheduleEntry> = {};
    DAYS.forEach(day => {
      const existing = data?.find(s => s.day_of_week === day.value);
      const key = `${selectedOutpost}-${day.value}`;
      scheduleMap[key] = existing || {
        outpost: selectedOutpost,
        day_of_week: day.value,
        week_start_date: weekStartStr,
        morning_soldier_id: null,
        afternoon_soldier_id: null,
        evening_soldier_id: null
      };
    });
    
    setSchedule(scheduleMap);
    setHasChanges(false);
    setLoading(false);
  };

  const updateScheduleEntry = (dayOfWeek: number, shift: string, soldierId: string | null) => {
    const key = `${selectedOutpost}-${dayOfWeek}`;
    setSchedule(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [`${shift}_soldier_id`]: soldierId === "none" ? null : soldierId
      }
    }));
    setHasChanges(true);
  };

  const saveSchedule = async () => {
    setSaving(true);
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    
    // Include ALL entries - even those with all null values (to allow clearing assignments)
    const entries = Object.values(schedule);

    try {
      for (const entry of entries) {
        const { id, ...data } = entry;
        
        if (id) {
          // Existing record - update it (even if all values are null)
          const { error } = await supabase
            .from('work_schedule')
            .update({
              morning_soldier_id: data.morning_soldier_id,
              afternoon_soldier_id: data.afternoon_soldier_id,
              evening_soldier_id: data.evening_soldier_id
            })
            .eq('id', id);
          
          if (error) throw error;
        } else if (data.morning_soldier_id || data.afternoon_soldier_id || data.evening_soldier_id) {
          // Only insert new records if they have at least one assignment
          const { error } = await supabase
            .from('work_schedule')
            .upsert({
              outpost: data.outpost,
              day_of_week: data.day_of_week,
              week_start_date: data.week_start_date,
              morning_soldier_id: data.morning_soldier_id,
              afternoon_soldier_id: data.afternoon_soldier_id,
              evening_soldier_id: data.evening_soldier_id
            }, {
              onConflict: 'outpost,day_of_week,week_start_date'
            });
          
          if (error) throw error;
        }
      }
      
      toast.success('סידור העבודה נשמר בהצלחה');
      setHasChanges(false);
      fetchSchedule();
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast.error('שגיאה בשמירת סידור העבודה');
    } finally {
      setSaving(false);
    }
  };

  const getSoldierById = (id: string | null) => {
    if (!id) return null;
    return soldiers.find(s => s.id === id);
  };

  const getWeekLabel = () => {
    const end = addDays(weekStart, 6);
    return `${format(weekStart, 'd.M', { locale: he })} - ${format(end, 'd.M.yyyy', { locale: he })}`;
  };

  const sendTestNotification = async (soldierId: string, soldierName: string, outpost: string, shiftLabel: string) => {
    setSendingSms(soldierId);
    try {
      const { data, error } = await supabase.functions.invoke('send-push-notification', {
        body: { 
          testMode: true,
          soldierId,
          soldierName,
          outpost,
          shiftType: shiftLabel
        }
      });

      if (error) throw error;
      
      if (data?.error) {
        toast.error(data.error);
      } else {
        toast.success(`התראה נשלחה ל${soldierName}`);
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error('שגיאה בשליחת התראה');
    } finally {
      setSendingSms(null);
    }
  };

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shadow-lg">
            <Calendar className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-foreground">סידור עבודה</h1>
            <p className="text-sm text-muted-foreground">ניהול משמרות לפי מוצבים</p>
          </div>
        </div>

        {/* Week Navigation */}
        <Card className="border-border/50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(prev => addWeeks(prev, 1))}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <div className="text-center">
                <p className="text-sm text-muted-foreground">שבוע</p>
                <p className="font-bold text-lg">{getWeekLabel()}</p>
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekStart(prev => subWeeks(prev, 1))}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Outpost Selection */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              בחר מוצב
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedOutpost} onValueChange={setSelectedOutpost}>
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {OUTPOSTS.map(outpost => (
                  <TabsTrigger
                    key={outpost}
                    value={outpost}
                    className="text-xs px-2 py-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                  >
                    {outpost}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Schedule Grid */}
        <div className="space-y-3">
          {DAYS.map(day => {
            const key = `${selectedOutpost}-${day.value}`;
            const entry = schedule[key];
            const dayDate = addDays(weekStart, day.value);
            
            return (
              <Card key={day.value} className="border-border/50 overflow-hidden">
                <CardHeader className="pb-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold">
                      יום {day.label}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {format(dayDate, 'd.M', { locale: he })}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-3">
                  {SHIFTS.map(shift => {
                    const Icon = shift.icon;
                    const soldierIdKey = `${shift.key}_soldier_id` as keyof WorkScheduleEntry;
                    const selectedSoldierId = entry?.[soldierIdKey] as string | null;
                    const selectedSoldier = getSoldierById(selectedSoldierId);
                    
                    return (
                      <div key={shift.key} className="flex items-center gap-3 p-2 rounded-lg bg-muted/20">
                        <div className={`w-10 h-10 rounded-lg ${shift.color} flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{shift.label}</span>
                            <Badge variant="secondary" className="text-xs">
                              <Clock className="w-3 h-3 ml-1" />
                              {shift.time}
                            </Badge>
                          </div>
                          
                          {canEdit ? (
                            <Select
                              value={selectedSoldierId || "none"}
                              onValueChange={(value) => updateScheduleEntry(day.value, shift.key, value)}
                            >
                              <SelectTrigger className="h-9">
                                <SelectValue placeholder="בחר חייל" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">ללא שיבוץ</SelectItem>
                                {soldiers.map(soldier => (
                                  <SelectItem key={soldier.id} value={soldier.id}>
                                    <div className="flex items-center gap-2">
                                      <span>{soldier.full_name}</span>
                                      {soldier.phone && (
                                        <Phone className="w-3 h-3 text-success" />
                                      )}
                                      {!soldier.phone && (
                                        <span className="text-xs text-muted-foreground">(ללא טלפון)</span>
                                      )}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <div className="text-sm">
                              {selectedSoldier ? (
                                <div className="flex items-center gap-2">
                                  <Users className="w-4 h-4 text-muted-foreground" />
                                  <span>{selectedSoldier.full_name}</span>
                                  {selectedSoldier.phone && (
                                    <Badge variant="outline" className="text-xs">
                                      <Phone className="w-3 h-3 ml-1" />
                                      {selectedSoldier.phone}
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">לא משובץ</span>
                              )}
                            </div>
                          )}
                          
                          {/* Send Test Notification Button */}
                          {canEdit && selectedSoldierId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2 text-primary hover:bg-primary/10"
                              onClick={() => sendTestNotification(selectedSoldierId, selectedSoldier?.full_name || '', selectedOutpost, shift.label)}
                              disabled={sendingSms === selectedSoldierId}
                            >
                              {sendingSms === selectedSoldierId ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Bell className="w-4 h-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Save Button */}
        {canEdit && hasChanges && (
          <div className="fixed bottom-20 left-4 right-4 z-50">
            <Button
              onClick={saveSchedule}
              disabled={saving}
              className="w-full h-12 bg-gradient-to-r from-primary to-teal-600 text-primary-foreground font-bold shadow-lg"
            >
              {saving ? (
                <Loader2 className="w-5 h-5 animate-spin ml-2" />
              ) : (
                <Save className="w-5 h-5 ml-2" />
              )}
              שמור סידור עבודה
            </Button>
          </div>
        )}

        {/* Push Notifications Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bell className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-bold text-foreground mb-1">התראות Push אוטומטיות</h3>
                <p className="text-sm text-muted-foreground">
                  המערכת שולחת התראה לחייל 15 דקות לפני תחילת המשמרת.
                  החיילים צריכים להפעיל התראות באפליקציה דרך העמוד הראשי.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 לחץ על כפתור הפעמון ליד חייל כדי לשלוח התראת בדיקה
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
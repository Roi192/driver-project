import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, addMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday, isSameDay, differenceInDays } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Bell, 
  Users, 
  Loader2,
  Edit,
  Trash2,
  Clock,
  AlertTriangle
} from "lucide-react";
import unitLogo from "@/assets/unit-logo.png";

interface WorkPlanEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  end_date: string | null;
  attendees: string[];
  status: "pending" | "in_progress" | "completed";
  color: string | null;
  created_at: string;
}

const statusColors = {
  pending: "bg-amber-500",
  in_progress: "bg-blue-500",
  completed: "bg-emerald-500",
};

const statusLabels = {
  pending: "ממתין",
  in_progress: "בתהליך",
  completed: "בוצע",
};

const colorOptions = [
  { value: "blue", label: "כחול", class: "bg-blue-500" },
  { value: "emerald", label: "ירוק", class: "bg-emerald-500" },
  { value: "amber", label: "כתום", class: "bg-amber-500" },
  { value: "red", label: "אדום", class: "bg-red-500" },
  { value: "purple", label: "סגול", class: "bg-purple-500" },
  { value: "pink", label: "ורוד", class: "bg-pink-500" },
];

export default function AnnualWorkPlan() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<WorkPlanEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<WorkPlanEvent | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<WorkPlanEvent | null>(null);

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    event_date: string;
    end_date: string;
    attendees: string;
    status: "pending" | "in_progress" | "completed";
    color: string;
  }>({
    title: "",
    description: "",
    event_date: "",
    end_date: "",
    attendees: "",
    status: "pending",
    color: "blue",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("work_plan_events")
      .select("*")
      .order("event_date", { ascending: true });

    if (error) {
      console.error("Error fetching events:", error);
      toast.error("שגיאה בטעינת המופעים");
    } else {
      setEvents((data || []) as WorkPlanEvent[]);
    }
    setLoading(false);
  };

  const getUpcomingReminders = () => {
    const today = new Date();
    const oneMonthAhead = addMonths(today, 1);
    const twoMonthsAhead = addMonths(today, 2);

    return events.filter(event => {
      const eventDate = new Date(event.event_date);
      const daysUntil = differenceInDays(eventDate, today);
      return daysUntil > 0 && daysUntil <= 60 && event.status !== "completed";
    }).map(event => {
      const daysUntil = differenceInDays(new Date(event.event_date), today);
      return { ...event, daysUntil };
    }).sort((a, b) => a.daysUntil - b.daysUntil);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.event_date) {
      toast.error("יש למלא כותרת ותאריך");
      return;
    }

    const attendeesArray = formData.attendees
      .split(",")
      .map(a => a.trim())
      .filter(a => a);

    const eventData = {
      title: formData.title,
      description: formData.description || null,
      event_date: formData.event_date,
      end_date: formData.end_date || null,
      attendees: attendeesArray,
      status: formData.status,
      color: formData.color,
    };

    if (editingEvent) {
      const { error } = await supabase
        .from("work_plan_events")
        .update(eventData)
        .eq("id", editingEvent.id);

      if (error) {
        toast.error("שגיאה בעדכון המופע");
      } else {
        toast.success("המופע עודכן בהצלחה");
        fetchEvents();
      }
    } else {
      const { error } = await supabase
        .from("work_plan_events")
        .insert(eventData);

      if (error) {
        toast.error("שגיאה ביצירת המופע");
      } else {
        toast.success("המופע נוצר בהצלחה");
        fetchEvents();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("work_plan_events")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("שגיאה במחיקת המופע");
    } else {
      toast.success("המופע נמחק בהצלחה");
      fetchEvents();
      setDetailDialogOpen(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      event_date: "",
      end_date: "",
      attendees: "",
      status: "pending",
      color: "blue",
    });
    setEditingEvent(null);
  };

  const openEditDialog = (event: WorkPlanEvent) => {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      description: event.description || "",
      event_date: event.event_date,
      end_date: event.end_date || "",
      attendees: event.attendees.join(", "),
      status: event.status,
      color: event.color || "blue",
    });
    setDialogOpen(true);
    setDetailDialogOpen(false);
  };

  const getEventColor = (color: string | null) => {
    const colorMap: Record<string, string> = {
      blue: "bg-blue-500",
      emerald: "bg-emerald-500",
      amber: "bg-amber-500",
      red: "bg-red-500",
      purple: "bg-purple-500",
      pink: "bg-pink-500",
    };
    return colorMap[color || "blue"] || "bg-blue-500";
  };

  // Calendar rendering
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getEventsForDate = (date: Date) => {
    return events.filter(event => isSameDay(new Date(event.event_date), date));
  };

  const upcomingReminders = getUpcomingReminders();

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-white pb-24" dir="rtl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
          <div className="absolute top-4 left-4 opacity-20">
            <img src={unitLogo} alt="" className="w-20 h-20" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/30 mb-4">
              <CalendarIcon className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-gold">תוכנית עבודה שנתית</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">לוח שנה</h1>
            <p className="text-slate-400 text-sm">ניהול מופעים ואירועים</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Reminders Section */}
          {upcomingReminders.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-amber-50 to-orange-50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Bell className="w-5 h-5" />
                  תזכורות קרובות
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingReminders.slice(0, 3).map(event => (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-amber-200 cursor-pointer"
                    onClick={() => { setSelectedEvent(event); setDetailDialogOpen(true); }}
                  >
                    <div className={`w-2 h-10 rounded-full ${getEventColor(event.color)}`} />
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{event.title}</p>
                      <p className="text-sm text-slate-500">
                        {format(new Date(event.event_date), "dd/MM/yyyy", { locale: he })}
                      </p>
                    </div>
                    <Badge className="bg-amber-500 text-white">
                      {event.daysUntil <= 30 ? `${event.daysUntil} ימים` : `${Math.ceil(event.daysUntil / 30)} חודשים`}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Add Event Button */}
          <Button
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="w-full bg-gradient-to-r from-primary to-teal text-white py-6 rounded-2xl shadow-lg"
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף מופע חדש
          </Button>

          {/* Calendar */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl overflow-hidden">
            <CardHeader className="bg-gradient-to-l from-primary/10 to-teal/10 border-b border-slate-100">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, 1))}
                  className="rounded-xl"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <CardTitle className="text-slate-800">
                  {format(currentDate, "MMMM yyyy", { locale: he })}
                </CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setCurrentDate(addMonths(currentDate, -1))}
                  className="rounded-xl"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {/* Day Names */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {["א", "ב", "ג", "ד", "ה", "ו", "ש"].map(day => (
                  <div key={day} className="text-center text-sm font-bold text-slate-500 py-2">
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Empty cells for days before month starts */}
                {Array.from({ length: monthStart.getDay() }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square" />
                ))}

                {daysInMonth.map(day => {
                  const dayEvents = getEventsForDate(day);
                  const isCurrentDay = isToday(day);

                  return (
                    <div
                      key={day.toISOString()}
                      onClick={() => {
                        if (dayEvents.length === 1) {
                          setSelectedEvent(dayEvents[0]);
                          setDetailDialogOpen(true);
                        } else if (dayEvents.length > 1) {
                          setSelectedDate(day);
                        }
                      }}
                      className={`
                        aspect-square p-1 rounded-xl cursor-pointer transition-all duration-200
                        ${isCurrentDay ? "bg-primary/20 ring-2 ring-primary" : "hover:bg-slate-100"}
                        ${dayEvents.length > 0 ? "relative" : ""}
                      `}
                    >
                      <div className={`text-center text-sm ${isCurrentDay ? "font-bold text-primary" : "text-slate-700"}`}>
                        {format(day, "d")}
                      </div>
                      {dayEvents.length > 0 && (
                        <div className="flex justify-center gap-0.5 mt-0.5">
                          {dayEvents.slice(0, 3).map(event => (
                            <div
                              key={event.id}
                              className={`w-1.5 h-1.5 rounded-full ${getEventColor(event.color)} ${statusColors[event.status]}`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Events List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">כל המופעים</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-3">
                  {events.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <CalendarIcon className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין מופעים</p>
                    </div>
                  ) : (
                    events.map(event => (
                      <div
                        key={event.id}
                        onClick={() => { setSelectedEvent(event); setDetailDialogOpen(true); }}
                        className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-1.5 h-full min-h-[60px] rounded-full ${getEventColor(event.color)}`} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-bold text-slate-800">{event.title}</h4>
                              <Badge className={`${statusColors[event.status]} text-white text-xs`}>
                                {statusLabels[event.status]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <Clock className="w-3 h-3" />
                              {format(new Date(event.event_date), "dd/MM/yyyy", { locale: he })}
                            </div>
                            {event.attendees.length > 0 && (
                              <div className="flex items-center gap-2 text-sm text-slate-500 mt-1">
                                <Users className="w-3 h-3" />
                                {event.attendees.length} משתתפים
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Event Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingEvent ? "עריכת מופע" : "הוספת מופע חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>כותרת *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="שם המופע"
                />
              </div>

              <div>
                <Label>תיאור</Label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="תיאור המופע"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>תאריך התחלה *</Label>
                  <Input
                    type="date"
                    value={formData.event_date}
                    onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                  />
                </div>
                <div>
                  <Label>תאריך סיום</Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>משתתפים (מופרדים בפסיק)</Label>
                <Input
                  value={formData.attendees}
                  onChange={(e) => setFormData({ ...formData, attendees: e.target.value })}
                  placeholder="משה, יוסי, דני"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סטטוס</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(v) => setFormData({ ...formData, status: v as any })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">ממתין</SelectItem>
                      <SelectItem value="in_progress">בתהליך</SelectItem>
                      <SelectItem value="completed">בוצע</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>צבע</Label>
                  <Select
                    value={formData.color}
                    onValueChange={(v) => setFormData({ ...formData, color: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {colorOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${opt.class}`} />
                            {opt.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingEvent ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Event Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-md" dir="rtl">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-12 rounded-full ${getEventColor(selectedEvent.color)}`} />
                    <div>
                      <DialogTitle>{selectedEvent.title}</DialogTitle>
                      <Badge className={`${statusColors[selectedEvent.status]} text-white mt-1`}>
                        {statusLabels[selectedEvent.status]}
                      </Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="space-y-4 mt-4">
                  {selectedEvent.description && (
                    <p className="text-slate-600">{selectedEvent.description}</p>
                  )}

                  <div className="flex items-center gap-2 text-slate-600">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{format(new Date(selectedEvent.event_date), "dd/MM/yyyy", { locale: he })}</span>
                    {selectedEvent.end_date && (
                      <span>- {format(new Date(selectedEvent.end_date), "dd/MM/yyyy", { locale: he })}</span>
                    )}
                  </div>

                  {selectedEvent.attendees.length > 0 && (
                    <div>
                      <div className="flex items-center gap-2 text-slate-600 mb-2">
                        <Users className="w-4 h-4" />
                        <span>משתתפים:</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {selectedEvent.attendees.map((attendee, i) => (
                          <Badge key={i} variant="secondary">{attendee}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <DialogFooter className="mt-6 flex gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => handleDelete(selectedEvent.id)}
                  >
                    <Trash2 className="w-4 h-4 ml-1" />
                    מחק
                  </Button>
                  <Button onClick={() => openEditDialog(selectedEvent)}>
                    <Edit className="w-4 h-4 ml-1" />
                    ערוך
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
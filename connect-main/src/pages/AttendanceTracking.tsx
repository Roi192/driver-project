import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths, getYear, getMonth } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Users, 
  Loader2,
  FileSpreadsheet,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  User,
  ChevronLeft,
  AlertCircle,
  MinusCircle,
  HelpCircle,
  Filter,
  TrendingUp,
  Edit,
  Ban
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// 5 סטטוסים לנוכחות
type AttendanceStatus = "attended" | "absent" | "not_in_rotation" | "not_updated" | "not_qualified";

// סיבות היעדרות
type AbsenceReason = "קורס" | "גימלים" | "נעדר" | "נפקד";

const absenceReasonOptions: { value: AbsenceReason; label: string }[] = [
  { value: "קורס", label: "קורס" },
  { value: "גימלים", label: "גימלים" },
  { value: "נעדר", label: "נעדר (ללא סיבה מוצדקת)" },
  { value: "נפקד", label: "נפקד" },
];

const attendanceStatusLabels: Record<AttendanceStatus, string> = {
  attended: "נכח",
  absent: "נעדר",
  not_in_rotation: "לא בסבב",
  not_updated: "לא עודכן",
  not_qualified: "לא מוכשר",
};

const attendanceStatusColors: Record<AttendanceStatus, string> = {
  attended: "bg-emerald-500",
  absent: "bg-red-500",
  not_in_rotation: "bg-blue-500",
  not_updated: "bg-slate-400",
  not_qualified: "bg-gray-600",
};

const hebrewMonths = [
  "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
  "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"
];

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  created_at: string;
}

interface WorkPlanEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
  category: string | null;
  expected_soldiers: string[] | null;
}

interface EventAttendance {
  id: string;
  event_id: string;
  soldier_id: string;
  attended: boolean;
  absence_reason: string | null;
  status: string;
  completed: boolean;
  created_at: string;
}

interface MonthlyRecord {
  month: number;
  year: number;
  events: {
    event: WorkPlanEvent;
    status: AttendanceStatus;
    absenceReason: string | null;
    completed: boolean;
    completedAt?: string;
    isExpected: boolean;
  }[];
  attended: number;
  absent: number;
  notInRotation: number;
  notQualified: number;
}

export default function AttendanceTracking() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [events, setEvents] = useState<WorkPlanEvent[]>([]);
  const [attendance, setAttendance] = useState<EventAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSoldier, setSelectedSoldier] = useState<Soldier | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  
  // Filters
  const [yearFilter, setYearFilter] = useState<string>(new Date().getFullYear().toString());
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [eventFilter, setEventFilter] = useState<string>("all");
  
  // Chart state
  const [chartCategoryFilter, setChartCategoryFilter] = useState<string>("all");
  
  // Edit attendance state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ soldier: Soldier; event: WorkPlanEvent; status: AttendanceStatus; reason: string | null; completed: boolean; completedAt?: string } | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("attended");
  const [editReason, setEditReason] = useState<AbsenceReason | "">("");
  const [editCompleted, setEditCompleted] = useState(false);
  
  // Low attendance soldiers dialog
  const [lowAttendanceDialogOpen, setLowAttendanceDialogOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    const [soldiersRes, eventsRes, attendanceRes] = await Promise.all([
      supabase
        .from("soldiers")
        .select("*")
        .eq("is_active", true)
        .order("full_name"),
      supabase
        .from("work_plan_events")
        .select("*")
        .neq("category", "holiday")
        .order("event_date", { ascending: false }),
      supabase
        .from("event_attendance")
        .select("*")
    ]);

    if (!soldiersRes.error) setSoldiers(soldiersRes.data || []);
    if (!eventsRes.error) setEvents((eventsRes.data || []) as WorkPlanEvent[]);
    if (!attendanceRes.error) setAttendance(attendanceRes.data || []);

    setLoading(false);
  };

  // Get available years from events
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    events.forEach(e => years.add(getYear(parseISO(e.event_date))));
    return Array.from(years).sort((a, b) => b - a);
  }, [events]);

  // Get unique event titles for filter
  const uniqueEventTitles = useMemo(() => {
    const titles = new Set<string>();
    events.forEach(e => titles.add(e.title));
    return Array.from(titles).sort();
  }, [events]);

  // Check if soldier was qualified at a specific date
  const wasSoldierQualifiedAtDate = (soldier: Soldier, eventDate: string): boolean => {
    const soldierCreatedDate = parseISO(soldier.created_at);
    const eventDateParsed = parseISO(eventDate);
    return soldierCreatedDate <= eventDateParsed;
  };

  // Get soldier's status for an event
  const getSoldierEventStatus = (soldier: Soldier, event: WorkPlanEvent): { status: AttendanceStatus; reason: string | null; completed: boolean; completedAt?: string } => {
    // Check if soldier was qualified at event date
    if (!wasSoldierQualifiedAtDate(soldier, event.event_date)) {
      return { status: "not_qualified", reason: null, completed: false };
    }

    const att = attendance.find(a => a.event_id === event.id && a.soldier_id === soldier.id);
    if (att) {
      const completedAt = att.completed ? att.created_at : undefined;
      return { 
        status: att.status as AttendanceStatus, 
        reason: att.absence_reason, 
        completed: att.completed,
        completedAt
      };
    }
    
    // Check if expected
    const expectedSoldiers = event.expected_soldiers || [];
    const isExpected = expectedSoldiers.includes(soldier.id);
    return { 
      status: isExpected ? "not_updated" : "not_in_rotation", 
      reason: null, 
      completed: false 
    };
  };

  // Build monthly records for a soldier
  const getSoldierMonthlyRecords = (soldierId: string): MonthlyRecord[] => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return [];

    // Filter events by year
    let filteredEvents = events.filter(e => {
      const eventYear = getYear(parseISO(e.event_date));
      return eventYear.toString() === yearFilter && e.status === "completed";
    });

    // Filter by month if specified
    if (monthFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => {
        const eventMonth = getMonth(parseISO(e.event_date));
        return eventMonth === parseInt(monthFilter);
      });
    }

    // Filter by event title if specified
    if (eventFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => e.title === eventFilter);
    }

    // Group by month
    const monthlyMap = new Map<string, MonthlyRecord>();
    
    filteredEvents.forEach(event => {
      const date = parseISO(event.event_date);
      const month = getMonth(date);
      const year = getYear(date);
      const key = `${year}-${month}`;
      
      const { status, reason, completed, completedAt } = getSoldierEventStatus(soldier, event);
      const isExpected = (event.expected_soldiers || []).includes(soldierId);
      
      if (!monthlyMap.has(key)) {
        monthlyMap.set(key, {
          month,
          year,
          events: [],
          attended: 0,
          absent: 0,
          notInRotation: 0,
          notQualified: 0,
        });
      }
      
      const record = monthlyMap.get(key)!;
      
      // Skip "not_in_rotation" status - don't add to display
      if (status === "not_in_rotation") {
        record.notInRotation++;
        return;
      }
      
      record.events.push({
        event,
        status: completed ? "attended" : status,
        absenceReason: reason,
        completed,
        completedAt,
        isExpected,
      });
      
      if (completed || status === "attended") record.attended++;
      else if (status === "absent") record.absent++;
      else if (status === "not_qualified") record.notQualified++;
    });

    return Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  };

  // Calculate overall stats for a soldier
  const getSoldierStats = (soldierId: string) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return { attended: 0, absent: 0, notInRotation: 0, notQualified: 0, total: 0, percentage: 100 };

    let attended = 0;
    let absent = 0;
    let notInRotation = 0;
    let notQualified = 0;

    const completedEvents = events.filter(e => e.status === "completed");
    
    completedEvents.forEach(event => {
      const { status, completed } = getSoldierEventStatus(soldier, event);
      const isExpected = (event.expected_soldiers || []).includes(soldierId);
      
      // Only count if soldier was expected or has attendance record
      if (isExpected || status === "attended" || status === "absent") {
        if (completed || status === "attended") attended++;
        else if (status === "absent") absent++;
        else if (status === "not_qualified") notQualified++;
      } else if (status === "not_in_rotation") {
        notInRotation++;
      } else if (status === "not_qualified") {
        notQualified++;
      }
    });

    const relevantTotal = attended + absent;
    
    return {
      attended,
      absent,
      notInRotation,
      notQualified,
      total: relevantTotal,
      percentage: relevantTotal > 0 ? Math.round((attended / relevantTotal) * 100) : 100
    };
  };

  // Monthly trend calculation
  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(now) });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthEvents = events.filter(e => {
        const eventDate = parseISO(e.event_date);
        const inMonth = eventDate >= monthStart && eventDate <= monthEnd;
        const matchesCategory = chartCategoryFilter === "all" || e.category === chartCategoryFilter;
        return inMonth && matchesCategory && e.status === "completed";
      });
      
      let totalExpected = 0;
      let totalAttended = 0;
      
      monthEvents.forEach(event => {
        const expectedSoldiers = event.expected_soldiers || [];
        totalExpected += expectedSoldiers.length;
        
        expectedSoldiers.forEach(soldierId => {
          const att = attendance.find(a => a.event_id === event.id && a.soldier_id === soldierId);
          if (att?.status === "attended" || att?.completed) {
            totalAttended++;
          }
        });
      });
      
      const percentage = totalExpected > 0 ? Math.round((totalAttended / totalExpected) * 100) : 0;
      
      return {
        month: format(month, "MMM yy", { locale: he }),
        percentage,
        expected: totalExpected,
        attended: totalAttended,
      };
    });
  }, [events, attendance, chartCategoryFilter]);

  const exportToExcel = () => {
    const data: any[] = [];
    
    soldiers.forEach(soldier => {
      const monthlyRecords = getSoldierMonthlyRecords(soldier.id);
      monthlyRecords.forEach(record => {
        record.events.forEach(eventRecord => {
          data.push({
            "מספר אישי": soldier.personal_number,
            "שם מלא": soldier.full_name,
            "חודש": `${hebrewMonths[record.month]} ${record.year}`,
            "מופע": eventRecord.event.title,
            "תאריך": format(parseISO(eventRecord.event.event_date), "dd/MM/yyyy"),
            "סטטוס": eventRecord.completed ? "נכח בהשלמה" : attendanceStatusLabels[eventRecord.status],
            "היה מצופה": eventRecord.isExpected ? "כן" : "לא",
            "סיבת היעדרות": eventRecord.absenceReason || "-",
            "בוצעה השלמה": eventRecord.completed ? "כן" : "לא",
            "תאריך השלמה": eventRecord.completedAt ? format(parseISO(eventRecord.completedAt), "dd/MM/yyyy") : "-",
          });
        });
      });
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מעקב נוכחות");
    XLSX.writeFile(wb, `מעקב_נוכחות_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  const filteredSoldiers = soldiers.filter(s =>
    s.full_name.includes(searchTerm) ||
    s.personal_number.includes(searchTerm)
  );

  const getAttendanceColor = (percentage: number) => {
    if (percentage >= 80) return "bg-emerald-500";
    if (percentage >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  // KPI
  const lowAttendanceSoldiers = soldiers.filter(s => {
    const stats = getSoldierStats(s.id);
    return stats.total > 0 && stats.percentage < 50;
  });
  
  const avgAttendance = soldiers.length > 0 
    ? Math.round(soldiers.reduce((sum, s) => sum + getSoldierStats(s.id).percentage, 0) / soldiers.length)
    : 0;

  const openSoldierDetail = (soldier: Soldier) => {
    setSelectedSoldier(soldier);
    setDetailDialogOpen(true);
  };

  // Edit attendance
  const openEditDialog = (soldier: Soldier, event: WorkPlanEvent, status: AttendanceStatus, reason: string | null, completed: boolean, completedAt?: string) => {
    setEditingEvent({ soldier, event, status, reason, completed, completedAt });
    setEditStatus(completed ? "absent" : status);
    setEditReason((reason as AbsenceReason) || "");
    setEditCompleted(completed);
    setEditDialogOpen(true);
  };

  const saveEditedAttendance = async () => {
    if (!editingEvent) return;

    await supabase.from("event_attendance").delete()
      .eq("event_id", editingEvent.event.id)
      .eq("soldier_id", editingEvent.soldier.id);

    if (editStatus !== "not_updated" && editStatus !== "not_qualified") {
      const isAbsent = editStatus === "absent";
      const { error } = await supabase.from("event_attendance").insert({
        event_id: editingEvent.event.id,
        soldier_id: editingEvent.soldier.id,
        attended: editStatus === "attended" || (isAbsent && editCompleted),
        absence_reason: isAbsent ? editReason : null,
        status: editStatus,
        completed: isAbsent && editCompleted,
      });

      if (error) {
        toast.error("שגיאה בעדכון הנוכחות");
        return;
      }
    }

    toast.success("הנוכחות עודכנה בהצלחה");
    fetchData();
    setEditDialogOpen(false);
  };

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/20 border border-purple-500/30 mb-4">
              <Users className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-bold text-purple-400">מעקב נוכחות</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">שליטה ובקרה - נוכחות</h1>
            <p className="text-slate-400 text-sm">{events.filter(e => e.status === "completed").length} מופעים שהושלמו | {soldiers.length} חיילים</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Legend */}
          <Card className="border-0 bg-gradient-to-br from-slate-50 to-white">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-slate-700 mb-3">מקרא סטטוסים:</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500 text-white gap-1">
                    <CheckCircle className="w-3 h-3" />
                    נכח
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white gap-1">
                    <XCircle className="w-3 h-3" />
                    נעדר
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500 text-white gap-1">
                    <MinusCircle className="w-3 h-3" />
                    לא בסבב
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-400 text-white gap-1">
                    <HelpCircle className="w-3 h-3" />
                    לא עודכן
                  </Badge>
                </div>
                <div className="flex items-center gap-2 col-span-2">
                  <Badge className="bg-gray-600 text-white gap-1">
                    <Ban className="w-3 h-3" />
                    לא מוכשר
                  </Badge>
                  <span className="text-xs text-slate-500">(חייל שהתווסף אחרי המופע)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50">
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-emerald-600">{avgAttendance}%</p>
                <p className="text-sm text-slate-600">ממוצע נוכחות</p>
              </CardContent>
            </Card>
            <Card 
              className="border-0 bg-gradient-to-br from-red-50 to-orange-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setLowAttendanceDialogOpen(true)}
            >
              <CardContent className="p-4 text-center">
                <p className="text-3xl font-black text-red-600">{lowAttendanceSoldiers.length}</p>
                <p className="text-sm text-slate-600">נדרשים שיפור</p>
                <p className="text-xs text-red-500 mt-1">לחץ לצפייה</p>
              </CardContent>
            </Card>
          </div>

          {/* Attendance Trend Chart */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-slate-800 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  מגמות נוכחות (6 חודשים)
                </CardTitle>
                <Select value={chartCategoryFilter} onValueChange={setChartCategoryFilter}>
                  <SelectTrigger className="w-32 h-9 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="platoon">פלוגתי</SelectItem>
                    <SelectItem value="brigade">חטיבה</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <p className="text-xs text-slate-500 mt-1">אחוז נוכחות מתוך מצופים בלבד</p>
            </CardHeader>
            <CardContent>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="month" 
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                    />
                    <YAxis 
                      domain={[0, 100]}
                      tick={{ fontSize: 12, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => {
                        if (name === "percentage") return [`${value}%`, "אחוז נוכחות"];
                        if (name === "attended") return [value, "נכחו"];
                        if (name === "expected") return [value, "מצופים"];
                        return [value, name];
                      }}
                      contentStyle={{ 
                        backgroundColor: 'white', 
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        direction: 'rtl'
                      }}
                    />
                    <Legend 
                      formatter={(value) => {
                        if (value === "percentage") return "אחוז נוכחות";
                        return value;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="percentage" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                      activeDot={{ r: 6, fill: '#059669' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Filters */}
          <Card className="border-0 shadow-lg bg-white rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-slate-800 flex items-center gap-2 text-base">
                <Filter className="w-4 h-4" />
                סינון
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs text-slate-700 font-medium">שנה</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year.toString()} className="text-slate-900">{year}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-700 font-medium">חודש</Label>
                  <Select value={monthFilter} onValueChange={setMonthFilter}>
                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-900">הכל</SelectItem>
                      {hebrewMonths.map((month, idx) => (
                        <SelectItem key={idx} value={idx.toString()} className="text-slate-900">{month}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-700 font-medium">מופע</Label>
                  <Select value={eventFilter} onValueChange={setEventFilter}>
                    <SelectTrigger className="h-10 rounded-xl bg-white border-slate-300 text-slate-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      <SelectItem value="all" className="text-slate-900">הכל</SelectItem>
                      {uniqueEventTitles.map(title => (
                        <SelectItem key={title} value={title} className="text-slate-900">{title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Search & Export */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש חייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 py-6 rounded-2xl border-2"
              />
            </div>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="py-6 rounded-2xl border-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </Button>
          </div>

          {/* Low Attendance Alert */}
          {lowAttendanceSoldiers.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-800 text-base">
                  <AlertCircle className="w-5 h-5" />
                  חיילים בנוכחות נמוכה ({lowAttendanceSoldiers.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {lowAttendanceSoldiers.slice(0, 3).map(soldier => {
                  const stats = getSoldierStats(soldier.id);
                  return (
                    <div 
                      key={soldier.id} 
                      className="flex items-center justify-between p-2 rounded-xl bg-white/80 cursor-pointer hover:bg-white transition-colors"
                      onClick={() => openSoldierDetail(soldier)}
                    >
                      <span className="font-medium text-slate-800">{soldier.full_name}</span>
                      <Badge className="bg-red-500 text-white">{stats.percentage}%</Badge>
                    </div>
                  );
                })}
                {lowAttendanceSoldiers.length > 3 && (
                  <Button
                    variant="ghost"
                    onClick={() => setLowAttendanceDialogOpen(true)}
                    className="w-full text-red-700 hover:bg-red-100"
                  >
                    הצג עוד {lowAttendanceSoldiers.length - 3} חיילים
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Summary Table */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">טבלה מתכללת - נוכחות חיילים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-right py-3 px-2 font-bold text-slate-700">שם חייל</th>
                      <th className="text-center py-3 px-2 font-bold text-slate-700">מס' אישי</th>
                      <th className="text-center py-3 px-2 font-bold text-emerald-600">נכח</th>
                      <th className="text-center py-3 px-2 font-bold text-red-600">נעדר</th>
                      <th className="text-center py-3 px-2 font-bold text-slate-600">אחוז</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSoldiers.map(soldier => {
                      const stats = getSoldierStats(soldier.id);
                      return (
                        <tr 
                          key={soldier.id} 
                          className="border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
                          onClick={() => openSoldierDetail(soldier)}
                        >
                          <td className="py-3 px-2 font-medium text-slate-800">{soldier.full_name}</td>
                          <td className="py-3 px-2 text-center text-slate-500">{soldier.personal_number}</td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="w-4 h-4" />
                              {stats.attended}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <span className="inline-flex items-center gap-1 text-red-600">
                              <XCircle className="w-4 h-4" />
                              {stats.absent}
                            </span>
                          </td>
                          <td className="py-3 px-2 text-center">
                            <Badge className={`${getAttendanceColor(stats.percentage)} text-white`}>
                              {stats.percentage}%
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Soldiers List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">רשימת חיילים - לחץ לפרטים לפי חודשים</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                {filteredSoldiers.map(soldier => {
                  const stats = getSoldierStats(soldier.id);
                  
                  return (
                    <div
                      key={soldier.id}
                      className="p-4 rounded-2xl bg-slate-50 border border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                      onClick={() => openSoldierDetail(soldier)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800">{soldier.full_name}</h4>
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                              <span className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-emerald-500" />
                                {stats.attended}
                              </span>
                              <span className="flex items-center gap-1">
                                <XCircle className="w-3 h-3 text-red-500" />
                                {stats.absent}
                              </span>
                              {stats.notQualified > 0 && (
                                <span className="flex items-center gap-1">
                                  <Ban className="w-3 h-3 text-gray-500" />
                                  {stats.notQualified}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getAttendanceColor(stats.percentage)} text-white`}>
                            {stats.percentage}%
                          </Badge>
                          <ChevronLeft className="w-5 h-5 text-slate-400" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Soldier Detail Dialog - Monthly View */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col" dir="rtl">
            {selectedSoldier && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p>{selectedSoldier.full_name}</p>
                      <p className="text-sm font-normal text-slate-500">{selectedSoldier.personal_number}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                {/* Stats */}
                {(() => {
                  const stats = getSoldierStats(selectedSoldier.id);
                  return (
                    <div className="grid grid-cols-4 gap-2 my-4">
                      <div className="text-center p-2 rounded-xl bg-emerald-50">
                        <p className="text-lg font-bold text-emerald-600">{stats.attended}</p>
                        <p className="text-xs text-emerald-700">נכח</p>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-red-50">
                        <p className="text-lg font-bold text-red-600">{stats.absent}</p>
                        <p className="text-xs text-red-700">נעדר</p>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-blue-50">
                        <p className="text-lg font-bold text-blue-600">{stats.notInRotation}</p>
                        <p className="text-xs text-blue-700">לא בסבב</p>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-slate-50">
                        <p className="text-lg font-bold text-slate-600">{stats.percentage}%</p>
                        <p className="text-xs text-slate-700">נוכחות</p>
                      </div>
                    </div>
                  );
                })()}

                {/* Monthly Records */}
                <div className="flex-1 overflow-y-auto min-h-0">
                  <div className="space-y-4">
                    {getSoldierMonthlyRecords(selectedSoldier.id).map(record => (
                      <div key={`${record.year}-${record.month}`} className="border-2 border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        {/* Month Header */}
                        <div className="bg-gradient-to-l from-primary to-primary/80 px-4 py-3 flex items-center justify-between border-b border-primary/50">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                              <Calendar className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <span className="font-bold text-lg text-white">{hebrewMonths[record.month]} {record.year}</span>
                              <p className="text-xs text-white/70">{record.events.length} מופעים</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-100">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              <span className="text-sm font-bold text-emerald-700">{record.attended}</span>
                            </div>
                            <div className="flex items-center gap-1 px-3 py-1 rounded-full bg-red-100">
                              <XCircle className="w-4 h-4 text-red-600" />
                              <span className="text-sm font-bold text-red-700">{record.absent}</span>
                            </div>
                          </div>
                        </div>
                        
                        {/* Events List */}
                        <div className="p-3 space-y-2 bg-slate-50/50">
                          {record.events.map(eventRecord => (
                            <div
                              key={eventRecord.event.id}
                              className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-bold text-slate-800">{eventRecord.event.title}</span>
                                    {eventRecord.isExpected && (
                                      <Badge variant="outline" className="text-xs text-blue-600 border-blue-300 bg-blue-50">מצופה</Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-2 text-sm text-slate-500">
                                    <Calendar className="w-4 h-4" />
                                    <span>{format(parseISO(eventRecord.event.event_date), "dd/MM/yyyy")}</span>
                                  </div>
                                  {eventRecord.absenceReason && !eventRecord.completed && (
                                    <p className="text-sm text-red-600 mt-2 flex items-center gap-1">
                                      <XCircle className="w-4 h-4" />
                                      סיבה: {eventRecord.absenceReason}
                                    </p>
                                  )}
                                  {eventRecord.completed && eventRecord.absenceReason && (
                                    <p className="text-sm text-amber-600 mt-2">
                                      סיבה מקורית: {eventRecord.absenceReason}
                                    </p>
                                  )}
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                  {eventRecord.completed ? (
                                    <div className="text-left">
                                      <Badge className="bg-emerald-500 text-white">נכח בהשלמה</Badge>
                                      {eventRecord.completedAt && (
                                        <p className="text-xs text-slate-500 mt-1 text-center">
                                          {format(parseISO(eventRecord.completedAt), "dd/MM/yy")}
                                        </p>
                                      )}
                                    </div>
                                  ) : (
                                    <Badge className={`${attendanceStatusColors[eventRecord.status]} text-white`}>
                                      {attendanceStatusLabels[eventRecord.status]}
                                    </Badge>
                                  )}
                                  {eventRecord.status !== "not_qualified" && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 text-xs"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        openEditDialog(
                                          selectedSoldier,
                                          eventRecord.event,
                                          eventRecord.status,
                                          eventRecord.absenceReason,
                                          eventRecord.completed,
                                          eventRecord.completedAt
                                        );
                                      }}
                                    >
                                      <Edit className="w-3 h-3 ml-1" />
                                      עריכה
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          {record.events.length === 0 && (
                            <div className="text-center py-6 text-slate-500">
                              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-emerald-500/30" />
                              <p className="text-sm">אין מופעים רלוונטיים בחודש זה</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {getSoldierMonthlyRecords(selectedSoldier.id).length === 0 && (
                      <div className="text-center py-12 text-slate-500">
                        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
                        <p className="text-lg font-medium">אין מופעים בתקופה שנבחרה</p>
                        <p className="text-sm mt-1">נסה לשנות את הסינון</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Attendance Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="max-w-sm" dir="rtl">
            <DialogHeader>
              <DialogTitle>עריכת נוכחות</DialogTitle>
            </DialogHeader>
            
            {editingEvent && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="font-bold text-slate-800">{editingEvent.soldier.full_name}</p>
                  <p className="text-sm text-slate-500">{editingEvent.event.title}</p>
                  <p className="text-xs text-slate-400">{format(parseISO(editingEvent.event.event_date), "dd/MM/yyyy")}</p>
                </div>

                <div>
                  <Label>סטטוס</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AttendanceStatus)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attended">נכח</SelectItem>
                      <SelectItem value="absent">נעדר</SelectItem>
                      <SelectItem value="not_in_rotation">לא בסבב</SelectItem>
                      <SelectItem value="not_updated">לא עודכן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editStatus === "absent" && (
                  <div className="space-y-4">
                    <div>
                      <Label>סיבת היעדרות</Label>
                      <Select value={editReason} onValueChange={(v) => setEditReason(v as AbsenceReason)}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="בחר סיבה..." />
                        </SelectTrigger>
                        <SelectContent>
                          {absenceReasonOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                      <input
                        type="checkbox"
                        id="completed"
                        checked={editCompleted}
                        onChange={(e) => setEditCompleted(e.target.checked)}
                        className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <Label htmlFor="completed" className="cursor-pointer">
                        <span className="font-bold text-emerald-700">השלים את המופע</span>
                        <p className="text-xs text-emerald-600">החייל ביצע השלמה ויראה כנכח</p>
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={saveEditedAttendance} className="bg-primary">
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Low Attendance Soldiers Dialog */}
        <Dialog open={lowAttendanceDialogOpen} onOpenChange={setLowAttendanceDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                חיילים נדרשים שיפור ({lowAttendanceSoldiers.length})
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500 mb-4">חיילים עם אחוז נוכחות נמוך מ-50%</p>
            <div className="max-h-[60vh] overflow-y-auto space-y-3">
              {lowAttendanceSoldiers.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-500 opacity-50" />
                  <p>אין חיילים נדרשים שיפור</p>
                </div>
              ) : (
                lowAttendanceSoldiers.map(soldier => {
                  const stats = getSoldierStats(soldier.id);
                  return (
                    <div
                      key={soldier.id}
                      className="p-4 rounded-2xl bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                      onClick={() => {
                        openSoldierDetail(soldier);
                        setLowAttendanceDialogOpen(false);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-bold text-slate-800">{soldier.full_name}</h4>
                          <p className="text-xs text-slate-500">{soldier.personal_number}</p>
                        </div>
                        <div className="text-left">
                          <Badge className="bg-red-500 text-white text-lg">{stats.percentage}%</Badge>
                          <p className="text-xs text-slate-500 mt-1">{stats.attended}/{stats.total} נוכחויות</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
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
import { format, parseISO, getYear, getMonth } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Users, 
  Loader2,
  FileSpreadsheet,
  Search,
  CheckCircle,
  XCircle,
  User,
  ChevronDown,
  ChevronUp,
  Home,
  Filter,
  Edit,
  AlertTriangle,
  Eye,
  Calendar,
  List
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  
  // Edit attendance state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<{ soldier: Soldier; event: WorkPlanEvent; status: AttendanceStatus; reason: string | null; completed: boolean; completedAt?: string } | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>("attended");
  const [editReason, setEditReason] = useState<AbsenceReason | "">("");
  const [editCompleted, setEditCompleted] = useState(false);
  
  // Expanded months state
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());
  
  // Commander mode - shows only issues
  const [commanderMode, setCommanderMode] = useState(false);
  
  // View mode - soldiers or months
  const [viewMode, setViewMode] = useState<"soldiers" | "months">("soldiers");
  
  // Selected month for event attendance dialog
  const [selectedMonthEvents, setSelectedMonthEvents] = useState<{ month: number; year: number; events: WorkPlanEvent[] } | null>(null);
  const [eventAttendanceDialogOpen, setEventAttendanceDialogOpen] = useState(false);
  const [selectedEventForAttendance, setSelectedEventForAttendance] = useState<WorkPlanEvent | null>(null);

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

    let filteredEvents = events.filter(e => {
      const eventYear = getYear(parseISO(e.event_date));
      return eventYear.toString() === yearFilter && e.status === "completed";
    });

    if (monthFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => {
        const eventMonth = getMonth(parseISO(e.event_date));
        return eventMonth === parseInt(monthFilter);
      });
    }

    if (eventFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => e.title === eventFilter);
    }

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

  // Calculate overall stats for a soldier based on current filters
  const getSoldierStats = (soldierId: string) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return { attended: 0, absent: 0, notInRotation: 0, notQualified: 0, total: 0, percentage: 100, hasData: false };

    let attended = 0;
    let absent = 0;
    let notInRotation = 0;
    let notQualified = 0;

    // Filter events based on current filters
    let filteredEvents = events.filter(e => {
      const eventYear = getYear(parseISO(e.event_date));
      return eventYear.toString() === yearFilter && e.status === "completed";
    });

    if (monthFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => {
        const eventMonth = getMonth(parseISO(e.event_date));
        return eventMonth === parseInt(monthFilter);
      });
    }

    if (eventFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => e.title === eventFilter);
    }
    
    filteredEvents.forEach(event => {
      const { status, completed } = getSoldierEventStatus(soldier, event);
      const isExpected = (event.expected_soldiers || []).includes(soldierId);
      
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
    const hasData = relevantTotal > 0;
    
    return {
      attended,
      absent,
      notInRotation,
      notQualified,
      total: relevantTotal,
      percentage: relevantTotal > 0 ? Math.round((attended / relevantTotal) * 100) : 100,
      hasData
    };
  };

  // Calculate total stats for overview
  const overallStats = useMemo(() => {
    let totalAttended = 0;
    let totalAbsent = 0;
    let totalNotInRotation = 0;
    let issues = 0;
    
    soldiers.forEach(soldier => {
      const stats = getSoldierStats(soldier.id);
      totalAttended += stats.attended;
      totalAbsent += stats.absent;
      totalNotInRotation += stats.notInRotation;
      if (stats.percentage < 80 && stats.total > 0) issues++;
    });
    
    const total = totalAttended + totalAbsent;
    const percentage = total > 0 ? Math.round((totalAttended / total) * 100) : 100;
    const status = percentage >= 80 ? "ok" : percentage >= 60 ? "warning" : "critical";
    
    return { totalAttended, totalAbsent, totalNotInRotation, issues, percentage, status };
  }, [soldiers, events, attendance, yearFilter, monthFilter, eventFilter]);

  // Get months with events for month cards view
  const monthsWithEvents = useMemo(() => {
    const monthMap = new Map<string, { month: number; year: number; events: WorkPlanEvent[]; attended: number; absent: number; total: number }>();
    
    let filteredEvents = events.filter(e => {
      const eventYear = getYear(parseISO(e.event_date));
      return eventYear.toString() === yearFilter && e.status === "completed";
    });

    if (monthFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => {
        const eventMonth = getMonth(parseISO(e.event_date));
        return eventMonth === parseInt(monthFilter);
      });
    }

    if (eventFilter !== "all") {
      filteredEvents = filteredEvents.filter(e => e.title === eventFilter);
    }
    
    filteredEvents.forEach(event => {
      const date = parseISO(event.event_date);
      const month = getMonth(date);
      const year = getYear(date);
      const key = `${year}-${month}`;
      
      if (!monthMap.has(key)) {
        monthMap.set(key, { month, year, events: [], attended: 0, absent: 0, total: 0 });
      }
      
      const monthData = monthMap.get(key)!;
      monthData.events.push(event);
      
      // Calculate attendance for this event
      const expectedSoldiers = event.expected_soldiers || [];
      expectedSoldiers.forEach(soldierId => {
        const soldier = soldiers.find(s => s.id === soldierId);
        if (soldier) {
          monthData.total++;
          const { status, completed } = getSoldierEventStatus(soldier, event);
          if (completed || status === "attended") monthData.attended++;
          else if (status === "absent") monthData.absent++;
        }
      });
    });
    
    return Array.from(monthMap.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  }, [events, soldiers, attendance, yearFilter, monthFilter, eventFilter]);

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

  // Filter soldiers - show all soldiers that match search, not just those with data
  const filteredSoldiers = soldiers.filter(s => {
    const matchesSearch = s.full_name.includes(searchTerm) || s.personal_number.includes(searchTerm);
    return matchesSearch;
  });

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

  const openSoldierDetail = (soldier: Soldier) => {
    setSelectedSoldier(soldier);
    setDetailDialogOpen(true);
  };

  const toggleMonth = (monthKey: string) => {
    const newExpanded = new Set(expandedMonths);
    if (newExpanded.has(monthKey)) {
      newExpanded.delete(monthKey);
    } else {
      newExpanded.add(monthKey);
    }
    setExpandedMonths(newExpanded);
  };

  // Check if month has issues (for commander mode)
  const monthHasIssues = (record: MonthlyRecord) => {
    return record.absent > 0 || record.events.some(e => e.status === "not_updated");
  };

  // Open month events dialog
  const openMonthEventsDialog = (monthData: { month: number; year: number; events: WorkPlanEvent[] }) => {
    setSelectedMonthEvents(monthData);
    setSelectedEventForAttendance(null);
  };

  // Get attendance list for an event - includes expected soldiers AND any soldier with attendance record
  const getEventAttendanceList = (event: WorkPlanEvent) => {
    const expectedSoldiers = event.expected_soldiers || [];
    const attendanceRecords = attendance.filter(a => a.event_id === event.id);
    
    // Get unique soldier IDs from both expected and attendance records
    const soldierIds = new Set<string>([
      ...expectedSoldiers,
      ...attendanceRecords.map(a => a.soldier_id)
    ]);
    
    return Array.from(soldierIds).map(soldierId => {
      const soldier = soldiers.find(s => s.id === soldierId);
      if (!soldier) return null;
      const { status, reason, completed, completedAt } = getSoldierEventStatus(soldier, event);
      return { soldier, status, reason, completed, completedAt };
    }).filter(Boolean);
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white pb-24" dir="rtl">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-l from-slate-900 via-slate-800 to-slate-900 px-4 py-6">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.15),transparent_50%)]" />
          <div className="absolute top-3 left-3 opacity-15">
            <img src={unitLogo} alt="" className="w-16 h-16" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 mb-3">
              <Users className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-purple-400">מעקב נוכחות</span>
            </div>
            <h1 className="text-xl font-black text-white mb-1">שליטה ובקרה - נוכחות</h1>
            <p className="text-slate-400 text-xs">{events.filter(e => e.status === "completed").length} מופעים | {soldiers.length} חיילים</p>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          {/* Smart Overview Card */}
          <Card className="border-0 shadow-lg bg-white overflow-hidden">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-800 text-sm">סקירה כללית</h3>
                <Badge 
                  className={`text-xs ${
                    overallStats.status === "ok" 
                      ? "bg-emerald-100 text-emerald-700" 
                      : overallStats.status === "warning" 
                        ? "bg-amber-100 text-amber-700" 
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {overallStats.status === "ok" ? "תקין" : overallStats.status === "warning" ? "דורש תשומת לב" : "דורש טיפול"}
                </Badge>
              </div>
              
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="p-3 rounded-xl bg-slate-50">
                  <p className="text-2xl font-black text-slate-800">{overallStats.percentage}%</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">נוכחות</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50">
                  <p className="text-2xl font-black text-emerald-600">{overallStats.totalAttended}</p>
                  <p className="text-[10px] text-emerald-700 mt-0.5">נכח</p>
                </div>
                <div className="p-3 rounded-xl bg-red-50">
                  <p className="text-2xl font-black text-red-600">{overallStats.totalAbsent}</p>
                  <p className="text-[10px] text-red-700 mt-0.5">נעדר</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50">
                  <p className="text-2xl font-black text-blue-600">{overallStats.totalNotInRotation}</p>
                  <p className="text-[10px] text-blue-700 mt-0.5">סבב בית</p>
                </div>
              </div>
              
              {overallStats.issues > 0 && (
                <div className="mt-3 p-2 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs text-amber-700">{overallStats.issues} חיילים דורשים שיפור (מתחת ל-80%)</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Commander Mode Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-100 border border-slate-200">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                {commanderMode ? "מצב חריגים" : "מצב סקירה"}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">{commanderMode ? "רק בעיות" : "הכל"}</span>
              <Switch 
                checked={commanderMode} 
                onCheckedChange={setCommanderMode}
                className="data-[state=checked]:bg-red-500"
              />
            </div>
          </div>

          {/* Filters */}
          <Card className="border-0 shadow-md bg-white rounded-xl">
            <CardContent className="p-3">
              <div className="flex items-center gap-2 mb-2">
                <Filter className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-xs font-medium text-slate-600">סינון</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger className="h-9 rounded-lg text-xs bg-white border-slate-200 text-slate-700">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                    {availableYears.map(year => (
                      <SelectItem key={year} value={year.toString()} className="text-slate-700">{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={monthFilter} onValueChange={setMonthFilter}>
                  <SelectTrigger className="h-9 rounded-lg text-xs bg-white border-slate-200 text-slate-700">
                    <SelectValue placeholder="חודש" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                    <SelectItem value="all" className="text-slate-700">כל החודשים</SelectItem>
                    {hebrewMonths.map((month, idx) => (
                      <SelectItem key={idx} value={idx.toString()} className="text-slate-700">{month}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={eventFilter} onValueChange={setEventFilter}>
                  <SelectTrigger className="h-9 rounded-lg text-xs bg-white border-slate-200 text-slate-700">
                    <SelectValue placeholder="מופע" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                    <SelectItem value="all" className="text-slate-700">כל המופעים</SelectItem>
                    {uniqueEventTitles.map(title => (
                      <SelectItem key={title} value={title} className="text-slate-700">{title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* View Mode Tabs */}
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "soldiers" | "months")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-10 bg-slate-200 rounded-xl">
              <TabsTrigger value="soldiers" className="flex items-center gap-2 text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">
                <List className="w-4 h-4" />
                חיילים
              </TabsTrigger>
              <TabsTrigger value="months" className="flex items-center gap-2 text-sm text-slate-700 data-[state=active]:bg-white data-[state=active]:text-slate-900 rounded-lg">
                <Calendar className="w-4 h-4" />
                חודשים
              </TabsTrigger>
            </TabsList>

            {/* Soldiers View */}
            <TabsContent value="soldiers" className="mt-4 space-y-4">
              {/* Search & Export */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="חיפוש חייל..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pr-9 h-10 rounded-xl border text-sm"
                  />
                </div>
                <Button
                  onClick={exportToExcel}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-xl"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                </Button>
              </div>

              {/* Soldiers Table */}
              <Card className="border-0 shadow-lg bg-white rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 hover:bg-slate-50">
                      <TableHead className="text-right font-bold text-slate-700 text-xs">מספר אישי</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs">שם מלא</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs">נוכחות</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs">סטטוס</TableHead>
                      <TableHead className="text-right font-bold text-slate-700 text-xs w-12"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSoldiers.map(soldier => {
                      const stats = getSoldierStats(soldier.id);
                      
                      // In commander mode, only show soldiers with issues
                      if (commanderMode && stats.percentage >= 80) return null;

                      return (
                        <TableRow 
                          key={soldier.id} 
                          className="cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => openSoldierDetail(soldier)}
                        >
                          <TableCell className="text-xs text-slate-600 font-mono">{soldier.personal_number}</TableCell>
                          <TableCell className="font-medium text-slate-800 text-sm">{soldier.full_name}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress 
                                value={stats.percentage} 
                                className={`w-16 h-2 ${stats.percentage >= 80 ? '[&>div]:bg-emerald-500' : stats.percentage >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                              />
                              <span className="text-xs text-slate-600">{stats.percentage}%</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="flex items-center gap-0.5 text-emerald-600">
                                <CheckCircle className="w-3 h-3" />
                                {stats.attended}
                              </span>
                              <span className="flex items-center gap-0.5 text-red-500">
                                <XCircle className="w-3 h-3" />
                                {stats.absent}
                              </span>
                              <span className="flex items-center gap-0.5 text-blue-500">
                                <Home className="w-3 h-3" />
                                {stats.notInRotation}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                
                {filteredSoldiers.length === 0 && (
                  <div className="text-center py-8">
                    <Users className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="text-slate-500 text-sm">אין חיילים עם נתונים בסינון שנבחר</p>
                  </div>
                )}
              </Card>
              
              {commanderMode && filteredSoldiers.every(s => getSoldierStats(s.id).percentage >= 80) && (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 mx-auto text-emerald-500 opacity-50 mb-3" />
                  <p className="text-slate-500">אין חריגים - כל החיילים בנוכחות תקינה</p>
                </div>
              )}
            </TabsContent>

            {/* Months View */}
            <TabsContent value="months" className="mt-4 space-y-3">
              {monthsWithEvents.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                  <p className="text-slate-500 text-sm">אין מופעים בסינון שנבחר</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {monthsWithEvents.map(monthData => {
                    const percentage = monthData.total > 0 ? Math.round((monthData.attended / monthData.total) * 100) : 100;
                    const hasIssues = monthData.absent > 0;
                    
                    // In commander mode, only show months with issues
                    if (commanderMode && !hasIssues) return null;
                    
                    return (
                      <Card 
                        key={`${monthData.year}-${monthData.month}`}
                        className={`border-0 shadow-md cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] ${hasIssues ? 'ring-2 ring-red-200' : ''}`}
                        onClick={() => openMonthEventsDialog(monthData)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="font-bold text-slate-800 text-sm">{hebrewMonths[monthData.month]}</h4>
                            <Badge variant="outline" className="text-xs bg-white text-slate-700 border-slate-300">{monthData.year}</Badge>
                          </div>
                          
                          <div className="space-y-2">
                            <Progress 
                              value={percentage} 
                              className={`h-2 ${percentage >= 80 ? '[&>div]:bg-emerald-500' : percentage >= 50 ? '[&>div]:bg-amber-500' : '[&>div]:bg-red-500'}`}
                            />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500">{monthData.events.length} מופעים</span>
                              <span className={percentage >= 80 ? 'text-emerald-600' : percentage >= 50 ? 'text-amber-600' : 'text-red-600'}>{percentage}%</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-center gap-3 mt-3 text-xs">
                            <span className="flex items-center gap-1 text-emerald-600">
                              <CheckCircle className="w-3.5 h-3.5" />
                              {monthData.attended}
                            </span>
                            {monthData.absent > 0 && (
                              <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="w-3.5 h-3.5" />
                                {monthData.absent}
                              </span>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Soldier Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col" dir="rtl">
            {selectedSoldier && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-base">{selectedSoldier.full_name}</p>
                      <p className="text-xs font-normal text-slate-500">{selectedSoldier.personal_number}</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                {(() => {
                  const stats = getSoldierStats(selectedSoldier.id);
                  return (
                    <div className="grid grid-cols-4 gap-2 my-4">
                      <div className="text-center p-2 rounded-lg bg-emerald-50">
                        <p className="text-lg font-bold text-emerald-600">{stats.attended}</p>
                        <p className="text-[10px] text-emerald-700">נכח</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-red-50">
                        <p className="text-lg font-bold text-red-600">{stats.absent}</p>
                        <p className="text-[10px] text-red-700">נעדר</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-blue-50">
                        <p className="text-lg font-bold text-blue-600">{stats.notInRotation}</p>
                        <p className="text-[10px] text-blue-700">סבב בית</p>
                      </div>
                      <div className="text-center p-2 rounded-lg bg-slate-100">
                        <p className="text-lg font-bold text-slate-700">{stats.percentage}%</p>
                        <p className="text-[10px] text-slate-600">נוכחות</p>
                      </div>
                    </div>
                  );
                })()}

                <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
                  {getSoldierMonthlyRecords(selectedSoldier.id).map(record => {
                    const monthPercentage = record.attended + record.absent > 0 
                      ? Math.round((record.attended / (record.attended + record.absent)) * 100) 
                      : 100;
                    
                    return (
                      <div key={`${record.year}-${record.month}`} className="border border-slate-200 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-3 bg-slate-100">
                          <span className="font-medium text-sm text-slate-800">{hebrewMonths[record.month]} {record.year}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-emerald-600">{record.attended} נכח</span>
                            {record.absent > 0 && <span className="text-xs text-red-500">{record.absent} נעדר</span>}
                            <Progress 
                              value={monthPercentage} 
                              className={`w-12 h-1.5 ${monthPercentage >= 80 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-red-500'}`}
                            />
                          </div>
                        </div>
                        <div className="p-2 space-y-1">
                          {record.events.map(eventRecord => (
                            <div 
                              key={eventRecord.event.id} 
                              className={`flex items-center justify-between py-1.5 px-2 rounded text-sm ${
                                eventRecord.status === "absent" && !eventRecord.completed ? 'bg-red-50' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${
                                  eventRecord.completed || eventRecord.status === "attended" ? 'bg-emerald-500' :
                                  eventRecord.status === "absent" ? 'bg-red-500' : 'bg-slate-300'
                                }`} />
                                <span className="text-slate-700">{eventRecord.event.title}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-400">{format(parseISO(eventRecord.event.event_date), "dd/MM")}</span>
                                {eventRecord.completed && (
                                  <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
                                    הושלם {eventRecord.completedAt && format(parseISO(eventRecord.completedAt), "dd/MM")}
                                  </Badge>
                                )}
                                {eventRecord.status === "not_qualified" && (
                                  <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-600">לא מוכשר</Badge>
                                )}
                                <button
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
                                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                                >
                                  <Edit className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Month Events Dialog */}
        <Dialog open={!!selectedMonthEvents} onOpenChange={() => setSelectedMonthEvents(null)}>
          <DialogContent className="max-w-lg max-h-[90vh] flex flex-col" dir="rtl">
            {selectedMonthEvents && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <Calendar className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-base">{hebrewMonths[selectedMonthEvents.month]} {selectedMonthEvents.year}</p>
                      <p className="text-xs font-normal text-slate-500">{selectedMonthEvents.events.length} מופעים</p>
                    </div>
                  </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto space-y-2 min-h-0 mt-4">
                  {selectedEventForAttendance ? (
                    // Show attendance list for selected event
                    <>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => setSelectedEventForAttendance(null)}
                        className="mb-2"
                      >
                        <ChevronUp className="w-4 h-4 mr-1" />
                        חזרה לרשימת מופעים
                      </Button>
                      
                      <Card className="border-0 shadow-sm bg-slate-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm flex items-center justify-between">
                            <span>{selectedEventForAttendance.title}</span>
                            <Badge variant="outline" className="text-xs">
                              {format(parseISO(selectedEventForAttendance.event_date), "dd/MM/yyyy")}
                            </Badge>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="text-right text-xs font-bold">מספר אישי</TableHead>
                                <TableHead className="text-right text-xs font-bold">שם</TableHead>
                                <TableHead className="text-right text-xs font-bold">סטטוס</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {getEventAttendanceList(selectedEventForAttendance).map((item: any) => (
                                <TableRow key={item.soldier.id} className="hover:bg-white">
                                  <TableCell className="text-xs font-mono">{item.soldier.personal_number}</TableCell>
                                  <TableCell className="text-sm">{item.soldier.full_name}</TableCell>
                                  <TableCell>
                                    {item.completed ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">
                                        נכח (הושלם {item.completedAt && format(parseISO(item.completedAt), "dd/MM")})
                                      </Badge>
                                    ) : item.status === "attended" ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 text-xs">נכח</Badge>
                                    ) : item.status === "absent" ? (
                                      <Badge className="bg-red-100 text-red-700 text-xs">
                                        נעדר {item.reason && `- ${item.reason}`}
                                      </Badge>
                                    ) : item.status === "not_qualified" ? (
                                      <Badge className="bg-slate-100 text-slate-600 text-xs">לא מוכשר</Badge>
                                    ) : (
                                      <Badge className="bg-amber-100 text-amber-700 text-xs">לא עודכן</Badge>
                                    )}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    // Show events list
                    selectedMonthEvents.events.map(event => {
                      const attendanceList = getEventAttendanceList(event);
                      const attended = attendanceList.filter((a: any) => a.completed || a.status === "attended").length;
                      const absent = attendanceList.filter((a: any) => a.status === "absent" && !a.completed).length;
                      const total = attendanceList.length;
                      const percentage = total > 0 ? Math.round((attended / total) * 100) : 100;
                      
                      return (
                        <Card 
                          key={event.id} 
                          className="border border-slate-200 shadow-sm cursor-pointer hover:shadow-md transition-all"
                          onClick={() => setSelectedEventForAttendance(event)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-medium text-slate-800 text-sm">{event.title}</h4>
                                <p className="text-xs text-slate-500">{format(parseISO(event.event_date), "dd/MM/yyyy")}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right">
                                  <div className="flex items-center gap-2 text-xs">
                                    <span className="text-emerald-600">{attended} נכח</span>
                                    {absent > 0 && <span className="text-red-500">{absent} נעדר</span>}
                                  </div>
                                  <Progress 
                                    value={percentage} 
                                    className={`w-20 h-1.5 mt-1 ${percentage >= 80 ? '[&>div]:bg-emerald-500' : '[&>div]:bg-red-500'}`}
                                  />
                                </div>
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
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
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="font-bold text-slate-800 text-sm">{editingEvent.soldier.full_name}</p>
                  <p className="text-xs text-slate-500">{editingEvent.event.title}</p>
                  <p className="text-xs text-slate-400">{format(parseISO(editingEvent.event.event_date), "dd/MM/yyyy")}</p>
                </div>

                <div>
                  <Label className="text-sm">סטטוס</Label>
                  <Select value={editStatus} onValueChange={(v) => setEditStatus(v as AttendanceStatus)}>
                    <SelectTrigger className="mt-1 bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                      <SelectItem value="attended" className="text-slate-700">נכח</SelectItem>
                      <SelectItem value="absent" className="text-slate-700">נעדר</SelectItem>
                      <SelectItem value="not_in_rotation" className="text-slate-700">לא בסבב</SelectItem>
                      <SelectItem value="not_updated" className="text-slate-700">לא עודכן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {editStatus === "absent" && (
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm">סיבת היעדרות</Label>
                      <Select value={editReason} onValueChange={(v) => setEditReason(v as AbsenceReason)}>
                        <SelectTrigger className="mt-1 bg-white">
                          <SelectValue placeholder="בחר סיבה..." />
                        </SelectTrigger>
                        <SelectContent className="bg-white border border-slate-200 shadow-lg z-50">
                          {absenceReasonOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value} className="text-slate-700">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                      <input
                        type="checkbox"
                        id="completed"
                        checked={editCompleted}
                        onChange={(e) => setEditCompleted(e.target.checked)}
                        className="w-4 h-4 rounded border-emerald-300"
                      />
                      <Label htmlFor="completed" className="cursor-pointer text-sm">
                        <span className="font-medium text-emerald-700">השלים את המופע</span>
                      </Label>
                    </div>
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(false)}>
                ביטול
              </Button>
              <Button size="sm" onClick={saveEditedAttendance}>
                שמור
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
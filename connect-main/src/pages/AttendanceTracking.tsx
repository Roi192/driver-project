import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from "date-fns";
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
  TableIcon,
  AlertCircle,
  MinusCircle,
  HelpCircle,
  Filter,
  TrendingUp,
  Edit
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

// 4 סטטוסים לנוכחות
type AttendanceStatus = "attended" | "absent" | "not_in_rotation" | "not_updated";

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
};

const attendanceStatusColors: Record<AttendanceStatus, string> = {
  attended: "bg-emerald-500",
  absent: "bg-red-500",
  not_in_rotation: "bg-blue-500",
  not_updated: "bg-slate-400",
};

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
}

interface TableRecord {
  soldierId: string;
  soldierName: string;
  personalNumber: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  status: AttendanceStatus;
  absenceReason: string | null;
  isExpected: boolean;
  completed: boolean;
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
  const [tableSearchTerm, setTableSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  
  // Chart state
  const [chartCategoryFilter, setChartCategoryFilter] = useState<string>("all");
  
  // Edit attendance state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<TableRecord | null>(null);
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

  // קבלת סטטוס נוכחות לחייל במופע מסוים
  const getSoldierEventStatus = (soldierId: string, event: WorkPlanEvent): AttendanceStatus => {
    const att = attendance.find(a => a.event_id === event.id && a.soldier_id === soldierId);
    if (att) {
      return att.status as AttendanceStatus;
    }
    // אם אין רשומה, בדוק אם מצופה או לא
    const expectedSoldiers = event.expected_soldiers || [];
    const isExpected = expectedSoldiers.includes(soldierId);
    return isExpected ? "not_updated" : "not_in_rotation";
  };

  // קבלת כל המופעים הרלוונטיים של חייל עם סטטוס
  // מציג: מופעים שהושלמו + מופעים שיש עבורם רשומת נוכחות (גם אם לא הושלמו מסיבה כלשהי)
  const getSoldierEvents = (soldierId: string) => {
    const soldier = soldiers.find(s => s.id === soldierId);
    if (!soldier) return [];

    const relevantEvents = events
      .filter(e => {
        if (e.status === "completed") return true;
        return attendance.some(a => a.event_id === e.id && a.soldier_id === soldierId);
      })
      .sort((a, b) => new Date(b.event_date).getTime() - new Date(a.event_date).getTime());

    return relevantEvents.map(event => {
      const status = getSoldierEventStatus(soldierId, event);
      const att = attendance.find(a => a.event_id === event.id && a.soldier_id === soldierId);
      const isExpected = (event.expected_soldiers || []).includes(soldierId);

      return {
        ...event,
        status,
        absence_reason: att?.absence_reason || null,
        isExpected,
      };
    });
  };

  // חישוב סטטיסטיקות - רק על מופעים שהחייל היה מצופה
  const getSoldierStats = (soldierId: string) => {
    const soldierEvents = getSoldierEvents(soldierId);
    const completedEvents = soldierEvents.filter(e => e.status !== "not_updated");
    
    // סנן רק מופעים שהחייל היה מצופה אליהם
    const expectedEvents = completedEvents.filter(e => e.isExpected || e.status === "attended" || e.status === "absent");
    const attendedCount = expectedEvents.filter(e => e.status === "attended").length;
    const absentCount = expectedEvents.filter(e => e.status === "absent").length;
    const notInRotationCount = completedEvents.filter(e => e.status === "not_in_rotation").length;
    
    const relevantTotal = attendedCount + absentCount;
    
    return {
      attended: attendedCount,
      absent: absentCount,
      notInRotation: notInRotationCount,
      total: relevantTotal,
      percentage: relevantTotal > 0 
        ? Math.round((attendedCount / relevantTotal) * 100) 
        : 100
    };
  };

  // בניית טבלה מתכללת - מציג רק מופעים שהושלמו או שיש רשומות נוכחות
  const buildComprehensiveTable = (): TableRecord[] => {
    const records: TableRecord[] = [];
    
    // קבל את כל המופעים שהושלמו
    const completedEvents = events.filter(e => e.status === "completed");
    
    completedEvents.forEach(event => {
      const expectedSoldiers = event.expected_soldiers || [];
      
      // עבור כל חייל שהיה מצופה או שיש לו רשומת נוכחות
      soldiers.forEach(soldier => {
        const att = attendance.find(a => a.event_id === event.id && a.soldier_id === soldier.id);
        const isExpected = expectedSoldiers.includes(soldier.id);
        
        // הצג רק אם החייל היה מצופה או יש לו רשומת נוכחות
        if (isExpected || att) {
          let status: AttendanceStatus;
          // אם יש השלמה, נספור כנכח
          const hasCompleted = att?.completed || false;
          
          if (att) {
            // אם השלים - הסטטוס הוא נכח (בהשלמה)
            status = hasCompleted ? "attended" : (att.status as AttendanceStatus);
          } else {
            status = isExpected ? "not_updated" : "not_in_rotation";
          }
          
          records.push({
            soldierId: soldier.id,
            soldierName: soldier.full_name,
            personalNumber: soldier.personal_number,
            eventId: event.id,
            eventTitle: event.title,
            eventDate: event.event_date,
            status,
            absenceReason: att?.absence_reason || null,
            isExpected,
            completed: hasCompleted,
          });
        }
      });
    });
    
    // מיון לפי תאריך (החדש קודם) ואז לפי שם
    records.sort((a, b) => {
      const dateCompare = new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime();
      if (dateCompare !== 0) return dateCompare;
      return a.soldierName.localeCompare(b.soldierName, 'he');
    });
    
    return records;
  };

  const comprehensiveTable = buildComprehensiveTable();
  
  const filteredTable = comprehensiveTable.filter(record => {
    const matchesSearch = 
      record.soldierName.includes(tableSearchTerm) ||
      record.personalNumber.includes(tableSearchTerm) ||
      record.eventTitle.includes(tableSearchTerm);
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const exportToExcel = () => {
    const data = comprehensiveTable.map(record => ({
      "מספר אישי": record.personalNumber,
      "שם מלא": record.soldierName,
      "מופע": record.eventTitle,
      "תאריך": format(parseISO(record.eventDate), "dd/MM/yyyy"),
      "סטטוס": record.completed ? "נכח בהשלמה" : attendanceStatusLabels[record.status],
      "היה מצופה": record.isExpected ? "כן" : "לא",
      "סיבת היעדרות מקורית": record.absenceReason || "-",
      "בוצעה השלמה": record.completed ? "כן" : "לא",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מעקב נוכחות");
    XLSX.writeFile(wb, `מעקב_נוכחות_מפורט_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
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

  // Count by status
  const statusCounts = {
    attended: comprehensiveTable.filter(r => r.status === "attended").length,
    absent: comprehensiveTable.filter(r => r.status === "absent").length,
    not_in_rotation: comprehensiveTable.filter(r => r.status === "not_in_rotation").length,
    not_updated: comprehensiveTable.filter(r => r.status === "not_updated").length,
  };

  // Monthly trend calculation - only from expected soldiers
  const monthlyTrendData = useMemo(() => {
    const now = new Date();
    const sixMonthsAgo = subMonths(now, 5);
    const months = eachMonthOfInterval({ start: startOfMonth(sixMonthsAgo), end: endOfMonth(now) });
    
    return months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      // Filter events by category and month
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
        
        // Count attended from expected only
        expectedSoldiers.forEach(soldierId => {
          const att = attendance.find(a => a.event_id === event.id && a.soldier_id === soldierId);
          if (att?.status === "attended") {
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

  // Edit attendance from table
  const openEditDialog = (record: TableRecord) => {
    setEditingRecord(record);
    setEditStatus(record.completed ? "absent" : record.status);
    setEditReason((record.absenceReason as AbsenceReason) || "");
    setEditCompleted(record.completed);
    setEditDialogOpen(true);
  };

  const saveEditedAttendance = async () => {
    if (!editingRecord) return;

    // Delete existing record
    await supabase.from("event_attendance").delete()
      .eq("event_id", editingRecord.eventId)
      .eq("soldier_id", editingRecord.soldierId);

    // Insert new record if not "not_updated"
    if (editStatus !== "not_updated") {
      const isAbsent = editStatus === "absent";
      const { error } = await supabase.from("event_attendance").insert({
        event_id: editingRecord.eventId,
        soldier_id: editingRecord.soldierId,
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
                  <span className="text-xs text-slate-500">({statusCounts.attended})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-red-500 text-white gap-1">
                    <XCircle className="w-3 h-3" />
                    נעדר
                  </Badge>
                  <span className="text-xs text-slate-500">({statusCounts.absent})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-blue-500 text-white gap-1">
                    <MinusCircle className="w-3 h-3" />
                    לא בסבב
                  </Badge>
                  <span className="text-xs text-slate-500">({statusCounts.not_in_rotation})</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-slate-400 text-white gap-1">
                    <HelpCircle className="w-3 h-3" />
                    לא עודכן
                  </Badge>
                  <span className="text-xs text-slate-500">({statusCounts.not_updated})</span>
                </div>
              </div>
              <p className="text-xs text-slate-500 mt-3">
                💡 "לא בסבב" = החייל לא היה אמור להגיע למופע (לא נספר כהיעדרות)
              </p>
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
              <div className="flex justify-center gap-4 mt-3 text-xs text-slate-500">
                {monthlyTrendData.length > 0 && (
                  <>
                    <span>מצופים: {monthlyTrendData[monthlyTrendData.length - 1]?.expected || 0}</span>
                    <span>נכחו: {monthlyTrendData[monthlyTrendData.length - 1]?.attended || 0}</span>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="w-full py-6 rounded-2xl border-2"
          >
            <FileSpreadsheet className="w-5 h-5 ml-2" />
            ייצוא טבלה מתכללת לאקסל
          </Button>

          <Tabs defaultValue="soldiers" className="w-full">
            <TabsList className="w-full grid grid-cols-2 h-12 rounded-2xl">
              <TabsTrigger value="soldiers" className="rounded-xl">
                <User className="w-4 h-4 ml-2" />
                לפי חייל
              </TabsTrigger>
              <TabsTrigger value="table" className="rounded-xl">
                <TableIcon className="w-4 h-4 ml-2" />
                טבלה מתכללת
              </TabsTrigger>
            </TabsList>

            <TabsContent value="soldiers" className="mt-4 space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="חיפוש חייל..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 py-6 rounded-2xl border-2"
                />
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
                    {lowAttendanceSoldiers.slice(0, 5).map(soldier => {
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
                  </CardContent>
                </Card>
              )}

              {/* Soldiers List */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-slate-800">רשימת חיילים - לחץ לפרטים</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[55vh] md:h-[65vh]">
                    <div className="space-y-3">
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
                                    <span className="flex items-center gap-1">
                                      <MinusCircle className="w-3 h-3 text-blue-500" />
                                      {stats.notInRotation}
                                    </span>
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
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="table" className="mt-4 space-y-4">
              {/* Filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    placeholder="חיפוש..."
                    value={tableSearchTerm}
                    onChange={(e) => setTableSearchTerm(e.target.value)}
                    className="pr-10 py-6 rounded-2xl border-2"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-36 rounded-2xl border-2 h-[52px]">
                    <Filter className="w-4 h-4 ml-1" />
                    <SelectValue placeholder="סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">הכל</SelectItem>
                    <SelectItem value="attended">נכח</SelectItem>
                    <SelectItem value="absent">נעדר</SelectItem>
                    <SelectItem value="not_in_rotation">לא בסבב</SelectItem>
                    <SelectItem value="not_updated">לא עודכן</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Comprehensive Table */}
              <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-slate-800 flex items-center gap-2">
                    <TableIcon className="w-5 h-5" />
                    טבלה מתכללת ({filteredTable.length} רשומות)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[60vh] md:h-[70vh]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-right">מס' אישי</TableHead>
                          <TableHead className="text-right">שם</TableHead>
                          <TableHead className="text-right">מופע</TableHead>
                          <TableHead className="text-right">תאריך</TableHead>
                          <TableHead className="text-right">סטטוס</TableHead>
                          <TableHead className="text-right">סיבה</TableHead>
                          <TableHead className="text-right w-12">עריכה</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredTable.map((record, idx) => (
                          <TableRow key={`${record.soldierId}-${record.eventId}-${idx}`}>
                            <TableCell className="font-mono text-sm">
                              {record.personalNumber}
                            </TableCell>
                            <TableCell className="font-medium">
                              {record.soldierName}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {record.eventTitle}
                                {record.isExpected && (
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">מצופה</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-slate-500">
                              {format(parseISO(record.eventDate), "dd/MM/yy")}
                            </TableCell>
                            <TableCell>
                              {record.completed ? (
                                <Badge className="bg-emerald-500 text-white text-xs">
                                  נכח בהשלמה
                                </Badge>
                              ) : (
                                <Badge className={`${attendanceStatusColors[record.status]} text-white text-xs`}>
                                  {attendanceStatusLabels[record.status]}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-slate-500 max-w-[100px] truncate">
                              {record.completed ? (
                                <span className="text-amber-600 font-medium">{record.absenceReason || "-"}</span>
                              ) : (
                                record.absenceReason || "-"
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(record)}
                                className="h-8 w-8 rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Soldier Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
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

                {/* Events List */}
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {getSoldierEvents(selectedSoldier.id).map(event => (
                      <div
                        key={event.id}
                        className="p-3 rounded-xl bg-slate-50 border border-slate-200"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800">{event.title}</span>
                            {event.isExpected && (
                              <Badge variant="outline" className="text-xs text-blue-600 border-blue-300">מצופה</Badge>
                            )}
                          </div>
                          <Badge className={`${attendanceStatusColors[event.status]} text-white text-xs`}>
                            {attendanceStatusLabels[event.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500">
                          <Calendar className="w-3 h-3" />
                          {format(parseISO(event.event_date), "dd/MM/yyyy", { locale: he })}
                        </div>
                        {event.absence_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            סיבה: {event.absence_reason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
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
            
            {editingRecord && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="font-bold text-slate-800">{editingRecord.soldierName}</p>
                  <p className="text-sm text-slate-500">{editingRecord.eventTitle}</p>
                  <p className="text-xs text-slate-400">{format(parseISO(editingRecord.eventDate), "dd/MM/yyyy")}</p>
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
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
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
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
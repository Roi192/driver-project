import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { 
  ClipboardCheck, 
  Plus, 
  Loader2,
  FileSpreadsheet,
  Search,
  User,
  Car,
  Shield,
  MapPin,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  AlertTriangle
} from "lucide-react";
import { OUTPOSTS } from "@/lib/constants";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface Inspection {
  id: string;
  inspection_date: string;
  platoon: string;
  commander_name: string;
  soldier_id: string;
  inspector_name: string;
  combat_score: number;
  vehicle_score: number;
  procedures_score: number;
  safety_score: number;
  routes_familiarity_score: number;
  simulations_score: number;
  total_score: number;
  general_notes: string | null;
  soldiers?: Soldier;
}

const SIMULATION_QUESTIONS = [
  "מה על הנהג לעשות בעת כניסת רכב לנתיב שלו?",
  "איך ומה אני עושה בטל\"ת?",
  "איפה עליי לעצור בעת תקלה חימושית ברכב? מתי אשתמש בהילוכים?",
  "מה עליי לעשות בעת תאונה?",
  "איפה אני עושה את הנקודות תרגולות?",
  "במידה ואני נמצא באירוע מבצעי האם מותר לי לעבור על חוקי התעבורה?",
  "הגעתי לצומת ויש לי ירוק האם אני נכנס ישר לצומת או עליי להסתכל שהצומת נקייה?",
  "מהי מהירות הנסיעה בכל הגזרה?",
  "במידה ואני רוצה להכנס לפילבוקס או מעיין איך אני נכנס?",
  "מה הם 2 הנקודות היחידות המותרות לפרסה בצומת בגזרה?"
];

export default function Inspections() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  
  // KPI dialogs
  const [outstandingDialogOpen, setOutstandingDialogOpen] = useState(false);
  const [improvementDialogOpen, setImprovementDialogOpen] = useState(false);
  
  // Safety files for vulnerability helper
  const [vulnerabilityFiles, setVulnerabilityFiles] = useState<{title: string; content: string | null}[]>([]);

  const [formData, setFormData] = useState({
    inspection_date: format(new Date(), "yyyy-MM-dd"),
    platoon: "",
    commander_name: "",
    soldier_id: "",
    inspector_name: "",
    // Combat (10 pts)
    combat_debrief_by: "",
    combat_driver_participated: false,
    combat_driver_in_debrief: false,
    // Vehicle (30 pts)
    vehicle_tlt_oil: false,
    vehicle_tlt_water: false,
    vehicle_tlt_nuts: false,
    vehicle_tlt_pressure: false,
    vehicle_vardim_knowledge: false,
    vehicle_mission_sheet: false,
    vehicle_work_card: false,
    vehicle_clean: false,
    vehicle_equipment_secured: false,
    // Procedures (20 pts)
    procedures_descent_drill: false,
    procedures_rollover_drill: false,
    procedures_fire_drill: false,
    procedures_combat_equipment: false,
    procedures_weapon_present: false,
    // Safety (10 pts)
    safety_ten_commandments: false,
    safety_driver_tools_extinguisher: false,
    safety_driver_tools_jack: false,
    safety_driver_tools_wheel_key: false,
    safety_driver_tools_vest: false,
    safety_driver_tools_triangle: false,
    safety_driver_tools_license: false,
    // Routes (15 pts)
    routes_familiarity_score: 0,
    routes_notes: "",
    // Simulations (15 pts)
    simulations_answers: {} as Record<number, boolean>,
    general_notes: "",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch vulnerability files when platoon changes
  useEffect(() => {
    const fetchVulnerabilities = async () => {
      if (!formData.platoon) {
        setVulnerabilityFiles([]);
        return;
      }
      
      const { data, error } = await supabase
        .from("safety_files")
        .select("title, content")
        .eq("outpost", formData.platoon)
        .eq("category", "vulnerability");
      
      if (!error && data) {
        setVulnerabilityFiles(data);
      }
    };
    
    fetchVulnerabilities();
  }, [formData.platoon]);

  const fetchData = async () => {
    setLoading(true);
    
    const [inspectionsRes, soldiersRes] = await Promise.all([
      supabase
        .from("inspections")
        .select("*, soldiers(id, full_name, personal_number)")
        .order("inspection_date", { ascending: false }),
      supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .eq("is_active", true)
        .order("full_name")
    ]);

    if (!inspectionsRes.error) setInspections(inspectionsRes.data || []);
    if (!soldiersRes.error) setSoldiers(soldiersRes.data || []);

    setLoading(false);
  };

  const calculateScores = () => {
    // Combat: 10 points (3 items)
    let combatScore = 0;
    if (formData.combat_debrief_by) combatScore += 3;
    if (formData.combat_driver_participated) combatScore += 4;
    if (formData.combat_driver_in_debrief) combatScore += 3;

    // Vehicle: 30 points (9 items)
    let vehicleScore = 0;
    const vehicleItems = [
      formData.vehicle_tlt_oil, formData.vehicle_tlt_water, formData.vehicle_tlt_nuts,
      formData.vehicle_tlt_pressure, formData.vehicle_vardim_knowledge, formData.vehicle_mission_sheet,
      formData.vehicle_work_card, formData.vehicle_clean, formData.vehicle_equipment_secured
    ];
    vehicleScore = vehicleItems.filter(Boolean).length * 3.33;

    // Procedures: 20 points (5 items)
    let proceduresScore = 0;
    const procedureItems = [
      formData.procedures_descent_drill, formData.procedures_rollover_drill,
      formData.procedures_fire_drill, formData.procedures_combat_equipment,
      formData.procedures_weapon_present
    ];
    proceduresScore = procedureItems.filter(Boolean).length * 4;

    // Safety: 10 points (7 items)
    let safetyScore = 0;
    const safetyItems = [
      formData.safety_ten_commandments, formData.safety_driver_tools_extinguisher,
      formData.safety_driver_tools_jack, formData.safety_driver_tools_wheel_key,
      formData.safety_driver_tools_vest, formData.safety_driver_tools_triangle,
      formData.safety_driver_tools_license
    ];
    safetyScore = safetyItems.filter(Boolean).length * (10 / 7);

    // Routes: 15 points (manual)
    const routesScore = formData.routes_familiarity_score;

    // Simulations: 15 points
    const answeredQuestions = Object.values(formData.simulations_answers).filter(Boolean).length;
    const simulationsScore = (answeredQuestions / 3) * 15; // 3 random questions

    return {
      combat: Math.round(combatScore),
      vehicle: Math.round(vehicleScore),
      procedures: Math.round(proceduresScore),
      safety: Math.round(safetyScore),
      routes: Math.round(routesScore),
      simulations: Math.round(simulationsScore),
      total: Math.round(combatScore + vehicleScore + proceduresScore + safetyScore + routesScore + simulationsScore)
    };
  };

  const handleSubmit = async () => {
    if (!formData.soldier_id || !formData.platoon || !formData.commander_name || !formData.inspector_name) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }

    const scores = calculateScores();

    const data = {
      inspection_date: formData.inspection_date,
      platoon: formData.platoon,
      commander_name: formData.commander_name,
      soldier_id: formData.soldier_id,
      inspector_name: formData.inspector_name,
      combat_debrief_by: formData.combat_debrief_by,
      combat_driver_participated: formData.combat_driver_participated,
      combat_driver_in_debrief: formData.combat_driver_in_debrief,
      combat_score: scores.combat,
      vehicle_tlt_oil: formData.vehicle_tlt_oil,
      vehicle_tlt_water: formData.vehicle_tlt_water,
      vehicle_tlt_nuts: formData.vehicle_tlt_nuts,
      vehicle_tlt_pressure: formData.vehicle_tlt_pressure,
      vehicle_vardim_knowledge: formData.vehicle_vardim_knowledge,
      vehicle_mission_sheet: formData.vehicle_mission_sheet,
      vehicle_work_card: formData.vehicle_work_card,
      vehicle_clean: formData.vehicle_clean,
      vehicle_equipment_secured: formData.vehicle_equipment_secured,
      vehicle_score: scores.vehicle,
      procedures_descent_drill: formData.procedures_descent_drill,
      procedures_rollover_drill: formData.procedures_rollover_drill,
      procedures_fire_drill: formData.procedures_fire_drill,
      procedures_combat_equipment: formData.procedures_combat_equipment,
      procedures_weapon_present: formData.procedures_weapon_present,
      procedures_score: scores.procedures,
      safety_ten_commandments: formData.safety_ten_commandments,
      safety_driver_tools_extinguisher: formData.safety_driver_tools_extinguisher,
      safety_driver_tools_jack: formData.safety_driver_tools_jack,
      safety_driver_tools_wheel_key: formData.safety_driver_tools_wheel_key,
      safety_driver_tools_vest: formData.safety_driver_tools_vest,
      safety_driver_tools_triangle: formData.safety_driver_tools_triangle,
      safety_driver_tools_license: formData.safety_driver_tools_license,
      safety_score: scores.safety,
      routes_familiarity_score: scores.routes,
      routes_notes: formData.routes_notes,
      simulations_questions: formData.simulations_answers,
      simulations_score: scores.simulations,
      total_score: scores.total,
      general_notes: formData.general_notes,
    };

    const { error } = await supabase.from("inspections").insert(data);

    if (error) {
      toast.error("שגיאה בשמירת הביקורת");
      console.error(error);
    } else {
      toast.success("הביקורת נשמרה בהצלחה");
      fetchData();
      setDialogOpen(false);
      resetForm();
    }
  };

  const resetForm = () => {
    setFormData({
      inspection_date: format(new Date(), "yyyy-MM-dd"),
      platoon: "",
      commander_name: "",
      soldier_id: "",
      inspector_name: "",
      combat_debrief_by: "",
      combat_driver_participated: false,
      combat_driver_in_debrief: false,
      vehicle_tlt_oil: false,
      vehicle_tlt_water: false,
      vehicle_tlt_nuts: false,
      vehicle_tlt_pressure: false,
      vehicle_vardim_knowledge: false,
      vehicle_mission_sheet: false,
      vehicle_work_card: false,
      vehicle_clean: false,
      vehicle_equipment_secured: false,
      procedures_descent_drill: false,
      procedures_rollover_drill: false,
      procedures_fire_drill: false,
      procedures_combat_equipment: false,
      procedures_weapon_present: false,
      safety_ten_commandments: false,
      safety_driver_tools_extinguisher: false,
      safety_driver_tools_jack: false,
      safety_driver_tools_wheel_key: false,
      safety_driver_tools_vest: false,
      safety_driver_tools_triangle: false,
      safety_driver_tools_license: false,
      routes_familiarity_score: 0,
      routes_notes: "",
      simulations_answers: {},
      general_notes: "",
    });
    setCurrentStep(0);
  };

  const exportToExcel = () => {
    const data = inspections.map(i => ({
      "תאריך": format(parseISO(i.inspection_date), "dd/MM/yyyy"),
      "שם החייל": i.soldiers?.full_name || "-",
      "פלוגה": i.platoon,
      "מפקד": i.commander_name,
      "מבצע הביקורת": i.inspector_name,
      "נוהל קרב": `${i.combat_score}/10`,
      "רכב": `${i.vehicle_score}/30`,
      "נהלים": `${i.procedures_score}/20`,
      "בטיחות": `${i.safety_score}/10`,
      "נתבים": `${i.routes_familiarity_score}/15`,
      "סימולציות": `${i.simulations_score}/15`,
      "ציון כולל": `${i.total_score}/100`,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ביקורות");
    XLSX.writeFile(wb, `ביקורות_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  const getScoreColor = (score: number, max: number) => {
    const percentage = (score / max) * 100;
    if (percentage >= 80) return "text-emerald-600";
    if (percentage >= 60) return "text-amber-600";
    return "text-red-600";
  };

  // KPI calculations
  const avgScore = inspections.length > 0 
    ? Math.round(inspections.reduce((sum, i) => sum + i.total_score, 0) / inspections.length)
    : 0;
  
  const belowAvgSoldiers = soldiers.filter(s => {
    const soldierInspections = inspections.filter(i => i.soldier_id === s.id);
    if (soldierInspections.length === 0) return false;
    const avg = soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length;
    return avg < 60;
  });

  const aboveAvgSoldiers = soldiers.filter(s => {
    const soldierInspections = inspections.filter(i => i.soldier_id === s.id);
    if (soldierInspections.length === 0) return false;
    const avg = soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length;
    return avg >= 80;
  });

  const [randomQuestions] = useState(() => {
    const shuffled = [...SIMULATION_QUESTIONS].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 3);
  });

  if (authLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  const steps = ["פרטים כלליים", "נוהל קרב", "רכב", "נהלים", "בטיחות", "נתבים", "מקתגים"];

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/20 border border-blue-500/30 mb-4">
              <ClipboardCheck className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-bold text-blue-400">ביקורות</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">טפסי ביקורת</h1>
            <p className="text-slate-400 text-sm">{inspections.length} ביקורות</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-3 text-center">
                <p className="text-2xl font-black text-blue-600">{avgScore}</p>
                <p className="text-xs text-slate-600">ממוצע</p>
              </CardContent>
            </Card>
            <Card 
              className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setOutstandingDialogOpen(true)}
            >
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <p className="text-2xl font-black text-emerald-600">{aboveAvgSoldiers.length}</p>
                </div>
                <p className="text-xs text-slate-600">מצטיינים</p>
                <p className="text-[10px] text-emerald-500">לחץ לצפייה</p>
              </CardContent>
            </Card>
            <Card 
              className="border-0 bg-gradient-to-br from-red-50 to-orange-50 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setImprovementDialogOpen(true)}
            >
              <CardContent className="p-3 text-center">
                <div className="flex items-center justify-center gap-1">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                  <p className="text-2xl font-black text-red-600">{belowAvgSoldiers.length}</p>
                </div>
                <p className="text-xs text-slate-600">לשיפור</p>
                <p className="text-[10px] text-red-500">לחץ לצפייה</p>
              </CardContent>
            </Card>
          </div>

          {/* Soldiers needing improvement */}
          {belowAvgSoldiers.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-800 text-base">
                  <AlertTriangle className="w-5 h-5" />
                  חיילים הדורשים שיפור
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {belowAvgSoldiers.map(s => (
                    <Badge key={s.id} className="bg-red-500 text-white">{s.full_name}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              ביקורת חדשה
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="py-6 rounded-2xl border-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="חיפוש..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 py-6 rounded-2xl border-2"
            />
          </div>

          {/* Inspections List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">רשימת ביקורות</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[55vh] md:h-[65vh]">
                <div className="space-y-3">
                  {inspections.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין ביקורות</p>
                    </div>
                  ) : (
                    inspections.filter(i => 
                      i.soldiers?.full_name?.includes(searchTerm) ||
                      i.platoon.includes(searchTerm)
                    ).map(inspection => (
                      <div key={inspection.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-slate-800">{inspection.soldiers?.full_name}</h4>
                            <p className="text-sm text-slate-500">
                              {format(parseISO(inspection.inspection_date), "dd/MM/yyyy")} | {inspection.platoon}
                            </p>
                          </div>
                          <Badge className={`${inspection.total_score >= 80 ? 'bg-emerald-500' : inspection.total_score >= 60 ? 'bg-amber-500' : 'bg-red-500'} text-white text-lg px-3`}>
                            {inspection.total_score}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div className="text-center p-2 rounded-lg bg-white">
                            <span className={`font-bold ${getScoreColor(inspection.combat_score, 10)}`}>{inspection.combat_score}/10</span>
                            <p className="text-slate-500">קרב</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white">
                            <span className={`font-bold ${getScoreColor(inspection.vehicle_score, 30)}`}>{inspection.vehicle_score}/30</span>
                            <p className="text-slate-500">רכב</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white">
                            <span className={`font-bold ${getScoreColor(inspection.procedures_score, 20)}`}>{inspection.procedures_score}/20</span>
                            <p className="text-slate-500">נהלים</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white">
                            <span className={`font-bold ${getScoreColor(inspection.safety_score, 10)}`}>{inspection.safety_score}/10</span>
                            <p className="text-slate-500">בטיחות</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white">
                            <span className={`font-bold ${getScoreColor(inspection.routes_familiarity_score, 15)}`}>{inspection.routes_familiarity_score}/15</span>
                            <p className="text-slate-500">נתבים</p>
                          </div>
                          <div className="text-center p-2 rounded-lg bg-white">
                            <span className={`font-bold ${getScoreColor(inspection.simulations_score, 15)}`}>{inspection.simulations_score}/15</span>
                            <p className="text-slate-500">מקתגים</p>
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

        {/* New Inspection Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>ביקורת חדשה</DialogTitle>
            </DialogHeader>

            {/* Steps Progress */}
            <div className="flex gap-1 mb-4">
              {steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`flex-1 h-2 rounded-full ${idx <= currentStep ? 'bg-primary' : 'bg-slate-200'}`}
                />
              ))}
            </div>
            <p className="text-sm text-slate-500 text-center mb-4">{steps[currentStep]}</p>

            <ScrollArea className="h-[55vh]">
              {/* Step 0: General Details */}
              {currentStep === 0 && (
                <div className="space-y-4">
                  <div>
                    <Label>תאריך</Label>
                    <Input type="date" value={formData.inspection_date} onChange={e => setFormData({...formData, inspection_date: e.target.value})} />
                  </div>
                  <div>
                    <Label>פלוגה</Label>
                    <Select value={formData.platoon} onValueChange={v => setFormData({...formData, platoon: v})}>
                      <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                      <SelectContent>
                        {OUTPOSTS.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>שם המפקד</Label>
                    <Input value={formData.commander_name} onChange={e => setFormData({...formData, commander_name: e.target.value})} />
                  </div>
                  <div>
                    <Label>שם הנהג</Label>
                    <Select value={formData.soldier_id} onValueChange={v => setFormData({...formData, soldier_id: v})}>
                      <SelectTrigger><SelectValue placeholder="בחר חייל" /></SelectTrigger>
                      <SelectContent>
                        {soldiers.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>שם מבצע הביקורת</Label>
                    <Input value={formData.inspector_name} onChange={e => setFormData({...formData, inspector_name: e.target.value})} />
                  </div>
                </div>
              )}

              {/* Step 1: Combat Procedure (10 pts) */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded-xl text-center">
                    <span className="font-bold text-blue-800">נוהל קרב - 10 נקודות</span>
                  </div>
                  <div>
                    <Label>ע"י מי בוצע התחקיר והתדריך</Label>
                    <Input value={formData.combat_debrief_by} onChange={e => setFormData({...formData, combat_debrief_by: e.target.value})} />
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border">
                    <Checkbox checked={formData.combat_driver_participated} onCheckedChange={c => setFormData({...formData, combat_driver_participated: !!c})} />
                    <span>האם הנהג השתתף בנוהל קרב</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border">
                    <Checkbox checked={formData.combat_driver_in_debrief} onCheckedChange={c => setFormData({...formData, combat_driver_in_debrief: !!c})} />
                    <span>נוכחות הנהג בתחקיר</span>
                  </div>
                </div>
              )}

              {/* Step 2: Vehicle (30 pts) */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-xl text-center">
                    <span className="font-bold text-amber-800">רכב - 30 נקודות</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">ביצוע טל"ת:</p>
                  {[
                    { key: "vehicle_tlt_oil", label: "בדיקת שמן" },
                    { key: "vehicle_tlt_water", label: "בדיקת מים" },
                    { key: "vehicle_tlt_nuts", label: "בדיקת אומים" },
                    { key: "vehicle_tlt_pressure", label: "בדיקת לחץ אוויר" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl border">
                      <Checkbox checked={formData[item.key as keyof typeof formData] as boolean} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                  <p className="text-sm font-medium text-slate-700 mt-4">בדיקות נוספות:</p>
                  {[
                    { key: "vehicle_vardim_knowledge", label: "הכרה של נוהל ורדים" },
                    { key: "vehicle_mission_sheet", label: "בדיקה של דף משימה עם הנהג בכח" },
                    { key: "vehicle_work_card", label: "בדיקת כרטיס עבודה והעברת חוגר" },
                    { key: "vehicle_clean", label: "רכב נקי" },
                    { key: "vehicle_equipment_secured", label: "ציוד מעוגן" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl border">
                      <Checkbox checked={formData[item.key as keyof typeof formData] as boolean} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Procedures (20 pts) */}
              {currentStep === 3 && (
                <div className="space-y-4">
                  <div className="p-3 bg-emerald-50 rounded-xl text-center">
                    <span className="font-bold text-emerald-800">נהלים - 20 נקודות</span>
                  </div>
                  {[
                    { key: "procedures_descent_drill", label: "תרגולת ירידה לשול" },
                    { key: "procedures_rollover_drill", label: "תרגולת התהפכות" },
                    { key: "procedures_fire_drill", label: "תרגולת שריפה" },
                    { key: "procedures_combat_equipment", label: "בדיקת ציוד לחימה" },
                    { key: "procedures_weapon_present", label: "הימצאות נשק של הנהג" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl border">
                      <Checkbox checked={formData[item.key as keyof typeof formData] as boolean} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 4: Safety (10 pts) */}
              {currentStep === 4 && (
                <div className="space-y-4">
                  <div className="p-3 bg-red-50 rounded-xl text-center">
                    <span className="font-bold text-red-800">בטיחות - 10 נקודות</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border">
                    <Checkbox checked={formData.safety_ten_commandments} onCheckedChange={c => setFormData({...formData, safety_ten_commandments: !!c})} />
                    <span>הכרות עם עשרת הדיברות לנהג ותדריך ע"פ הענ"א</span>
                  </div>
                  <p className="text-sm font-medium text-slate-700">בדיקת כלי נהג:</p>
                  {[
                    { key: "safety_driver_tools_extinguisher", label: "מטף" },
                    { key: "safety_driver_tools_jack", label: "ג'ק ומוט לג'ק" },
                    { key: "safety_driver_tools_wheel_key", label: "מפתח גלגלים" },
                    { key: "safety_driver_tools_vest", label: "אפודה זוהרת" },
                    { key: "safety_driver_tools_triangle", label: "משולש אזהרה" },
                    { key: "safety_driver_tools_license", label: "רשיון רכב" },
                  ].map(item => (
                    <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl border">
                      <Checkbox checked={formData[item.key as keyof typeof formData] as boolean} onCheckedChange={c => setFormData({...formData, [item.key]: !!c})} />
                      <span>{item.label}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Step 5: Routes (15 pts) */}
              {currentStep === 5 && (
                <div className="space-y-4">
                  <div className="p-3 bg-purple-50 rounded-xl text-center">
                    <span className="font-bold text-purple-800">הכרות עם הנתב"ים בגזרה - 15 נקודות</span>
                  </div>
                  
                  {/* Vulnerability Helper */}
                  {formData.platoon && (
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                      <div className="flex items-center gap-2 mb-3">
                        <MapPin className="w-5 h-5 text-amber-600" />
                        <span className="font-bold text-amber-800">עזר למפקד - נקודות תורפה ב{formData.platoon}</span>
                      </div>
                      {vulnerabilityFiles.length > 0 ? (
                        <ScrollArea className="max-h-40">
                          <div className="space-y-2">
                            {vulnerabilityFiles.map((file, idx) => (
                              <div key={idx} className="p-2 bg-white rounded-lg border border-amber-100">
                                <p className="font-medium text-amber-900 text-sm">{file.title}</p>
                                {file.content && (
                                  <p className="text-xs text-slate-600 mt-1">{file.content}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <p className="text-sm text-amber-700">אין נקודות תורפה רשומות עבור {formData.platoon}</p>
                      )}
                    </div>
                  )}
                  
                  <div>
                    <Label>ציון (0-15)</Label>
                    <Input 
                      type="number" 
                      min="0" 
                      max="15" 
                      value={formData.routes_familiarity_score} 
                      onChange={e => setFormData({...formData, routes_familiarity_score: Math.min(15, Math.max(0, parseInt(e.target.value) || 0))})} 
                    />
                  </div>
                  <div>
                    <Label>הערות</Label>
                    <Textarea value={formData.routes_notes} onChange={e => setFormData({...formData, routes_notes: e.target.value})} />
                  </div>
                </div>
              )}

              {/* Step 6: Simulations (15 pts) */}
              {currentStep === 6 && (
                <div className="space-y-4">
                  <div className="p-3 bg-indigo-50 rounded-xl text-center">
                    <span className="font-bold text-indigo-800">מקת"גים וסימולציות - 15 נקודות</span>
                  </div>
                  <p className="text-sm text-slate-600">סמן אם הנהג ענה נכון:</p>
                  {randomQuestions.map((q, idx) => (
                    <div key={idx} className="p-3 rounded-xl border space-y-2">
                      <p className="text-sm font-medium">{idx + 1}. {q}</p>
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={formData.simulations_answers[idx] || false} 
                          onCheckedChange={c => setFormData({
                            ...formData, 
                            simulations_answers: {...formData.simulations_answers, [idx]: !!c}
                          })} 
                        />
                        <span className="text-sm text-slate-600">ענה נכון</span>
                      </div>
                    </div>
                  ))}
                  <div>
                    <Label>הערות כלליות</Label>
                    <Textarea value={formData.general_notes} onChange={e => setFormData({...formData, general_notes: e.target.value})} />
                  </div>
                </div>
              )}
            </ScrollArea>

            <DialogFooter className="gap-2 mt-4">
              {currentStep > 0 && (
                <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>הקודם</Button>
              )}
              {currentStep < steps.length - 1 ? (
                <Button onClick={() => setCurrentStep(currentStep + 1)} className="bg-primary">הבא</Button>
              ) : (
                <Button onClick={handleSubmit} className="bg-emerald-500">שמור ביקורת</Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Outstanding Soldiers Dialog */}
        <Dialog open={outstandingDialogOpen} onOpenChange={setOutstandingDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-emerald-800">
                <TrendingUp className="w-5 h-5" />
                חיילים מצטיינים ({aboveAvgSoldiers.length})
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500 mb-4">חיילים עם ציון ממוצע מעל 80</p>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {aboveAvgSoldiers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>אין חיילים מצטיינים</p>
                  </div>
                ) : (
                  aboveAvgSoldiers.map(soldier => {
                    const soldierInspections = inspections.filter(i => i.soldier_id === soldier.id);
                    const avgSoldierScore = soldierInspections.length > 0 
                      ? Math.round(soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length)
                      : 0;
                    return (
                      <div key={soldier.id} className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{soldier.full_name}</h4>
                            <p className="text-xs text-slate-500">{soldier.personal_number}</p>
                            <p className="text-xs text-slate-500">{soldierInspections.length} ביקורות</p>
                          </div>
                          <Badge className="bg-emerald-500 text-white text-lg">{avgSoldierScore}</Badge>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Improvement Soldiers Dialog */}
        <Dialog open={improvementDialogOpen} onOpenChange={setImprovementDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-800">
                <TrendingDown className="w-5 h-5" />
                חיילים לשיפור ({belowAvgSoldiers.length})
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-slate-500 mb-4">חיילים עם ציון ממוצע מתחת ל-60</p>
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-3">
                {belowAvgSoldiers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>אין חיילים לשיפור</p>
                  </div>
                ) : (
                  belowAvgSoldiers.map(soldier => {
                    const soldierInspections = inspections.filter(i => i.soldier_id === soldier.id);
                    const avgSoldierScore = soldierInspections.length > 0 
                      ? Math.round(soldierInspections.reduce((sum, i) => sum + i.total_score, 0) / soldierInspections.length)
                      : 0;
                    return (
                      <div key={soldier.id} className="p-4 rounded-2xl bg-red-50 border border-red-200">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-bold text-slate-800">{soldier.full_name}</h4>
                            <p className="text-xs text-slate-500">{soldier.personal_number}</p>
                            <p className="text-xs text-slate-500">{soldierInspections.length} ביקורות</p>
                          </div>
                          <Badge className="bg-red-500 text-white text-lg">{avgSoldierScore}</Badge>
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
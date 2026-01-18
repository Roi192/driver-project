import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, differenceInDays, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  AlertTriangle,
  Shield,
  Calendar,
  FileSpreadsheet,
  Search,
  Eye,
  Car,
  CheckCircle,
  Gauge,
  Crown
} from "lucide-react";
import { OUTPOSTS } from "@/lib/constants";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { SoldierProfileDialog } from "@/components/admin/SoldierProfileDialog";

interface Soldier {
  id: string;
  personal_number: string;
  full_name: string;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  release_date: string | null;
  outpost: string | null;
  is_active: boolean;
  created_at: string;
  defensive_driving_passed: boolean | null;
  qualified_date: string | null;
  correct_driving_in_service_date: string | null;
  current_safety_score: number | null;
  consecutive_low_months: number | null;
  safety_status: string | null;
  license_type: string | null;
  permits: string[] | null;
}

interface MonthlyExcellence {
  soldier_id: string;
  excellence_month: string;
}

// Available permits
const PERMITS_LIST = ["דויד", "סוואנה", "טיגריס", "פנתר"];
const LICENSE_TYPES = ["B", "C1", "C"];

// פונקציית כשירות אוטומטית - נהג כשיר = רשיון צבאי ואזרחי בתוקף (לא קשור לנהיגה מונעת)
const getFitnessStatus = (soldier: Soldier) => {
  const today = new Date();
  const militaryExpiry = soldier.military_license_expiry ? parseISO(soldier.military_license_expiry) : null;
  const civilianExpiry = soldier.civilian_license_expiry ? parseISO(soldier.civilian_license_expiry) : null;
  
  const militaryExpired = militaryExpiry && differenceInDays(militaryExpiry, today) < 0;
  const civilianExpired = civilianExpiry && differenceInDays(civilianExpiry, today) < 0;
  
  // נהג כשיר = שני הרשיונות בתוקף
  if (militaryExpired || civilianExpired) {
    return { status: "not_fit", label: "לא כשיר", color: "bg-red-500", icon: "❌" };
  }
  if (!militaryExpiry || !civilianExpiry) {
    return { status: "unknown", label: "חסר מידע", color: "bg-slate-400", icon: "❓" };
  }
  return { status: "fit", label: "כשיר", color: "bg-emerald-500", icon: "✓" };
};

// פונקציה לבדיקת תוקף נהיגה נכונה בשירות (נדרש אחת לשנה)
const getCorrectDrivingStatus = (soldier: Soldier) => {
  if (!soldier.correct_driving_in_service_date) {
    return { status: "unknown", label: "לא הוזן", color: "bg-slate-400", isValid: false };
  }
  
  const today = new Date();
  const trainingDate = parseISO(soldier.correct_driving_in_service_date);
  const daysSinceTraining = differenceInDays(today, trainingDate);
  
  if (daysSinceTraining > 365) {
    return { status: "expired", label: "פג תוקף", color: "bg-red-500", isValid: false };
  } else if (daysSinceTraining > 300) {
    return { status: "warning", label: `${365 - daysSinceTraining} ימים`, color: "bg-amber-500", isValid: true };
  }
  return { status: "valid", label: "תקף", color: "bg-emerald-500", isValid: true };
};

export default function SoldiersControl() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSoldier, setEditingSoldier] = useState<Soldier | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [soldierToDelete, setSoldierToDelete] = useState<Soldier | null>(null);
  const [profileSoldier, setProfileSoldier] = useState<Soldier | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [excellenceData, setExcellenceData] = useState<MonthlyExcellence[]>([]);
  
  // Filters
  const [militaryLicenseFilter, setMilitaryLicenseFilter] = useState<string>("all");
  const [civilianLicenseFilter, setCivilianLicenseFilter] = useState<string>("all");
  const [defensiveDrivingFilter, setDefensiveDrivingFilter] = useState<string>("all");
  const [licenseTypeFilter, setLicenseTypeFilter] = useState<string>("all");
  const [permitFilter, setPermitFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    personal_number: "",
    full_name: "",
    military_license_expiry: "",
    civilian_license_expiry: "",
    release_date: "",
    defensive_driving_passed: false,
    qualified_date: format(new Date(), "yyyy-MM-dd"),
    correct_driving_in_service_date: "",
    license_type: "",
    permits: [] as string[],
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchSoldiers();
    fetchExcellenceData();
  }, []);

  const fetchExcellenceData = async () => {
    const { data, error } = await supabase
      .from("monthly_excellence")
      .select("soldier_id, excellence_month")
      .order("excellence_month", { ascending: false });

    if (!error && data) {
      setExcellenceData(data);
    }
  };

  const getSoldierExcellence = (soldierId: string) => {
    return excellenceData.filter(e => e.soldier_id === soldierId);
  };

  const fetchSoldiers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("soldiers")
      .select("*")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error("Error fetching soldiers:", error);
      toast.error("שגיאה בטעינת החיילים");
    } else {
      setSoldiers(data || []);
    }
    setLoading(false);
  };

  const getLicenseStatus = (expiryDate: string | null) => {
    if (!expiryDate) return { status: "unknown", label: "לא הוזן", color: "bg-slate-400" };
    
    const today = new Date();
    const expiry = parseISO(expiryDate);
    const daysUntil = differenceInDays(expiry, today);
    
    if (daysUntil < 0) {
      return { status: "expired", label: "פג תוקף", color: "bg-red-500" };
    } else if (daysUntil <= 60) {
      return { status: "warning", label: `${daysUntil} ימים`, color: "bg-amber-500" };
    }
    return { status: "valid", label: "תקף", color: "bg-emerald-500" };
  };

  const handleSubmit = async () => {
    if (!formData.personal_number || !formData.full_name) {
      toast.error("יש למלא מספר אישי ושם מלא");
      return;
    }

    const soldierData = {
      personal_number: formData.personal_number,
      full_name: formData.full_name,
      military_license_expiry: formData.military_license_expiry || null,
      civilian_license_expiry: formData.civilian_license_expiry || null,
      release_date: formData.release_date || null,
      defensive_driving_passed: formData.defensive_driving_passed,
      qualified_date: formData.qualified_date || null,
      correct_driving_in_service_date: formData.correct_driving_in_service_date || null,
      license_type: formData.license_type || null,
      permits: formData.permits.length > 0 ? formData.permits : null,
    };

    if (editingSoldier) {
      const { error } = await supabase
        .from("soldiers")
        .update(soldierData)
        .eq("id", editingSoldier.id);

      if (error) {
        toast.error("שגיאה בעדכון החייל");
      } else {
        toast.success("החייל עודכן בהצלחה");
        fetchSoldiers();
      }
    } else {
      const { error } = await supabase
        .from("soldiers")
        .insert(soldierData);

      if (error) {
        if (error.code === "23505") {
          toast.error("מספר אישי זה כבר קיים במערכת");
        } else {
          toast.error("שגיאה בהוספת החייל");
        }
      } else {
        toast.success("החייל נוסף בהצלחה");
        fetchSoldiers();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!soldierToDelete) return;

    const { error } = await supabase
      .from("soldiers")
      .update({ is_active: false })
      .eq("id", soldierToDelete.id);

    if (error) {
      toast.error("שגיאה במחיקת החייל");
    } else {
      toast.success("החייל הוסר בהצלחה");
      fetchSoldiers();
    }
    setDeleteConfirmOpen(false);
    setSoldierToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      personal_number: "",
      full_name: "",
      military_license_expiry: "",
      civilian_license_expiry: "",
      release_date: "",
      defensive_driving_passed: false,
      qualified_date: format(new Date(), "yyyy-MM-dd"),
      correct_driving_in_service_date: "",
      license_type: "",
      permits: [],
    });
    setEditingSoldier(null);
  };

  const openEditDialog = (soldier: Soldier) => {
    setEditingSoldier(soldier);
    setFormData({
      personal_number: soldier.personal_number,
      full_name: soldier.full_name,
      military_license_expiry: soldier.military_license_expiry || "",
      civilian_license_expiry: soldier.civilian_license_expiry || "",
      release_date: soldier.release_date || "",
      defensive_driving_passed: soldier.defensive_driving_passed || false,
      qualified_date: soldier.qualified_date || format(new Date(), "yyyy-MM-dd"),
      correct_driving_in_service_date: soldier.correct_driving_in_service_date || "",
      license_type: soldier.license_type || "",
      permits: soldier.permits || [],
    });
    setDialogOpen(true);
  };

  // Safety score status helper
  const getSafetyScoreStatus = (soldier: Soldier) => {
    if (soldier.current_safety_score === null || soldier.current_safety_score === undefined) {
      return { status: "unknown", label: "לא הוזן", color: "bg-slate-400", icon: "❓" };
    }
    if (soldier.safety_status === 'suspended') {
      return { status: "suspended", label: "מושעה", color: "bg-red-600", icon: "🚫" };
    }
    if (soldier.current_safety_score < 75) {
      if ((soldier.consecutive_low_months || 0) >= 3) {
        return { status: "critical", label: `${soldier.current_safety_score} (מושעה)`, color: "bg-red-600", icon: "🚫" };
      }
      if ((soldier.consecutive_low_months || 0) >= 2) {
        return { status: "warning", label: `${soldier.current_safety_score} (בירור+מבחן)`, color: "bg-amber-500", icon: "⚠️" };
      }
      return { status: "low", label: `${soldier.current_safety_score} (בירור)`, color: "bg-amber-500", icon: "⚠️" };
    }
    return { status: "ok", label: `${soldier.current_safety_score}`, color: "bg-emerald-500", icon: "✓" };
  };

  const exportToExcel = () => {
    const data = soldiers.map(soldier => ({
      "מספר אישי": soldier.personal_number,
      "שם מלא": soldier.full_name,
      "מוצב": soldier.outpost || "-",
      "סוג רשיון": soldier.license_type || "-",
      "היתרים": soldier.permits?.join(", ") || "-",
      "תאריך נהג מוכשר": soldier.qualified_date ? format(parseISO(soldier.qualified_date), "dd/MM/yyyy") : "-",
      "רשיון צבאי": soldier.military_license_expiry ? format(parseISO(soldier.military_license_expiry), "dd/MM/yyyy") : "-",
      "סטטוס רשיון צבאי": getLicenseStatus(soldier.military_license_expiry).label,
      "רשיון אזרחי": soldier.civilian_license_expiry ? format(parseISO(soldier.civilian_license_expiry), "dd/MM/yyyy") : "-",
      "סטטוס רשיון אזרחי": getLicenseStatus(soldier.civilian_license_expiry).label,
      "תאריך שחרור": soldier.release_date ? format(parseISO(soldier.release_date), "dd/MM/yyyy") : "-",
      "נהיגה מונעת": soldier.defensive_driving_passed ? "עבר" : "לא עבר",
      "נהיגה נכונה בשירות": soldier.correct_driving_in_service_date ? format(parseISO(soldier.correct_driving_in_service_date), "dd/MM/yyyy") : "-",
      "סטטוס נהיגה נכונה": getCorrectDrivingStatus(soldier).label,
      "ציון בטיחות": soldier.current_safety_score ?? "-",
      "חודשים ברציפות מתחת ל-75": soldier.consecutive_low_months ?? 0,
      "סטטוס בטיחות": getSafetyScoreStatus(soldier).label,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "טבלת שליטה");
    XLSX.writeFile(wb, `טבלת_שליטה_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  // Apply all filters
  const filteredSoldiers = soldiers.filter(soldier => {
    // Text search
    const matchesSearch = soldier.full_name.includes(searchTerm) || soldier.personal_number.includes(searchTerm);
    if (!matchesSearch) return false;
    
    // Military license filter
    if (militaryLicenseFilter !== "all") {
      const status = getLicenseStatus(soldier.military_license_expiry).status;
      if (militaryLicenseFilter === "expired" && status !== "expired") return false;
      if (militaryLicenseFilter === "warning" && status !== "warning") return false;
      if (militaryLicenseFilter === "valid" && status !== "valid") return false;
      if (militaryLicenseFilter === "unknown" && status !== "unknown") return false;
    }
    
    // Civilian license filter
    if (civilianLicenseFilter !== "all") {
      const status = getLicenseStatus(soldier.civilian_license_expiry).status;
      if (civilianLicenseFilter === "expired" && status !== "expired") return false;
      if (civilianLicenseFilter === "warning" && status !== "warning") return false;
      if (civilianLicenseFilter === "valid" && status !== "valid") return false;
      if (civilianLicenseFilter === "unknown" && status !== "unknown") return false;
    }
    
    // Defensive driving filter
    if (defensiveDrivingFilter !== "all") {
      if (defensiveDrivingFilter === "passed" && !soldier.defensive_driving_passed) return false;
      if (defensiveDrivingFilter === "not_passed" && soldier.defensive_driving_passed) return false;
    }
    
    // License type filter
    if (licenseTypeFilter !== "all") {
      if (soldier.license_type !== licenseTypeFilter) return false;
    }
    
    // Permit filter
    if (permitFilter !== "all") {
      if (!soldier.permits || !soldier.permits.includes(permitFilter)) return false;
    }
    
    return true;
  });

  const expiringLicenses = soldiers.filter(soldier => {
    const militaryStatus = getLicenseStatus(soldier.military_license_expiry);
    const civilianStatus = getLicenseStatus(soldier.civilian_license_expiry);
    return militaryStatus.status === "expired" || militaryStatus.status === "warning" ||
           civilianStatus.status === "expired" || civilianStatus.status === "warning";
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
              <Users className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-gold">טבלת שליטה</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">ניהול חיילים</h1>
            <p className="text-slate-400 text-sm">{soldiers.length} חיילים פעילים</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-emerald-600">
                  {soldiers.filter(s => getFitnessStatus(s).status === "fit").length}
                </div>
                <p className="text-sm font-bold text-emerald-700">נהגים כשירים</p>
                <p className="text-xs text-emerald-600 mt-1">
                  {Math.round((soldiers.filter(s => getFitnessStatus(s).status === "fit").length / soldiers.length) * 100) || 0}%
                </p>
              </CardContent>
            </Card>
            <Card className="border-0 bg-gradient-to-br from-red-50 to-amber-50 shadow-lg">
              <CardContent className="p-4 text-center">
                <div className="text-3xl font-black text-red-600">
                  {soldiers.filter(s => getFitnessStatus(s).status === "not_fit").length}
                </div>
                <p className="text-sm font-bold text-red-700">לא כשירים</p>
                <p className="text-xs text-red-600 mt-1">דורשים טיפול מיידי</p>
              </CardContent>
            </Card>
          </div>

          {/* 30/60 Day License Alerts */}
          {expiringLicenses.length > 0 && (
            <Card className="border-0 bg-gradient-to-br from-red-50 to-amber-50 shadow-lg">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <AlertTriangle className="w-5 h-5" />
                  התראות רשיונות - 30/60 יום ({expiringLicenses.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="w-full">
                  <div className="space-y-2 min-w-[300px]">
                    {expiringLicenses.map(soldier => {
                      const militaryStatus = getLicenseStatus(soldier.military_license_expiry);
                      const civilianStatus = getLicenseStatus(soldier.civilian_license_expiry);
                      const militaryDays = soldier.military_license_expiry ? differenceInDays(parseISO(soldier.military_license_expiry), new Date()) : null;
                      const civilianDays = soldier.civilian_license_expiry ? differenceInDays(parseISO(soldier.civilian_license_expiry), new Date()) : null;
                      return (
                        <div key={soldier.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/80 border border-red-200">
                          <div className="flex-1">
                            <p className="font-bold text-slate-800">{soldier.full_name}</p>
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {(militaryStatus.status === "expired" || militaryStatus.status === "warning") && (
                                <Badge className={`${militaryStatus.color} text-white text-xs`}>
                                  צבאי: {militaryDays !== null && militaryDays < 0 ? "פג תוקף" : `${militaryDays} ימים`}
                                </Badge>
                              )}
                              {(civilianStatus.status === "expired" || civilianStatus.status === "warning") && (
                                <Badge className={`${civilianStatus.color} text-white text-xs`}>
                                  אזרחי: {civilianDays !== null && civilianDays < 0 ? "פג תוקף" : `${civilianDays} ימים`}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-primary to-teal text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף חייל
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
              placeholder="חיפוש לפי שם או מספר אישי..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10 py-6 rounded-2xl border-2"
            />
          </div>
          
          {/* Filters */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur rounded-2xl">
            <CardContent className="p-4">
              <p className="text-sm font-bold text-slate-700 mb-3">סינון מתקדם</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">רשיון צבאי</Label>
                  <Select value={militaryLicenseFilter} onValueChange={setMilitaryLicenseFilter}>
                    <SelectTrigger className="rounded-xl bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="valid" className="text-slate-700">תקף</SelectItem>
                      <SelectItem value="warning" className="text-slate-700">עומד לפוג (60 יום)</SelectItem>
                      <SelectItem value="expired" className="text-slate-700">פג תוקף</SelectItem>
                      <SelectItem value="unknown" className="text-slate-700">לא הוזן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">רשיון אזרחי</Label>
                  <Select value={civilianLicenseFilter} onValueChange={setCivilianLicenseFilter}>
                    <SelectTrigger className="rounded-xl bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="valid" className="text-slate-700">תקף</SelectItem>
                      <SelectItem value="warning" className="text-slate-700">עומד לפוג (60 יום)</SelectItem>
                      <SelectItem value="expired" className="text-slate-700">פג תוקף</SelectItem>
                      <SelectItem value="unknown" className="text-slate-700">לא הוזן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">נהיגה מונעת</Label>
                  <Select value={defensiveDrivingFilter} onValueChange={setDefensiveDrivingFilter}>
                    <SelectTrigger className="rounded-xl bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="passed" className="text-slate-700">עבר</SelectItem>
                      <SelectItem value="not_passed" className="text-slate-700">לא עבר</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">סוג רשיון</Label>
                  <Select value={licenseTypeFilter} onValueChange={setLicenseTypeFilter}>
                    <SelectTrigger className="rounded-xl bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      {LICENSE_TYPES.map(type => (
                        <SelectItem key={type} value={type} className="text-slate-700">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">היתרים</Label>
                  <Select value={permitFilter} onValueChange={setPermitFilter}>
                    <SelectTrigger className="rounded-xl bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      {PERMITS_LIST.map(permit => (
                        <SelectItem key={permit} value={permit} className="text-slate-700">{permit}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Soldiers List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">רשימת חיילים</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] md:h-[70vh]">
                <div className="space-y-3">
                  {filteredSoldiers.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין חיילים</p>
                    </div>
                  ) : (
                    filteredSoldiers.map(soldier => {
                      const militaryStatus = getLicenseStatus(soldier.military_license_expiry);
                      const civilianStatus = getLicenseStatus(soldier.civilian_license_expiry);
                      const hasAlert = militaryStatus.status !== "valid" || civilianStatus.status !== "valid";
                      const soldierExcellence = getSoldierExcellence(soldier.id);
                      
                      return (
                        <div
                          key={soldier.id}
                          className={`p-4 rounded-2xl border transition-all ${
                            hasAlert ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"
                          }`}
                        >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="font-bold text-slate-800">{soldier.full_name}</h4>
                                {/* Excellence Crown Badge */}
                                {soldierExcellence.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    {soldierExcellence.map((excellence) => (
                                      <Badge 
                                        key={excellence.excellence_month}
                                        className="bg-gradient-to-r from-amber-400 to-yellow-500 text-slate-900 text-xs font-bold flex items-center gap-1 shadow-md"
                                      >
                                        <Crown className="w-3 h-3" />
                                        {format(parseISO(excellence.excellence_month + "-01"), "MM/yyyy")}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                <Badge variant="secondary" className="text-xs font-bold">{soldier.personal_number}</Badge>
                                {/* Fitness Badge */}
                                <Badge className={`${getFitnessStatus(soldier).color} text-white text-xs`}>
                                  {getFitnessStatus(soldier).icon} {getFitnessStatus(soldier).label}
                                </Badge>
                                {/* Safety Score Badge */}
                                <Badge className={`${getSafetyScoreStatus(soldier).color} text-white text-xs flex items-center gap-1`}>
                                  <Gauge className="w-3 h-3" />
                                  {getSafetyScoreStatus(soldier).label}
                                </Badge>
                              </div>
                              
                              {soldier.outpost && (
                                <p className="text-sm text-slate-500 mb-2">מוצב: {soldier.outpost}</p>
                              )}
                              
                              <div className="flex flex-wrap gap-2">
                                <div className="flex items-center gap-1">
                                  <Shield className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">צבאי:</span>
                                  <Badge className={`${militaryStatus.color} text-white text-xs`}>
                                    {soldier.military_license_expiry 
                                      ? format(parseISO(soldier.military_license_expiry), "dd/MM/yy")
                                      : "לא הוזן"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Shield className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">אזרחי:</span>
                                  <Badge className={`${civilianStatus.color} text-white text-xs`}>
                                    {soldier.civilian_license_expiry 
                                      ? format(parseISO(soldier.civilian_license_expiry), "dd/MM/yy")
                                      : "לא הוזן"}
                                  </Badge>
                                </div>
                              </div>
                              
                              {soldier.qualified_date && (
                                <div className="flex items-center gap-1 mt-2">
                                  <CheckCircle className="w-3 h-3 text-emerald-500" />
                                  <span className="text-xs text-emerald-600 font-medium">
                                    מוכשר מ: {format(parseISO(soldier.qualified_date), "dd/MM/yyyy")}
                                  </span>
                                </div>
                              )}
                              
                              {soldier.release_date && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span className="text-xs text-slate-500">
                                    שחרור: {format(parseISO(soldier.release_date), "dd/MM/yyyy")}
                                  </span>
                                </div>
                              )}
                              
                              {soldier.defensive_driving_passed && (
                                <div className="flex items-center gap-1 mt-2">
                                  <Badge className="bg-blue-500 text-white text-xs gap-1">
                                    <Car className="w-3 h-3" />
                                    עבר נהיגה מונעת
                                  </Badge>
                                </div>
                              )}
                              
                              {/* Correct Driving in Service Status */}
                              <div className="flex items-center gap-1 mt-2">
                                <Car className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-500">נהיגה נכונה בשירות:</span>
                                <Badge className={`${getCorrectDrivingStatus(soldier).color} text-white text-xs`}>
                                  {soldier.correct_driving_in_service_date 
                                    ? format(parseISO(soldier.correct_driving_in_service_date), "dd/MM/yy")
                                    : "לא הוזן"}
                                </Badge>
                              </div>
                              
                              {/* License Type & Permits */}
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {soldier.license_type && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500">סוג רשיון:</span>
                                    <Badge className="bg-indigo-500 text-white text-xs">{soldier.license_type}</Badge>
                                  </div>
                                )}
                                {soldier.permits && soldier.permits.length > 0 && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-xs text-slate-500">היתרים:</span>
                                    {soldier.permits.map(permit => (
                                      <Badge key={permit} className="bg-teal-500 text-white text-xs">{permit}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setProfileSoldier(soldier); setProfileOpen(true); }}
                                className="rounded-xl text-blue-500 hover:text-blue-600 hover:bg-blue-50"
                                title="צפייה בפרופיל מרוכז"
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(soldier)}
                                className="rounded-xl"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => { setSoldierToDelete(soldier); setDeleteConfirmOpen(true); }}
                                className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingSoldier ? "עריכת חייל" : "הוספת חייל חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>מספר אישי *</Label>
                <Input
                  value={formData.personal_number}
                  onChange={(e) => setFormData({ ...formData, personal_number: e.target.value })}
                  placeholder="הזן מספר אישי"
                />
              </div>

              <div>
                <Label>שם מלא *</Label>
                <Input
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="הזן שם מלא"
                />
              </div>

              <div>
                <Label>תוקף רשיון צבאי</Label>
                <Input
                  type="date"
                  value={formData.military_license_expiry}
                  onChange={(e) => setFormData({ ...formData, military_license_expiry: e.target.value })}
                />
              </div>

              <div>
                <Label>תוקף רשיון אזרחי</Label>
                <Input
                  type="date"
                  value={formData.civilian_license_expiry}
                  onChange={(e) => setFormData({ ...formData, civilian_license_expiry: e.target.value })}
                />
              </div>

              <div>
                <Label>תאריך שחרור</Label>
                <Input
                  type="date"
                  value={formData.release_date}
                  onChange={(e) => setFormData({ ...formData, release_date: e.target.value })}
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <Label className="text-emerald-700 font-bold">תאריך נהג מוכשר *</Label>
                <p className="text-xs text-emerald-600 mb-2">מתי הנהג הוכשר לנהיגה ביחידה</p>
                <Input
                  type="date"
                  value={formData.qualified_date}
                  onChange={(e) => setFormData({ ...formData, qualified_date: e.target.value })}
                  className="bg-white"
                />
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-50 border border-blue-200">
                <input
                  type="checkbox"
                  id="defensive_driving"
                  checked={formData.defensive_driving_passed}
                  onChange={(e) => setFormData({ ...formData, defensive_driving_passed: e.target.checked })}
                  className="w-5 h-5 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="defensive_driving" className="cursor-pointer">
                  <span className="font-bold text-blue-700">עבר נהיגה מונעת</span>
                  <p className="text-xs text-blue-600">סמן אם החייל עבר הכשרת נהיגה מונעת</p>
                </Label>
              </div>

              <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                <Label className="text-purple-700 font-bold">נהיגה נכונה בשירות</Label>
                <p className="text-xs text-purple-600 mb-2">נדרש אחת לשנה לשמירה על כשירות</p>
                <Input
                  type="date"
                  value={formData.correct_driving_in_service_date}
                  onChange={(e) => setFormData({ ...formData, correct_driving_in_service_date: e.target.value })}
                  className="bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>סוג רשיון</Label>
                  <Select 
                    value={formData.license_type} 
                    onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="בחר סוג רשיון" />
                    </SelectTrigger>
                    <SelectContent>
                      {LICENSE_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>היתרים</Label>
                  <div className="space-y-2 mt-1">
                    {PERMITS_LIST.map(permit => (
                      <div key={permit} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id={`permit-${permit}`}
                          checked={formData.permits.includes(permit)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, permits: [...formData.permits, permit] });
                            } else {
                              setFormData({ ...formData, permits: formData.permits.filter(p => p !== permit) });
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                        />
                        <Label htmlFor={`permit-${permit}`} className="text-sm cursor-pointer">{permit}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingSoldier ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm Dialog */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>אישור מחיקה</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">
              האם אתה בטוח שברצונך להסיר את {soldierToDelete?.full_name}?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                ביטול
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                הסר
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Soldier Profile Dialog */}
        <SoldierProfileDialog
          soldier={profileSoldier}
          open={profileOpen}
          onOpenChange={setProfileOpen}
        />
      </div>
    </AppLayout>
  );
}
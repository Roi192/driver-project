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
  Car
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
}

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
  
  // Filters
  const [militaryLicenseFilter, setMilitaryLicenseFilter] = useState<string>("all");
  const [civilianLicenseFilter, setCivilianLicenseFilter] = useState<string>("all");
  const [defensiveDrivingFilter, setDefensiveDrivingFilter] = useState<string>("all");

  const [formData, setFormData] = useState({
    personal_number: "",
    full_name: "",
    military_license_expiry: "",
    civilian_license_expiry: "",
    release_date: "",
    defensive_driving_passed: false,
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchSoldiers();
  }, []);

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
    });
    setDialogOpen(true);
  };

  const exportToExcel = () => {
    const data = soldiers.map(soldier => ({
      "מספר אישי": soldier.personal_number,
      "שם מלא": soldier.full_name,
      "מוצב": soldier.outpost || "-",
      "רשיון צבאי": soldier.military_license_expiry ? format(parseISO(soldier.military_license_expiry), "dd/MM/yyyy") : "-",
      "סטטוס רשיון צבאי": getLicenseStatus(soldier.military_license_expiry).label,
      "רשיון אזרחי": soldier.civilian_license_expiry ? format(parseISO(soldier.civilian_license_expiry), "dd/MM/yyyy") : "-",
      "סטטוס רשיון אזרחי": getLicenseStatus(soldier.civilian_license_expiry).label,
      "תאריך שחרור": soldier.release_date ? format(parseISO(soldier.release_date), "dd/MM/yyyy") : "-",
      "נהיגה מונעת": soldier.defensive_driving_passed ? "עבר" : "לא עבר",
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
              <CardContent className="space-y-2">
                {expiringLicenses.slice(0, 5).map(soldier => {
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
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      <SelectItem value="valid">תקף</SelectItem>
                      <SelectItem value="warning">עומד לפוג (60 יום)</SelectItem>
                      <SelectItem value="expired">פג תוקף</SelectItem>
                      <SelectItem value="unknown">לא הוזן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">רשיון אזרחי</Label>
                  <Select value={civilianLicenseFilter} onValueChange={setCivilianLicenseFilter}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      <SelectItem value="valid">תקף</SelectItem>
                      <SelectItem value="warning">עומד לפוג (60 יום)</SelectItem>
                      <SelectItem value="expired">פג תוקף</SelectItem>
                      <SelectItem value="unknown">לא הוזן</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-slate-500 mb-1 block">נהיגה מונעת</Label>
                  <Select value={defensiveDrivingFilter} onValueChange={setDefensiveDrivingFilter}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      <SelectItem value="passed">עבר</SelectItem>
                      <SelectItem value="not_passed">לא עבר</SelectItem>
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
                                <Badge variant="secondary" className="text-xs font-bold">{soldier.personal_number}</Badge>
                                {/* Fitness Badge */}
                                <Badge className={`${getFitnessStatus(soldier).color} text-white text-xs`}>
                                  {getFitnessStatus(soldier).icon} {getFitnessStatus(soldier).label}
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
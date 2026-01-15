import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, startOfMonth } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Gauge, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  FileSpreadsheet,
  Search,
  Upload,
  AlertTriangle,
  CheckCircle,
  Calendar,
  TrendingUp,
  User
} from "lucide-react";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";
import { MONTHS_HEB } from "@/lib/constants";

interface Soldier {
  id: string;
  personal_number: string;
  full_name: string;
}

interface SafetyScore {
  id: string;
  soldier_id: string;
  score_month: string;
  safety_score: number;
  kilometers: number | null;
  speed_violations: number | null;
  harsh_braking: number | null;
  harsh_turns: number | null;
  harsh_accelerations: number | null;
  illegal_overtakes: number | null;
  notes: string | null;
  created_at: string;
}

export default function SafetyScoresManagement() {
  const { isAdmin, loading: authLoading, user } = useAuth();
  const navigate = useNavigate();
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [safetyScores, setSafetyScores] = useState<SafetyScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingScore, setEditingScore] = useState<SafetyScore | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Filter mode: single month or date range
  const [isRangeMode, setIsRangeMode] = useState(false);
  
  // Single month filter
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  
  // Date range filter
  const [startYear, setStartYear] = useState(new Date().getFullYear());
  const [startMonth, setStartMonth] = useState(1);
  const [endYear, setEndYear] = useState(new Date().getFullYear());
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>("");
  
  // Form dialog year/month selection
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [scoreToDelete, setScoreToDelete] = useState<SafetyScore | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importData, setImportData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    soldier_id: "",
    safety_score: 100,
    kilometers: 0,
    speed_violations: 0,
    harsh_braking: 0,
    harsh_turns: 0,
    harsh_accelerations: 0,
    illegal_overtakes: 0,
    notes: "",
  });

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth, isRangeMode, startYear, startMonth, endYear, endMonth, selectedSoldierId]);

  const getSelectedMonthStr = () => {
    const monthStr = String(selectedMonth).padStart(2, '0');
    return `${selectedYear}-${monthStr}`;
  };

  const getMonthLabel = () => {
    const month = MONTHS_HEB.find(m => m.value === selectedMonth);
    return `${month?.label || ''} ${selectedYear}`;
  };

  const getMonthLabelFromDate = (dateStr: string) => {
    const [year, monthNum] = dateStr.split('-');
    const month = MONTHS_HEB.find(m => m.value === parseInt(monthNum));
    return `${month?.label || ''} ${year}`;
  };

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch soldiers
    const { data: soldiersData } = await supabase
      .from("soldiers")
      .select("id, personal_number, full_name")
      .eq("is_active", true)
      .order("full_name");
    
    if (soldiersData) setSoldiers(soldiersData);

    // Fetch scores based on mode
    if (isRangeMode && selectedSoldierId) {
      // Date range mode with specific soldier
      const startMonthStr = `${startYear}-${String(startMonth).padStart(2, '0')}-01`;
      const endMonthStr = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
      
      const { data: scoresData } = await supabase
        .from("monthly_safety_scores")
        .select("*")
        .eq("soldier_id", selectedSoldierId)
        .gte("score_month", startMonthStr)
        .lte("score_month", endMonthStr)
        .order("score_month", { ascending: true });
      
      if (scoresData) setSafetyScores(scoresData);
    } else if (!isRangeMode) {
      // Single month mode
      const monthStr = getSelectedMonthStr();
      const { data: scoresData } = await supabase
        .from("monthly_safety_scores")
        .select("*")
        .eq("score_month", `${monthStr}-01`)
        .order("safety_score", { ascending: true });
      
      if (scoresData) setSafetyScores(scoresData);
    } else {
      setSafetyScores([]);
    }
    
    setLoading(false);
  };

  const getSoldierName = (soldierId: string) => {
    return soldiers.find(s => s.id === soldierId)?.full_name || "לא ידוע";
  };

  const handleSubmit = async () => {
    if (!formData.soldier_id) {
      toast.error("יש לבחור חייל");
      return;
    }

    const scoreMonthStr = `${formYear}-${String(formMonth).padStart(2, '0')}-01`;
    const scoreData = {
      soldier_id: formData.soldier_id,
      score_month: scoreMonthStr,
      safety_score: formData.safety_score,
      kilometers: formData.kilometers,
      speed_violations: formData.speed_violations,
      harsh_braking: formData.harsh_braking,
      harsh_turns: formData.harsh_turns,
      harsh_accelerations: formData.harsh_accelerations,
      illegal_overtakes: formData.illegal_overtakes,
      notes: formData.notes || null,
      created_by: user?.id,
    };

    if (editingScore) {
      const { error } = await supabase
        .from("monthly_safety_scores")
        .update(scoreData)
        .eq("id", editingScore.id);

      if (error) {
        toast.error("שגיאה בעדכון הציון");
      } else {
        toast.success("הציון עודכן בהצלחה");
        await updateSoldierSafetyStatus(formData.soldier_id);
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("monthly_safety_scores")
        .insert(scoreData);

      if (error) {
        if (error.code === "23505") {
          toast.error("כבר קיים ציון לנהג זה בחודש הנבחר");
        } else {
          toast.error("שגיאה בהוספת הציון");
        }
      } else {
        toast.success("הציון נוסף בהצלחה");
        await updateSoldierSafetyStatus(formData.soldier_id);
        fetchData();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const updateSoldierSafetyStatus = async (soldierId: string) => {
    // Get last 3 months of scores for this soldier
    const { data: recentScores } = await supabase
      .from("monthly_safety_scores")
      .select("safety_score, score_month")
      .eq("soldier_id", soldierId)
      .order("score_month", { ascending: false })
      .limit(3);

    if (!recentScores || recentScores.length === 0) return;

    const latestScore = recentScores[0].safety_score;
    const lowScoreMonths = recentScores.filter(s => s.safety_score < 75).length;
    
    let safetyStatus = 'ok';
    if (lowScoreMonths >= 3) {
      safetyStatus = 'suspended';
    } else if (lowScoreMonths >= 2) {
      safetyStatus = 'critical';
    } else if (latestScore < 75) {
      safetyStatus = 'warning';
    }

    await supabase
      .from("soldiers")
      .update({
        current_safety_score: latestScore,
        consecutive_low_months: lowScoreMonths,
        safety_status: safetyStatus,
      })
      .eq("id", soldierId);
  };

  const handleDelete = async () => {
    if (!scoreToDelete) return;

    const { error } = await supabase
      .from("monthly_safety_scores")
      .delete()
      .eq("id", scoreToDelete.id);

    if (error) {
      toast.error("שגיאה במחיקת הציון");
    } else {
      toast.success("הציון נמחק בהצלחה");
      await updateSoldierSafetyStatus(scoreToDelete.soldier_id);
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setScoreToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      soldier_id: "",
      safety_score: 100,
      kilometers: 0,
      speed_violations: 0,
      harsh_braking: 0,
      harsh_turns: 0,
      harsh_accelerations: 0,
      illegal_overtakes: 0,
      notes: "",
    });
    setFormYear(new Date().getFullYear());
    setFormMonth(new Date().getMonth() + 1);
    setEditingScore(null);
  };

  const openEditDialog = (score: SafetyScore) => {
    setEditingScore(score);
    const [year, month] = score.score_month.split('-');
    setFormYear(parseInt(year));
    setFormMonth(parseInt(month));
    setFormData({
      soldier_id: score.soldier_id,
      safety_score: score.safety_score,
      kilometers: score.kilometers || 0,
      speed_violations: score.speed_violations || 0,
      harsh_braking: score.harsh_braking || 0,
      harsh_turns: score.harsh_turns || 0,
      harsh_accelerations: score.harsh_accelerations || 0,
      illegal_overtakes: score.illegal_overtakes || 0,
      notes: score.notes || "",
    });
    setDialogOpen(true);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
      // Map the data
      const mappedData = jsonData.map((row: any) => ({
        personal_number: row['מספר אישי'] || row['personal_number'] || '',
        safety_score: Number(row['ציון בטיחות'] || row['safety_score'] || row['ציון'] || 0),
        kilometers: Number(row['קילומטרים'] || row['kilometers'] || row['ק"מ'] || 0),
        speed_violations: Number(row['חריגות מהירות'] || row['speed_violations'] || 0),
        harsh_braking: Number(row['בלימות חדות'] || row['harsh_braking'] || 0),
        harsh_turns: Number(row['פניות חדות'] || row['harsh_turns'] || 0),
        harsh_accelerations: Number(row['האצות חדות'] || row['harsh_accelerations'] || 0),
        illegal_overtakes: Number(row['עקיפות מסוכנות'] || row['illegal_overtakes'] || 0),
      }));

      setImportData(mappedData);
      setImportDialogOpen(true);
    };
    reader.readAsArrayBuffer(file);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = async () => {
    setImporting(true);
    let successCount = 0;
    let errorCount = 0;
    const monthStr = getSelectedMonthStr();

    for (const row of importData) {
      const soldier = soldiers.find(s => s.personal_number === String(row.personal_number));
      if (!soldier) {
        errorCount++;
        continue;
      }

      const { error } = await supabase
        .from("monthly_safety_scores")
        .upsert({
          soldier_id: soldier.id,
          score_month: `${monthStr}-01`,
          safety_score: row.safety_score,
          kilometers: row.kilometers,
          speed_violations: row.speed_violations,
          harsh_braking: row.harsh_braking,
          harsh_turns: row.harsh_turns,
          harsh_accelerations: row.harsh_accelerations,
          illegal_overtakes: row.illegal_overtakes,
          created_by: user?.id,
        }, { onConflict: 'soldier_id,score_month' });

      if (error) {
        errorCount++;
      } else {
        successCount++;
        await updateSoldierSafetyStatus(soldier.id);
      }
    }

    toast.success(`יובאו ${successCount} רשומות בהצלחה${errorCount > 0 ? `, ${errorCount} נכשלו` : ''}`);
    setImportDialogOpen(false);
    setImportData([]);
    setImporting(false);
    fetchData();
  };

  const downloadTemplate = () => {
    const templateData = soldiers.map(s => ({
      'מספר אישי': s.personal_number,
      'שם מלא': s.full_name,
      'ציון בטיחות': '',
      'קילומטרים': '',
      'חריגות מהירות': '',
      'בלימות חדות': '',
      'פניות חדות': '',
      'האצות חדות': '',
      'עקיפות מסוכנות': '',
    }));

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ציוני בטיחות");
    XLSX.writeFile(wb, `תבנית_ציוני_בטיחות_${getSelectedMonthStr()}.xlsx`);
    toast.success("התבנית הורדה בהצלחה");
  };

  const exportToExcel = () => {
    const data = safetyScores.map(score => ({
      "שם מלא": getSoldierName(score.soldier_id),
      "חודש": score.score_month.slice(0, 7),
      "ציון בטיחות": score.safety_score,
      "קילומטרים": score.kilometers || 0,
      "חריגות מהירות": score.speed_violations || 0,
      "בלימות חדות": score.harsh_braking || 0,
      "פניות חדות": score.harsh_turns || 0,
      "האצות חדות": score.harsh_accelerations || 0,
      "עקיפות מסוכנות": score.illegal_overtakes || 0,
      "הערות": score.notes || "",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ציוני בטיחות");
    XLSX.writeFile(wb, `ציוני_בטיחות_${isRangeMode ? 'טווח' : getSelectedMonthStr()}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  const filteredScores = safetyScores.filter(score => {
    const soldierName = getSoldierName(score.soldier_id);
    return soldierName.includes(searchTerm);
  });

  const getScoreColor = (score: number) => {
    if (score >= 75) return "bg-emerald-500";
    if (score >= 60) return "bg-amber-500";
    return "bg-red-500";
  };

  // Calculate average for range mode
  const averageScore = safetyScores.length > 0
    ? Math.round(safetyScores.reduce((sum, s) => sum + s.safety_score, 0) / safetyScores.length)
    : 0;

  const stats = {
    total: safetyScores.length,
    good: safetyScores.filter(s => s.safety_score >= 75).length,
    warning: safetyScores.filter(s => s.safety_score >= 60 && s.safety_score < 75).length,
    critical: safetyScores.filter(s => s.safety_score < 60).length,
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
        <div className="relative overflow-hidden bg-gradient-to-l from-amber-900 via-amber-800 to-amber-900 px-4 py-8">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--gold)/0.2),transparent_50%)]" />
          <div className="absolute top-4 left-4 opacity-20">
            <img src={unitLogo} alt="" className="w-20 h-20" />
          </div>
          
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gold/20 border border-gold/30 mb-4">
              <Gauge className="w-4 h-4 text-gold" />
              <span className="text-sm font-bold text-gold">ציוני בטיחות</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">ניהול ציוני בטיחות חודשיים</h1>
            <p className="text-amber-200 text-sm">
              {isRangeMode && selectedSoldierId 
                ? `${safetyScores.length} ציונים ל${getSoldierName(selectedSoldierId)}`
                : `${safetyScores.length} ציונים ל${getMonthLabel()}`
              }
            </p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Filter Mode Toggle */}
          <Card className="border-0 shadow-lg bg-white/90 backdrop-blur rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span className="font-bold text-slate-700">מצב סינון</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm ${!isRangeMode ? 'font-bold text-primary' : 'text-slate-600'}`}>חודש בודד</span>
                  <Switch checked={isRangeMode} onCheckedChange={setIsRangeMode} />
                  <span className={`text-sm ${isRangeMode ? 'font-bold text-primary' : 'text-slate-600'}`}>טווח תאריכים</span>
                </div>
              </div>

              {!isRangeMode ? (
                // Single month mode
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-700 font-bold">שנה:</Label>
                    <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                      <SelectTrigger className="w-24 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-slate-700 font-bold">חודש:</Label>
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                      <SelectTrigger className="w-32 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_HEB.map(month => (
                          <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                // Date range mode
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-700 font-bold mb-2 block">
                      <User className="w-4 h-4 inline ml-1" />
                      בחר חייל
                    </Label>
                    <Select value={selectedSoldierId} onValueChange={setSelectedSoldierId}>
                      <SelectTrigger className="w-full rounded-xl">
                        <SelectValue placeholder="בחר חייל לצפייה בציונים" />
                      </SelectTrigger>
                      <SelectContent>
                        {soldiers.map(soldier => (
                          <SelectItem key={soldier.id} value={soldier.id}>
                            {soldier.full_name} ({soldier.personal_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2 p-3 rounded-xl bg-slate-50 border">
                      <Label className="text-slate-700 font-bold text-sm">מתאריך</Label>
                      <div className="flex gap-2">
                        <Select value={String(startMonth)} onValueChange={(v) => setStartMonth(Number(v))}>
                          <SelectTrigger className="flex-1 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS_HEB.map(month => (
                              <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={String(startYear)} onValueChange={(v) => setStartYear(Number(v))}>
                          <SelectTrigger className="w-20 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026, 2027].map(year => (
                              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    
                    <div className="space-y-2 p-3 rounded-xl bg-slate-50 border">
                      <Label className="text-slate-700 font-bold text-sm">עד תאריך</Label>
                      <div className="flex gap-2">
                        <Select value={String(endMonth)} onValueChange={(v) => setEndMonth(Number(v))}>
                          <SelectTrigger className="flex-1 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS_HEB.map(month => (
                              <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select value={String(endYear)} onValueChange={(v) => setEndYear(Number(v))}>
                          <SelectTrigger className="w-20 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {[2024, 2025, 2026, 2027].map(year => (
                              <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Cards */}
          {isRangeMode && selectedSoldierId && safetyScores.length > 0 ? (
            // Range mode stats with average
            <Card className="border-0 bg-gradient-to-br from-primary/10 to-teal/10 shadow-lg rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600 font-medium">ממוצע ציונים</p>
                    <p className="text-3xl font-black text-primary">{averageScore}</p>
                    <p className="text-xs text-slate-500">{safetyScores.length} חודשים</p>
                  </div>
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center ${getScoreColor(averageScore)}`}>
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-4 gap-3">
              <Card className="border-0 bg-gradient-to-br from-slate-50 to-slate-100 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-black text-slate-700">{stats.total}</div>
                  <p className="text-xs font-bold text-slate-500">סה"כ</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-emerald-50 to-teal-50 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-black text-emerald-600">{stats.good}</div>
                  <p className="text-xs font-bold text-emerald-700">75+</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-amber-50 to-yellow-50 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-black text-amber-600">{stats.warning}</div>
                  <p className="text-xs font-bold text-amber-700">60-74</p>
                </CardContent>
              </Card>
              <Card className="border-0 bg-gradient-to-br from-red-50 to-orange-50 shadow-lg">
                <CardContent className="p-3 text-center">
                  <div className="text-2xl font-black text-red-600">{stats.critical}</div>
                  <p className="text-xs font-bold text-red-700">&lt;60</p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-primary to-teal text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף ציון
            </Button>
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="py-6 rounded-2xl border-2"
            >
              <Upload className="w-5 h-5 ml-2" />
              ייבוא מאקסל
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
            />
            <Button
              onClick={downloadTemplate}
              variant="outline"
              className="py-6 rounded-2xl border-2"
            >
              <FileSpreadsheet className="w-5 h-5" />
            </Button>
            <Button
              onClick={exportToExcel}
              variant="outline"
              className="py-6 rounded-2xl border-2"
            >
              ייצוא
            </Button>
          </div>

          {/* Search */}
          {!isRangeMode && (
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                placeholder="חיפוש לפי שם..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 py-6 rounded-2xl border-2"
              />
            </div>
          )}

          {/* Scores List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">
                {isRangeMode && selectedSoldierId 
                  ? `ציוני בטיחות - ${getSoldierName(selectedSoldierId)}`
                  : `ציוני בטיחות - ${getMonthLabel()}`
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[50vh]">
                <div className="space-y-3">
                  {isRangeMode && !selectedSoldierId ? (
                    <div className="text-center py-12 text-slate-500">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>בחר חייל לצפייה בציונים</p>
                    </div>
                  ) : filteredScores.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Gauge className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין ציונים {isRangeMode ? 'בטווח הנבחר' : 'לחודש זה'}</p>
                    </div>
                  ) : (
                    filteredScores.map(score => (
                      <div
                        key={score.id}
                        className={`p-4 rounded-2xl border transition-all ${
                          score.safety_score < 75 ? "bg-red-50/50 border-red-200" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              {isRangeMode ? (
                                <h4 className="font-bold text-slate-800">{getMonthLabelFromDate(score.score_month)}</h4>
                              ) : (
                                <h4 className="font-bold text-slate-800">{getSoldierName(score.soldier_id)}</h4>
                              )}
                              <Badge className={`${getScoreColor(score.safety_score)} text-white text-sm font-bold`}>
                                {score.safety_score}
                              </Badge>
                              {score.safety_score < 75 && (
                                <Badge variant="outline" className="text-red-600 border-red-300">
                                  <AlertTriangle className="w-3 h-3 ml-1" />
                                  דורש שיחה
                                </Badge>
                              )}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-sm text-slate-500">
                              <div>ק"מ: {score.kilometers || 0}</div>
                              <div>מהירות: {score.speed_violations || 0}</div>
                              <div>בלימות: {score.harsh_braking || 0}</div>
                              <div>פניות: {score.harsh_turns || 0}</div>
                              <div>האצות: {score.harsh_accelerations || 0}</div>
                              <div>עקיפות: {score.illegal_overtakes || 0}</div>
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(score)}
                              className="rounded-xl"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setScoreToDelete(score); setDeleteConfirmOpen(true); }}
                              className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
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

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>{editingScore ? "עריכת ציון" : "הוספת ציון חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>חייל *</Label>
                <Select 
                  value={formData.soldier_id} 
                  onValueChange={(value) => setFormData({ ...formData, soldier_id: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder="בחר חייל" />
                  </SelectTrigger>
                  <SelectContent>
                    {soldiers.map(soldier => (
                      <SelectItem key={soldier.id} value={soldier.id}>
                        {soldier.full_name} ({soldier.personal_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border">
                <Label className="font-bold mb-2 block">חודש וציון *</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs text-slate-500">שנה</Label>
                    <Select value={String(formYear)} onValueChange={(v) => setFormYear(Number(v))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[2024, 2025, 2026, 2027].map(year => (
                          <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">חודש</Label>
                    <Select value={String(formMonth)} onValueChange={(v) => setFormMonth(Number(v))}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS_HEB.map(month => (
                          <SelectItem key={month.value} value={String(month.value)}>{month.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <Label className="text-amber-700 font-bold">ציון בטיחות * (0-100)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={formData.safety_score}
                  onChange={(e) => setFormData({ ...formData, safety_score: Number(e.target.value) })}
                  className="mt-2 bg-white text-lg font-bold text-center"
                />
                {formData.safety_score < 75 && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    ציון מתחת ל-75 דורש שיחת בירור
                  </p>
                )}
              </div>

              <div>
                <Label>קילומטרים</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.kilometers}
                  onChange={(e) => setFormData({ ...formData, kilometers: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">חריגות מהירות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.speed_violations}
                    onChange={(e) => setFormData({ ...formData, speed_violations: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">בלימות חדות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.harsh_braking}
                    onChange={(e) => setFormData({ ...formData, harsh_braking: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">פניות חדות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.harsh_turns}
                    onChange={(e) => setFormData({ ...formData, harsh_turns: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">האצות חדות</Label>
                  <Input
                    type="number"
                    min={0}
                    value={formData.harsh_accelerations}
                    onChange={(e) => setFormData({ ...formData, harsh_accelerations: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <Label>עקיפות מסוכנות</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.illegal_overtakes}
                  onChange={(e) => setFormData({ ...formData, illegal_overtakes: Number(e.target.value) })}
                />
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות..."
                />
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingScore ? "עדכן" : "הוסף"}
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
              האם אתה בטוח שברצונך למחוק את הציון של {scoreToDelete ? getSoldierName(scoreToDelete.soldier_id) : ""}?
            </p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                ביטול
              </Button>
              <Button variant="destructive" onClick={handleDelete}>
                מחק
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle>ייבוא ציוני בטיחות</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <p className="text-slate-600">
                נמצאו {importData.length} רשומות. הציונים ייובאו לחודש {getMonthLabel()}.
              </p>
              
              <ScrollArea className="h-[300px] border rounded-xl p-3">
                <div className="space-y-2">
                  {importData.map((row, idx) => {
                    const soldier = soldiers.find(s => s.personal_number === String(row.personal_number));
                    return (
                      <div 
                        key={idx}
                        className={`p-3 rounded-lg flex items-center justify-between ${
                          soldier ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {soldier ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600" />
                          )}
                          <div>
                            <p className="font-bold">{row.personal_number}</p>
                            <p className="text-sm text-slate-500">
                              {soldier ? soldier.full_name : 'לא נמצא במערכת'}
                            </p>
                          </div>
                        </div>
                        <Badge className={`${row.safety_score >= 75 ? 'bg-emerald-500' : 'bg-red-500'} text-white`}>
                          ציון: {row.safety_score}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
              
              <p className="text-sm text-slate-500">
                <CheckCircle className="w-4 h-4 inline ml-1 text-green-600" />
                {importData.filter(r => soldiers.some(s => s.personal_number === String(r.personal_number))).length} רשומות תקינות
                <span className="mx-2">|</span>
                <AlertTriangle className="w-4 h-4 inline ml-1 text-red-600" />
                {importData.filter(r => !soldiers.some(s => s.personal_number === String(r.personal_number))).length} לא נמצאו
              </p>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
                ביטול
              </Button>
              <Button onClick={handleImport} disabled={importing} className="bg-primary">
                {importing ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : null}
                ייבא ציונים
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Gavel, 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  FileSpreadsheet,
  Search,
  User
} from "lucide-react";
import * as XLSX from "xlsx";
import unitLogo from "@/assets/unit-logo.png";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface Punishment {
  id: string;
  soldier_id: string;
  punishment_date: string;
  offense: string;
  punishment: string;
  judge: string;
  notes: string | null;
  created_at: string;
  soldiers?: Soldier;
}

export default function PunishmentsTracking() {
  const { isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [punishments, setPunishments] = useState<Punishment[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPunishment, setEditingPunishment] = useState<Punishment | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<Punishment | null>(null);

  const [formData, setFormData] = useState({
    soldier_id: "",
    punishment_date: format(new Date(), "yyyy-MM-dd"),
    offense: "",
    punishment: "",
    judge: "",
    notes: "",
  });

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
    
    const [punishmentsRes, soldiersRes] = await Promise.all([
      supabase
        .from("punishments")
        .select("*, soldiers(id, full_name, personal_number)")
        .order("punishment_date", { ascending: false }),
      supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .eq("is_active", true)
        .order("full_name")
    ]);

    if (punishmentsRes.error) {
      console.error("Error fetching punishments:", punishmentsRes.error);
    } else {
      setPunishments(punishmentsRes.data || []);
    }

    if (soldiersRes.error) {
      console.error("Error fetching soldiers:", soldiersRes.error);
    } else {
      setSoldiers(soldiersRes.data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.soldier_id || !formData.offense || !formData.punishment || !formData.judge) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }

    const data = {
      soldier_id: formData.soldier_id,
      punishment_date: formData.punishment_date,
      offense: formData.offense,
      punishment: formData.punishment,
      judge: formData.judge,
      notes: formData.notes || null,
    };

    if (editingPunishment) {
      const { error } = await supabase
        .from("punishments")
        .update(data)
        .eq("id", editingPunishment.id);

      if (error) {
        toast.error("שגיאה בעדכון");
      } else {
        toast.success("עודכן בהצלחה");
        fetchData();
      }
    } else {
      const { error } = await supabase
        .from("punishments")
        .insert(data);

      if (error) {
        toast.error("שגיאה בהוספה");
      } else {
        toast.success("נוסף בהצלחה");
        fetchData();
      }
    }

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async () => {
    if (!itemToDelete) return;

    const { error } = await supabase
      .from("punishments")
      .delete()
      .eq("id", itemToDelete.id);

    if (error) {
      toast.error("שגיאה במחיקה");
    } else {
      toast.success("נמחק בהצלחה");
      fetchData();
    }
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  const resetForm = () => {
    setFormData({
      soldier_id: "",
      punishment_date: format(new Date(), "yyyy-MM-dd"),
      offense: "",
      punishment: "",
      judge: "",
      notes: "",
    });
    setEditingPunishment(null);
  };

  const openEditDialog = (punishment: Punishment) => {
    setEditingPunishment(punishment);
    setFormData({
      soldier_id: punishment.soldier_id,
      punishment_date: punishment.punishment_date,
      offense: punishment.offense,
      punishment: punishment.punishment,
      judge: punishment.judge,
      notes: punishment.notes || "",
    });
    setDialogOpen(true);
  };

  const exportToExcel = () => {
    const data = punishments.map(p => ({
      "תאריך": format(parseISO(p.punishment_date), "dd/MM/yyyy"),
      "שם החייל": p.soldiers?.full_name || "-",
      "מספר אישי": p.soldiers?.personal_number || "-",
      "העבירה": p.offense,
      "העונש": p.punishment,
      "השופט": p.judge,
      "הערות": p.notes || "-",
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "מעקב עונשים");
    XLSX.writeFile(wb, `מעקב_עונשים_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
    toast.success("הקובץ יוצא בהצלחה");
  };

  const filteredPunishments = punishments.filter(p =>
    p.soldiers?.full_name?.includes(searchTerm) ||
    p.offense.includes(searchTerm) ||
    p.punishment.includes(searchTerm)
  );

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
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/20 border border-red-500/30 mb-4">
              <Gavel className="w-4 h-4 text-red-400" />
              <span className="text-sm font-bold text-red-400">מעקב עונשים</span>
            </div>
            <h1 className="text-2xl font-black text-white mb-2">ניהול עונשים</h1>
            <p className="text-slate-400 text-sm">{punishments.length} רשומות</p>
          </div>
        </div>

        <div className="px-4 py-6 space-y-6">
          {/* Actions */}
          <div className="flex gap-3">
            <Button
              onClick={() => { resetForm(); setDialogOpen(true); }}
              className="flex-1 bg-gradient-to-r from-red-500 to-red-600 text-white py-6 rounded-2xl shadow-lg"
            >
              <Plus className="w-5 h-5 ml-2" />
              הוסף עונש
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

          {/* List */}
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur rounded-3xl">
            <CardHeader>
              <CardTitle className="text-slate-800">רשימת עונשים</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {filteredPunishments.length === 0 ? (
                    <div className="text-center py-12 text-slate-500">
                      <Gavel className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>אין עונשים</p>
                    </div>
                  ) : (
                    filteredPunishments.map(p => (
                      <div key={p.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <User className="w-4 h-4 text-slate-400" />
                              <h4 className="font-bold text-slate-800">{p.soldiers?.full_name}</h4>
                              <span className="text-xs text-slate-500">
                                {format(parseISO(p.punishment_date), "dd/MM/yyyy")}
                              </span>
                            </div>
                            <p className="text-sm text-slate-600 mb-1"><strong>העבירה:</strong> {p.offense}</p>
                            <p className="text-sm text-slate-600 mb-1"><strong>העונש:</strong> {p.punishment}</p>
                            <p className="text-sm text-slate-500"><strong>שופט:</strong> {p.judge}</p>
                            {p.notes && (
                              <p className="text-sm text-slate-500 mt-1"><strong>הערות:</strong> {p.notes}</p>
                            )}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditDialog(p)}
                              className="rounded-xl"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => { setItemToDelete(p); setDeleteConfirmOpen(true); }}
                              className="rounded-xl text-red-500"
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
              <DialogTitle>{editingPunishment ? "עריכה" : "הוספת עונש חדש"}</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label>חייל *</Label>
                <Select
                  value={formData.soldier_id}
                  onValueChange={(value) => setFormData({ ...formData, soldier_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר חייל" />
                  </SelectTrigger>
                  <SelectContent>
                    {soldiers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>תאריך *</Label>
                <Input
                  type="date"
                  value={formData.punishment_date}
                  onChange={(e) => setFormData({ ...formData, punishment_date: e.target.value })}
                />
              </div>

              <div>
                <Label>מה עשה *</Label>
                <Textarea
                  value={formData.offense}
                  onChange={(e) => setFormData({ ...formData, offense: e.target.value })}
                  placeholder="תאר את העבירה"
                />
              </div>

              <div>
                <Label>מה העונש *</Label>
                <Textarea
                  value={formData.punishment}
                  onChange={(e) => setFormData({ ...formData, punishment: e.target.value })}
                  placeholder="תאר את העונש"
                />
              </div>

              <div>
                <Label>השופט *</Label>
                <Input
                  value={formData.judge}
                  onChange={(e) => setFormData({ ...formData, judge: e.target.value })}
                  placeholder="שם השופט"
                />
              </div>

              <div>
                <Label>הערות</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="הערות נוספות"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 mt-4">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>ביטול</Button>
              <Button onClick={handleSubmit} className="bg-primary">
                {editingPunishment ? "עדכן" : "הוסף"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirm */}
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent dir="rtl">
            <DialogHeader>
              <DialogTitle>אישור מחיקה</DialogTitle>
            </DialogHeader>
            <p className="text-slate-600">האם אתה בטוח?</p>
            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>ביטול</Button>
              <Button variant="destructive" onClick={handleDelete}>מחק</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
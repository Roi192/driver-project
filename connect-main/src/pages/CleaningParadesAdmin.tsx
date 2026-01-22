import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { OUTPOSTS } from "@/lib/constants";
import { useNavigate } from "react-router-dom";
import { format, startOfWeek, addWeeks } from "date-fns";
import { he } from "date-fns/locale";
import { 
  Plus, 
  Trash2, 
  Edit,
  MapPin,
  ListChecks,
  Image,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  Calendar
} from "lucide-react";

interface ResponsibilityArea {
  id: string;
  outpost: string;
  area_name: string;
  description: string | null;
  display_order: number;
  is_active: boolean;
}

interface Highlight {
  id: string;
  title: string;
  display_order: number;
  is_active: boolean;
  area_id: string | null;
}

interface ExamplePhoto {
  id: string;
  outpost: string | null;
  description: string;
  image_url: string;
  display_order: number;
  area_id: string | null;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  outpost: string | null;
}

interface DayAssignment {
  id: string;
  area_id: string;
  soldier_id: string;
  week_start_date: string;
  day_of_week: string;
}

const DAY_OPTIONS = [
  { value: "monday", label: "יום שני" },
  { value: "wednesday", label: "יום רביעי" },
  { value: "saturday_night", label: "מוצאי שבת" },
];

export default function CleaningParadesAdmin() {
  const { canAccessCleaningManagement, loading: roleLoading } = useAuth();
  const navigate = useNavigate();
  
  // Data state
  const [areas, setAreas] = useState<ResponsibilityArea[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [examples, setExamples] = useState<ExamplePhoto[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [dayAssignments, setDayAssignments] = useState<DayAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Selection state
  const [selectedOutpost, setSelectedOutpost] = useState<string>(OUTPOSTS[0]);
  const [expandedAreaId, setExpandedAreaId] = useState<string>("");
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [selectedDayForAssignment, setSelectedDayForAssignment] = useState<string>("monday");
  
  // Dialog states
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [highlightDialogOpen, setHighlightDialogOpen] = useState(false);
  const [exampleDialogOpen, setExampleDialogOpen] = useState(false);
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false);
  
  const [editingArea, setEditingArea] = useState<ResponsibilityArea | null>(null);
  const [editingHighlight, setEditingHighlight] = useState<Highlight | null>(null);
  const [currentAreaIdForDialog, setCurrentAreaIdForDialog] = useState<string>("");
  
  // Form states
  const [areaForm, setAreaForm] = useState({ area_name: "", description: "", display_order: 0 });
  const [highlightForm, setHighlightForm] = useState({ title: "" });
  const [exampleForm, setExampleForm] = useState({ description: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedSoldierId, setSelectedSoldierId] = useState<string>("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!roleLoading && !canAccessCleaningManagement) {
      navigate('/');
    }
  }, [canAccessCleaningManagement, roleLoading, navigate]);

  useEffect(() => {
    if (canAccessCleaningManagement) {
      fetchAllData();
    }
  }, [canAccessCleaningManagement, selectedOutpost]);

  useEffect(() => {
    if (canAccessCleaningManagement && selectedOutpost) {
      fetchDayAssignments();
    }
  }, [canAccessCleaningManagement, selectedOutpost, currentWeekStart]);

  const fetchAllData = async () => {
    setLoading(true);
    await Promise.all([fetchAreas(), fetchHighlights(), fetchExamples(), fetchSoldiers()]);
    setLoading(false);
  };

  const fetchAreas = async () => {
    const { data } = await supabase
      .from("cleaning_responsibility_areas")
      .select("*")
      .eq("outpost", selectedOutpost)
      .order("display_order");
    setAreas(data || []);
  };

  const fetchHighlights = async () => {
    const { data } = await supabase
      .from("cleaning_parade_highlights")
      .select("*")
      .order("display_order");
    setHighlights(data || []);
  };

  const fetchExamples = async () => {
    const { data } = await supabase
      .from("cleaning_parade_examples")
      .select("*")
      .order("display_order");
    setExamples(data || []);
  };

  const fetchSoldiers = async () => {
    // Fetch all active soldiers, not just from selected outpost
    const { data } = await supabase
      .from("soldiers")
      .select("id, full_name, personal_number, outpost")
      .eq("is_active", true)
      .order("full_name");
    setSoldiers(data || []);
  };

  const fetchDayAssignments = async () => {
    const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
    const { data } = await supabase
      .from("cleaning_weekly_assignments")
      .select("*")
      .eq("week_start_date", weekStartDate);
    setDayAssignments(data || []);
  };

  const getAssignmentForAreaAndDay = (areaId: string, dayOfWeek: string) => {
    const assignment = dayAssignments.find(a => a.area_id === areaId && a.day_of_week === dayOfWeek);
    if (!assignment) return null;
    const soldier = soldiers.find(s => s.id === assignment.soldier_id);
    return { ...assignment, soldier };
  };

  // Soldier list for assignment (show all soldiers from the control table)
  const getSoldiersForOutpost = () => {
    return soldiers;
  };

  const getHighlightsForArea = (areaId: string) => highlights.filter(h => h.area_id === areaId);
  const getExamplesForArea = (areaId: string) => examples.filter(e => e.area_id === areaId);

  // Area handlers
  const handleSaveArea = async () => {
    if (!areaForm.area_name.trim()) {
      toast.error("יש להזין שם תחום אחריות");
      return;
    }

    try {
      if (editingArea) {
        await supabase
          .from("cleaning_responsibility_areas")
          .update({
            area_name: areaForm.area_name,
            description: areaForm.description || null,
            display_order: areaForm.display_order,
          })
          .eq("id", editingArea.id);
        toast.success("תחום האחריות עודכן בהצלחה");
      } else {
        await supabase.from("cleaning_responsibility_areas").insert({
          outpost: selectedOutpost,
          area_name: areaForm.area_name,
          description: areaForm.description || null,
          display_order: areas.length,
        });
        toast.success("תחום האחריות נוסף בהצלחה");
      }

      setAreaDialogOpen(false);
      setEditingArea(null);
      setAreaForm({ area_name: "", description: "", display_order: 0 });
      fetchAreas();
    } catch (error) {
      toast.error("שגיאה בשמירת תחום האחריות");
    }
  };

  const handleDeleteArea = async (areaId: string) => {
    if (!confirm("האם למחוק את תחום האחריות? כל הדגשים והתמונות יימחקו גם כן.")) return;
    await supabase.from("cleaning_responsibility_areas").delete().eq("id", areaId);
    toast.success("תחום האחריות נמחק");
    setExpandedAreaId("");
    fetchAreas();
    fetchHighlights();
    fetchExamples();
  };

  // Highlight handlers
  const handleSaveHighlight = async () => {
    if (!highlightForm.title.trim()) {
      toast.error("יש להזין כותרת");
      return;
    }

    try {
      if (editingHighlight) {
        await supabase
          .from("cleaning_parade_highlights")
          .update({ title: highlightForm.title })
          .eq("id", editingHighlight.id);
        toast.success("הדגש עודכן בהצלחה");
      } else {
        const areaHighlights = getHighlightsForArea(currentAreaIdForDialog);
        const maxOrder = areaHighlights.length > 0 ? Math.max(...areaHighlights.map(h => h.display_order)) : -1;
        await supabase.from("cleaning_parade_highlights").insert({
          title: highlightForm.title,
          area_id: currentAreaIdForDialog,
          display_order: maxOrder + 1,
          is_active: true,
        });
        toast.success("הדגש נוסף בהצלחה");
      }

      setHighlightDialogOpen(false);
      setEditingHighlight(null);
      setHighlightForm({ title: "" });
      fetchHighlights();
    } catch (error) {
      toast.error("שגיאה בשמירת הדגש");
    }
  };

  const handleDeleteHighlight = async (id: string) => {
    if (!confirm("האם למחוק את הדגש?")) return;
    await supabase.from("cleaning_parade_highlights").delete().eq("id", id);
    toast.success("הדגש נמחק");
    fetchHighlights();
  };

  // Example photo handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAddExample = async () => {
    if (!exampleForm.description || !imageFile) {
      toast.error("נא למלא תיאור ולבחור תמונה");
      return;
    }

    setIsUploading(true);
    try {
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${selectedOutpost}/${currentAreaIdForDialog}/${crypto.randomUUID()}.${fileExt}`;
      
      await supabase.storage.from('cleaning-examples').upload(fileName, imageFile);
      
      // 48 hours validity for example photos (reference content)
      const { data: signedUrlData } = await supabase.storage
        .from('cleaning-examples')
        .createSignedUrl(fileName, 60 * 60 * 24 * 2);

      const areaExamples = getExamplesForArea(currentAreaIdForDialog);
      const maxOrder = areaExamples.length > 0 ? Math.max(...areaExamples.map(e => e.display_order)) : -1;

      await supabase.from('cleaning_parade_examples').insert({
        outpost: selectedOutpost,
        area_id: currentAreaIdForDialog,
        description: exampleForm.description,
        image_url: signedUrlData?.signedUrl || '',
        display_order: maxOrder + 1,
      });

      toast.success("התמונה נוספה בהצלחה");
      setExampleDialogOpen(false);
      setExampleForm({ description: "" });
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchExamples();
    } catch (error) {
      toast.error("שגיאה בהוספת התמונה");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteExample = async (id: string) => {
    if (!confirm("האם למחוק את התמונה?")) return;
    await supabase.from('cleaning_parade_examples').delete().eq('id', id);
    toast.success("התמונה נמחקה");
    fetchExamples();
  };

  // Day assignment handlers
  const handleAssignSoldierToDay = async () => {
    if (!selectedSoldierId || !currentAreaIdForDialog || !selectedDayForAssignment) {
      toast.error("יש לבחור חייל ויום");
      return;
    }

    try {
      const weekStartDate = format(currentWeekStart, 'yyyy-MM-dd');
      
      // Delete existing assignment for this area+day
      await supabase
        .from('cleaning_weekly_assignments')
        .delete()
        .eq('area_id', currentAreaIdForDialog)
        .eq('day_of_week', selectedDayForAssignment)
        .eq('week_start_date', weekStartDate);
      
      // Insert new assignment
      await supabase.from('cleaning_weekly_assignments').insert({
        area_id: currentAreaIdForDialog,
        soldier_id: selectedSoldierId,
        week_start_date: weekStartDate,
        day_of_week: selectedDayForAssignment,
      });

      toast.success("החייל שובץ בהצלחה");
      setAssignmentDialogOpen(false);
      setSelectedSoldierId("");
      fetchDayAssignments();
    } catch (error) {
      toast.error("שגיאה בשיבוץ החייל");
    }
  };

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  if (!canAccessCleaningManagement) return null;

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          <PageHeader
            icon={Settings}
            title="ניהול מסדרי ניקיון"
            subtitle="ניהול תחומי אחריות, דגשים, תמונות ושיבוץ חיילים"
            badge="ניהול"
          />

          {/* Outpost Selection */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-primary" />
                <Label className="font-bold">בחר מוצב:</Label>
                <Select value={selectedOutpost} onValueChange={(value) => {
                  setSelectedOutpost(value);
                  setExpandedAreaId("");
                }}>
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OUTPOSTS.map(outpost => (
                      <SelectItem key={outpost} value={outpost}>{outpost}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Week Navigation */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="w-5 h-5 text-primary" />
                  שבוע שיבוץ
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, -1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[120px] text-center">
                    {format(currentWeekStart, 'dd/MM/yyyy', { locale: he })}
                  </span>
                  <Button variant="outline" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>

          {/* Day-based Assignments */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                שיבוץ חיילים לפי יום ותחום אחריות
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {areas.length === 0 ? (
                <p className="text-center text-slate-500 py-4">אין תחומי אחריות - הוסף תחום חדש למטה</p>
              ) : (
                <div className="space-y-4">
                  {areas.map((area) => (
                    <div key={area.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-800 mb-3">{area.area_name}</h4>
                      <div className="grid grid-cols-1 gap-2">
                        {DAY_OPTIONS.map((day) => {
                          const assignment = getAssignmentForAreaAndDay(area.id, day.value);
                          return (
                            <div key={day.value} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-slate-600 min-w-[80px]">{day.label}</span>
                                {assignment?.soldier ? (
                                  <span className="text-sm text-emerald-600 font-medium">{assignment.soldier.full_name}</span>
                                ) : (
                                  <span className="text-sm text-slate-400">לא שובץ</span>
                                )}
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setCurrentAreaIdForDialog(area.id);
                                  setSelectedDayForAssignment(day.value);
                                  setSelectedSoldierId(assignment?.soldier_id || "");
                                  setAssignmentDialogOpen(true);
                                }}
                              >
                                <Users className="w-4 h-4 ml-1" />
                                שבץ
                              </Button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Responsibility Areas with nested Highlights & Images */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ListChecks className="w-5 h-5 text-primary" />
                  תחומי אחריות - דגשים ותמונות
                </CardTitle>
                <Button 
                  size="sm"
                  onClick={() => {
                    setEditingArea(null);
                    setAreaForm({ area_name: "", description: "", display_order: 0 });
                    setAreaDialogOpen(true);
                  }}
                >
                  <Plus className="w-4 h-4 ml-1" />
                  הוסף תחום
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              {areas.length === 0 ? (
                <p className="text-center text-slate-500 py-4">אין תחומי אחריות למוצב זה</p>
              ) : (
                <Accordion type="single" collapsible value={expandedAreaId} onValueChange={setExpandedAreaId}>
                  {areas.map((area) => {
                    const areaHighlights = getHighlightsForArea(area.id);
                    const areaExamples = getExamplesForArea(area.id);
                    
                    return (
                      <AccordionItem key={area.id} value={area.id} className="border rounded-xl mb-3 overflow-hidden">
                        <AccordionTrigger className="px-4 py-3 hover:no-underline bg-slate-50">
                          <div className="flex items-center justify-between flex-1 ml-2">
                            <span className="font-bold text-slate-800">{area.area_name}</span>
                            <div className="flex items-center gap-2 text-xs">
                              <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full">{areaHighlights.length} דגשים</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">{areaExamples.length} תמונות</span>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 pb-4">
                          <div className="space-y-4">
                            {/* Area Actions */}
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingArea(area);
                                  setAreaForm({ 
                                    area_name: area.area_name, 
                                    description: area.description || "", 
                                    display_order: area.display_order 
                                  });
                                  setAreaDialogOpen(true);
                                }}
                              >
                                <Edit className="w-4 h-4 ml-1" />
                                ערוך
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                onClick={() => handleDeleteArea(area.id)}
                              >
                                <Trash2 className="w-4 h-4 ml-1" />
                                מחק
                              </Button>
                            </div>

                            {area.description && (
                              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">{area.description}</p>
                            )}

                            {/* Highlights Section */}
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-slate-700 flex items-center gap-2">
                                  <ListChecks className="w-4 h-4 text-amber-500" />
                                  דגשים
                                </h5>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCurrentAreaIdForDialog(area.id);
                                    setEditingHighlight(null);
                                    setHighlightForm({ title: "" });
                                    setHighlightDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-4 h-4 ml-1" />
                                  הוסף דגש
                                </Button>
                              </div>
                              {areaHighlights.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-2">אין דגשים לתחום זה</p>
                              ) : (
                                <ul className="space-y-2">
                                  {areaHighlights.map((highlight, index) => (
                                    <li key={highlight.id} className="flex items-center justify-between p-2 bg-amber-50 rounded-lg border border-amber-200">
                                      <div className="flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">
                                          {index + 1}
                                        </span>
                                        <span className="text-sm text-amber-800">{highlight.title}</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-slate-500 hover:text-blue-600"
                                          onClick={() => {
                                            setCurrentAreaIdForDialog(area.id);
                                            setEditingHighlight(highlight);
                                            setHighlightForm({ title: highlight.title });
                                            setHighlightDialogOpen(true);
                                          }}
                                        >
                                          <Edit className="w-3 h-3" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 text-slate-500 hover:text-red-600"
                                          onClick={() => handleDeleteHighlight(highlight.id)}
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </Button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            {/* Example Images Section */}
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-slate-700 flex items-center gap-2">
                                  <Image className="w-4 h-4 text-blue-500" />
                                  תמונות להמחשה
                                </h5>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setCurrentAreaIdForDialog(area.id);
                                    setExampleForm({ description: "" });
                                    setImageFile(null);
                                    setImagePreview(null);
                                    setExampleDialogOpen(true);
                                  }}
                                >
                                  <Plus className="w-4 h-4 ml-1" />
                                  הוסף תמונה
                                </Button>
                              </div>
                              {areaExamples.length === 0 ? (
                                <p className="text-sm text-slate-400 text-center py-2">אין תמונות לתחום זה</p>
                              ) : (
                                <div className="grid grid-cols-2 gap-3">
                                  {areaExamples.map((example) => (
                                    <div key={example.id} className="relative group rounded-xl overflow-hidden border border-slate-200">
                                      <img src={example.image_url} alt={example.description} className="w-full h-24 object-cover" />
                                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8 text-white hover:text-red-400 hover:bg-transparent"
                                          onClick={() => handleDeleteExample(example.id)}
                                        >
                                          <Trash2 className="w-5 h-5" />
                                        </Button>
                                      </div>
                                      <p className="text-xs text-slate-600 p-2 bg-slate-50 truncate">{example.description}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              )}
            </CardContent>
          </Card>

          {/* Area Dialog */}
          <Dialog open={areaDialogOpen} onOpenChange={setAreaDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingArea ? "עריכת תחום אחריות" : "הוספת תחום אחריות"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>שם התחום</Label>
                  <Input 
                    value={areaForm.area_name} 
                    onChange={(e) => setAreaForm(prev => ({ ...prev, area_name: e.target.value }))} 
                    placeholder="לדוגמא: פינה ימנית" 
                  />
                </div>
                <div>
                  <Label>תיאור (אופציונלי)</Label>
                  <Input 
                    value={areaForm.description} 
                    onChange={(e) => setAreaForm(prev => ({ ...prev, description: e.target.value }))} 
                    placeholder="תיאור מפורט של התחום" 
                  />
                </div>
                <Button className="w-full" onClick={handleSaveArea} disabled={!areaForm.area_name}>
                  {editingArea ? "עדכן" : "הוסף"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Highlight Dialog */}
          <Dialog open={highlightDialogOpen} onOpenChange={setHighlightDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingHighlight ? "עריכת דגש" : "הוספת דגש"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>כותרת הדגש</Label>
                  <Input 
                    value={highlightForm.title} 
                    onChange={(e) => setHighlightForm({ title: e.target.value })} 
                    placeholder="לדוגמא: ניקיון המקרר" 
                  />
                </div>
                <Button className="w-full" onClick={handleSaveHighlight} disabled={!highlightForm.title}>
                  {editingHighlight ? "עדכן" : "הוסף"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Example Image Dialog */}
          <Dialog open={exampleDialogOpen} onOpenChange={setExampleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>הוספת תמונה להמחשה</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>תיאור התמונה</Label>
                  <Input 
                    value={exampleForm.description} 
                    onChange={(e) => setExampleForm({ description: e.target.value })} 
                    placeholder="לדוגמא: מקרר נקי ומסודר" 
                  />
                </div>
                <div>
                  <Label>בחר תמונה</Label>
                  <Input 
                    ref={fileInputRef}
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange}
                  />
                  {imagePreview && (
                    <img src={imagePreview} alt="Preview" className="mt-2 w-full h-32 object-cover rounded-lg" />
                  )}
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAddExample}
                  disabled={!exampleForm.description || !imageFile || isUploading}
                >
                  {isUploading ? "מעלה..." : "העלה תמונה"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Assignment Dialog - Day-based */}
          <Dialog open={assignmentDialogOpen} onOpenChange={setAssignmentDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>שיבוץ חייל ליום</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-sm text-slate-600">
                    שבוע: <strong>{format(currentWeekStart, 'dd/MM/yyyy', { locale: he })}</strong>
                  </p>
                  <p className="text-sm text-slate-600">
                    יום: <strong>{DAY_OPTIONS.find(d => d.value === selectedDayForAssignment)?.label}</strong>
                  </p>
                </div>
                <div>
                  <Label>בחר חייל</Label>
                  <Select value={selectedSoldierId} onValueChange={setSelectedSoldierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר חייל" />
                    </SelectTrigger>
                    <SelectContent>
                      {getSoldiersForOutpost().map((soldier) => (
                        <SelectItem key={soldier.id} value={soldier.id}>
                          {soldier.full_name} ({soldier.personal_number})
                        </SelectItem>
                      ))}
                      {getSoldiersForOutpost().length === 0 && (
                        <div className="p-2 text-sm text-slate-500 text-center">
                          אין חיילים במוצב זה - הוסף חיילים דרך ניהול חיילים
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleAssignSoldierToDay}
                  disabled={!selectedSoldierId}
                >
                  שבץ חייל
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AppLayout>
  );
}
import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Download, ExternalLink, Plus, Pencil, Trash2, Loader2, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddEditDialog, FieldConfig } from "@/components/admin/AddEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

interface Procedure {
  id: string;
  title: string;
  file_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

const procedureFields: FieldConfig[] = [
  { name: "title", label: "שם הנוהל", type: "text", required: true, placeholder: "הזן שם נוהל..." },
  { name: "file_url", label: "קובץ PDF (העלאה או קישור)", type: "media", mediaTypes: ["pdf", "file"] },
  { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור הנוהל..." },
];

export default function Procedures() {
  const { isAdmin } = useAuth();
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<Procedure | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchProcedures();
  }, []);

  const fetchProcedures = async () => {
    const { data, error } = await supabase
      .from("procedures")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("שגיאה בטעינת הנהלים");
      console.error(error);
    } else {
      setProcedures(data || []);
    }
    setLoading(false);
  };

  const handleAdd = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    const insertData = {
      title: data.title as string,
      file_url: data.file_url || null,
      description: data.description || null,
    };
    const { error } = await supabase.from("procedures").insert([insertData]);

    if (error) {
      toast.error("שגיאה בהוספת הנוהל");
      console.error(error);
    } else {
      toast.success("הנוהל נוסף בהצלחה");
      setAddDialogOpen(false);
      fetchProcedures();
    }
    setIsSubmitting(false);
  };

  const handleEdit = async (data: Record<string, any>) => {
    if (!selectedProcedure) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("procedures")
      .update(data)
      .eq("id", selectedProcedure.id);

    if (error) {
      toast.error("שגיאה בעדכון הנוהל");
      console.error(error);
    } else {
      toast.success("הנוהל עודכן בהצלחה");
      setEditDialogOpen(false);
      setSelectedProcedure(null);
      fetchProcedures();
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedProcedure) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("procedures")
      .delete()
      .eq("id", selectedProcedure.id);

    if (error) {
      toast.error("שגיאה במחיקת הנוהל");
      console.error(error);
    } else {
      toast.success("הנוהל נמחק בהצלחה");
      setDeleteDialogOpen(false);
      setSelectedProcedure(null);
      fetchProcedures();
    }
    setIsSubmitting(false);
  };

  const openView = (procedure: Procedure) => {
    if (procedure.file_url) {
      window.open(procedure.file_url, "_blank");
    } else {
      toast.info("אין קובץ צמוד לנוהל זה");
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
            <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Premium Header */}
        <div className="relative text-center mb-8 animate-slide-up">
          {/* Atmospheric glows */}
          <div className="absolute top-8 left-10 w-28 h-28 bg-gradient-to-br from-primary/12 to-accent/8 rounded-full blur-3xl animate-float" />
          <div className="absolute top-14 right-8 w-20 h-20 bg-accent/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
          
          <div className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-card/50 to-accent/20 border border-primary/40 mb-5 shadow-[0_0_40px_hsl(var(--primary)/0.25)] animate-glow">
            <BookOpen className="w-5 h-5 text-primary animate-bounce-soft" />
            <span className="text-sm font-black text-primary">נהלים</span>
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent mb-3">
            נהלים
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            נהלי הפלוגה והחטיבה
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="w-full mb-6 h-14 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem hover:shadow-luxury transition-all duration-300 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף נוהל
          </Button>
        )}

        {procedures.length === 0 ? (
          <div className="text-center py-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <FileText className="w-10 h-10 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">אין נהלים להצגה</p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-2">
                לחץ על "הוסף נוהל" להוספת נוהל חדש
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {procedures.map((procedure, index) => (
              <div 
                key={procedure.id} 
                className="group relative overflow-hidden p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 hover:border-primary/40 hover:shadow-luxury transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${(index + 2) * 50}ms` }}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {isAdmin && (
                  <div className="absolute top-3 left-3 flex gap-2 z-10">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="w-9 h-9 rounded-xl backdrop-blur-sm bg-card/80 border border-border/30 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300"
                      onClick={() => {
                        setSelectedProcedure(procedure);
                        setEditDialogOpen(true);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="w-9 h-9 rounded-xl"
                      onClick={() => {
                        setSelectedProcedure(procedure);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className="relative flex items-start gap-4">
                  <div className="relative shrink-0">
                    <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20 group-hover:border-primary/40 group-hover:scale-110 transition-all duration-300">
                      <FileText className="w-7 h-7 text-primary" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-lg mb-1 group-hover:text-primary transition-colors duration-300">
                      {procedure.title}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      עודכן לאחרונה: {formatDate(procedure.updated_at)}
                    </p>
                    {procedure.description && (
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {procedure.description}
                      </p>
                    )}
                    <div className="flex gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => openView(procedure)}
                        className="rounded-xl gap-2 hover:bg-primary/20 hover:text-primary transition-all duration-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                        צפייה
                      </Button>
                      {procedure.file_url && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openView(procedure)}
                          className="rounded-xl gap-2 hover:border-primary/40 transition-all duration-300"
                        >
                          <Download className="w-4 h-4" />
                          הורדה
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="הוספת נוהל"
        fields={procedureFields}
        onSubmit={handleAdd}
        isLoading={isSubmitting}
      />

      <AddEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="עריכת נוהל"
        fields={procedureFields}
        initialData={selectedProcedure || undefined}
        onSubmit={handleEdit}
        isLoading={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="מחיקת נוהל"
        description={`האם אתה בטוח שברצונך למחוק את הנוהל "${selectedProcedure?.title}"?`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}
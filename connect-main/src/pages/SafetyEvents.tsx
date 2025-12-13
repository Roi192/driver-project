import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeckCard } from "@/components/shared/DeckCard";
import { ArrowRight, Flag, MapPin, Users, Calendar, Plus, Pencil, Trash2, Loader2, Play, FileText, Image, AlertTriangle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddEditDialog, FieldConfig } from "@/components/admin/AddEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";

type View = "categories" | "items" | "itemDetail";
type ContentCategory = "flag_investigations" | "sector_events" | "neighbor_events" | "monthly_summaries";

interface SafetyContent {
  id: string;
  title: string;
  description: string | null;
  category: ContentCategory;
  image_url: string | null;
  video_url: string | null;
  file_url: string | null;
  event_date: string | null;
}

const categories = [
  { 
    id: "flag_investigations" as ContentCategory, 
    label: "תחקירי דגל", 
    icon: Flag, 
    description: "סרטוני תחקירים ולקחים",
    contentType: "video"
  },
  { 
    id: "sector_events" as ContentCategory, 
    label: "אירועים בגזרה", 
    icon: MapPin, 
    description: "אירועים שהתרחשו בגזרתנו",
    contentType: "image"
  },
  { 
    id: "neighbor_events" as ContentCategory, 
    label: "אירועים בגזרות שכנות", 
    icon: Users, 
    description: "אירועים מגזרות אחרות",
    contentType: "image"
  },
  { 
    id: "monthly_summaries" as ContentCategory, 
    label: "סיכומי חודש", 
    icon: Calendar, 
    description: "סיכומים חודשיים",
    contentType: "mixed"
  },
];

const categoryLabels: Record<ContentCategory, string> = {
  flag_investigations: "תחקירי דגל",
  sector_events: "אירועים בגזרה",
  neighbor_events: "אירועים בגזרות שכנות",
  monthly_summaries: "סיכומי חודש",
};

const getFields = (category: ContentCategory): FieldConfig[] => {
  const baseFields: FieldConfig[] = [
    { name: "title", label: "כותרת", type: "text", required: true, placeholder: "הזן כותרת..." },
    { name: "event_date", label: "תאריך", type: "text", placeholder: "2024-01-15" },
    { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור מפורט..." },
  ];

  if (category === "flag_investigations") {
    return [
      ...baseFields,
      { name: "video_url", label: "סרטון (קובץ / YouTube / קישור)", type: "media", mediaTypes: ["video", "youtube", "file"] },
    ];
  }

  if (category === "sector_events" || category === "neighbor_events") {
    return [
      ...baseFields,
      { name: "image_url", label: "תמונה", type: "image" },
    ];
  }

  if (category === "monthly_summaries") {
    return [
      ...baseFields,
      { name: "video_url", label: "סרטון (קובץ / YouTube)", type: "media", mediaTypes: ["video", "youtube"] },
      { name: "image_url", label: "תמונה", type: "image" },
      { name: "file_url", label: "קובץ PDF", type: "media", mediaTypes: ["pdf", "file"] },
    ];
  }

  return baseFields;
};

export default function SafetyEvents() {
  const { isAdmin } = useAuth();
  const [view, setView] = useState<View>("categories");
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<SafetyContent | null>(null);
  const [items, setItems] = useState<SafetyContent[]>([]);
  const [loading, setLoading] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchItems = async (category: ContentCategory) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("safety_content")
      .select("*")
      .eq("category", category)
      .order("event_date", { ascending: false });

    if (error) {
      toast.error("שגיאה בטעינת התוכן");
      console.error(error);
    } else {
      setItems(data as SafetyContent[] || []);
    }
    setLoading(false);
  };

  const handleAdd = async (data: Record<string, any>) => {
    if (!selectedCategory) return;
    setIsSubmitting(true);

    const insertData = {
      title: data.title as string,
      category: selectedCategory,
      description: data.description || null,
      event_date: data.event_date || null,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
      file_url: data.file_url || null,
    };

    const { error } = await supabase.from("safety_content").insert([insertData]);

    if (error) {
      toast.error("שגיאה בהוספת התוכן");
      console.error(error);
    } else {
      toast.success("התוכן נוסף בהצלחה");
      setAddDialogOpen(false);
      fetchItems(selectedCategory);
    }
    setIsSubmitting(false);
  };

  const handleEdit = async (data: Record<string, any>) => {
    if (!selectedItem) return;
    setIsSubmitting(true);

    const updateData = {
      title: data.title as string,
      description: data.description || null,
      event_date: data.event_date || null,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
      file_url: data.file_url || null,
    };

    const { error } = await supabase
      .from("safety_content")
      .update(updateData)
      .eq("id", selectedItem.id);

    if (error) {
      toast.error("שגיאה בעדכון התוכן");
      console.error(error);
    } else {
      toast.success("התוכן עודכן בהצלחה");
      setEditDialogOpen(false);
      if (selectedCategory) {
        fetchItems(selectedCategory);
      }
    }
    setIsSubmitting(false);
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    setIsSubmitting(true);

    const { error } = await supabase
      .from("safety_content")
      .delete()
      .eq("id", selectedItem.id);

    if (error) {
      toast.error("שגיאה במחיקת התוכן");
      console.error(error);
    } else {
      toast.success("התוכן נמחק בהצלחה");
      setDeleteDialogOpen(false);
      setView("items");
      setSelectedItem(null);
      if (selectedCategory) {
        fetchItems(selectedCategory);
      }
    }
    setIsSubmitting(false);
  };

  const handleCategorySelect = async (categoryId: ContentCategory) => {
    setSelectedCategory(categoryId);
    await fetchItems(categoryId);
    setView("items");
  };

  const handleItemSelect = (item: SafetyContent) => {
    setSelectedItem(item);
    setView("itemDetail");
  };

  const goBack = () => {
    if (view === "itemDetail") {
      setView("items");
      setSelectedItem(null);
    } else if (view === "items") {
      setView("categories");
      setSelectedCategory(null);
      setItems([]);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("he-IL");
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId[1]}`;
    }
    return url;
  };

  const renderHeader = () => {
    if (view === "categories") {
      return (
        <div className="relative text-center mb-8 animate-slide-up">
          {/* Decorative glowing orbs */}
          <div className="absolute top-12 left-6 w-28 h-28 bg-gradient-to-br from-primary/15 to-accent/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-20 right-8 w-20 h-20 bg-accent/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
          
          <div className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-card/50 to-accent/20 border border-primary/40 mb-5 shadow-[0_0_40px_hsl(var(--primary)/0.25)] animate-glow">
            <Flag className="w-5 h-5 text-primary animate-wiggle" />
            <span className="text-sm font-black text-primary">אירועי בטיחות</span>
            <AlertTriangle className="w-4 h-4 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent mb-3">
            אירועי בטיחות ותחקירים
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
            צפה בתחקירים ואירועים מהשטח
          </p>
        </div>
      );
    }

    const categoryLabel = categoryLabels[selectedCategory!];

    return (
      <div className="mb-6 animate-slide-up">
        <Button variant="ghost" onClick={goBack} className="mb-4 hover:bg-primary/10 rounded-xl gap-2">
          <ArrowRight className="w-5 h-5" />
          חזרה
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent mb-1">
              {view === "items" ? categoryLabel : selectedItem?.title}
            </h1>
            {view === "itemDetail" && selectedItem?.event_date && (
              <p className="text-muted-foreground">
                {formatDate(selectedItem.event_date)}
              </p>
            )}
          </div>
          {isAdmin && view === "items" && (
            <Button 
              size="sm" 
              onClick={() => setAddDialogOpen(true)} 
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem"
            >
              <Plus className="w-4 h-4" />
              הוסף
            </Button>
          )}
          {isAdmin && view === "itemDetail" && (
            <div className="flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                onClick={() => setEditDialogOpen(true)}
                className="rounded-xl"
              >
                <Pencil className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                className="rounded-xl"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (view === "categories") {
      return (
        <div className="grid gap-4">
          {categories.map((category, index) => (
            <DeckCard
              key={category.id}
              icon={category.icon}
              title={category.label}
              description={category.description}
              onClick={() => handleCategorySelect(category.id)}
              className={`animate-slide-up stagger-${index + 1}`}
            />
          ))}
        </div>
      );
    }

    if (view === "items") {
      if (loading) {
        return (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        );
      }

      if (items.length === 0) {
        return (
          <div className="text-center py-12 glass-card">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Flag className="w-10 h-10 text-primary" />
            </div>
            <p className="text-muted-foreground text-lg">אין תוכן להצגה</p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-2">
                לחץ על "הוסף" להוספת תוכן חדש
              </p>
            )}
          </div>
        );
      }

      return (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`glass-card p-4 cursor-pointer hover:border-primary/50 transition-all duration-300 animate-slide-up stagger-${(index % 5) + 1}`}
              onClick={() => handleItemSelect(item)}
            >
              <div className="flex gap-4">
                {item.image_url && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {item.video_url && !item.image_url && (
                  <div className="w-20 h-20 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Play className="w-8 h-8 text-primary" />
                  </div>
                )}
                {item.file_url && !item.image_url && !item.video_url && (
                  <div className="w-20 h-20 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-8 h-8 text-accent" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold mb-1 truncate">{item.title}</h3>
                  {item.event_date && (
                    <p className="text-sm text-primary mb-2">
                      {formatDate(item.event_date)}
                    </p>
                  )}
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    // Item Detail View
    if (view === "itemDetail" && selectedItem) {
      return (
        <div className="space-y-6 animate-fade-in">
          {/* Video Player */}
          {selectedItem.video_url && (
            <div className="glass-card p-4 overflow-hidden">
              <div className="aspect-video rounded-xl overflow-hidden bg-black">
                <iframe
                  src={getYouTubeEmbedUrl(selectedItem.video_url)}
                  className="w-full h-full"
                  allowFullScreen
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                />
              </div>
            </div>
          )}

          {/* Image */}
          {selectedItem.image_url && (
            <div className="glass-card p-4">
              <img 
                src={selectedItem.image_url} 
                alt={selectedItem.title}
                className="w-full rounded-xl"
              />
            </div>
          )}

          {/* Content */}
          <div className="glass-card p-6">
            <h2 className="text-2xl font-black mb-3 text-gradient">{selectedItem.title}</h2>
            {selectedItem.event_date && (
              <p className="text-sm text-primary font-bold mb-4 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {formatDate(selectedItem.event_date)}
              </p>
            )}
            {selectedItem.description && (
              <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap text-lg">
                {selectedItem.description}
              </p>
            )}
          </div>

          {/* PDF Link */}
          {selectedItem.file_url && (
            <a 
              href={selectedItem.file_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-accent/20 flex items-center justify-center group-hover:bg-accent/30 transition-colors">
                <FileText className="w-7 h-7 text-accent" />
              </div>
              <div>
                <p className="font-bold">צפה בקובץ PDF</p>
                <p className="text-sm text-muted-foreground">לחץ לפתיחה בחלון חדש</p>
              </div>
            </a>
          )}
        </div>
      );
    }

    return null;
  };

  const fields = selectedCategory ? getFields(selectedCategory) : [];

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-lg mx-auto">
        {renderHeader()}
        {renderContent()}
      </div>

      <AddEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title={`הוספת ${categoryLabels[selectedCategory!] || 'תוכן'}`}
        fields={fields}
        onSubmit={handleAdd}
        isLoading={isSubmitting}
      />

      <AddEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title={`עריכת ${categoryLabels[selectedCategory!] || 'תוכן'}`}
        fields={fields}
        initialData={selectedItem || undefined}
        onSubmit={handleEdit}
        isLoading={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="מחיקת תוכן"
        description={`האם אתה בטוח שברצונך למחוק את "${selectedItem?.title}"?`}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}
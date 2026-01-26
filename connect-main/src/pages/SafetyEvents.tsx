import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { DeckCard } from "@/components/shared/DeckCard";
import { ArrowRight, Flag, MapPin, Users, Calendar, Plus, Pencil, Trash2, Loader2, Play, FileText, Image, AlertTriangle, Clock } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddEditDialog, FieldConfig } from "@/components/admin/AddEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import flagInvestigationThumbnail from "@/assets/flag-investigation-thumbnail.png";
import monthlySummaryThumbnail from "@/assets/monthly-summary-thumbnail.png";
import { REGIONS, OUTPOSTS } from "@/lib/constants";

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
  latitude: number | null;
  longitude: number | null;
  event_type: string | null;
  driver_type: string | null;
  region: string | null;
  outpost: string | null;
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

const EVENT_TYPES = [
  { value: "accident", label: "תאונה" },
  { value: "stuck", label: "התחפרות" },
  { value: "other", label: "אחר" },
] as const;

const DRIVER_TYPES = [
  { value: "security", label: 'נהג בט"ש' },
  { value: "combat", label: "נהג גדוד" },
] as const;

const SEVERITY_TYPES = [
  { value: "minor", label: "קל" },
  { value: "moderate", label: "בינוני" },
  { value: "severe", label: "חמור" },
] as const;

const getFields = (category: ContentCategory, soldiers: { id: string; full_name: string; personal_number: string }[] = []): FieldConfig[] => {
  const baseFields: FieldConfig[] = [
    { name: "title", label: "כותרת", type: "text", required: true, placeholder: "הזן כותרת..." },
    { name: "event_date", label: "תאריך", type: "date", placeholder: "בחר תאריך" },
    { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור מפורט..." },
  ];

  if (category === "flag_investigations") {
    return [
      ...baseFields,
      { name: "image_url", label: "תמונה ממוזערת", type: "image" },
      { name: "video_url", label: "סרטון (קובץ / YouTube / קישור)", type: "media", mediaTypes: ["video", "youtube", "file"] },
    ];
  }

  if (category === "sector_events" || category === "neighbor_events") {
    // For sector events, add event type and driver type selection
    const sectorFields: FieldConfig[] = [
      { name: "title", label: "כותרת", type: "text", required: true, placeholder: "הזן כותרת..." },
      { name: "event_date", label: "תאריך", type: "date", placeholder: "בחר תאריך" },
      { 
        name: "region", 
        label: "גזרה", 
        type: "select",
        options: REGIONS.map(r => ({ value: r, label: r })),
        placeholder: "בחר גזרה"
      },
      { 
        name: "outpost", 
        label: "מוצב", 
        type: "select",
        options: OUTPOSTS.map(o => ({ value: o, label: o })),
        placeholder: "בחר מוצב"
      },
      { 
        name: "event_type", 
        label: "סוג אירוע", 
        type: "select",
        options: EVENT_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר סוג אירוע"
      },
      { 
        name: "driver_type", 
        label: "סוג נהג", 
        type: "select",
        options: DRIVER_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר סוג נהג"
      },
      { 
        name: "soldier_id", 
        label: "בחר חייל", 
        type: "select",
        options: soldiers.map(s => ({ value: s.id, label: `${s.full_name} (${s.personal_number})` })),
        placeholder: "בחר חייל מהרשימה",
        dependsOn: { field: "driver_type", value: "security" }
      },
      { 
        name: "driver_name", 
        label: "שם הנהג", 
        type: "text",
        placeholder: "הזן שם נהג...",
        dependsOn: { field: "driver_type", value: "combat" }
      },
      { name: "vehicle_number", label: "מספר רכב צבאי", type: "text", placeholder: "הזן מספר רכב..." },
      { 
        name: "severity", 
        label: "חומרת האירוע", 
        type: "select",
        options: SEVERITY_TYPES.map(t => ({ value: t.value, label: t.label })),
        placeholder: "בחר חומרה"
      },
      { name: "description", label: "תיאור", type: "textarea", placeholder: "תיאור מפורט..." },
      { name: "image_url", label: "תמונה", type: "image" },
      { name: "file_url", label: "קובץ PDF", type: "media", mediaTypes: ["pdf", "file"] },
      { name: "video_url", label: "סרטון (קובץ / YouTube)", type: "media", mediaTypes: ["video", "youtube"] },
      { name: "get_location", label: "מיקום נוכחי", type: "location", latField: "latitude", lngField: "longitude" },
      { name: "map_picker", label: "דקירה במפה", type: "map_picker", latField: "latitude", lngField: "longitude" },
      { name: "latitude", label: "קו רוחב", type: "text", placeholder: "31.9" },
      { name: "longitude", label: "קו אורך", type: "text", placeholder: "35.2" },
    ];
    return sectorFields;
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
  const { canEditSafetyEvents: canEdit, canDelete } = useAuth();
  const [view, setView] = useState<View>("categories");
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [selectedItem, setSelectedItem] = useState<SafetyContent | null>(null);
  const [items, setItems] = useState<SafetyContent[]>([]);
  const [soldiers, setSoldiers] = useState<{ id: string; full_name: string; personal_number: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch soldiers for the dropdown
  useEffect(() => {
    const fetchSoldiers = async () => {
      const { data, error } = await supabase
        .from("soldiers")
        .select("id, full_name, personal_number")
        .eq("is_active", true)
        .order("full_name");
      
      if (!error && data) {
        setSoldiers(data);
      }
    };
    fetchSoldiers();
  }, []);

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

    const latitude = data.latitude ? parseFloat(data.latitude) : null;
    const longitude = data.longitude ? parseFloat(data.longitude) : null;
    const eventType = data.event_type || null;
    const driverType = data.driver_type || null;

    const insertData = {
      title: data.title as string,
      category: selectedCategory,
      description: data.description || null,
      event_date: data.event_date || null,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
      file_url: data.file_url || null,
      latitude,
      longitude,
      event_type: eventType,
      driver_type: driverType,
      region: data.region || null,
      outpost: data.outpost || null,
    };

    const { error } = await supabase.from("safety_content").insert([insertData]);

    if (error) {
      toast.error("שגיאה בהוספת התוכן");
      console.error(error);
    } else {
      toast.success("התוכן נוסף בהצלחה");
      
      // If it's a sector event with accident or stuck type, sync to accidents table
      if (selectedCategory === "sector_events" && driverType && (eventType === "accident" || eventType === "stuck")) {
        // Map driver_type: security stays security, combat (גדוד) maps to combat (לוחם)
        const accidentDriverType = driverType === "security" ? "security" : "combat";
        
        // Get driver name - from soldier selection or manual input
        let driverName = data.driver_name || null;
        if (driverType === "security" && data.soldier_id) {
          const selectedSoldier = soldiers.find(s => s.id === data.soldier_id);
          driverName = selectedSoldier?.full_name || null;
        }
        
        await supabase.from("accidents").insert([{
          accident_date: data.event_date || new Date().toISOString().split('T')[0],
          driver_type: accidentDriverType,
          soldier_id: driverType === "security" ? data.soldier_id : null,
          driver_name: driverName,
          vehicle_number: data.vehicle_number || null,
          description: data.description || data.title,
          location: latitude && longitude ? `${latitude}, ${longitude}` : null,
          incident_type: eventType, // 'accident' or 'stuck'
          severity: data.severity || 'minor',
        }]);
      }
      
      // Sync to safety_events table for map display in "Know The Area"
      // For sector_events and neighbor_events - sync if it has location
      if ((selectedCategory === "sector_events" || selectedCategory === "neighbor_events") && latitude && longitude) {
        // Map event types to valid safety_events categories
        // Valid categories: 'accident' | 'fire' | 'vehicle' | 'weapon' | 'other'
        const eventCategory = eventType === "accident" ? "accident" : "other";
        await supabase.from("safety_events").insert([{
          title: data.title,
          description: data.description || null,
          category: eventCategory,
          event_date: data.event_date || null,
          latitude,
          longitude,
          region: data.region || null,
        }]);
      }
      
      setAddDialogOpen(false);
      fetchItems(selectedCategory);
    }
    setIsSubmitting(false);
  };

  const handleEdit = async (data: Record<string, any>) => {
    if (!selectedItem) return;
    setIsSubmitting(true);

    const latitude = data.latitude ? parseFloat(data.latitude) : null;
    const longitude = data.longitude ? parseFloat(data.longitude) : null;
    const eventType = data.event_type || null;

    const updateData = {
      title: data.title as string,
      description: data.description || null,
      event_date: data.event_date || null,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
      file_url: data.file_url || null,
      latitude,
      longitude,
      event_type: eventType,
      driver_type: data.driver_type || null,
      region: data.region || null,
      outpost: data.outpost || null,
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
      
      // Sync to safety_events table for map display when coordinates are added/updated
      if ((selectedCategory === "sector_events" || selectedCategory === "neighbor_events") && latitude && longitude) {
        const eventCategory = eventType === "accident" ? "accident" : "other";
        
        // Check if this event already exists in safety_events (by matching title and approximate date)
        const { data: existingEvent } = await supabase
          .from("safety_events")
          .select("id")
          .eq("title", data.title)
          .maybeSingle();
        
        if (existingEvent) {
          // Update existing
          await supabase.from("safety_events").update({
            title: data.title,
            description: data.description || null,
            category: eventCategory,
            event_date: data.event_date || null,
            latitude,
            longitude,
            region: data.region || null,
          }).eq("id", existingEvent.id);
        } else {
          // Insert new
          await supabase.from("safety_events").insert([{
            title: data.title,
            description: data.description || null,
            category: eventCategory,
            event_date: data.event_date || null,
            latitude,
            longitude,
            region: data.region || null,
          }]);
        }
      }
      
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
        <PageHeader
          icon={Flag}
          title="אירועי בטיחות ותחקירים"
          subtitle="צפה בתחקירים ואירועים מהשטח"
          badge="אירועי בטיחות"
        />
      );
    }

    const categoryLabel = categoryLabels[selectedCategory!];

    return (
      <div className="mb-6 animate-slide-up">
        <Button variant="ghost" onClick={goBack} className="mb-4 hover:bg-primary/10 rounded-xl gap-2 text-foreground">
          <ArrowRight className="w-5 h-5" />
          חזרה
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/10 border border-primary/30">
              <Flag className="w-4 h-4 text-primary" />
              <h1 className="text-xl font-black text-foreground">
                {view === "items" ? categoryLabel : selectedItem?.title}
              </h1>
            </div>
            {view === "itemDetail" && selectedItem?.event_date && (
              <p className="text-sm text-primary font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDate(selectedItem.event_date)}
              </p>
            )}
          </div>
          {canEdit && view === "items" && (
            <Button 
              size="sm" 
              onClick={() => setAddDialogOpen(true)} 
              className="gap-2 rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem"
            >
              <Plus className="w-4 h-4" />
              הוסף
            </Button>
          )}
          {(canEdit || canDelete) && view === "itemDetail" && (
            <div className="flex gap-2">
              {canEdit && (
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => setEditDialogOpen(true)}
                  className="rounded-xl"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {canDelete && (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
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
            <div className="relative">
              <div className="absolute inset-0 bg-primary/30 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-10 h-10 animate-spin text-primary relative" />
            </div>
          </div>
        );
      }

      if (items.length === 0) {
        return (
          <div className="text-center py-12 animate-slide-up">
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <Flag className="w-10 h-10 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">אין תוכן להצגה</p>
            {canEdit && (
              <p className="text-sm text-muted-foreground mt-2">
                לחץ על "הוסף" להוספת תוכן חדש
              </p>
            )}
          </div>
        );
      }

      // For flag_investigations and monthly_summaries, use video card style
      const isVideoStyle = selectedCategory === "flag_investigations" || selectedCategory === "monthly_summaries";
      const defaultThumbnail = selectedCategory === "flag_investigations" ? flagInvestigationThumbnail : monthlySummaryThumbnail;

      if (isVideoStyle) {
        return (
          <div className="grid gap-4">
            {items.map((item, index) => (
              <div
                key={item.id}
                className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-luxury transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${(index + 2) * 50}ms` }}
                onClick={() => handleItemSelect(item)}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {(canEdit || canDelete) && (
                  <div className="absolute top-3 left-3 z-10 flex gap-2">
                    {canEdit && (
                      <Button
                        size="icon"
                        variant="secondary"
                        className="w-9 h-9 rounded-xl backdrop-blur-sm bg-card/80 border border-border/30 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setEditDialogOpen(true);
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {canDelete && (
                      <Button
                        size="icon"
                        variant="destructive"
                        className="w-9 h-9 rounded-xl"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedItem(item);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                )}
                
                <div className="relative">
                  <img
                    src={item.image_url || defaultThumbnail}
                    alt={item.title}
                    className="w-full h-44 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/50 rounded-full blur-xl animate-pulse" />
                      <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-emblem group-hover:scale-110 transition-transform duration-300">
                        <Play className="w-8 h-8 text-primary-foreground mr-[-3px]" />
                      </div>
                    </div>
                  </div>
                  {item.event_date && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-bold flex items-center gap-1.5 border border-border/30">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {formatDate(item.event_date)}
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-lg text-slate-800 group-hover:text-primary transition-colors duration-300">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-sm text-slate-600 mt-2 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        );
      }

      // For sector_events and neighbor_events, use existing card style
      return (
        <div className="grid gap-4">
          {items.map((item, index) => (
            <div
              key={item.id}
              className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-lg transition-all duration-500 animate-slide-up p-4"
              style={{ animationDelay: `${(index + 2) * 50}ms` }}
              onClick={() => handleItemSelect(item)}
            >
              <div className="flex gap-4">
                {item.image_url && (
                  <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border/30">
                    <img 
                      src={item.image_url} 
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                {!item.image_url && (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center flex-shrink-0 border border-border/30">
                    <MapPin className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold mb-1 truncate text-slate-800 group-hover:text-primary transition-colors">{item.title}</h3>
                    {item.latitude && item.longitude && (
                      <div className="flex-shrink-0 w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center" title="כולל מיקום">
                        <MapPin className="w-3 h-3 text-green-600" />
                      </div>
                    )}
                  </div>
                  {item.event_date && (
                    <p className="text-sm text-primary font-medium mb-2">
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
            <h2 className="text-2xl font-black mb-3 text-slate-800">{selectedItem.title}</h2>
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

          {/* Location */}
          {selectedItem.latitude && selectedItem.longitude && (
            <a
              href={`https://www.google.com/maps?q=${selectedItem.latitude},${selectedItem.longitude}`}
              target="_blank"
              rel="noopener noreferrer"
              className="glass-card p-4 flex items-center gap-4 hover:border-primary/50 transition-all duration-300 group"
            >
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                <MapPin className="w-7 h-7 text-primary" />
              </div>
              <div>
                <p className="font-bold text-slate-800">הצג מיקום במפה</p>
                <p className="text-sm text-muted-foreground">
                  {selectedItem.latitude.toFixed(6)}, {selectedItem.longitude.toFixed(6)}
                </p>
              </div>
            </a>
          )}

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
                <p className="font-bold text-slate-800">צפה בקובץ PDF</p>
                <p className="text-sm text-muted-foreground">לחץ לפתיחה בחלון חדש</p>
              </div>
            </a>
          )}
        </div>
      );
    }

    return null;
  };

  const fields = selectedCategory ? getFields(selectedCategory, soldiers) : [];

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
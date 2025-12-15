import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Play, Clock, Plus, Pencil, Trash2, Video, Loader2, Sparkles, Film } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddEditDialog, FieldConfig } from "@/components/admin/AddEditDialog";
import { DeleteConfirmDialog } from "@/components/admin/DeleteConfirmDialog";
import trainingVideoThumbnail from "@/assets/training-video-thumbnail.png";

interface TrainingVideo {
  id: string;
  title: string;
  duration: string | null;
  thumbnail_url: string | null;
  video_url: string | null;
}

const videoFields: FieldConfig[] = [
  { name: "title", label: "כותרת הסרטון", type: "text", required: true, placeholder: "הזן כותרת..." },
  { name: "video_url", label: "סרטון (קובץ / YouTube / PDF)", type: "media", mediaTypes: ["video", "youtube", "pdf"] },
  { name: "duration", label: "משך הסרטון", type: "text", placeholder: "5:30" },
  { name: "thumbnail_url", label: "תמונה ממוזערת", type: "image" },
];

export default function TrainingVideos() {
  const { isAdmin } = useAuth();
  const [videos, setVideos] = useState<TrainingVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<TrainingVideo | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, []);

  const fetchVideos = async () => {
    const { data, error } = await supabase
      .from("training_videos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("שגיאה בטעינת הסרטונים");
      console.error(error);
    } else {
      setVideos(data || []);
    }
    setLoading(false);
  };

  const handleAddVideo = async (data: Record<string, any>) => {
    setIsSubmitting(true);
    const insertData = {
      title: data.title as string,
      video_url: data.video_url || null,
      duration: data.duration || null,
      thumbnail_url: data.thumbnail_url || null,
    };
    const { error } = await supabase.from("training_videos").insert([insertData]);

    if (error) {
      toast.error("שגיאה בהוספת הסרטון");
      console.error(error);
    } else {
      toast.success("הסרטון נוסף בהצלחה");
      setAddDialogOpen(false);
      fetchVideos();
    }
    setIsSubmitting(false);
  };

  const handleEditVideo = async (data: Record<string, any>) => {
    if (!selectedVideo) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("training_videos")
      .update(data)
      .eq("id", selectedVideo.id);

    if (error) {
      toast.error("שגיאה בעדכון הסרטון");
      console.error(error);
    } else {
      toast.success("הסרטון עודכן בהצלחה");
      setEditDialogOpen(false);
      setSelectedVideo(null);
      fetchVideos();
    }
    setIsSubmitting(false);
  };

  const handleDeleteVideo = async () => {
    if (!selectedVideo) return;
    setIsSubmitting(true);
    const { error } = await supabase
      .from("training_videos")
      .delete()
      .eq("id", selectedVideo.id);

    if (error) {
      toast.error("שגיאה במחיקת הסרטון");
      console.error(error);
    } else {
      toast.success("הסרטון נמחק בהצלחה");
      setDeleteDialogOpen(false);
      setSelectedVideo(null);
      fetchVideos();
    }
    setIsSubmitting(false);
  };

  const openEditDialog = (video: TrainingVideo) => {
    setSelectedVideo(video);
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (video: TrainingVideo) => {
    setSelectedVideo(video);
    setDeleteDialogOpen(true);
  };

  const openVideo = (video: TrainingVideo) => {
    if (video.video_url) {
      window.open(video.video_url, "_blank");
    } else {
      toast.info("אין קישור לסרטון");
    }
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
          {/* Glowing background elements */}
          <div className="absolute top-10 left-8 w-32 h-32 bg-gradient-to-br from-primary/15 to-accent/10 rounded-full blur-3xl animate-float" />
          <div className="absolute top-16 right-6 w-24 h-24 bg-accent/20 rounded-full blur-2xl animate-float" style={{ animationDelay: '1.5s' }} />
          
          <div className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-card/50 to-accent/20 border border-primary/40 mb-5 shadow-[0_0_40px_hsl(var(--primary)/0.25)] animate-glow">
            <Film className="w-5 h-5 text-primary animate-bounce-soft" />
            <span className="text-sm font-black text-primary">סרטוני הדרכה</span>
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent mb-3">
            סרטוני הדרכה
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <Play className="w-4 h-4 text-accent" />
            צפה בסרטוני הדרכה ולמידה
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="w-full mb-6 h-14 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem hover:shadow-luxury transition-all duration-300 animate-slide-up"
            style={{ animationDelay: '0.1s' }}
          >
            <Plus className="w-5 h-5 ml-2" />
            הוסף סרטון הדרכה
          </Button>
        )}

        {videos.length === 0 ? (
          <div className="text-center py-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <div className="relative inline-block mb-6">
              <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center border border-primary/20">
                <Video className="w-10 h-10 text-primary" />
              </div>
            </div>
            <p className="text-muted-foreground text-lg font-medium">אין סרטונים להצגה</p>
            {isAdmin && (
              <p className="text-sm text-muted-foreground mt-2">
                לחץ על "הוסף סרטון הדרכה" להוספת סרטון חדש
              </p>
            )}
          </div>
        ) : (
          <div className="grid gap-4">
            {videos.map((video, index) => (
              <div
                key={video.id}
                className="group relative overflow-hidden rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 cursor-pointer hover:border-primary/40 hover:shadow-luxury transition-all duration-500 animate-slide-up"
                style={{ animationDelay: `${(index + 2) * 50}ms` }}
                onClick={() => openVideo(video)}
              >
                {/* Hover gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                
                {isAdmin && (
                  <div className="absolute top-3 left-3 z-10 flex gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      className="w-9 h-9 rounded-xl backdrop-blur-sm bg-card/80 border border-border/30 hover:bg-primary/20 hover:border-primary/40 transition-all duration-300"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(video);
                      }}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="destructive"
                      className="w-9 h-9 rounded-xl"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(video);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                
                <div className="relative">
                  <img
                    src={video.thumbnail_url || trainingVideoThumbnail}
                    alt={video.title}
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
                  {video.duration && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-lg bg-background/90 backdrop-blur-sm text-xs font-bold flex items-center gap-1.5 border border-border/30">
                      <Clock className="w-3.5 h-3.5 text-primary" />
                      {video.duration}
                    </div>
                  )}
                </div>
                
                <div className="p-5">
                  <h3 className="font-bold text-lg group-hover:text-primary transition-colors duration-300">
                    {video.title}
                  </h3>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AddEditDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        title="הוספת סרטון הדרכה"
        fields={videoFields}
        onSubmit={handleAddVideo}
        isLoading={isSubmitting}
      />

      <AddEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        title="עריכת סרטון הדרכה"
        fields={videoFields}
        initialData={selectedVideo || undefined}
        onSubmit={handleEditVideo}
        isLoading={isSubmitting}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="מחיקת סרטון הדרכה"
        description={`האם אתה בטוח שברצונך למחוק את הסרטון "${selectedVideo?.title}"?`}
        onConfirm={handleDeleteVideo}
        isLoading={isSubmitting}
      />
    </AppLayout>
  );
}
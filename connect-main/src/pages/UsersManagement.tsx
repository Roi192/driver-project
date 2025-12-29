import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Users,
  Search,
  Pencil,
  Shield,
  User,
  Mail,
  Calendar,
  Loader2,
  ArrowRight,
  Building2,
  UserCog,
  MapPin,
} from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  outpost: string | null;
  user_type: string | null;
  region: string | null;
  military_role: string | null;
  platoon: string | null;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: "driver" | "admin";
}

const UsersManagement = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isLoading: roleLoading } = useUserRole();
  
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Edit dialog
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editFormData, setEditFormData] = useState({
    full_name: "",
    outpost: "",
    user_type: "",
    region: "",
    military_role: "",
    platoon: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      return;
    }
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, roleLoading, navigate]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      const [profilesRes, rolesRes] = await Promise.all([
        supabase.from("profiles").select("*").order("created_at", { ascending: false }),
        supabase.from("user_roles").select("user_id, role"),
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (rolesRes.error) throw rolesRes.error;

      setProfiles(profilesRes.data || []);
      setUserRoles(rolesRes.data || []);
    } catch (error: any) {
      console.error("Error fetching users:", error);
      toast.error("שגיאה בטעינת המשתמשים");
    } finally {
      setLoading(false);
    }
  };

  const getUserRole = (userId: string): "driver" | "admin" => {
    const roleEntry = userRoles.find(r => r.user_id === userId);
    return roleEntry?.role || "driver";
  };

  const handleEditClick = (profile: UserProfile) => {
    setEditingUser(profile);
    setEditFormData({
      full_name: profile.full_name || "",
      outpost: profile.outpost || "",
      user_type: profile.user_type || "driver",
      region: profile.region || "",
      military_role: profile.military_role || "",
      platoon: profile.platoon || "",
    });
  };

  const handleSave = async () => {
    if (!editingUser) return;
    
    try {
      setSaving(true);
      
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editFormData.full_name,
          outpost: editFormData.outpost || null,
          user_type: editFormData.user_type || null,
          region: editFormData.region || null,
          military_role: editFormData.military_role || null,
          platoon: editFormData.platoon || null,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      toast.success("פרטי המשתמש עודכנו בהצלחה");
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error("שגיאה בעדכון המשתמש");
    } finally {
      setSaving(false);
    }
  };

  const filteredProfiles = profiles.filter(p =>
    p.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.outpost?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (p.platoon?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (roleLoading || loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <AppLayout>
      <div className="p-4 pb-24 max-w-4xl mx-auto" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-xl bg-muted/50 flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-black text-foreground">ניהול משתמשים</h1>
            <p className="text-sm text-muted-foreground">צפייה ועריכת משתמשים רשומים</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
        </div>

        {/* Stats Card */}
        <div className="glass-card p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-600/20 flex items-center justify-center">
                <UserCog className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-black text-foreground">{profiles.length}</p>
                <p className="text-sm text-muted-foreground">משתמשים רשומים</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/30">
                {userRoles.filter(r => r.role === "admin").length} מנהלים
              </Badge>
              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30">
                {userRoles.filter(r => r.role === "driver").length} נהגים
              </Badge>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="חיפוש לפי שם, מוצב או מחלקה..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pr-10 h-12 rounded-xl bg-muted/50 border-0"
          />
        </div>

        {/* Users List */}
        <div className="space-y-3">
          {filteredProfiles.map((profile) => {
            const role = getUserRole(profile.user_id);
            const isAdminUser = role === "admin";
            
            return (
              <div
                key={profile.id}
                className="glass-card p-4 hover:shadow-lg transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      isAdminUser 
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" 
                        : "bg-gradient-to-br from-blue-500/20 to-indigo-500/20"
                    }`}>
                      {isAdminUser ? (
                        <Shield className="w-6 h-6 text-amber-500" />
                      ) : (
                        <User className="w-6 h-6 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground">{profile.full_name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={isAdminUser ? "default" : "secondary"} className={
                          isAdminUser ? "bg-amber-500/90" : ""
                        }>
                          {isAdminUser ? "מנהל" : "נהג"}
                        </Badge>
                        {profile.outpost && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {profile.outpost}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(profile)}
                    className="w-10 h-10 rounded-xl"
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                </div>
                
                {/* Additional Details */}
                <div className="mt-3 pt-3 border-t border-border/50 grid grid-cols-2 gap-2 text-sm">
                  {profile.platoon && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Building2 className="w-4 h-4" />
                      <span>מחלקה: {profile.platoon}</span>
                    </div>
                  )}
                  {profile.military_role && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <UserCog className="w-4 h-4" />
                      <span>תפקיד: {profile.military_role}</span>
                    </div>
                  )}
                  {profile.region && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span>אזור: {profile.region}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>הצטרף: {new Date(profile.created_at).toLocaleDateString("he-IL")}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {filteredProfiles.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>לא נמצאו משתמשים</p>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="max-w-md bg-card" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Pencil className="w-5 h-5 text-primary" />
                עריכת משתמש
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>שם מלא *</Label>
                <Input
                  value={editFormData.full_name}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
                  placeholder="שם מלא"
                  className="h-12 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label>מוצב</Label>
                <Input
                  value={editFormData.outpost}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, outpost: e.target.value }))}
                  placeholder="מוצב"
                  className="h-12 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label>סוג משתמש</Label>
                <Select
                  value={editFormData.user_type}
                  onValueChange={(value) => setEditFormData(prev => ({ ...prev, user_type: value }))}
                >
                  <SelectTrigger className="h-12 rounded-xl">
                    <SelectValue placeholder="בחר סוג" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="driver">נהג</SelectItem>
                    <SelectItem value="commander">מפקד</SelectItem>
                    <SelectItem value="officer">קצין בטיחות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>מחלקה</Label>
                <Input
                  value={editFormData.platoon}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, platoon: e.target.value }))}
                  placeholder="מחלקה"
                  className="h-12 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label>תפקיד צבאי</Label>
                <Input
                  value={editFormData.military_role}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, military_role: e.target.value }))}
                  placeholder="תפקיד"
                  className="h-12 rounded-xl"
                />
              </div>
              
              <div className="space-y-2">
                <Label>אזור</Label>
                <Input
                  value={editFormData.region}
                  onChange={(e) => setEditFormData(prev => ({ ...prev, region: e.target.value }))}
                  placeholder="אזור"
                  className="h-12 rounded-xl"
                />
              </div>
            </div>
            
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setEditingUser(null)}
                className="flex-1 h-12 rounded-xl"
              >
                ביטול
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !editFormData.full_name}
                className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-accent"
              >
                {saving && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
                שמירה
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default UsersManagement;
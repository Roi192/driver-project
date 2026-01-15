import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardCheck, Users, AlertTriangle, CheckCircle2, Eye, Building2, Filter, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface Interview {
  id: string;
  driver_name: string;
  interviewer_name: string;
  interview_date: string;
  battalion: string;
  region: string;
  outpost: string;
  license_type: string | null;
  permits: string | null;
  civilian_license_expiry: string | null;
  military_license_expiry: string | null;
  defensive_driving_passed: boolean | null;
  military_accidents: string | null;
  family_status: string | null;
  financial_status: string | null;
  additional_notes: string | null;
  interviewer_summary: string | null;
  signature: string;
  created_at: string;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  outpost: string | null;
}

interface BattalionStats {
  battalion: string;
  totalInterviews: number;
  totalDrivers: number;
  interviewedDrivers: number;
  gap: number;
}

const BATTALIONS = [
  "כל הגדודות",
  "גדוד 7049",
  "גדוד 7050", 
  "גדוד 7051",
  "גדוד 7052"
];

export default function AdminDriverInterviews() {
  const { isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [soldiers, setSoldiers] = useState<Soldier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedBattalion, setSelectedBattalion] = useState("כל הגדודות");
  const [selectedInterview, setSelectedInterview] = useState<Interview | null>(null);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAdmin) {
      navigate("/");
      return;
    }
    fetchData();
  }, [isAdmin, navigate]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [interviewsRes, soldiersRes] = await Promise.all([
        supabase
          .from('driver_interviews')
          .select('*')
          .order('interview_date', { ascending: false }),
        supabase
          .from('soldiers')
          .select('id, full_name, personal_number, outpost')
          .eq('is_active', true)
      ]);

      if (interviewsRes.error) throw interviewsRes.error;
      if (soldiersRes.error) throw soldiersRes.error;

      setInterviews(interviewsRes.data || []);
      setSoldiers(soldiersRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error("שגיאה בטעינת הנתונים");
    } finally {
      setIsLoading(false);
    }
  };

  const filteredInterviews = selectedBattalion === "כל הגדודות"
    ? interviews
    : interviews.filter(i => i.battalion === selectedBattalion);

  // Calculate stats by battalion
  const battalionStats: BattalionStats[] = BATTALIONS.slice(1).map(battalion => {
    const battalionInterviews = interviews.filter(i => i.battalion === battalion);
    const interviewedDriverNames = new Set(battalionInterviews.map(i => i.driver_name.toLowerCase()));
    const totalDrivers = soldiers.length; // In real scenario, filter by battalion
    
    return {
      battalion,
      totalInterviews: battalionInterviews.length,
      totalDrivers,
      interviewedDrivers: interviewedDriverNames.size,
      gap: totalDrivers - interviewedDriverNames.size
    };
  });

  const totalInterviews = interviews.length;
  const uniqueDrivers = new Set(interviews.map(i => i.driver_name.toLowerCase())).size;
  const driversWithoutInterview = soldiers.length - uniqueDrivers;

  const handleViewInterview = (interview: Interview) => {
    setSelectedInterview(interview);
    setIsViewDialogOpen(true);
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <PageHeader 
        title="מעקב ראיונות נהגי קו" 
        subtitle="צפייה ובקרה על ראיונות כל הגדודות"
        icon={ClipboardCheck}
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-black text-primary">{totalInterviews}</p>
                <p className="text-xs text-slate-500">סה"כ ראיונות</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <UserCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-emerald-600">{uniqueDrivers}</p>
                <p className="text-xs text-slate-500">נהגים עם ראיון</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-amber-600">{soldiers.length}</p>
                <p className="text-xs text-slate-500">סה"כ נהגים</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-black text-red-600">{driversWithoutInterview > 0 ? driversWithoutInterview : 0}</p>
                <p className="text-xs text-slate-500">חסר ראיון</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Battalion Stats */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            סטטוס לפי גדוד
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {battalionStats.map((stat) => (
              <div 
                key={stat.battalion}
                className="p-4 rounded-xl bg-slate-50 border border-slate-200"
              >
                <h4 className="font-bold text-slate-800 mb-2">{stat.battalion}</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">ראיונות שבוצעו:</span>
                    <span className="font-bold text-primary">{stat.totalInterviews}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">נהגים שרואיינו:</span>
                    <span className="font-bold text-emerald-600">{stat.interviewedDrivers}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter */}
      <div className="mb-4 flex items-center gap-3">
        <Filter className="w-5 h-5 text-slate-400" />
        <Select value={selectedBattalion} onValueChange={setSelectedBattalion}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="בחר גדוד" />
          </SelectTrigger>
          <SelectContent>
            {BATTALIONS.map((battalion) => (
              <SelectItem key={battalion} value={battalion}>
                {battalion}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Interviews List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">רשימת ראיונות ({filteredInterviews.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredInterviews.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ClipboardCheck className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>לא נמצאו ראיונות</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredInterviews.map((interview) => (
                <div 
                  key={interview.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-bold text-slate-800">{interview.driver_name}</h4>
                        <Badge variant="outline" className="text-xs">
                          {interview.battalion}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">
                        מראיין: {interview.interviewer_name}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(interview.interview_date), "dd/MM/yyyy", { locale: he })}
                        {" • "}
                        {interview.outpost}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewInterview(interview)}
                      className="text-primary hover:bg-primary/10"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      צפייה
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Interview Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-primary" />
              פרטי ראיון
            </DialogTitle>
          </DialogHeader>
          
          {selectedInterview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">שם הנהג</p>
                  <p className="font-bold">{selectedInterview.driver_name}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">תאריך ראיון</p>
                  <p className="font-bold">{format(new Date(selectedInterview.interview_date), "dd/MM/yyyy")}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">גדוד</p>
                  <p className="font-bold">{selectedInterview.battalion}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">עמדה</p>
                  <p className="font-bold">{selectedInterview.outpost}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">אזור</p>
                  <p className="font-bold">{selectedInterview.region}</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">מראיין</p>
                  <p className="font-bold">{selectedInterview.interviewer_name}</p>
                </div>
              </div>

              {selectedInterview.license_type && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">סוג רישיון</p>
                  <p className="font-medium">{selectedInterview.license_type}</p>
                </div>
              )}

              {selectedInterview.permits && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">היתרים</p>
                  <p className="font-medium">{selectedInterview.permits}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {selectedInterview.civilian_license_expiry && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">תוקף רישיון אזרחי</p>
                    <p className="font-medium">{format(new Date(selectedInterview.civilian_license_expiry), "dd/MM/yyyy")}</p>
                  </div>
                )}
                {selectedInterview.military_license_expiry && (
                  <div className="p-3 rounded-lg bg-slate-50">
                    <p className="text-xs text-slate-500">תוקף רישיון צבאי</p>
                    <p className="font-medium">{format(new Date(selectedInterview.military_license_expiry), "dd/MM/yyyy")}</p>
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg bg-slate-50">
                <p className="text-xs text-slate-500">נהיגה מונעת</p>
                <div className="flex items-center gap-2 mt-1">
                  {selectedInterview.defensive_driving_passed ? (
                    <Badge className="bg-emerald-500">עבר</Badge>
                  ) : (
                    <Badge variant="destructive">לא עבר</Badge>
                  )}
                </div>
              </div>

              {selectedInterview.military_accidents && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <p className="text-xs text-amber-600">תאונות צבאיות</p>
                  <p className="font-medium text-amber-800">{selectedInterview.military_accidents}</p>
                </div>
              )}

              {selectedInterview.family_status && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">מצב משפחתי</p>
                  <p className="font-medium">{selectedInterview.family_status}</p>
                </div>
              )}

              {selectedInterview.financial_status && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">מצב כלכלי</p>
                  <p className="font-medium">{selectedInterview.financial_status}</p>
                </div>
              )}

              {selectedInterview.additional_notes && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500">הערות נוספות</p>
                  <p className="font-medium">{selectedInterview.additional_notes}</p>
                </div>
              )}

              {selectedInterview.interviewer_summary && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <p className="text-xs text-primary">סיכום המראיין</p>
                  <p className="font-medium">{selectedInterview.interviewer_summary}</p>
                </div>
              )}

              {selectedInterview.signature && (
                <div className="p-3 rounded-lg bg-slate-50">
                  <p className="text-xs text-slate-500 mb-2">חתימה</p>
                  <img 
                    src={selectedInterview.signature} 
                    alt="חתימה" 
                    className="max-h-20 border rounded"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
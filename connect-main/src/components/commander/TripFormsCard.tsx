import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Home, Users, CheckCircle2, Clock, ChevronLeft, Eye } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface TripForm {
  id: string;
  soldier_name: string;
  form_date: string;
  weapon_reset: boolean;
  exit_briefing_by_officer: boolean;
  officer_name: string | null;
  uniform_class_a: boolean;
  personal_equipment_checked: boolean;
  vehicle_returned: boolean;
  signature: string;
  notes: string | null;
  created_at: string;
}

export function TripFormsCard() {
  const [periodForms, setPeriodForms] = useState<TripForm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedForm, setSelectedForm] = useState<TripForm | null>(null);
  const [showAllDialog, setShowAllDialog] = useState(false);

  const getMostRecentThursday = (date: Date) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);

    // JS: 0=Sunday ... 4=Thursday
    const day = d.getDay();
    const diffDays = (day - 4 + 7) % 7;
    d.setDate(d.getDate() - diffDays);

    // כדי שב"יום חמישי" עדיין נראה את טפסי השבוע שחלף, אנחנו מתחילים מהחמישי הקודם (לא של היום)
    if (day === 4) {
      d.setDate(d.getDate() - 7);
    }

    return d;
  };

  useEffect(() => {
    fetchPeriodForms();
  }, []);

  const fetchPeriodForms = async () => {
    try {
      const now = new Date();
      const periodStart = getMostRecentThursday(now);
      const periodStartStr = format(periodStart, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('trip_forms')
        .select('*')
        .gte('form_date', periodStartStr)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPeriodForms((data as TripForm[]) || []);
    } catch (error) {
      console.error('Error fetching trip forms:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const now = new Date();
  const periodStart = getMostRecentThursday(now);
  const rangeStartLabel = format(periodStart, 'dd/MM/yyyy', { locale: he });
  const rangeEndLabel = format(now, 'dd/MM/yyyy', { locale: he });
  const rangeLabel =
    rangeStartLabel === rangeEndLabel
      ? rangeStartLabel
      : `${rangeStartLabel}–${rangeEndLabel}`;

  const formCount = periodForms.length;

  return (
    <>
      <Card 
        className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 group"
        onClick={() => setShowAllDialog(true)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 rounded-full blur-2xl" />
        
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span>טפסי טיולים מאז חמישי</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative">
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center">
                  <Users className="w-7 h-7 text-emerald-600" />
                </div>
                <div>
                  <div className="text-3xl font-black text-slate-800">{formCount}</div>
                  <div className="text-sm text-slate-500">חיילים מילאו</div>
                </div>
              </div>
              
              {formCount > 0 && (
                <div className="flex-1 space-y-1">
                  {periodForms.slice(0, 3).map((form) => (
                    <div key={form.id} className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <span className="text-slate-600 truncate">{form.soldier_name}</span>
                    </div>
                  ))}
                  {formCount > 3 && (
                    <div className="text-sm text-slate-400">+{formCount - 3} נוספים</div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All forms dialog */}
      <Dialog open={showAllDialog} onOpenChange={setShowAllDialog}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Home className="w-5 h-5 text-emerald-500" />
              טפסי טיולים • {rangeLabel}
            </DialogTitle>
          </DialogHeader>
          
          {periodForms.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">אין טפסים מאז חמישי</p>
            </div>
          ) : (
            <div className="space-y-3 mt-4">
              {periodForms.map((form) => (
                <div
                  key={form.id}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <div>
                      <div className="font-semibold text-slate-800">{form.soldier_name}</div>
                      <div className="text-sm text-slate-500">
                        {format(new Date(form.created_at), 'HH:mm', { locale: he })}
                        {form.officer_name && ` • תודרך ע"י ${form.officer_name}`}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedForm(form);
                    }}
                    className="text-slate-600 hover:text-primary"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Form details dialog */}
      <Dialog open={!!selectedForm} onOpenChange={() => setSelectedForm(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>פרטי טופס טיולים</DialogTitle>
          </DialogHeader>
          
          {selectedForm && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="font-bold text-lg text-slate-800 mb-1">{selectedForm.soldier_name}</div>
                <div className="text-sm text-slate-500">
                  {format(new Date(selectedForm.created_at), 'dd/MM/yyyy HH:mm', { locale: he })}
                </div>
              </div>

              <div className="space-y-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-800">כל הסעיפים בוצעו ✓</span>
                  </div>
                  <div className="text-sm text-emerald-700 space-y-1">
                    <div>• הופעה ולבוש - 3 סעיפים</div>
                    <div>• בטיחות בדרכים - 5 סעיפים</div>
                    <div>• נהלים כלליים - 8 סעיפים</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 border border-blue-200">
                  <span className="font-medium text-blue-800">קצין מתדרך:</span>
                  <span className="text-blue-700">{selectedForm.officer_name || 'לא צוין'}</span>
                </div>
              </div>

              {selectedForm.notes && (
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="text-sm font-medium text-amber-800 mb-1">הערות:</div>
                  <div className="text-sm text-amber-700">{selectedForm.notes}</div>
                </div>
              )}

              {selectedForm.signature && (
                <div className="space-y-2">
                  <div className="text-sm font-medium text-slate-600">חתימה:</div>
                  <img 
                    src={selectedForm.signature} 
                    alt="חתימה" 
                    className="w-full h-24 object-contain border border-slate-200 rounded-lg bg-white"
                  />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
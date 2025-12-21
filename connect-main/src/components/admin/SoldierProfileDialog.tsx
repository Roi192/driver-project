import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { format, parseISO, differenceInDays, getYear, getMonth } from 'date-fns';
import { he } from 'date-fns/locale';
import { Car, AlertTriangle, Gavel, Calendar, User, FileText, CheckCircle, XCircle, Download, Loader2, AlertCircle, TrendingDown } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  release_date: string | null;
  outpost: string | null;
}

interface SoldierProfileDialogProps {
  soldier: Soldier | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const severityLabels: Record<string, string> = {
  minor: 'קל',
  moderate: 'בינוני',
  severe: 'חמור'
};

const severityColors: Record<string, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800'
};

export function SoldierProfileDialog({ soldier, open, onOpenChange }: SoldierProfileDialogProps) {
  // Fetch accidents
  const { data: accidents = [], isLoading: accidentsLoading } = useQuery({
    queryKey: ['soldier-accidents', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('accidents')
        .select('*')
        .eq('soldier_id', soldier.id)
        .order('accident_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Fetch punishments
  const { data: punishments = [], isLoading: punishmentsLoading } = useQuery({
    queryKey: ['soldier-punishments', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('punishments')
        .select('*')
        .eq('soldier_id', soldier.id)
        .order('punishment_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Fetch inspections
  const { data: inspections = [], isLoading: inspectionsLoading } = useQuery({
    queryKey: ['soldier-inspections', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('inspections')
        .select('*')
        .eq('soldier_id', soldier.id)
        .order('inspection_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  // Fetch attendance
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['soldier-attendance', soldier?.id],
    queryFn: async () => {
      if (!soldier) return [];
      const { data, error } = await supabase
        .from('event_attendance')
        .select('*, work_plan_events(title, event_date, category)')
        .eq('soldier_id', soldier.id)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!soldier
  });

  if (!soldier) return null;

  const isLoading = accidentsLoading || punishmentsLoading || inspectionsLoading || attendanceLoading;

  // Calculate statistics
  const attendanceRate = attendance.length > 0 
    ? Math.round((attendance.filter(a => a.attended).length / attendance.length) * 100) 
    : 0;
  
  const avgInspectionScore = inspections.length > 0
    ? Math.round(inspections.reduce((sum, i) => sum + (i.total_score || 0), 0) / inspections.length)
    : 0;

  const severeAccidents = accidents.filter(a => a.severity === 'severe').length;
  const unexcusedAbsences = attendance.filter(a => !a.attended && (!a.absence_reason || a.absence_reason === 'נפקד')).length;

  // Generate alerts
  const alerts: { type: 'warning' | 'danger'; message: string }[] = [];
  
  if (accidents.length >= 2) {
    alerts.push({ type: 'danger', message: `${accidents.length} תאונות מתועדות - דורש תשומת לב מיוחדת` });
  }
  if (severeAccidents > 0) {
    alerts.push({ type: 'danger', message: `${severeAccidents} תאונות חמורות` });
  }
  if (unexcusedAbsences >= 3) {
    alerts.push({ type: 'warning', message: `${unexcusedAbsences} היעדרויות ללא סיבה מוצדקת` });
  }
  if (attendanceRate < 70 && attendance.length > 0) {
    alerts.push({ type: 'warning', message: `אחוז נוכחות נמוך: ${attendanceRate}%` });
  }
  if (avgInspectionScore < 60 && inspections.length > 0) {
    alerts.push({ type: 'warning', message: `ציון ממוצע נמוך בביקורות: ${avgInspectionScore}` });
  }
  if (punishments.length >= 3) {
    alerts.push({ type: 'warning', message: `${punishments.length} עונשים מתועדים` });
  }

  // License expiry alerts
  if (soldier.military_license_expiry) {
    const daysUntilExpiry = differenceInDays(parseISO(soldier.military_license_expiry), new Date());
    if (daysUntilExpiry < 0) {
      alerts.push({ type: 'danger', message: 'רישיון צבאי פג תוקף!' });
    } else if (daysUntilExpiry <= 30) {
      alerts.push({ type: 'warning', message: `רישיון צבאי יפוג בעוד ${daysUntilExpiry} ימים` });
    }
  }
  if (soldier.civilian_license_expiry) {
    const daysUntilExpiry = differenceInDays(parseISO(soldier.civilian_license_expiry), new Date());
    if (daysUntilExpiry < 0) {
      alerts.push({ type: 'danger', message: 'רישיון אזרחי פג תוקף!' });
    } else if (daysUntilExpiry <= 30) {
      alerts.push({ type: 'warning', message: `רישיון אזרחי יפוג בעוד ${daysUntilExpiry} ימים` });
    }
  }

  const handleExport = () => {
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['פרופיל חייל - סיכום'],
      [''],
      ['שם מלא', soldier.full_name],
      ['מספר אישי', soldier.personal_number],
      ['עמדה', soldier.outpost || '-'],
      [''],
      ['סטטיסטיקות'],
      ['סה"כ תאונות', accidents.length],
      ['תאונות חמורות', severeAccidents],
      ['סה"כ עונשים', punishments.length],
      ['סה"כ בדיקות', inspections.length],
      ['ציון ממוצע בבדיקות', avgInspectionScore],
      ['אחוז נוכחות', `${attendanceRate}%`],
      ['היעדרויות ללא סיבה', unexcusedAbsences],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'סיכום');

    // Accidents sheet
    if (accidents.length > 0) {
      const accidentsData = accidents.map(a => ({
        'תאריך': format(parseISO(a.accident_date), 'dd/MM/yyyy'),
        'חומרה': severityLabels[a.severity] || a.severity,
        'מיקום': a.location || '-',
        'רכב': a.vehicle_number || '-',
        'תיאור': a.description || '-',
        'הערות': a.notes || '-'
      }));
      const accidentsSheet = XLSX.utils.json_to_sheet(accidentsData);
      XLSX.utils.book_append_sheet(wb, accidentsSheet, 'תאונות');
    }

    // Punishments sheet
    if (punishments.length > 0) {
      const punishmentsData = punishments.map(p => ({
        'תאריך': format(parseISO(p.punishment_date), 'dd/MM/yyyy'),
        'עבירה': p.offense,
        'עונש': p.punishment,
        'שופט': p.judge,
        'הערות': p.notes || '-'
      }));
      const punishmentsSheet = XLSX.utils.json_to_sheet(punishmentsData);
      XLSX.utils.book_append_sheet(wb, punishmentsSheet, 'עונשים');
    }

    // Inspections sheet
    if (inspections.length > 0) {
      const inspectionsData = inspections.map(i => ({
        'תאריך': format(parseISO(i.inspection_date), 'dd/MM/yyyy'),
        'ציון כולל': i.total_score || 0,
        'מבקר': i.inspector_name,
        'מפקד': i.commander_name,
        'הערות': i.general_notes || '-'
      }));
      const inspectionsSheet = XLSX.utils.json_to_sheet(inspectionsData);
      XLSX.utils.book_append_sheet(wb, inspectionsSheet, 'בדיקות');
    }

    // Attendance sheet
    if (attendance.length > 0) {
      const attendanceData = attendance.map(a => ({
        'אירוע': a.work_plan_events?.title || '-',
        'תאריך': a.work_plan_events?.event_date ? format(parseISO(a.work_plan_events.event_date), 'dd/MM/yyyy') : '-',
        'נכח': a.attended ? 'כן' : 'לא',
        'סיבת היעדרות': a.absence_reason || '-',
        'השלמה': a.completed ? 'כן' : 'לא'
      }));
      const attendanceSheet = XLSX.utils.json_to_sheet(attendanceData);
      XLSX.utils.book_append_sheet(wb, attendanceSheet, 'נוכחות');
    }

    XLSX.writeFile(wb, `פרופיל_${soldier.full_name}_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-3">
              <User className="w-6 h-6" />
              <span>{soldier.full_name}</span>
              <Badge variant="outline">{soldier.personal_number}</Badge>
            </DialogTitle>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={isLoading}>
              <Download className="w-4 h-4 ml-2" />
              ייצוא
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Alerts Section */}
            {alerts.length > 0 && (
              <div className="space-y-2 mb-4">
                {alerts.map((alert, idx) => (
                  <div 
                    key={idx}
                    className={`flex items-center gap-2 p-3 rounded-lg ${
                      alert.type === 'danger' 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <span className="text-sm font-medium">{alert.message}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Card className="bg-gradient-to-br from-red-50 to-orange-50 border-0">
                <CardContent className="p-4 text-center">
                  <Car className="w-6 h-6 mx-auto text-red-500 mb-1" />
                  <div className="text-2xl font-bold text-red-700">{accidents.length}</div>
                  <div className="text-xs text-red-600">תאונות</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-0">
                <CardContent className="p-4 text-center">
                  <Gavel className="w-6 h-6 mx-auto text-purple-500 mb-1" />
                  <div className="text-2xl font-bold text-purple-700">{punishments.length}</div>
                  <div className="text-xs text-purple-600">עונשים</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-0">
                <CardContent className="p-4 text-center">
                  <FileText className="w-6 h-6 mx-auto text-blue-500 mb-1" />
                  <div className="text-2xl font-bold text-blue-700">{avgInspectionScore}</div>
                  <div className="text-xs text-blue-600">ציון ממוצע</div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-0">
                <CardContent className="p-4 text-center">
                  <Calendar className="w-6 h-6 mx-auto text-green-500 mb-1" />
                  <div className="text-2xl font-bold text-green-700">{attendanceRate}%</div>
                  <div className="text-xs text-green-600">נוכחות</div>
                </CardContent>
              </Card>
            </div>

            {/* Extended Stats */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="font-bold text-foreground">{inspections.length}</div>
                <div className="text-muted-foreground text-xs">בדיקות</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="font-bold text-foreground">{severeAccidents}</div>
                <div className="text-muted-foreground text-xs">תאונות חמורות</div>
              </div>
              <div className="bg-muted/50 rounded-lg p-2">
                <div className="font-bold text-foreground">{unexcusedAbsences}</div>
                <div className="text-muted-foreground text-xs">היעדרויות ללא סיבה</div>
              </div>
            </div>

            <Tabs defaultValue="accidents" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="accidents">תאונות</TabsTrigger>
                <TabsTrigger value="punishments">עונשים</TabsTrigger>
                <TabsTrigger value="inspections">ביקורות</TabsTrigger>
                <TabsTrigger value="attendance">נוכחות</TabsTrigger>
              </TabsList>

              {/* Accidents Tab */}
              <TabsContent value="accidents">
                <ScrollArea className="h-[250px]">
                  {accidents.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Car className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>אין תאונות מתועדות</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {accidents.map((accident) => (
                        <Card key={accident.id} className="border-r-4 border-r-red-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold">
                                    {format(parseISO(accident.accident_date), 'dd/MM/yyyy')}
                                  </span>
                                  <Badge className={severityColors[accident.severity] || 'bg-gray-100'}>
                                    {severityLabels[accident.severity] || accident.severity}
                                  </Badge>
                                </div>
                                {accident.location && (
                                  <p className="text-sm text-muted-foreground">מיקום: {accident.location}</p>
                                )}
                                {accident.description && (
                                  <p className="text-sm mt-1">{accident.description}</p>
                                )}
                                {accident.vehicle_number && (
                                  <p className="text-xs text-muted-foreground mt-1">רכב: {accident.vehicle_number}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Punishments Tab */}
              <TabsContent value="punishments">
                <ScrollArea className="h-[250px]">
                  {punishments.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Gavel className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>אין עונשים מתועדים</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {punishments.map((punishment) => (
                        <Card key={punishment.id} className="border-r-4 border-r-purple-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold">
                                    {format(parseISO(punishment.punishment_date), 'dd/MM/yyyy')}
                                  </span>
                                  <Badge variant="outline">{punishment.punishment}</Badge>
                                </div>
                                <p className="text-sm font-medium">עבירה: {punishment.offense}</p>
                                <p className="text-sm text-muted-foreground">שופט: {punishment.judge}</p>
                                {punishment.notes && (
                                  <p className="text-xs mt-1 text-muted-foreground">{punishment.notes}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Inspections Tab */}
              <TabsContent value="inspections">
                <ScrollArea className="h-[250px]">
                  {inspections.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>אין ביקורות מתועדות</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {inspections.map((inspection) => (
                        <Card key={inspection.id} className="border-r-4 border-r-blue-500">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold">
                                    {format(parseISO(inspection.inspection_date), 'dd/MM/yyyy')}
                                  </span>
                                  <Badge 
                                    className={`${
                                      (inspection.total_score || 0) >= 80 
                                        ? 'bg-green-100 text-green-800' 
                                        : (inspection.total_score || 0) >= 60 
                                          ? 'bg-yellow-100 text-yellow-800' 
                                          : 'bg-red-100 text-red-800'
                                    }`}
                                  >
                                    ציון: {inspection.total_score || 0}
                                  </Badge>
                                </div>
                                <p className="text-sm">מבקר: {inspection.inspector_name}</p>
                                <p className="text-sm text-muted-foreground">מפקד: {inspection.commander_name}</p>
                                {inspection.general_notes && (
                                  <p className="text-xs mt-1 text-muted-foreground">{inspection.general_notes}</p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>

              {/* Attendance Tab */}
              <TabsContent value="attendance">
                <ScrollArea className="h-[250px]">
                  {attendance.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p>אין נתוני נוכחות</p>
                    </div>
                  ) : (
                    (() => {
                      // Group attendance by month
                      const hebrewMonths = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
                      const monthlyMap = new Map<string, typeof attendance>();
                      
                      attendance.forEach(record => {
                        if (!record.work_plan_events?.event_date) return;
                        const date = parseISO(record.work_plan_events.event_date);
                        const key = `${getYear(date)}-${getMonth(date)}`;
                        if (!monthlyMap.has(key)) {
                          monthlyMap.set(key, []);
                        }
                        monthlyMap.get(key)!.push(record);
                      });

                      const sortedMonths = Array.from(monthlyMap.entries()).sort((a, b) => {
                        const [yearA, monthA] = a[0].split('-').map(Number);
                        const [yearB, monthB] = b[0].split('-').map(Number);
                        if (yearA !== yearB) return yearB - yearA;
                        return monthB - monthA;
                      });

                      return (
                        <div className="space-y-4">
                          {sortedMonths.map(([key, records]) => {
                            const [year, month] = key.split('-').map(Number);
                            const attended = records.filter(r => r.attended || r.completed).length;
                            const absent = records.filter(r => !r.attended && !r.completed).length;
                            
                            return (
                              <div key={key} className="border rounded-xl overflow-hidden">
                                <div className="bg-gradient-to-l from-primary to-primary/80 px-4 py-2 flex items-center justify-between">
                                  <span className="font-bold text-white">{hebrewMonths[month]} {year}</span>
                                  <div className="flex gap-2">
                                    <Badge className="bg-emerald-500 text-white text-xs">{attended} נכח</Badge>
                                    <Badge className="bg-red-500 text-white text-xs">{absent} נעדר</Badge>
                                  </div>
                                </div>
                                <div className="p-2 space-y-2">
                                  {records.map((record) => (
                                    <div 
                                      key={record.id} 
                                      className={`p-3 rounded-lg border-r-4 ${record.attended || record.completed ? 'border-r-emerald-500 bg-emerald-50' : 'border-r-red-500 bg-red-50'}`}
                                    >
                                      <div className="flex justify-between items-center">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-slate-800">
                                              {record.work_plan_events?.title || 'אירוע'}
                                            </span>
                                            {record.work_plan_events?.event_date && (
                                              <span className="text-sm text-slate-500">
                                                {format(parseISO(record.work_plan_events.event_date), 'dd/MM/yyyy')}
                                              </span>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            {record.attended ? (
                                              <Badge className="bg-emerald-500 text-white text-xs">נכח</Badge>
                                            ) : record.completed ? (
                                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-xs">נכח בהשלמה</Badge>
                                            ) : (
                                              <Badge className="bg-red-500 text-white text-xs">נעדר</Badge>
                                            )}
                                            {record.absence_reason && !record.completed && (
                                              <span className="text-xs text-slate-500">סיבה: {record.absence_reason}</span>
                                            )}
                                          </div>
                                          {record.completed && (
                                            <p className="text-xs text-emerald-600 mt-1">
                                              תאריך השלמה: {format(parseISO(record.created_at), 'dd/MM/yyyy')}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center">
                                          {record.attended || record.completed ? (
                                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                                          ) : (
                                            <XCircle className="w-6 h-6 text-red-500" />
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()
                  )}
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
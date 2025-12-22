import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  CalendarCheck, 
  ClipboardCheck, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO, format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface KPI {
  id: string;
  label: string;
  value: string | number;
  suffix?: string;
  icon: React.ComponentType<{ className?: string }>;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color: 'primary' | 'success' | 'warning' | 'danger';
}

interface Soldier {
  id: string;
  full_name: string;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  is_active: boolean | null;
}

interface EventAttendance {
  soldier_id: string;
  status: string;
}

interface Inspection {
  id: string;
  total_score: number | null;
  soldier_id: string;
  inspection_date: string;
}

interface Accident {
  id: string;
  driver_name: string | null;
  severity: string | null;
  accident_date: string;
  description: string | null;
}

// Detail data types
interface KPIDetailData {
  readyDrivers: Soldier[];
  notReadyDrivers: Soldier[];
  attendanceRecords: { soldier: Soldier; attended: number; total: number }[];
  inspectionDetails: (Inspection & { soldierName?: string })[];
  accidentDetails: Accident[];
}

export function KPICards() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedKPI, setSelectedKPI] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<KPIDetailData>({
    readyDrivers: [],
    notReadyDrivers: [],
    attendanceRecords: [],
    inspectionDetails: [],
    accidentDetails: []
  });

  useEffect(() => {
    fetchKPIs();
  }, []);

  const fetchKPIs = async () => {
    setIsLoading(true);
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    try {
      // 1. Driver readiness percentage
      const { data: soldiers } = await supabase
        .from('soldiers')
        .select('id, full_name, military_license_expiry, civilian_license_expiry, is_active')
        .eq('is_active', true);

      let readyDriversList: Soldier[] = [];
      let notReadyDriversList: Soldier[] = [];
      let totalDrivers = soldiers?.length || 0;

      if (soldiers) {
        soldiers.forEach((soldier: Soldier) => {
          const militaryExpiry = soldier.military_license_expiry ? parseISO(soldier.military_license_expiry) : null;
          const civilianExpiry = soldier.civilian_license_expiry ? parseISO(soldier.civilian_license_expiry) : null;
          
          const militaryValid = !militaryExpiry || differenceInDays(militaryExpiry, today) > 0;
          const civilianValid = !civilianExpiry || differenceInDays(civilianExpiry, today) > 0;
          
          if (militaryValid && civilianValid) {
            readyDriversList.push(soldier);
          } else {
            notReadyDriversList.push(soldier);
          }
        });
      }

      const readinessPercent = totalDrivers > 0 
        ? Math.round((readyDriversList.length / totalDrivers) * 100) 
        : 0;

      // 2. Monthly attendance percentage
      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('soldier_id, status')
        .gte('created_at', firstDayOfMonth.toISOString())
        .neq('status', 'not_in_rotation');

      let attendedCount = 0;
      let totalAttendance = attendance?.length || 0;
      const attendanceByDriver: Record<string, { attended: number; total: number }> = {};

      if (attendance) {
        attendance.forEach((record: EventAttendance) => {
          if (!attendanceByDriver[record.soldier_id]) {
            attendanceByDriver[record.soldier_id] = { attended: 0, total: 0 };
          }
          attendanceByDriver[record.soldier_id].total++;
          if (record.status === 'attended' || record.status === 'makeup_completed') {
            attendedCount++;
            attendanceByDriver[record.soldier_id].attended++;
          }
        });
      }

      const attendancePercent = totalAttendance > 0 
        ? Math.round((attendedCount / totalAttendance) * 100) 
        : 0;

      // Build attendance records with soldier names
      const attendanceRecords = Object.entries(attendanceByDriver).map(([soldierId, data]) => {
        const soldier = soldiers?.find(s => s.id === soldierId);
        return {
          soldier: soldier || { id: soldierId, full_name: 'לא ידוע', military_license_expiry: null, civilian_license_expiry: null, is_active: true },
          attended: data.attended,
          total: data.total
        };
      }).sort((a, b) => (a.attended / a.total) - (b.attended / b.total));

      // 3. Average inspection score
      const { data: inspections } = await supabase
        .from('inspections')
        .select('id, total_score, soldier_id, inspection_date')
        .gte('inspection_date', firstDayOfMonth.toISOString().split('T')[0])
        .order('total_score', { ascending: true });

      let avgScore = 0;
      const inspectionDetails: (Inspection & { soldierName?: string })[] = [];
      if (inspections && inspections.length > 0) {
        const validScores = inspections.filter((i: Inspection) => i.total_score !== null);
        if (validScores.length > 0) {
          avgScore = Math.round(
            validScores.reduce((sum: number, i: Inspection) => sum + (i.total_score || 0), 0) / validScores.length
          );
        }
        inspections.forEach((insp: Inspection) => {
          const soldier = soldiers?.find(s => s.id === insp.soldier_id);
          inspectionDetails.push({
            ...insp,
            soldierName: soldier?.full_name || 'לא ידוע'
          });
        });
      }

      // 4. Exceptional events count
      const { data: accidents } = await supabase
        .from('accidents')
        .select('id, driver_name, severity, accident_date, description')
        .gte('accident_date', firstDayOfMonth.toISOString().split('T')[0])
        .order('accident_date', { ascending: false });

      const exceptionalEvents = accidents?.length || 0;

      setDetailData({
        readyDrivers: readyDriversList,
        notReadyDrivers: notReadyDriversList,
        attendanceRecords,
        inspectionDetails,
        accidentDetails: accidents || []
      });

      setKpis([
        {
          id: 'readiness',
          label: 'כשירות נהגים',
          value: readinessPercent,
          suffix: '%',
          icon: Users,
          trend: readinessPercent >= 90 ? 'up' : readinessPercent >= 70 ? 'neutral' : 'down',
          color: readinessPercent >= 90 ? 'success' : readinessPercent >= 70 ? 'warning' : 'danger'
        },
        {
          id: 'attendance',
          label: 'נוכחות חודשית',
          value: attendancePercent,
          suffix: '%',
          icon: CalendarCheck,
          trend: attendancePercent >= 80 ? 'up' : attendancePercent >= 60 ? 'neutral' : 'down',
          color: attendancePercent >= 80 ? 'success' : attendancePercent >= 60 ? 'warning' : 'danger'
        },
        {
          id: 'inspections',
          label: 'ציון ביקורות',
          value: avgScore || '-',
          icon: ClipboardCheck,
          trend: avgScore >= 80 ? 'up' : avgScore >= 60 ? 'neutral' : 'down',
          color: avgScore >= 80 ? 'success' : avgScore >= 60 ? 'warning' : 'danger'
        },
        {
          id: 'events',
          label: 'אירועים חריגים',
          value: exceptionalEvents,
          icon: AlertTriangle,
          trend: exceptionalEvents === 0 ? 'up' : exceptionalEvents <= 2 ? 'neutral' : 'down',
          color: exceptionalEvents === 0 ? 'success' : exceptionalEvents <= 2 ? 'warning' : 'danger'
        }
      ]);

    } catch (error) {
      console.error('Error fetching KPIs:', error);
    }

    setIsLoading(false);
  };

  const getColorStyles = (color: KPI['color']) => {
    switch (color) {
      case 'success':
        return {
          bg: 'from-success/20 to-success/5',
          icon: 'text-success',
          text: 'text-success',
          border: 'border-success/30'
        };
      case 'warning':
        return {
          bg: 'from-warning/20 to-warning/5',
          icon: 'text-warning',
          text: 'text-amber-700',
          border: 'border-warning/30'
        };
      case 'danger':
        return {
          bg: 'from-danger/20 to-danger/5',
          icon: 'text-danger',
          text: 'text-danger',
          border: 'border-danger/30'
        };
      default:
        return {
          bg: 'from-primary/20 to-primary/5',
          icon: 'text-primary',
          text: 'text-primary',
          border: 'border-primary/30'
        };
    }
  };

  const TrendIcon = ({ trend }: { trend?: KPI['trend'] }) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-success" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-danger" />;
      default:
        return <Minus className="w-4 h-4 text-warning" />;
    }
  };

  const renderDetailContent = () => {
    switch (selectedKPI) {
      case 'readiness':
        return (
          <div className="space-y-4">
            <div>
              <h4 className="font-bold text-emerald-700 mb-2">נהגים כשירים ({detailData.readyDrivers.length})</h4>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {detailData.readyDrivers.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg">
                      <span className="font-medium text-slate-700">{s.full_name}</span>
                      <Badge className="bg-emerald-500 text-white">כשיר</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div>
              <h4 className="font-bold text-red-700 mb-2">נהגים לא כשירים ({detailData.notReadyDrivers.length})</h4>
              <ScrollArea className="h-40">
                <div className="space-y-2">
                  {detailData.notReadyDrivers.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                      <div>
                        <span className="font-medium text-slate-700">{s.full_name}</span>
                        <div className="text-xs text-red-600 mt-1">
                          {s.military_license_expiry && differenceInDays(parseISO(s.military_license_expiry), new Date()) < 0 && (
                            <span>רשיון צבאי פג • </span>
                          )}
                          {s.civilian_license_expiry && differenceInDays(parseISO(s.civilian_license_expiry), new Date()) < 0 && (
                            <span>רשיון אזרחי פג</span>
                          )}
                        </div>
                      </div>
                      <Badge className="bg-red-500 text-white">לא כשיר</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        );
      case 'attendance':
        return (
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {detailData.attendanceRecords.map(record => {
                const percent = Math.round((record.attended / record.total) * 100);
                return (
                  <div key={record.soldier.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <span className="font-medium text-slate-700">{record.soldier.full_name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-slate-500">{record.attended}/{record.total}</span>
                      <Badge className={cn(
                        "text-white",
                        percent >= 80 ? "bg-emerald-500" : percent >= 60 ? "bg-amber-500" : "bg-red-500"
                      )}>
                        {percent}%
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        );
      case 'inspections':
        return (
          <ScrollArea className="h-80">
            <div className="space-y-2">
              {detailData.inspectionDetails.map(insp => (
                <div key={insp.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div>
                    <span className="font-medium text-slate-700">{insp.soldierName}</span>
                    <p className="text-xs text-slate-500">{format(parseISO(insp.inspection_date), 'dd/MM/yyyy', { locale: he })}</p>
                  </div>
                  <Badge className={cn(
                    "text-white",
                    (insp.total_score || 0) >= 80 ? "bg-emerald-500" : (insp.total_score || 0) >= 60 ? "bg-amber-500" : "bg-red-500"
                  )}>
                    {insp.total_score || 0}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        );
      case 'events':
        return (
          <ScrollArea className="h-80">
            {detailData.accidentDetails.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-30" />
                <p>אין אירועים חריגים החודש</p>
              </div>
            ) : (
              <div className="space-y-2">
                {detailData.accidentDetails.map(acc => (
                  <div key={acc.id} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-slate-700">{acc.driver_name || 'לא ידוע'}</span>
                      <Badge className={cn(
                        "text-white",
                        acc.severity === 'severe' || acc.severity === 'major' ? "bg-red-500" : "bg-amber-500"
                      )}>
                        {acc.severity === 'severe' ? 'חמור' : acc.severity === 'major' ? 'משמעותי' : 'קל'}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">{format(parseISO(acc.accident_date), 'dd/MM/yyyy', { locale: he })}</p>
                    {acc.description && <p className="text-sm text-slate-600 mt-1">{acc.description}</p>}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        );
      default:
        return null;
    }
  };

  const getKPITitle = () => {
    switch (selectedKPI) {
      case 'readiness': return 'פירוט כשירות נהגים';
      case 'attendance': return 'פירוט נוכחות חודשית';
      case 'inspections': return 'פירוט ביקורות החודש';
      case 'events': return 'פירוט אירועים חריגים';
      default: return '';
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="h-28 bg-slate-200/50 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-black text-lg text-slate-800">מדדי ביצוע</h2>
            <p className="text-sm text-slate-500">לחץ לפירוט מלא</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {kpis.map((kpi, index) => {
            const Icon = kpi.icon;
            const styles = getColorStyles(kpi.color);
            
            return (
              <div
                key={kpi.id}
                onClick={() => setSelectedKPI(kpi.id)}
                className={cn(
                  "group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm cursor-pointer",
                  "border p-4 transition-all duration-300",
                  "hover:shadow-lg hover:scale-[1.02]",
                  styles.border
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Background gradient */}
                <div className={cn(
                  "absolute inset-0 bg-gradient-to-br opacity-50",
                  styles.bg
                )} />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-2">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center bg-white/80 shadow-sm",
                      styles.border
                    )}>
                      <Icon className={cn("w-5 h-5", styles.icon)} />
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendIcon trend={kpi.trend} />
                      <ChevronLeft className="w-4 h-4 text-slate-400 group-hover:translate-x-[-2px] transition-transform" />
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <p className={cn("text-3xl font-black", styles.text)}>
                      {kpi.value}
                      {kpi.suffix && <span className="text-lg">{kpi.suffix}</span>}
                    </p>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">
                      {kpi.label}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedKPI} onOpenChange={() => setSelectedKPI(null)}>
        <DialogContent className="max-w-lg max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle>{getKPITitle()}</DialogTitle>
          </DialogHeader>
          {renderDetailContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}
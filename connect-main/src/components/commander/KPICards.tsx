import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  CalendarCheck, 
  ClipboardCheck, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';

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
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  is_active: boolean | null;
}

interface EventAttendance {
  status: string;
}

interface Inspection {
  total_score: number | null;
}

interface Accident {
  severity: string | null;
}

export function KPICards() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        .select('id, military_license_expiry, civilian_license_expiry, is_active')
        .eq('is_active', true);

      let readyDrivers = 0;
      let totalDrivers = soldiers?.length || 0;

      if (soldiers) {
        soldiers.forEach((soldier: Soldier) => {
          const militaryExpiry = soldier.military_license_expiry ? parseISO(soldier.military_license_expiry) : null;
          const civilianExpiry = soldier.civilian_license_expiry ? parseISO(soldier.civilian_license_expiry) : null;
          
          const militaryValid = !militaryExpiry || differenceInDays(militaryExpiry, today) > 0;
          const civilianValid = !civilianExpiry || differenceInDays(civilianExpiry, today) > 0;
          
          if (militaryValid && civilianValid) {
            readyDrivers++;
          }
        });
      }

      const readinessPercent = totalDrivers > 0 
        ? Math.round((readyDrivers / totalDrivers) * 100) 
        : 0;

      // 2. Monthly attendance percentage
      const { data: attendance } = await supabase
        .from('event_attendance')
        .select('status')
        .gte('created_at', firstDayOfMonth.toISOString())
        .neq('status', 'not_in_rotation');

      let attendedCount = 0;
      let totalAttendance = attendance?.length || 0;

      if (attendance) {
        attendance.forEach((record: EventAttendance) => {
          if (record.status === 'attended' || record.status === 'makeup_completed') {
            attendedCount++;
          }
        });
      }

      const attendancePercent = totalAttendance > 0 
        ? Math.round((attendedCount / totalAttendance) * 100) 
        : 0;

      // 3. Average inspection score
      const { data: inspections } = await supabase
        .from('inspections')
        .select('total_score')
        .gte('inspection_date', firstDayOfMonth.toISOString().split('T')[0]);

      let avgScore = 0;
      if (inspections && inspections.length > 0) {
        const validScores = inspections.filter((i: Inspection) => i.total_score !== null);
        if (validScores.length > 0) {
          avgScore = Math.round(
            validScores.reduce((sum: number, i: Inspection) => sum + (i.total_score || 0), 0) / validScores.length
          );
        }
      }

      // 4. Exceptional events count
      const { data: accidents } = await supabase
        .from('accidents')
        .select('severity')
        .gte('accident_date', firstDayOfMonth.toISOString().split('T')[0]);

      const exceptionalEvents = accidents?.length || 0;

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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <TrendingUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="font-black text-lg text-slate-800">מדדי ביצוע</h2>
          <p className="text-sm text-slate-500">סטטוס הפלוגה בזמן אמת</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          const styles = getColorStyles(kpi.color);
          
          return (
            <div
              key={kpi.id}
              className={cn(
                "group relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm",
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
                  <TrendIcon trend={kpi.trend} />
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
  );
}
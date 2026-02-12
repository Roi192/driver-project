import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useHagmarSettlement } from "@/hooks/useHagmarSettlement";
import { useAuth } from "@/hooks/useAuth";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { LayoutDashboard, Users, Shield, Target, Package, AlertTriangle, Calendar, ChevronLeft, FileSpreadsheet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { differenceInDays, format, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { he } from "date-fns/locale";
import { HAGMAR_REGIONS, SHOOTING_VALIDITY_DAYS, SHOOTING_WARNING_DAYS, CERT_VALIDITY_DAYS, CERT_WARNING_DAYS, HAGMAR_CERT_TYPES } from "@/lib/hagmar-constants";

interface DashboardData {
  totalSoldiers: number;
  activeSoldiers: number;
  expiredShooting: number;
  warningShooting: number;
  expiredCerts: number;
  equipmentShortages: number;
  openIncidents: number;
  weekEvents: number;
  weaponHoldersThisWeek: number;
}

interface Alert {
  type: "error" | "warning" | "info";
  title: string;
  detail: string;
  route?: string;
}

export default function HagmarDashboard() {
  const { isHagmarAdmin, isSuperAdmin } = useAuth();
  const { userSettlement, isRestricted } = useHagmarSettlement();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchDashboard(); }, [isRestricted, userSettlement]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const today = new Date();
      const weekStart = format(startOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");
      const weekEnd = format(endOfWeek(today, { weekStartsOn: 0 }), "yyyy-MM-dd");

      const [soldiersRes, certsRes, equipRes, incidentsRes, eventsRes, weaponRes] = await Promise.all([
        supabase.from("hagmar_soldiers").select("id, is_active, last_shooting_range_date, settlement"),
        supabase.from("hagmar_certifications").select("id, cert_type, last_refresh_date, soldier_id"),
        supabase.from("hagmar_equipment").select("id, expected_quantity, actual_quantity"),
        supabase.from("hagmar_security_incidents").select("id, status").eq("status", "open"),
        supabase.from("hagmar_training_events").select("id, event_date, title").gte("event_date", weekStart).lte("event_date", weekEnd),
        supabase.from("weekend_weapon_holders").select("id").gte("weekend_date", weekStart).lte("weekend_date", weekEnd),
      ]);

      let soldiers = soldiersRes.data || [];
      const certs = certsRes.data || [];
      let equipment = equipRes.data || [];
      
      // Ravshatz: restrict to own settlement
      if (isRestricted && userSettlement) {
        soldiers = soldiers.filter(s => s.settlement === userSettlement);
        equipment = equipment.filter((e: any) => e.settlement === userSettlement);
      }
      
      const active = soldiers.filter(s => s.is_active);

      // Shooting range checks
      let expiredShooting = 0, warningShooting = 0;
      active.forEach(s => {
        if (!s.last_shooting_range_date) { expiredShooting++; return; }
        const days = differenceInDays(today, parseISO(s.last_shooting_range_date));
        if (days > SHOOTING_VALIDITY_DAYS) expiredShooting++;
        else if (days > SHOOTING_WARNING_DAYS) warningShooting++;
      });

      // Cert checks
      let expiredCerts = 0;
      certs.forEach(c => {
        if (!c.last_refresh_date) { expiredCerts++; return; }
        const days = differenceInDays(today, parseISO(c.last_refresh_date));
        if (days > CERT_VALIDITY_DAYS) expiredCerts++;
      });

      // Equipment shortages
      const shortages = equipment.filter(e => e.actual_quantity < e.expected_quantity).length;

      const dashData: DashboardData = {
        totalSoldiers: soldiers.length,
        activeSoldiers: active.length,
        expiredShooting,
        warningShooting,
        expiredCerts,
        equipmentShortages: shortages,
        openIncidents: incidentsRes.data?.length || 0,
        weekEvents: eventsRes.data?.length || 0,
        weaponHoldersThisWeek: weaponRes.data?.length || 0,
      };
      setData(dashData);

      // Build alerts
      const newAlerts: Alert[] = [];
      if (dashData.openIncidents > 0) newAlerts.push({ type: "error", title: `${dashData.openIncidents} אירועים ביטחוניים פתוחים`, detail: "יש לטפל באירועים פתוחים", route: "/hagmar/security-incidents" });
      if (expiredShooting > 0) newAlerts.push({ type: "error", title: `${expiredShooting} לוחמים עם מטווח פג תוקף`, detail: "יש לתאם מטווח בהקדם", route: "/hagmar/soldiers" });
      if (warningShooting > 0) newAlerts.push({ type: "warning", title: `${warningShooting} לוחמים קרובים לפקיעת מטווח`, detail: "פחות מ-30 יום לפקיעה", route: "/hagmar/soldiers" });
      if (expiredCerts > 0) newAlerts.push({ type: "warning", title: `${expiredCerts} הסמכות פגות תוקף`, detail: "יש לחדש הסמכות", route: "/hagmar/soldiers" });
      if (shortages > 0) newAlerts.push({ type: "warning", title: `${shortages} פריטי ציוד בחוסר`, detail: "יש להשלים מלאי", route: "/hagmar/equipment" });
      if (dashData.weekEvents > 0) newAlerts.push({ type: "info", title: `${dashData.weekEvents} אירועים השבוע`, detail: (eventsRes.data || []).map(e => e.title).join(", "), route: "/hagmar/training-events" });
      setAlerts(newAlerts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin w-10 h-10 border-4 border-amber-500 border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  const kpis = [
    { label: "לוחמים פעילים", value: data?.activeSoldiers || 0, total: data?.totalSoldiers || 0, icon: Users, color: "from-emerald-500 to-teal-500", route: "/hagmar/soldiers" },
    { label: "אוחזי נשק (שבוע)", value: data?.weaponHoldersThisWeek || 0, icon: Shield, color: "from-amber-500 to-orange-500", route: "/hagmar/weapon-holders" },
    { label: "אירועים פתוחים", value: data?.openIncidents || 0, icon: AlertTriangle, color: data?.openIncidents ? "from-red-500 to-rose-500" : "from-slate-400 to-slate-500", route: "/hagmar/security-incidents" },
    { label: "אימונים השבוע", value: data?.weekEvents || 0, icon: Target, color: "from-blue-500 to-indigo-500", route: "/hagmar/training-events" },
    { label: "חוסרי ציוד", value: data?.equipmentShortages || 0, icon: Package, color: data?.equipmentShortages ? "from-orange-500 to-red-500" : "from-slate-400 to-slate-500", route: "/hagmar/equipment" },
    { label: "מטווח פג תוקף", value: data?.expiredShooting || 0, icon: Target, color: data?.expiredShooting ? "from-red-600 to-red-700" : "from-slate-400 to-slate-500", route: "/hagmar/soldiers" },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white pb-24" dir="rtl">
        <div className="px-4 py-6 space-y-5">
          <PageHeader title='דשבורד מנהל הגמ"ר' subtitle="תמונת מצב מרכזית" icon={LayoutDashboard} />

          {/* Alerts */}
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.map((alert, i) => (
                <Card
                  key={i}
                  className={`p-3 cursor-pointer transition-all hover:shadow-md ${
                    alert.type === "error" ? "border-red-300 bg-red-50" :
                    alert.type === "warning" ? "border-amber-300 bg-amber-50" :
                    "border-blue-200 bg-blue-50"
                  }`}
                  onClick={() => alert.route && navigate(alert.route)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={`w-4 h-4 ${alert.type === "error" ? "text-red-600" : alert.type === "warning" ? "text-amber-600" : "text-blue-600"}`} />
                      <div>
                        <p className={`text-sm font-bold ${alert.type === "error" ? "text-red-800" : alert.type === "warning" ? "text-amber-800" : "text-blue-800"}`}>{alert.title}</p>
                        <p className={`text-xs ${alert.type === "error" ? "text-red-600" : alert.type === "warning" ? "text-amber-600" : "text-blue-600"}`}>{alert.detail}</p>
                      </div>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-muted-foreground" />
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* KPI Cards */}
          <div className="grid grid-cols-2 gap-3">
            {kpis.map((kpi, i) => {
              const Icon = kpi.icon;
              return (
                <Card
                  key={i}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 border-0 overflow-hidden"
                  onClick={() => navigate(kpi.route)}
                >
                  <CardContent className={`p-4 bg-gradient-to-br ${kpi.color} text-white`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-5 h-5 opacity-80" />
                      <span className="text-xs font-semibold opacity-90">{kpi.label}</span>
                    </div>
                    <p className="text-3xl font-black">{kpi.value}</p>
                    {"total" in kpi && kpi.total ? <p className="text-xs opacity-75">מתוך {kpi.total}</p> : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Quick Navigation */}
          <h2 className="text-lg font-bold text-foreground">ניווט מהיר</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "לוחמים", icon: Users, route: "/hagmar/soldiers", color: "from-emerald-500 to-teal-500" },
              { label: "אוחזי נשק", icon: Shield, route: "/hagmar/weapon-holders", color: "from-amber-500 to-orange-500" },
              { label: "אימונים", icon: Target, route: "/hagmar/training-events", color: "from-blue-500 to-indigo-500" },
              { label: "ציוד", icon: Package, route: "/hagmar/equipment", color: "from-purple-500 to-indigo-500" },
              { label: "אירועים ביטחוניים", icon: AlertTriangle, route: "/hagmar/security-incidents", color: "from-red-500 to-rose-500" },
              { label: "ניהול משתמשים", icon: Users, route: "/hagmar/users-management", color: "from-pink-500 to-pink-600" },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <Card key={i} className="cursor-pointer hover:shadow-lg transition-all group border-border" onClick={() => navigate(item.route)}>
                  <CardContent className="p-4 text-center">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${item.color} flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-bold text-foreground">{item.label}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
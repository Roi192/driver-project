import { AppLayout } from "@/components/layout/AppLayout";
import { Building2, Shield, Users, AlertTriangle, UserCog, Target, Package, LayoutDashboard } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const HagmarHome = () => {
  const { user, isHagmarAdmin, isSuperAdmin, role } = useAuth();
  const navigate = useNavigate();
  const [userDepartment, setUserDepartment] = useState<string | null>(null);

  useEffect(() => {
    const fetchDept = async () => {
      if (!user) return;
      const { data } = await supabase
        .from('profiles')
        .select('department')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserDepartment(data?.department || null);
    };
    fetchDept();
  }, [user]);

  const isManager = isHagmarAdmin || isSuperAdmin || role === 'ravshatz';
  const isFighter = userDepartment === 'hagmar' && !isManager;

  // Fighter view - only weapon holders
  if (isFighter) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white p-4 pt-20" dir="rtl">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-800">הגמ"ר</h1>
                <p className="text-sm text-slate-500">הגנת המרחב</p>
              </div>
            </div>
          </div>

          <Card 
            className="relative overflow-hidden border-amber-200 hover:shadow-lg transition-all duration-300 cursor-pointer group"
            onClick={() => navigate('/hagmar/weapon-holders')}
          >
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mx-auto mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Shield className="w-10 h-10 text-white" />
              </div>
              <p className="font-black text-slate-700 text-lg">דיווח נוכחות נשק לסוף שבוע</p>
              <p className="text-sm text-slate-500 mt-2">לחץ כדי לדווח האם אתה סוגר שבת עם נשק</p>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  const quickActions = [
    ...(isHagmarAdmin || isSuperAdmin ? [{ icon: LayoutDashboard, label: "דשבורד מנהל", color: "from-gold to-gold-dark", comingSoon: false, route: "/hagmar/dashboard" }] : []),
    ...(isHagmarAdmin || isSuperAdmin ? [{ icon: UserCog, label: "ניהול משתמשים", color: "from-pink-500 to-pink-600", comingSoon: false, route: "/hagmar/users-management" }] : []),
    { icon: Users, label: "לוחמי הגמ\"ר", color: "from-emerald-500 to-teal-500", comingSoon: false, route: "/hagmar/soldiers" },
    { icon: Shield, label: "מעקב אוחזי נשק", color: "from-amber-500 to-orange-500", comingSoon: false, route: "/hagmar/weapon-holders" },
    { icon: Target, label: "אירועי אימונים", color: "from-blue-500 to-indigo-500", comingSoon: false, route: "/hagmar/training-events" },
    { icon: Package, label: "ניהול ציוד", color: "from-purple-500 to-indigo-500", comingSoon: false, route: "/hagmar/equipment" },
    { icon: AlertTriangle, label: "אירועים ביטחוניים", color: "from-red-500 to-rose-500", comingSoon: false, route: "/hagmar/security-incidents" },
  ];

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-amber-50/30 to-white p-4 pt-20" dir="rtl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-800">מחלקת הגמ"ר</h1>
              <p className="text-sm text-slate-500">הגנת המרחב - מערכת ניהול</p>
            </div>
          </div>
        </div>

        <Card className="mb-6 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-amber-600" />
              <h2 className="text-lg font-bold text-amber-800">ברוכים הבאים</h2>
            </div>
            <p className="text-amber-700 leading-relaxed">
              מערכת הגמ"ר מנהלת את הקשר בין הצבא להתיישבות, כולל ניהול מתנדבים, נקודות תצפית, דיווחי אירועים והתרעות.
            </p>
          </CardContent>
        </Card>

        <h2 className="text-lg font-bold text-slate-800 mb-4">פעולות מהירות</h2>
        <div className="grid grid-cols-2 gap-4">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Card 
                key={action.label} 
                className="relative overflow-hidden border-slate-200 hover:shadow-lg transition-all duration-300 cursor-pointer group"
                onClick={() => action.route && navigate(action.route)}
              >
                <CardContent className="p-5 text-center">
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.color} flex items-center justify-center mx-auto mb-3 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <p className="font-bold text-slate-700 text-sm">{action.label}</p>
                  {action.comingSoon && (
                    <span className="text-xs text-slate-400 mt-1 block">בקרוב</span>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
};

export default HagmarHome;
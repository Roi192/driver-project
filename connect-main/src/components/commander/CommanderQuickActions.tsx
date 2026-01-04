import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  Car, 
  FileText,
  ChevronLeft,
  Sparkles,
  Shield,
  Activity
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const actions = [
  {
    to: "/soldiers-control",
    icon: Users,
    label: "טבלת שליטה",
    description: "ניהול נהגים ורישיונות",
    gradient: "from-primary to-teal-dark",
    bgGlow: "bg-primary/20"
  },
  {
    to: "/annual-work-plan",
    icon: Calendar,
    label: "תוכנית עבודה",
    description: "לוח שנה ומופעים",
    gradient: "from-accent to-amber-600",
    bgGlow: "bg-accent/20"
  },
  {
    to: "/attendance-tracking",
    icon: FileText,
    label: "מעקב נוכחות",
    description: "נוכחות לפי חודש ונהג",
    gradient: "from-success to-emerald-600",
    bgGlow: "bg-success/20"
  },
  {
    to: "/inspections",
    icon: ClipboardCheck,
    label: "ביקורות",
    description: "ביקורות נהגים",
    gradient: "from-olive to-olive-dark",
    bgGlow: "bg-olive/20"
  },
  {
    to: "/accidents-tracking",
    icon: Car,
    label: "מעקב תאונות",
    description: "ניהול ומעקב תאונות",
    gradient: "from-danger to-red-700",
    bgGlow: "bg-danger/20"
  },
  {
    to: "/punishments-tracking",
    icon: Shield,
    label: "מעקב עונשים",
    description: "עונשים ואירועים משמעתיים",
    gradient: "from-slate-600 to-slate-800",
    bgGlow: "bg-slate-400/20"
  },
  {
    to: "/fitness-report",
    icon: Activity,
    label: "דוח כשירות",
    description: "כשירות מרוכזת נהגים",
    gradient: "from-teal-500 to-cyan-600",
    bgGlow: "bg-teal-400/20"
  },
  {
    to: "/cleaning-parades-management",
    icon: Sparkles,
    label: "מסדרי ניקיון",
    description: "ניהול תמונות דוגמא",
    gradient: "from-purple-500 to-pink-500",
    bgGlow: "bg-purple-400/20"
  }
];

export function CommanderQuickActions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
          <Sparkles className="w-5 h-5 text-accent" />
        </div>
        <div>
          <h2 className="font-black text-lg text-slate-800">גישה מהירה</h2>
          <p className="text-sm text-slate-500">כלי ניהול ושליטה</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          
          return (
            <Link
              key={action.to}
              to={action.to}
              className="group"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className={cn(
                "relative overflow-hidden rounded-2xl bg-white/90 backdrop-blur-sm",
                "border border-slate-200 p-4 transition-all duration-300",
                "hover:shadow-lg hover:scale-[1.03] hover:border-primary/40"
              )}>
                {/* Gradient glow on hover */}
                <div className={cn(
                  "absolute -inset-2 rounded-3xl blur-xl opacity-0 group-hover:opacity-50 transition-opacity duration-500",
                  action.bgGlow
                )} />
                
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />

                <div className="relative">
                  <div className="flex items-center justify-between mb-3">
                    <div className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center",
                      "bg-gradient-to-br shadow-lg group-hover:scale-110 transition-transform duration-300",
                      action.gradient
                    )}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all duration-300" />
                  </div>
                  
                  <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors">
                    {action.label}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">
                    {action.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
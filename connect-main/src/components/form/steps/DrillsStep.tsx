import { useFormContext } from "react-hook-form";
import { Textarea } from "@/components/ui/textarea";
import { DRILLS } from "@/lib/constants";
import { Target, AlertTriangle, MapPin, CheckCircle2, Sparkles } from "lucide-react";

export function DrillsStep() {
  const { register, watch, setValue } = useFormContext();
  const drillsCompleted: string[] = watch("drillsCompleted") || [];

  const toggleDrill = (drill: string) => {
    const newDrills = drillsCompleted.includes(drill)
      ? drillsCompleted.filter((d) => d !== drill)
      : [...drillsCompleted, drill];
    setValue("drillsCompleted", newDrills);
  };

  const allDrillsCompleted = DRILLS.every((drill) => drillsCompleted.includes(drill));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Target className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 4 מתוך 5</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-foreground">תרגולות מחייבות</h2>
        <p className="text-muted-foreground">סמן את התרגולות שבוצעו ומלא את הפרטים</p>
      </div>

      {/* Drills Checklist */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
              <Target className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">תרגולות שבוצעו</h3>
              <p className="text-xs text-muted-foreground">{drillsCompleted.length} / {DRILLS.length} בוצעו</p>
            </div>
          </div>
          {allDrillsCompleted && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-50 text-green-600 border border-green-200">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-sm font-bold">הושלם</span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {DRILLS.map((drill, index) => {
            const isChecked = drillsCompleted.includes(drill);
            return (
              <div
                key={drill}
                onClick={() => toggleDrill(drill)}
                className={`flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 animate-fade-in ${
                  isChecked 
                    ? "bg-green-50/50 border-green-300 shadow-sm" 
                    : "bg-muted/20 border-transparent hover:border-green-200 hover:bg-green-50/50"
                }`}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  isChecked 
                    ? "bg-green-500 text-white shadow-md" 
                    : "bg-muted/50 border border-border/50"
                }`}>
                  {isChecked && <CheckCircle2 className="w-5 h-5" />}
                </div>
                <span className={`flex-1 font-medium transition-colors duration-300 ${
                  isChecked ? "text-foreground" : "text-muted-foreground"
                }`}>
                  {drill}
                </span>
                {isChecked && (
                  <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-100">
                    <Sparkles className="w-3 h-3 text-green-600" />
                    <span className="text-xs font-bold text-green-600">בוצע</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 pt-4 border-t border-border/20">
          <div className="h-2 bg-muted/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-green-500 to-primary transition-all duration-500"
              style={{ width: `${(drillsCompleted.length / DRILLS.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Safety Vulnerabilities */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">נקודות תורפה בטיחותיות</h3>
            <p className="text-xs text-muted-foreground">ציין 2 נקודות תורפה בגזרתך</p>
          </div>
        </div>
        <Textarea
          {...register("safetyVulnerabilities")}
          placeholder="תאר את נקודות התורפה הבטיחותיות בגזרה שלך..."
          className="min-h-[120px] bg-muted/20 border-border/30 resize-none focus:border-orange-400 focus:ring-orange-200 transition-all duration-300 rounded-xl"
        />
      </div>

      {/* Vardim Procedure */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">נוהל ורדים</h3>
            <p className="text-xs text-muted-foreground">מהו נוהל ורדים?</p>
          </div>
        </div>
        <Textarea
          {...register("vardimProcedure")}
          placeholder="תאר את נוהל ורדים בהרחבה..."
          className="min-h-[120px] bg-muted/20 border-border/30 resize-none focus:border-accent/50 focus:ring-accent/20 transition-all duration-300 rounded-xl"
        />
      </div>

      {/* Vardim Points */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">נקודות ורדים</h3>
            <p className="text-xs text-muted-foreground">ציין 2 נקודות ורדים בגזרתך</p>
          </div>
        </div>
        <Textarea
          {...register("vardimPoints")}
          placeholder="פרט את נקודות הורדים בגזרה שלך..."
          className="min-h-[120px] bg-muted/20 border-border/30 resize-none focus:border-primary/50 focus:ring-primary/20 transition-all duration-300 rounded-xl"
        />
      </div>
    </div>
  );
}

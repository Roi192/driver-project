import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Layers } from "lucide-react";

interface WorkPlanEvent {
  id: string;
  title: string;
  event_date: string;
  status: string;
  expected_soldiers: string[] | null;
  content_cycle?: string | null;
}

interface EventAttendance {
  id: string;
  event_id: string;
  soldier_id: string;
  attended: boolean;
  status: string;
  completed: boolean;
}

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  rotation_group: string | null;
  qualified_date: string | null;
}

interface ContentCycleTrackerProps {
  events: WorkPlanEvent[];
  attendance: EventAttendance[];
  soldiers: Soldier[];
}

export function ContentCycleTracker({ events, attendance, soldiers }: ContentCycleTrackerProps) {
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  const contentCycles = useMemo(() => {
    const cycleMap = new Map<string, WorkPlanEvent[]>();
    
    events.forEach(event => {
      const cycle = (event as any).content_cycle;
      if (cycle) {
        if (!cycleMap.has(cycle)) cycleMap.set(cycle, []);
        cycleMap.get(cycle)!.push(event);
      }
    });

    return Array.from(cycleMap.entries()).map(([cycleName, cycleEvents]) => {
      // Find the earliest event date in this cycle to determine which soldiers were qualified
      const earliestDate = cycleEvents.reduce((min, e) => e.event_date < min ? e.event_date : min, cycleEvents[0].event_date);

      // Only include soldiers who were qualified before or on the earliest event date
      const eligibleSoldiers = soldiers.filter(s => {
        if (!s.qualified_date) return true; // no date = assume qualified
        return s.qualified_date <= earliestDate;
      });

      // For each eligible soldier, check if they attended ANY event in this cycle
      const attended: Soldier[] = [];
      const missing: Soldier[] = [];

      eligibleSoldiers.forEach(soldier => {
        const didAttend = cycleEvents.some(event => {
          const att = attendance.find(
            a => a.event_id === event.id && a.soldier_id === soldier.id
          );
          return att && (att.status === "attended" || att.completed);
        });
        if (didAttend) attended.push(soldier);
        else missing.push(soldier);
      });

      const total = eligibleSoldiers.length;
      const completedCount = attended.length;
      const percentage = total > 0 ? Math.round((completedCount / total) * 100) : 0;

      return {
        name: cycleName,
        events: cycleEvents,
        eligibleSoldiers,
        attended,
        missing,
        total,
        completedCount,
        percentage,
      };
    });
  }, [events, attendance, soldiers]);

  if (contentCycles.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <Layers className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
          <p className="font-bold text-foreground">אין מחזורי תוכן</p>
          <p className="text-sm text-muted-foreground mt-1">הוסף שדה "מחזור תוכן" למופעים כדי לעקוב אחרי העברת תוכן דו-שבועית</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-foreground flex items-center gap-2">
        <Layers className="w-5 h-5" />
        מעקב תוכן דו-שבועי
      </h3>
      
      {contentCycles.map(cycle => {
        const isExpanded = expandedCycle === cycle.name;
        
        return (
          <Card key={cycle.name} className="border-0 shadow-md overflow-hidden">
            <div 
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setExpandedCycle(isExpanded ? null : cycle.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-foreground">{cycle.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {cycle.events.length} מופעים
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={`text-xs ${
                    cycle.percentage >= 80 ? "bg-emerald-100 text-emerald-700" :
                    cycle.percentage >= 50 ? "bg-amber-100 text-amber-700" :
                    "bg-red-100 text-red-700"
                  }`}>
                    {cycle.completedCount}/{cycle.total}
                  </Badge>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>
              
              <Progress value={cycle.percentage} className="h-2" />
              <p className="text-xs text-muted-foreground mt-1">{cycle.percentage}% מהחיילים עברו את התוכן</p>

              {cycle.missing.length > 0 && (
                <p className="text-xs text-red-600 font-medium mt-2">
                  חסר להשלים: {cycle.missing.length} חיילים
                </p>
              )}
            </div>

            {isExpanded && (
              <div className="border-t border-border p-4 space-y-4 bg-muted/30">
                {/* Missing soldiers - who needs completion */}
                {cycle.missing.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-red-700 mb-2 flex items-center gap-1.5">
                      <XCircle className="w-4 h-4" />
                      צריכים להשלים ({cycle.missing.length})
                    </p>
                    <div className="space-y-1">
                      {cycle.missing.map(soldier => (
                        <div key={soldier.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background border border-border">
                          <span className="text-sm text-foreground">{soldier.full_name}</span>
                          <XCircle className="w-5 h-5 text-red-400" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attended soldiers */}
                {cycle.attended.length > 0 && (
                  <div>
                    <p className="text-sm font-bold text-emerald-700 mb-2 flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" />
                      עברו את התוכן ({cycle.attended.length})
                    </p>
                    <div className="space-y-1">
                      {cycle.attended.map(soldier => (
                        <div key={soldier.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-background border border-border">
                          <span className="text-sm text-foreground">{soldier.full_name}</span>
                          <CheckCircle className="w-5 h-5 text-emerald-500" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
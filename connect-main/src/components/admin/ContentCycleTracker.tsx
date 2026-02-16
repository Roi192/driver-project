import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, ChevronDown, ChevronUp, Layers } from "lucide-react";

const ROTATION_GROUPS = [
  { value: "a_sunday", label: "סבב א' (ראשון)" },
  { value: "a_monday", label: "סבב א' (שני)" },
  { value: "b_sunday", label: "סבב ב' (ראשון)" },
  { value: "b_monday", label: "סבב ב' (שני)" },
];

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
}

interface ContentCycleTrackerProps {
  events: WorkPlanEvent[];
  attendance: EventAttendance[];
  soldiers: Soldier[];
}

export function ContentCycleTracker({ events, attendance, soldiers }: ContentCycleTrackerProps) {
  const [expandedCycle, setExpandedCycle] = useState<string | null>(null);

  // Group events by content_cycle
  const contentCycles = useMemo(() => {
    const cycleMap = new Map<string, WorkPlanEvent[]>();
    
    events.forEach(event => {
      const cycle = (event as any).content_cycle;
      if (cycle) {
        if (!cycleMap.has(cycle)) {
          cycleMap.set(cycle, []);
        }
        cycleMap.get(cycle)!.push(event);
      }
    });

    return Array.from(cycleMap.entries()).map(([cycleName, cycleEvents]) => {
      // For each soldier, check if they attended ANY event in this cycle
      const soldierCompletion = new Map<string, boolean>();
      
      soldiers.forEach(soldier => {
        const attended = cycleEvents.some(event => {
          const att = attendance.find(
            a => a.event_id === event.id && a.soldier_id === soldier.id
          );
          return att && (att.status === "attended" || att.completed);
        });
        soldierCompletion.set(soldier.id, attended);
      });

      // Group completion by rotation
      const rotationStats = ROTATION_GROUPS.map(group => {
        const groupSoldiers = soldiers.filter(s => s.rotation_group === group.value);
        const completed = groupSoldiers.filter(s => soldierCompletion.get(s.id)).length;
        return {
          ...group,
          soldiers: groupSoldiers,
          completed,
          total: groupSoldiers.length,
          percentage: groupSoldiers.length > 0 ? Math.round((completed / groupSoldiers.length) * 100) : 0,
        };
      });

      const totalSoldiers = soldiers.length;
      const totalCompleted = soldiers.filter(s => soldierCompletion.get(s.id)).length;

      return {
        name: cycleName,
        events: cycleEvents,
        rotationStats,
        totalSoldiers,
        totalCompleted,
        percentage: totalSoldiers > 0 ? Math.round((totalCompleted / totalSoldiers) * 100) : 0,
        soldierCompletion,
      };
    });
  }, [events, attendance, soldiers]);

  if (contentCycles.length === 0) {
    return (
      <Card className="border-0 shadow-lg">
        <CardContent className="p-6 text-center">
          <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="font-bold text-slate-700">אין מחזורי תוכן</p>
          <p className="text-sm text-slate-500 mt-1">הוסף שדה "מחזור תוכן" למופעים כדי לעקוב אחרי העברת תוכן דו-שבועית</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="font-bold text-slate-800 flex items-center gap-2">
        <Layers className="w-5 h-5" />
        מעקב תוכן דו-שבועי
      </h3>
      
      {contentCycles.map(cycle => {
        const isExpanded = expandedCycle === cycle.name;
        
        return (
          <Card key={cycle.name} className="border-0 shadow-md overflow-hidden">
            <div 
              className="p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              onClick={() => setExpandedCycle(isExpanded ? null : cycle.name)}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-slate-800">{cycle.name}</h4>
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
                    {cycle.totalCompleted}/{cycle.totalSoldiers}
                  </Badge>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                </div>
              </div>
              
              <Progress value={cycle.percentage} className="h-2" />
              <p className="text-xs text-slate-500 mt-1">{cycle.percentage}% מהחיילים עברו את התוכן</p>

              {/* Rotation groups summary */}
              <div className="grid grid-cols-2 gap-2 mt-3">
                {cycle.rotationStats.map(rs => (
                  <div key={rs.value} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="text-xs font-medium text-slate-700">{rs.label}</span>
                    <Badge className={`text-[10px] ${
                      rs.percentage >= 80 ? "bg-emerald-500 text-white" :
                      rs.percentage >= 50 ? "bg-amber-500 text-white" :
                      "bg-red-500 text-white"
                    }`}>
                      {rs.completed}/{rs.total}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-slate-100 p-4 space-y-3 bg-slate-50/50">
                {ROTATION_GROUPS.map(group => {
                  const groupSoldiers = soldiers.filter(s => s.rotation_group === group.value);
                  if (groupSoldiers.length === 0) return null;
                  
                  return (
                    <div key={group.value}>
                      <p className="text-sm font-bold text-slate-700 mb-2">{group.label}</p>
                      <div className="space-y-1">
                        {groupSoldiers.map(soldier => {
                          const completed = cycle.soldierCompletion.get(soldier.id);
                          return (
                            <div key={soldier.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-slate-200">
                              <span className="text-sm text-slate-800">{soldier.full_name}</span>
                              {completed ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

                {/* Soldiers without rotation group */}
                {(() => {
                  const noGroup = soldiers.filter(s => !s.rotation_group);
                  if (noGroup.length === 0) return null;
                  return (
                    <div>
                      <p className="text-sm font-bold text-slate-700 mb-2">ללא סבב</p>
                      <div className="space-y-1">
                        {noGroup.map(soldier => {
                          const completed = cycle.soldierCompletion.get(soldier.id);
                          return (
                            <div key={soldier.id} className="flex items-center justify-between py-1.5 px-3 rounded-lg bg-white border border-slate-200">
                              <span className="text-sm text-slate-800">{soldier.full_name}</span>
                              {completed ? (
                                <CheckCircle className="w-5 h-5 text-emerald-500" />
                              ) : (
                                <XCircle className="w-5 h-5 text-red-400" />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
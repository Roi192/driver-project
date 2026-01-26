import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Home, Users, CheckCircle2, XCircle, ChevronLeft, Loader2, Calendar, MapPin } from "lucide-react";
import { format, parseISO, addDays, startOfDay, endOfDay, getDay } from "date-fns";
import { he } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Soldier {
  id: string;
  full_name: string;
  outpost: string | null;
}

interface ExpectedSoldierInfo {
  soldier: Soldier;
  expectedDate: string; // The date they were expected at an event (e.g., Sunday the 17th)
  departureDate: string; // The date they should leave (7 days later, e.g., Sunday the 24th)
  hasSubmittedForm: boolean;
  eventTitle: string;
}

export function TripFormsComplianceCard() {
  const [expectedSoldiers, setExpectedSoldiers] = useState<ExpectedSoldierInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "submitted" | "pending">("all");

  useEffect(() => {
    fetchExpectedSoldiers();
  }, []);

  const fetchExpectedSoldiers = async () => {
    setLoading(true);
    try {
      const today = startOfDay(new Date());
      const todayDay = getDay(today); // 0 = Sunday, 1 = Monday, etc.
      
      // We're interested in soldiers who were expected 7 days ago (they should leave today/soon)
      // For Sunday/Monday rotations, check events from 7 days ago
      const sevenDaysAgo = addDays(today, -7);
      const fourteenDaysAgo = addDays(today, -14);
      
      // Fetch work plan events with expected soldiers from the past 7-14 days
      // Focus on events that were on Sunday (0) or Monday (1) as per the requirement
      const { data: eventsData, error: eventsError } = await supabase
        .from("work_plan_events")
        .select("id, event_date, title, expected_soldiers")
        .gte("event_date", format(fourteenDaysAgo, "yyyy-MM-dd"))
        .lte("event_date", format(today, "yyyy-MM-dd"))
        .not("expected_soldiers", "is", null)
        .order("event_date", { ascending: false });

      if (eventsError) {
        console.error("Error fetching events:", eventsError);
        return;
      }

      // Filter events that were on Sunday or Monday
      const relevantEvents = (eventsData || []).filter(event => {
        const eventDate = parseISO(event.event_date);
        const dayOfWeek = getDay(eventDate);
        return dayOfWeek === 0 || dayOfWeek === 1; // Sunday or Monday
      });

      // Collect all expected soldier IDs with their event info
      const soldierEventMap = new Map<string, { expectedDate: string; eventTitle: string }>();
      
      relevantEvents.forEach(event => {
        const expectedIds = event.expected_soldiers as string[] || [];
        expectedIds.forEach((soldierId: string) => {
          // Only keep the most recent event for each soldier
          if (!soldierEventMap.has(soldierId)) {
            soldierEventMap.set(soldierId, {
              expectedDate: event.event_date,
              eventTitle: event.title
            });
          }
        });
      });

      if (soldierEventMap.size === 0) {
        setExpectedSoldiers([]);
        setLoading(false);
        return;
      }

      // Fetch soldier details
      const soldierIds = Array.from(soldierEventMap.keys());
      const { data: soldiersData } = await supabase
        .from("soldiers")
        .select("id, full_name, outpost")
        .in("id", soldierIds);

      // Fetch trip forms submitted in the relevant period (from 7 days ago to today)
      const { data: tripFormsData } = await supabase
        .from("trip_forms")
        .select("soldier_name, form_date, user_id")
        .gte("form_date", format(sevenDaysAgo, "yyyy-MM-dd"));

      // Create a set of soldier names who submitted forms
      const submittedNames = new Set(
        (tripFormsData || []).map(form => form.soldier_name.trim().toLowerCase())
      );

      // Build the expected soldiers info
      const expectedList: ExpectedSoldierInfo[] = [];
      
      (soldiersData || []).forEach(soldier => {
        const eventInfo = soldierEventMap.get(soldier.id);
        if (!eventInfo) return;
        
        const departureDate = format(addDays(parseISO(eventInfo.expectedDate), 7), "yyyy-MM-dd");
        
        // Check if soldier submitted a trip form
        const hasSubmitted = submittedNames.has(soldier.full_name.trim().toLowerCase());
        
        expectedList.push({
          soldier,
          expectedDate: eventInfo.expectedDate,
          departureDate,
          hasSubmittedForm: hasSubmitted,
          eventTitle: eventInfo.eventTitle
        });
      });

      // Sort: pending first, then by departure date
      expectedList.sort((a, b) => {
        if (a.hasSubmittedForm !== b.hasSubmittedForm) {
          return a.hasSubmittedForm ? 1 : -1;
        }
        return a.departureDate.localeCompare(b.departureDate);
      });

      setExpectedSoldiers(expectedList);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredSoldiers = () => {
    if (filterType === "submitted") {
      return expectedSoldiers.filter(s => s.hasSubmittedForm);
    } else if (filterType === "pending") {
      return expectedSoldiers.filter(s => !s.hasSubmittedForm);
    }
    return expectedSoldiers;
  };

  const submittedCount = expectedSoldiers.filter(s => s.hasSubmittedForm).length;
  const pendingCount = expectedSoldiers.filter(s => !s.hasSubmittedForm).length;
  const totalCount = expectedSoldiers.length;

  if (loading) {
    return (
      <Card className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card 
        className="relative overflow-hidden bg-white/90 backdrop-blur-sm border-slate-200/60 shadow-lg cursor-pointer hover:shadow-xl transition-all duration-300 group"
        onClick={() => setDialogOpen(true)}
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-teal-500/10 to-cyan-500/10 rounded-full blur-2xl" />
        
        <CardHeader className="pb-2 relative">
          <CardTitle className="text-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <Home className="w-5 h-5 text-white" />
              </div>
              <span>תדריך יציאה לפי מצופים</span>
            </div>
            <ChevronLeft className="w-5 h-5 text-slate-400 group-hover:text-primary group-hover:-translate-x-1 transition-all" />
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative">
          {totalCount === 0 ? (
            <div className="text-center py-4">
              <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500">אין חיילים מצופים בתקופה זו</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-100 to-cyan-100 flex items-center justify-center">
                    <Users className="w-7 h-7 text-teal-600" />
                  </div>
                  <div>
                    <div className="text-3xl font-black text-slate-800">{totalCount}</div>
                    <div className="text-sm text-slate-500">חיילים מצופים</div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3">
                <div className="flex-1 p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <span className="text-sm font-bold text-emerald-700">הזינו טופס</span>
                  </div>
                  <div className="text-2xl font-black text-emerald-600">{submittedCount}</div>
                </div>
                
                <div className="flex-1 p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    <XCircle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-bold text-red-700">לא הזינו</span>
                  </div>
                  <div className="text-2xl font-black text-red-600">{pendingCount}</div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Soldiers List Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden" dir="rtl">
          <DialogHeader className="p-5 bg-gradient-to-br from-teal-500 to-cyan-500 text-white">
            <DialogTitle className="text-white text-lg font-bold">
              תדריך יציאה לפי מצופים
            </DialogTitle>
            <p className="text-white/80 text-sm">
              חיילים שהיו מצופים בימי ראשון/שני וצריכים להזין טופס טיולים
            </p>
          </DialogHeader>
          
          {/* Filter */}
          <div className="p-4 border-b border-slate-100">
            <div className="flex gap-2">
              <Button
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
                className="flex-1 rounded-lg"
              >
                הכל ({totalCount})
              </Button>
              <Button
                variant={filterType === "submitted" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("submitted")}
                className="flex-1 rounded-lg"
              >
                <CheckCircle2 className="w-3 h-3 ml-1 text-emerald-500" />
                הזינו ({submittedCount})
              </Button>
              <Button
                variant={filterType === "pending" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("pending")}
                className="flex-1 rounded-lg"
              >
                <XCircle className="w-3 h-3 ml-1 text-red-500" />
                חסר ({pendingCount})
              </Button>
            </div>
          </div>
          
          {/* Soldiers List */}
          <ScrollArea className="max-h-[55vh]">
            <div className="p-4 space-y-2">
              {getFilteredSoldiers().length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">לא נמצאו חיילים</p>
                </div>
              ) : (
                getFilteredSoldiers().map(info => (
                  <div
                    key={info.soldier.id}
                    className={cn(
                      "p-3 rounded-xl border transition-colors",
                      info.hasSubmittedForm 
                        ? "bg-emerald-50 border-emerald-200" 
                        : "bg-red-50 border-red-200"
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {info.hasSubmittedForm ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800">{info.soldier.full_name}</p>
                        {info.soldier.outpost && (
                          <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {info.soldier.outpost}
                          </div>
                        )}
                        <div className="mt-2 space-y-1">
                          <div className="text-xs text-slate-600">
                            <span className="font-medium">מופע:</span> {info.eventTitle}
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">תאריך מופע:</span>{" "}
                            {format(parseISO(info.expectedDate), "EEEE dd/MM", { locale: he })}
                          </div>
                          <div className="text-xs text-slate-500">
                            <span className="font-medium">יציאה צפויה:</span>{" "}
                            {format(parseISO(info.departureDate), "EEEE dd/MM", { locale: he })}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="secondary" 
                        className={cn(
                          "text-xs",
                          info.hasSubmittedForm 
                            ? "bg-emerald-100 text-emerald-700" 
                            : "bg-red-100 text-red-700"
                        )}
                      >
                        {info.hasSubmittedForm ? "הזין" : "חסר"}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
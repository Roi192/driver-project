import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, ChevronDown, Users, Calendar, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface SignatureRecord {
  id: string;
  user_id: string;
  procedure_type: string;
  full_name: string;
  signature: string;
  created_at: string;
}

interface SignatureStats {
  total: number;
  byProcedure: {
    routine: number;
    shift: number;
    aluf70: number;
  };
}

const procedureLabels: Record<string, string> = {
  routine: "נהלי שגרה",
  shift: "נהלים במהלך משמרת",
  aluf70: "נוהל אלוף 70",
};

export function ProcedureSignaturesCard() {
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [stats, setStats] = useState<SignatureStats>({
    total: 0,
    byProcedure: { routine: 0, shift: 0, aluf70: 0 }
  });

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("procedure_signatures")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching signatures:", error);
    } else {
      setSignatures(data || []);
      
      // Calculate stats
      const byProcedure = {
        routine: data?.filter(s => s.procedure_type === "routine").length || 0,
        shift: data?.filter(s => s.procedure_type === "shift").length || 0,
        aluf70: data?.filter(s => s.procedure_type === "aluf70").length || 0,
      };
      
      // Get unique users who signed all 3 procedures
      const userSignatures = new Map<string, Set<string>>();
      data?.forEach(sig => {
        if (!userSignatures.has(sig.user_id)) {
          userSignatures.set(sig.user_id, new Set());
        }
        userSignatures.get(sig.user_id)?.add(sig.procedure_type);
      });
      
      const completeSignatures = Array.from(userSignatures.values()).filter(
        procedures => procedures.size === 3
      ).length;
      
      setStats({
        total: completeSignatures,
        byProcedure
      });
    }
    setLoading(false);
  };

  const openProcedureSignatures = (procedureType: string) => {
    setSelectedProcedure(procedureType);
    setDialogOpen(true);
  };

  const filteredSignatures = selectedProcedure
    ? signatures.filter(s => s.procedure_type === selectedProcedure)
    : signatures;

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "dd/MM/yyyy HH:mm", { locale: he });
  };

  if (loading) {
    return (
      <Card className="col-span-2 overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] rounded-3xl">
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="col-span-2 group relative overflow-hidden border-0 bg-white/90 backdrop-blur-2xl shadow-[0_6px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_50px_rgba(0,0,0,0.12)] transition-all duration-500 rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-accent/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-3 text-slate-800">
            <div className="relative">
              <div className="absolute inset-0 bg-accent/20 rounded-xl blur-lg opacity-50" />
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-accent/20 to-accent/10 flex items-center justify-center border border-accent/20">
                <FileSignature className="w-5 h-5 text-accent" />
              </div>
            </div>
            חתימות על נהלים
          </CardTitle>
        </CardHeader>
        
        <CardContent className="relative space-y-4">
          {/* Summary */}
          <div className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-accent/10 to-primary/5 border border-accent/20">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6 text-accent" />
              <div>
                <p className="text-2xl font-black text-slate-800">{stats.total}</p>
                <p className="text-sm text-muted-foreground">חתמו על כל הנהלים</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedProcedure(null);
                setDialogOpen(true);
              }}
              className="rounded-xl"
            >
              צפה בכל
            </Button>
          </div>

          {/* Procedure breakdown */}
          <div className="grid gap-2">
            {Object.entries(stats.byProcedure).map(([key, count]) => (
              <div
                key={key}
                onClick={() => openProcedureSignatures(key)}
                className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 hover:bg-primary/10 cursor-pointer transition-colors"
              >
                <span className="font-medium text-slate-700">{procedureLabels[key]}</span>
                <Badge variant="secondary" className="bg-primary/10 text-primary">
                  {count} חתימות
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Signatures Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[80vh]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              {selectedProcedure 
                ? `חתימות על ${procedureLabels[selectedProcedure]}`
                : "כל החתימות על נהלים"
              }
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-3 pr-4">
              {filteredSignatures.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">אין חתימות להצגה</p>
              ) : (
                filteredSignatures.map(sig => (
                  <div
                    key={sig.id}
                    className="p-4 rounded-xl bg-secondary/30 border border-border/30"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-bold text-slate-800">{sig.full_name}</p>
                        {!selectedProcedure && (
                          <Badge variant="outline" className="mt-1">
                            {procedureLabels[sig.procedure_type]}
                          </Badge>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(sig.created_at)}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-2">
                      חתימה: {sig.signature}
                    </p>
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
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileSignature, Users, Calendar, Loader2, CheckCircle2, XCircle, ChevronLeft, Search } from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import unitLogo from "@/assets/unit-logo.png";

interface SignatureRecord {
  id: string;
  user_id: string;
  procedure_type: string;
  full_name: string;
  signature: string;
  created_at: string;
}

interface SignatureStats {
  totalSigners: number;
  byProcedure: {
    routine: { signed: number; signers: SignatureRecord[] };
    shift: { signed: number; signers: SignatureRecord[] };
    aluf70: { signed: number; signers: SignatureRecord[] };
  };
}

const procedureLabels: Record<string, string> = {
  routine: "נהלי שגרה",
  shift: "נהלים במהלך משמרת",
  aluf70: "נוהל אלוף 70",
};

const procedureColors: Record<string, string> = {
  routine: "from-blue-500 to-blue-600",
  shift: "from-emerald-500 to-emerald-600",
  aluf70: "from-amber-500 to-amber-600",
};

const procedureIcons: Record<string, string> = {
  routine: "📋",
  shift: "🚗",
  aluf70: "⚠️",
};

export function ProcedureSignaturesCard() {
  const [signatures, setSignatures] = useState<SignatureRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [stats, setStats] = useState<SignatureStats>({
    totalSigners: 0,
    byProcedure: {
      routine: { signed: 0, signers: [] },
      shift: { signed: 0, signers: [] },
      aluf70: { signed: 0, signers: [] }
    }
  });

  useEffect(() => {
    fetchSignatures();
  }, []);

  const fetchSignatures = async () => {
    setLoading(true);
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1).toISOString();
    
    const { data, error } = await supabase
      .from("procedure_signatures")
      .select("*")
      .gte("created_at", startOfYear)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching signatures:", error);
    } else {
      setSignatures(data || []);
      
      // Get unique latest signatures per user per procedure
      const latestSignatures = new Map<string, SignatureRecord>();
      data?.forEach(sig => {
        const key = `${sig.user_id}-${sig.procedure_type}`;
        if (!latestSignatures.has(key)) {
          latestSignatures.set(key, sig);
        }
      });

      const uniqueSignatures = Array.from(latestSignatures.values());
      
      const byProcedure = {
        routine: {
          signed: uniqueSignatures.filter(s => s.procedure_type === "routine").length,
          signers: uniqueSignatures.filter(s => s.procedure_type === "routine")
        },
        shift: {
          signed: uniqueSignatures.filter(s => s.procedure_type === "shift").length,
          signers: uniqueSignatures.filter(s => s.procedure_type === "shift")
        },
        aluf70: {
          signed: uniqueSignatures.filter(s => s.procedure_type === "aluf70").length,
          signers: uniqueSignatures.filter(s => s.procedure_type === "aluf70")
        },
      };
      
      // Count users who signed all 3
      const userSignatures = new Map<string, Set<string>>();
      uniqueSignatures.forEach(sig => {
        if (!userSignatures.has(sig.user_id)) {
          userSignatures.set(sig.user_id, new Set());
        }
        userSignatures.get(sig.user_id)?.add(sig.procedure_type);
      });
      
      const completeSigners = Array.from(userSignatures.values()).filter(
        procedures => procedures.size === 3
      ).length;
      
      setStats({
        totalSigners: completeSigners,
        byProcedure
      });
    }
    setLoading(false);
  };

  const openProcedureSignatures = (procedureType: string) => {
    setSelectedProcedure(procedureType);
    setSearchTerm("");
    setDialogOpen(true);
  };

  const getFilteredSigners = () => {
    if (!selectedProcedure) return [];
    const signers = stats.byProcedure[selectedProcedure as keyof typeof stats.byProcedure]?.signers || [];
    if (!searchTerm) return signers;
    return signers.filter(s => 
      s.full_name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

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
          {/* Summary Card */}
          <div className="relative overflow-hidden p-5 rounded-2xl bg-gradient-to-br from-primary/10 via-accent/5 to-primary/5 border border-primary/20">
            <div className="absolute top-2 left-2 opacity-10">
              <img src={unitLogo} alt="" className="w-16 h-16" />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/30">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div>
                  <p className="text-3xl font-black text-slate-800">{stats.totalSigners}</p>
                  <p className="text-sm text-slate-600">חתמו על כל הנהלים</p>
                </div>
              </div>
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {new Date().getFullYear()}
              </Badge>
            </div>
          </div>

          {/* Procedure Cards */}
          <div className="space-y-3">
            {(["routine", "shift", "aluf70"] as const).map((key) => {
              const data = stats.byProcedure[key];
              return (
                <div
                  key={key}
                  onClick={() => openProcedureSignatures(key)}
                  className="group/item relative overflow-hidden p-4 rounded-2xl bg-slate-50 hover:bg-white border border-slate-200 hover:border-primary/30 cursor-pointer transition-all duration-300 hover:shadow-lg"
                >
                  <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${procedureColors[key]}`} />
                  
                  <div className="flex items-center gap-4 pr-2">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${procedureColors[key]} flex items-center justify-center text-xl shadow-md group-hover/item:scale-110 transition-transform`}>
                      {procedureIcons[key]}
                    </div>
                    
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-800">{procedureLabels[key]}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm text-slate-600">{data.signed} חתימות</span>
                      </div>
                    </div>
                    
                    <ChevronLeft className="w-5 h-5 text-slate-400 group-hover/item:text-primary transition-colors" />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Signatures Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[85vh] p-0 overflow-hidden" dir="rtl">
          {selectedProcedure && (
            <>
              {/* Header */}
              <div className={`p-6 bg-gradient-to-br ${procedureColors[selectedProcedure]} text-white`}>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl">
                    {procedureIcons[selectedProcedure]}
                  </div>
                  <div>
                    <DialogTitle className="text-white text-xl font-bold mb-1">
                      {procedureLabels[selectedProcedure]}
                    </DialogTitle>
                    <p className="text-white/80 text-sm">
                      {stats.byProcedure[selectedProcedure as keyof typeof stats.byProcedure]?.signed || 0} חתימות
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Search */}
              <div className="p-4 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="חיפוש לפי שם..."
                    className="pr-10 bg-slate-50 border-slate-200 rounded-xl"
                  />
                </div>
              </div>
              
              {/* Signers List */}
              <ScrollArea className="max-h-[50vh]">
                <div className="p-4 space-y-3">
                  {getFilteredSigners().length === 0 ? (
                    <div className="text-center py-12">
                      <XCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">לא נמצאו חתימות</p>
                    </div>
                  ) : (
                    getFilteredSigners().map(sig => (
                      <div
                        key={sig.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                              <span className="text-sm font-bold text-primary">
                                {sig.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <p className="font-bold text-slate-800">{sig.full_name}</p>
                              <p className="text-xs text-slate-500 mt-0.5">חתימה: {sig.signature}</p>
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="flex items-center gap-1 text-xs text-slate-500">
                              <Calendar className="w-3 h-3" />
                              {formatDate(sig.created_at)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
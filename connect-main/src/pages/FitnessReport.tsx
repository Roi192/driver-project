import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileText, Download, Search, Filter, AlertTriangle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format, parseISO, differenceInDays, differenceInMonths } from "date-fns";
import { he } from "date-fns/locale";
import { OUTPOSTS } from "@/lib/constants";
import * as XLSX from "xlsx";

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
  outpost: string | null;
  military_license_expiry: string | null;
  civilian_license_expiry: string | null;
  defensive_driving_passed: boolean | null;
  correct_driving_in_service_date: string | null;
  is_active: boolean | null;
}

type FitnessStatus = "fit" | "warning" | "unfit";

interface SoldierFitness extends Soldier {
  militaryLicenseStatus: FitnessStatus;
  civilianLicenseStatus: FitnessStatus;
  defensiveDrivingStatus: FitnessStatus;
  correctDrivingStatus: FitnessStatus;
  overallStatus: FitnessStatus;
}

export default function FitnessReport() {
  const { isAdmin } = useAuth();
  const [soldiers, setSoldiers] = useState<SoldierFitness[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOutpost, setFilterOutpost] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchSoldiers();
  }, []);

  const getDateStatus = (dateStr: string | null, daysWarning: number = 30): FitnessStatus => {
    if (!dateStr) return "unfit";
    const date = parseISO(dateStr);
    const today = new Date();
    const daysUntil = differenceInDays(date, today);
    if (daysUntil < 0) return "unfit";
    if (daysUntil <= daysWarning) return "warning";
    return "fit";
  };

  const getCorrectDrivingStatus = (dateStr: string | null): FitnessStatus => {
    if (!dateStr) return "unfit";
    const date = parseISO(dateStr);
    const today = new Date();
    const monthsDiff = differenceInMonths(today, date);
    if (monthsDiff > 12) return "unfit";
    if (monthsDiff >= 10) return "warning";
    return "fit";
  };

  const fetchSoldiers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("soldiers")
        .select("*")
        .eq("is_active", true)
        .order("full_name");

      if (error) throw error;

      const soldiersWithFitness: SoldierFitness[] = (data || []).map(soldier => {
        const militaryLicenseStatus = getDateStatus(soldier.military_license_expiry);
        const civilianLicenseStatus = getDateStatus(soldier.civilian_license_expiry);
        const defensiveDrivingStatus = soldier.defensive_driving_passed ? "fit" : "unfit";
        const correctDrivingStatus = getCorrectDrivingStatus(soldier.correct_driving_in_service_date);

        // Overall status: worst of all
        let overallStatus: FitnessStatus = "fit";
        const statuses = [militaryLicenseStatus, civilianLicenseStatus, defensiveDrivingStatus, correctDrivingStatus];
        if (statuses.includes("unfit")) overallStatus = "unfit";
        else if (statuses.includes("warning")) overallStatus = "warning";

        return {
          ...soldier,
          militaryLicenseStatus,
          civilianLicenseStatus,
          defensiveDrivingStatus,
          correctDrivingStatus,
          overallStatus,
        };
      });

      setSoldiers(soldiersWithFitness);
    } catch (error) {
      console.error("Error fetching soldiers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSoldiers = soldiers.filter(soldier => {
    const matchesSearch = soldier.full_name.includes(searchQuery) || 
                          soldier.personal_number.includes(searchQuery);
    const matchesOutpost = filterOutpost === "all" || soldier.outpost === filterOutpost;
    const matchesStatus = filterStatus === "all" || soldier.overallStatus === filterStatus;
    return matchesSearch && matchesOutpost && matchesStatus;
  });

  const stats = {
    total: soldiers.length,
    fit: soldiers.filter(s => s.overallStatus === "fit").length,
    warning: soldiers.filter(s => s.overallStatus === "warning").length,
    unfit: soldiers.filter(s => s.overallStatus === "unfit").length,
  };

  const getStatusBadge = (status: FitnessStatus) => {
    switch (status) {
      case "fit":
        return <Badge className="bg-green-500 text-white"><CheckCircle className="w-3 h-3 ml-1" />תקין</Badge>;
      case "warning":
        return <Badge className="bg-amber-500 text-white"><Clock className="w-3 h-3 ml-1" />בקרוב</Badge>;
      case "unfit":
        return <Badge className="bg-red-500 text-white"><XCircle className="w-3 h-3 ml-1" />לא כשיר</Badge>;
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "לא מוזן";
    return format(parseISO(dateStr), "dd/MM/yyyy", { locale: he });
  };

  const exportToExcel = () => {
    const exportData = filteredSoldiers.map(soldier => ({
      "שם מלא": soldier.full_name,
      "מספר אישי": soldier.personal_number,
      "מוצב": soldier.outpost || "לא משויך",
      "רישיון צבאי": formatDate(soldier.military_license_expiry),
      "סטטוס רישיון צבאי": soldier.militaryLicenseStatus === "fit" ? "תקין" : soldier.militaryLicenseStatus === "warning" ? "בקרוב" : "פג",
      "רישיון אזרחי": formatDate(soldier.civilian_license_expiry),
      "סטטוס רישיון אזרחי": soldier.civilianLicenseStatus === "fit" ? "תקין" : soldier.civilianLicenseStatus === "warning" ? "בקרוב" : "פג",
      "נהיגה מונעת": soldier.defensive_driving_passed ? "עבר" : "לא עבר",
      "נהיגה נכונה בשירות": formatDate(soldier.correct_driving_in_service_date),
      "סטטוס נה\"נ בשירות": soldier.correctDrivingStatus === "fit" ? "תקין" : soldier.correctDrivingStatus === "warning" ? "בקרוב" : "פג",
      "סטטוס כללי": soldier.overallStatus === "fit" ? "כשיר" : soldier.overallStatus === "warning" ? "אזהרה" : "לא כשיר",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "דוח כשירות");
    XLSX.writeFile(wb, `דוח_כשירות_${format(new Date(), "dd-MM-yyyy")}.xlsx`);
  };

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Header */}
          <header className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/60 p-5 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
                  <FileText className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="font-black text-xl text-slate-800">דוח כשירות מרוכז</h1>
                  <p className="text-sm text-slate-500">סטטוס כשירות כל הנהגים</p>
                </div>
              </div>
              <Button onClick={exportToExcel} variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                ייצוא
              </Button>
            </div>
          </header>

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="text-center p-3">
              <p className="text-2xl font-black text-slate-800">{stats.total}</p>
              <p className="text-xs text-slate-500">סה"כ</p>
            </Card>
            <Card className="text-center p-3 bg-green-50 border-green-200">
              <p className="text-2xl font-black text-green-600">{stats.fit}</p>
              <p className="text-xs text-green-600">כשירים</p>
            </Card>
            <Card className="text-center p-3 bg-amber-50 border-amber-200">
              <p className="text-2xl font-black text-amber-600">{stats.warning}</p>
              <p className="text-xs text-amber-600">בקרוב</p>
            </Card>
            <Card className="text-center p-3 bg-red-50 border-red-200">
              <p className="text-2xl font-black text-red-600">{stats.unfit}</p>
              <p className="text-xs text-red-600">לא כשירים</p>
            </Card>
          </div>

          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="חיפוש לפי שם או מ.א..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
              <Select value={filterOutpost} onValueChange={setFilterOutpost}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="מוצב" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המוצבים</SelectItem>
                  {OUTPOSTS.map(outpost => (
                    <SelectItem key={outpost} value={outpost}>{outpost}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="fit">כשיר</SelectItem>
                  <SelectItem value="warning">אזהרה</SelectItem>
                  <SelectItem value="unfit">לא כשיר</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">מוצב</TableHead>
                    <TableHead className="text-center">רש' צבאי</TableHead>
                    <TableHead className="text-center">רש' אזרחי</TableHead>
                    <TableHead className="text-center">נהיגה מונעת</TableHead>
                    <TableHead className="text-center">נה"נ בשירות</TableHead>
                    <TableHead className="text-center">סטטוס</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredSoldiers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        לא נמצאו תוצאות
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSoldiers.map(soldier => (
                      <TableRow key={soldier.id}>
                        <TableCell className="font-medium">{soldier.full_name}</TableCell>
                        <TableCell>{soldier.outpost || "-"}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.militaryLicenseStatus)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.civilianLicenseStatus)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.defensiveDrivingStatus)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.correctDrivingStatus)}</TableCell>
                        <TableCell className="text-center">{getStatusBadge(soldier.overallStatus)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Edit, Car, Shield, AlertTriangle, TrendingUp, FileSpreadsheet, Filter, Eye, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, parseISO, differenceInDays } from 'date-fns';
import { he } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import * as XLSX from 'xlsx';

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
}

interface AccidentChecklist {
  debriefing: boolean;
  driver_talk: boolean;
  closed: boolean;
}

interface Accident {
  id: string;
  soldier_id: string | null;
  driver_name: string | null;
  accident_date: string;
  driver_type: 'security' | 'combat';
  vehicle_number: string | null;
  description: string | null;
  severity: 'minor' | 'moderate' | 'severe';
  location: string | null;
  notes: string | null;
  created_at: string;
  soldiers?: Soldier;
  status: 'reported' | 'investigating' | 'closed';
  checklist: AccidentChecklist;
  closed_at: string | null;
}

type DriverType = 'security' | 'combat';
type Severity = 'minor' | 'moderate' | 'severe';
type AccidentStatus = 'reported' | 'investigating' | 'closed';

const driverTypeLabels: Record<DriverType, string> = {
  security: 'נהג בט"ש',
  combat: 'נהג לוחם'
};

const severityLabels: Record<Severity, string> = {
  minor: 'קל',
  moderate: 'בינוני',
  severe: 'חמור'
};

const severityColors: Record<Severity, string> = {
  minor: 'bg-yellow-100 text-yellow-800',
  moderate: 'bg-orange-100 text-orange-800',
  severe: 'bg-red-100 text-red-800'
};

const statusLabels: Record<AccidentStatus, string> = {
  reported: 'דווח',
  investigating: 'בתחקיר',
  closed: 'נסגר'
};

const statusColors: Record<AccidentStatus, string> = {
  reported: 'bg-amber-100 text-amber-800',
  investigating: 'bg-blue-100 text-blue-800',
  closed: 'bg-emerald-100 text-emerald-800'
};

const AccidentsTracking = () => {
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingAccident, setEditingAccident] = useState<Accident | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [accidentToDelete, setAccidentToDelete] = useState<string | null>(null);
  
  // Filters
  const [filterDriverType, setFilterDriverType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  
  // KPI dialogs for filtered accident lists
  const [securityAccidentsDialogOpen, setSecurityAccidentsDialogOpen] = useState(false);
  const [combatAccidentsDialogOpen, setCombatAccidentsDialogOpen] = useState(false);

  // Detail dialog for single accident with checklist
  const [accidentDetailOpen, setAccidentDetailOpen] = useState(false);
  const [selectedAccident, setSelectedAccident] = useState<Accident | null>(null);

  const [formData, setFormData] = useState({
    soldier_id: '',
    driver_name: '',
    accident_date: format(new Date(), 'yyyy-MM-dd'),
    driver_type: 'security' as DriverType,
    vehicle_number: '',
    description: '',
    severity: 'minor' as Severity,
    location: '',
    notes: '',
    status: 'reported' as AccidentStatus
  });

  // Fetch soldiers
  const { data: soldiers = [] } = useQuery({
    queryKey: ['soldiers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('soldiers')
        .select('id, full_name, personal_number')
        .eq('is_active', true)
        .order('full_name');
      if (error) throw error;
      return data as Soldier[];
    }
  });

  // Fetch accidents
  const { data: accidents = [], isLoading } = useQuery({
    queryKey: ['accidents'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('accidents')
        .select('*, soldiers(id, full_name, personal_number)')
        .order('accident_date', { ascending: false });
      if (error) throw error;
      // Parse checklist from JSON
      return (data || []).map(a => ({
        ...a,
        checklist: (a.checklist as unknown as AccidentChecklist) || { debriefing: false, driver_talk: false, closed: false }
      })) as Accident[];
    }
  });

  // Add accident mutation
  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from('accidents').insert({
        accident_date: data.accident_date,
        driver_type: data.driver_type,
        vehicle_number: data.vehicle_number || null,
        description: data.description || null,
        severity: data.severity,
        location: data.location || null,
        notes: data.notes || null,
        soldier_id: data.driver_type === 'security' ? data.soldier_id : null,
        driver_name: data.driver_type === 'combat' ? (data.driver_name || null) : null,
        status: data.status,
        checklist: { debriefing: false, driver_talk: false, closed: false }
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accidents'] });
      toast.success('התאונה נוספה בהצלחה');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: () => toast.error('שגיאה בהוספת התאונה')
  });

  // Update accident mutation
  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('accidents')
        .update({
          accident_date: data.accident_date,
          driver_type: data.driver_type,
          vehicle_number: data.vehicle_number || null,
          description: data.description || null,
          severity: data.severity,
          location: data.location || null,
          notes: data.notes || null,
          soldier_id: data.driver_type === 'security' ? data.soldier_id : null,
          driver_name: data.driver_type === 'combat' ? (data.driver_name || null) : null,
          status: data.status
        })
        .eq('id', data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accidents'] });
      toast.success('התאונה עודכנה בהצלחה');
      setEditingAccident(null);
      resetForm();
    },
    onError: () => toast.error('שגיאה בעדכון התאונה')
  });

  // Update checklist mutation
  const updateChecklistMutation = useMutation({
    mutationFn: async ({ id, checklist, status, closed_at }: { id: string; checklist: AccidentChecklist; status: AccidentStatus; closed_at: string | null }) => {
      const { error } = await supabase
        .from('accidents')
        .update({ 
          checklist: JSON.parse(JSON.stringify(checklist)), 
          status, 
          closed_at 
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accidents'] });
      toast.success('הצ\'קליסט עודכן');
    },
    onError: () => toast.error('שגיאה בעדכון הצ\'קליסט')
  });

  // Delete accident mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('accidents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accidents'] });
      toast.success('התאונה נמחקה בהצלחה');
    },
    onError: () => toast.error('שגיאה במחיקת התאונה')
  });

  const resetForm = () => {
    setFormData({
      soldier_id: '',
      driver_name: '',
      accident_date: format(new Date(), 'yyyy-MM-dd'),
      driver_type: 'security',
      vehicle_number: '',
      description: '',
      severity: 'minor',
      location: '',
      notes: '',
      status: 'reported'
    });
  };

  const openEditDialog = (accident: Accident) => {
    setEditingAccident(accident);
    setFormData({
      soldier_id: accident.soldier_id || '',
      driver_name: accident.driver_name || '',
      accident_date: accident.accident_date,
      driver_type: accident.driver_type,
      vehicle_number: accident.vehicle_number || '',
      description: accident.description || '',
      severity: accident.severity,
      location: accident.location || '',
      notes: accident.notes || '',
      status: accident.status || 'reported'
    });
  };

  const handleChecklistChange = (accident: Accident, field: keyof Accident['checklist'], value: boolean) => {
    const newChecklist = { ...accident.checklist, [field]: value };
    let newStatus: AccidentStatus = accident.status;
    let closedAt: string | null = accident.closed_at;
    
    // Auto-update status based on checklist
    if (newChecklist.closed) {
      newStatus = 'closed';
      closedAt = new Date().toISOString();
    } else if (newChecklist.debriefing || newChecklist.driver_talk) {
      newStatus = 'investigating';
    } else {
      newStatus = 'reported';
    }
    
    updateChecklistMutation.mutate({ id: accident.id, checklist: newChecklist, status: newStatus, closed_at: closedAt });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate based on driver type
    if (formData.driver_type === 'security' && !formData.soldier_id) {
      toast.error('יש לבחור חייל');
      return;
    }
    if (formData.driver_type === 'combat' && !formData.driver_name.trim()) {
      toast.error('יש להזין שם נהג');
      return;
    }
    
    if (editingAccident) {
      updateMutation.mutate({ ...formData, id: editingAccident.id });
    } else {
      addMutation.mutate(formData);
    }
  };

  // Get driver name for display
  const getDriverName = (accident: Accident): string => {
    if (accident.driver_type === 'security' && accident.soldiers) {
      return accident.soldiers.full_name;
    }
    return accident.driver_name || 'לא צוין';
  };

  // Calculate statistics - based on filtered accidents
  // Filter accidents - must be before stats
  const filteredAccidents = useMemo(() => {
    return accidents.filter(a => {
      if (filterDriverType !== 'all' && a.driver_type !== filterDriverType) return false;
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterDateFrom && a.accident_date < filterDateFrom) return false;
      if (filterDateTo && a.accident_date > filterDateTo) return false;
      return true;
    });
  }, [accidents, filterDriverType, filterSeverity, filterDateFrom, filterDateTo]);

  // Calculate statistics - based on filtered accidents
  const stats = useMemo(() => {
    const securityAccidents = filteredAccidents.filter(a => a.driver_type === 'security').length;
    const combatAccidents = filteredAccidents.filter(a => a.driver_type === 'combat').length;
    const openAccidents = filteredAccidents.filter(a => a.status !== 'closed').length;
    const closedAccidents = filteredAccidents.filter(a => a.status === 'closed');
    
    // Calculate average time to close
    let avgTimeToClose = 0;
    if (closedAccidents.length > 0) {
      const totalDays = closedAccidents.reduce((sum, a) => {
        if (a.closed_at) {
          return sum + differenceInDays(parseISO(a.closed_at), parseISO(a.accident_date));
        }
        return sum;
      }, 0);
      avgTimeToClose = Math.round(totalDays / closedAccidents.length);
    }
    
    return {
      security: securityAccidents,
      combat: combatAccidents,
      total: securityAccidents + combatAccidents,
      open: openAccidents,
      avgTimeToClose
    };
  }, [filteredAccidents]);

  // Calculate monthly trends (last 12 months)
  const monthlyTrends = useMemo(() => {
    const months: { month: string; security: number; combat: number; total: number }[] = [];
    
    for (let i = 11; i >= 0; i--) {
      const date = subMonths(new Date(), i);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);
      const monthLabel = format(date, 'MMM yy', { locale: he });
      
      const monthAccidents = accidents.filter(a => {
        const accidentDate = parseISO(a.accident_date);
        return accidentDate >= monthStart && accidentDate <= monthEnd;
      });
      
      const security = monthAccidents.filter(a => a.driver_type === 'security').length;
      const combat = monthAccidents.filter(a => a.driver_type === 'combat').length;
      
      months.push({
        month: monthLabel,
        security,
        combat,
        total: security + combat
      });
    }
    
    return months;
  }, [accidents]);

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredAccidents.map(accident => ({
      'תאריך': format(parseISO(accident.accident_date), 'dd/MM/yyyy'),
      'שם נהג': getDriverName(accident),
      'סוג נהג': driverTypeLabels[accident.driver_type],
      'מספר רכב': accident.vehicle_number || '-',
      'חומרה': severityLabels[accident.severity],
      'מיקום': accident.location || '-',
      'תיאור': accident.description || '-',
      'הערות': accident.notes || '-'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'תאונות');
    XLSX.writeFile(wb, `דוח_תאונות_${format(new Date(), 'dd-MM-yyyy')}.xlsx`);
    toast.success('הקובץ יוצא בהצלחה');
  };

  // Clear filters
  const clearFilters = () => {
    setFilterDriverType('all');
    setFilterSeverity('all');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  // Form content as JSX element instead of function to prevent re-renders and focus loss
  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>סוג נהג *</Label>
          <Select 
            value={formData.driver_type} 
            onValueChange={(v: DriverType) => setFormData(p => ({ ...p, driver_type: v, soldier_id: '', driver_name: '' }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="security">נהג בט"ש</SelectItem>
              <SelectItem value="combat">נהג לוחם</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>תאריך תאונה *</Label>
          <Input
            type="date"
            value={formData.accident_date}
            onChange={(e) => setFormData(p => ({ ...p, accident_date: e.target.value }))}
            required
          />
        </div>
      </div>

      {/* Conditional driver selection based on type */}
      {formData.driver_type === 'security' ? (
        <div className="space-y-2">
          <Label>חייל (מהרשימה) *</Label>
          <Select value={formData.soldier_id} onValueChange={(v) => setFormData(p => ({ ...p, soldier_id: v }))}>
            <SelectTrigger>
              <SelectValue placeholder="בחר חייל" />
            </SelectTrigger>
            <SelectContent>
              {soldiers.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.full_name} ({s.personal_number})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : (
        <div className="space-y-2">
          <Label>שם הנהג *</Label>
          <Input
            value={formData.driver_name}
            onChange={(e) => setFormData(p => ({ ...p, driver_name: e.target.value }))}
            placeholder="הזן שם נהג לוחם"
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>מספר רכב</Label>
          <Input
            value={formData.vehicle_number}
            onChange={(e) => setFormData(p => ({ ...p, vehicle_number: e.target.value }))}
            placeholder="מספר רכב"
          />
        </div>
        <div className="space-y-2">
          <Label>חומרה</Label>
          <Select value={formData.severity} onValueChange={(v: Severity) => setFormData(p => ({ ...p, severity: v }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="minor">קל</SelectItem>
              <SelectItem value="moderate">בינוני</SelectItem>
              <SelectItem value="severe">חמור</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>מיקום</Label>
        <Input
          value={formData.location}
          onChange={(e) => setFormData(p => ({ ...p, location: e.target.value }))}
          placeholder="מיקום התאונה"
        />
      </div>

      <div className="space-y-2">
        <Label>תיאור התאונה</Label>
        <Textarea
          value={formData.description}
          onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
          placeholder="תיאור מפורט של התאונה"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label>הערות</Label>
        <Textarea
          value={formData.notes}
          onChange={(e) => setFormData(p => ({ ...p, notes: e.target.value }))}
          placeholder="הערות נוספות"
          rows={2}
        />
      </div>

      <Button type="submit" className="w-full" disabled={addMutation.isPending || updateMutation.isPending}>
        {editingAccident ? 'עדכן תאונה' : 'הוסף תאונה'}
      </Button>
    </form>
  );

  return (
    <AppLayout>
      <div className="p-4 md:p-6 space-y-6" dir="rtl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <h1 className="text-2xl font-bold">מעקב תאונות</h1>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
              <Filter className="ml-2 h-4 w-4" /> סינון
            </Button>
            <Button variant="outline" onClick={exportToExcel}>
              <FileSpreadsheet className="ml-2 h-4 w-4" /> ייצוא לאקסל
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={(open) => { setIsAddDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button><Plus className="ml-2 h-4 w-4" /> הוסף תאונה</Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>הוספת תאונה חדשה</DialogTitle>
                </DialogHeader>
                {formContent}
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card className="bg-white border border-slate-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-slate-800">סינון מתקדם</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">סוג נהג</Label>
                  <Select value={filterDriverType} onValueChange={setFilterDriverType}>
                    <SelectTrigger className="bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="security" className="text-slate-700">נהגי בט"ש</SelectItem>
                      <SelectItem value="combat" className="text-slate-700">נהגי לוחמים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">חומרה</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger className="bg-white text-slate-700 border-slate-300">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-slate-200">
                      <SelectItem value="all" className="text-slate-700">הכל</SelectItem>
                      <SelectItem value="minor" className="text-slate-700">קל</SelectItem>
                      <SelectItem value="moderate" className="text-slate-700">בינוני</SelectItem>
                      <SelectItem value="severe" className="text-slate-700">חמור</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">מתאריך</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="bg-white text-slate-700 border-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">עד תאריך</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="bg-white text-slate-700 border-slate-300"
                  />
                </div>
                <div className="flex items-end">
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    נקה סינון
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setSecurityAccidentsDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">נהגי בט"ש</CardTitle>
              <Shield className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.security}</div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => setCombatAccidentsDialogOpen(true)}
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">נהגי לוחמים</CardTitle>
              <Car className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.combat}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">סה"כ</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.total}</div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Trends Chart */}
        <Card>
          <CardHeader className="flex flex-row items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>מגמות תאונות חודשיות (12 חודשים אחרונים)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="security" name='נהגי בט"ש' stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="combat" name="נהגי לוחמים" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="total" name="סה״כ" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Accidents Table */}
        <Card>
          <CardHeader>
            <CardTitle>רשימת תאונות ({filteredAccidents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-center py-8 text-muted-foreground">טוען...</p>
            ) : filteredAccidents.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">לא נמצאו תאונות</p>
            ) : (
              <div className="max-h-[65vh] overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>תאריך</TableHead>
                      <TableHead>נהג</TableHead>
                      <TableHead>סוג נהג</TableHead>
                      <TableHead>חומרה</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccidents.map((accident) => (
                      <TableRow key={accident.id} className={accident.status === 'closed' ? 'bg-emerald-50/50' : ''}>
                        <TableCell>{format(parseISO(accident.accident_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-medium">{getDriverName(accident)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            accident.driver_type === 'security' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {driverTypeLabels[accident.driver_type]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${severityColors[accident.severity]}`}>
                            {severityLabels[accident.severity]}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => { setSelectedAccident(accident); setAccidentDetailOpen(true); }}
                              title="פרטי תאונה וצ'קליסט"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => openEditDialog(accident)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="text-red-500 hover:text-red-600"
                              onClick={() => { setAccidentToDelete(accident.id); setDeleteConfirmOpen(true); }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Dialog */}
        <Dialog open={!!editingAccident} onOpenChange={(open) => { if (!open) { setEditingAccident(null); resetForm(); } }}>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>עריכת תאונה</DialogTitle>
            </DialogHeader>
            {formContent}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <DeleteConfirmDialog
          open={deleteConfirmOpen}
          onOpenChange={setDeleteConfirmOpen}
          title="מחיקת תאונה"
          description="האם אתה בטוח שברצונך למחוק תאונה זו? פעולה זו אינה ניתנת לביטול."
          onConfirm={() => {
            if (accidentToDelete) {
              deleteMutation.mutate(accidentToDelete);
            }
            setDeleteConfirmOpen(false);
            setAccidentToDelete(null);
            return Promise.resolve();
          }}
        />

        {/* Security Accidents Dialog */}
        <Dialog open={securityAccidentsDialogOpen} onOpenChange={setSecurityAccidentsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-blue-800">
                <Shield className="w-5 h-5" />
                תאונות נהגי בט"ש ({accidents.filter(a => a.driver_type === 'security').length})
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תאריך</TableHead>
                    <TableHead>נהג</TableHead>
                    <TableHead>מספר רכב</TableHead>
                    <TableHead>חומרה</TableHead>
                    <TableHead>מיקום</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accidents.filter(a => a.driver_type === 'security').map(accident => (
                    <TableRow key={accident.id}>
                      <TableCell>{format(parseISO(accident.accident_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{getDriverName(accident)}</TableCell>
                      <TableCell>{accident.vehicle_number || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${severityColors[accident.severity]}`}>
                          {severityLabels[accident.severity]}
                        </span>
                      </TableCell>
                      <TableCell>{accident.location || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {accidents.filter(a => a.driver_type === 'security').length === 0 && (
                <p className="text-center py-8 text-muted-foreground">אין תאונות של נהגי בט"ש</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Combat Accidents Dialog */}
        <Dialog open={combatAccidentsDialogOpen} onOpenChange={setCombatAccidentsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-800">
                <Car className="w-5 h-5" />
                תאונות נהגי לוחמים ({accidents.filter(a => a.driver_type === 'combat').length})
              </DialogTitle>
            </DialogHeader>
            <div className="max-h-[60vh] overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>תאריך</TableHead>
                    <TableHead>נהג</TableHead>
                    <TableHead>מספר רכב</TableHead>
                    <TableHead>חומרה</TableHead>
                    <TableHead>מיקום</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accidents.filter(a => a.driver_type === 'combat').map(accident => (
                    <TableRow key={accident.id}>
                      <TableCell>{format(parseISO(accident.accident_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell className="font-medium">{getDriverName(accident)}</TableCell>
                      <TableCell>{accident.vehicle_number || '-'}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs ${severityColors[accident.severity]}`}>
                          {severityLabels[accident.severity]}
                        </span>
                      </TableCell>
                      <TableCell>{accident.location || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {accidents.filter(a => a.driver_type === 'combat').length === 0 && (
                <p className="text-center py-8 text-muted-foreground">אין תאונות של נהגי לוחמים</p>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Accident Detail Dialog with Checklist */}
        <Dialog open={accidentDetailOpen} onOpenChange={setAccidentDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
            {selectedAccident && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                    פרטי תאונה
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl">
                    <div>
                      <p className="text-xs text-slate-500">תאריך</p>
                      <p className="font-bold">{format(parseISO(selectedAccident.accident_date), 'dd/MM/yyyy')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">נהג</p>
                      <p className="font-bold">{getDriverName(selectedAccident)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">סוג נהג</p>
                      <p className="font-bold">{driverTypeLabels[selectedAccident.driver_type]}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">חומרה</p>
                      <span className={`px-2 py-1 rounded-full text-xs ${severityColors[selectedAccident.severity]}`}>
                        {severityLabels[selectedAccident.severity]}
                      </span>
                    </div>
                    {selectedAccident.vehicle_number && (
                      <div>
                        <p className="text-xs text-slate-500">מספר רכב</p>
                        <p className="font-bold">{selectedAccident.vehicle_number}</p>
                      </div>
                    )}
                    {selectedAccident.location && (
                      <div>
                        <p className="text-xs text-slate-500">מיקום</p>
                        <p className="font-bold">{selectedAccident.location}</p>
                      </div>
                    )}
                  </div>

                  {selectedAccident.description && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 mb-1">תיאור</p>
                      <p className="text-sm">{selectedAccident.description}</p>
                    </div>
                  )}

                  {/* Status */}
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-slate-50 rounded-xl">
                    <p className="text-sm font-bold text-slate-700 mb-2">סטטוס</p>
                    <span className={`px-3 py-1.5 rounded-full text-sm font-bold ${statusColors[selectedAccident.status]}`}>
                      {statusLabels[selectedAccident.status]}
                    </span>
                  </div>

                  {/* Checklist */}
                  <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl">
                    <p className="text-sm font-bold text-slate-700 mb-3">צ'קליסט פעולות</p>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedAccident.checklist?.debriefing || false}
                          onChange={(e) => handleChecklistChange(selectedAccident, 'debriefing', e.target.checked)}
                          className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">תחקיר בוצע</span>
                        {selectedAccident.checklist?.debriefing && <CheckCircle className="w-4 h-4 text-emerald-500 mr-auto" />}
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedAccident.checklist?.driver_talk || false}
                          onChange={(e) => handleChecklistChange(selectedAccident, 'driver_talk', e.target.checked)}
                          className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">שיחה עם נהג</span>
                        {selectedAccident.checklist?.driver_talk && <CheckCircle className="w-4 h-4 text-emerald-500 mr-auto" />}
                      </label>
                      
                      <label className="flex items-center gap-3 p-3 bg-white rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedAccident.checklist?.closed || false}
                          onChange={(e) => handleChecklistChange(selectedAccident, 'closed', e.target.checked)}
                          className="w-5 h-5 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="font-medium">סגירת תאונה</span>
                        {selectedAccident.checklist?.closed && <CheckCircle className="w-4 h-4 text-emerald-500 mr-auto" />}
                      </label>
                    </div>
                  </div>

                  {selectedAccident.notes && (
                    <div className="p-4 bg-slate-50 rounded-xl">
                      <p className="text-xs text-slate-500 mb-1">הערות</p>
                      <p className="text-sm">{selectedAccident.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default AccidentsTracking;
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
import { Plus, Trash2, Edit, Car, Shield, AlertTriangle, TrendingUp, FileSpreadsheet, Filter } from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, subMonths, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DeleteConfirmDialog } from '@/components/admin/DeleteConfirmDialog';
import * as XLSX from 'xlsx';

interface Soldier {
  id: string;
  full_name: string;
  personal_number: string;
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
}

type DriverType = 'security' | 'combat';
type Severity = 'minor' | 'moderate' | 'severe';

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

  const [formData, setFormData] = useState({
    soldier_id: '',
    driver_name: '',
    accident_date: format(new Date(), 'yyyy-MM-dd'),
    driver_type: 'security' as DriverType,
    vehicle_number: '',
    description: '',
    severity: 'minor' as Severity,
    location: '',
    notes: ''
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
      return data as Accident[];
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
        driver_name: data.driver_type === 'combat' ? (data.driver_name || null) : null
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
          driver_name: data.driver_type === 'combat' ? (data.driver_name || null) : null
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
      notes: ''
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
      notes: accident.notes || ''
    });
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

  // Calculate statistics
  const stats = useMemo(() => {
    const securityAccidents = accidents.filter(a => a.driver_type === 'security').length;
    const combatAccidents = accidents.filter(a => a.driver_type === 'combat').length;
    return {
      security: securityAccidents,
      combat: combatAccidents,
      total: securityAccidents + combatAccidents
    };
  }, [accidents]);

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

  // Filter accidents
  const filteredAccidents = useMemo(() => {
    return accidents.filter(a => {
      if (filterDriverType !== 'all' && a.driver_type !== filterDriverType) return false;
      if (filterSeverity !== 'all' && a.severity !== filterSeverity) return false;
      if (filterDateFrom && a.accident_date < filterDateFrom) return false;
      if (filterDateTo && a.accident_date > filterDateTo) return false;
      return true;
    });
  }, [accidents, filterDriverType, filterSeverity, filterDateFrom, filterDateTo]);

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

  const FormContent = () => (
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
                <FormContent />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">סינון מתקדם</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>סוג נהג</Label>
                  <Select value={filterDriverType} onValueChange={setFilterDriverType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      <SelectItem value="security">נהגי בט"ש</SelectItem>
                      <SelectItem value="combat">נהגי לוחמים</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>חומרה</Label>
                  <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">הכל</SelectItem>
                      <SelectItem value="minor">קל</SelectItem>
                      <SelectItem value="moderate">בינוני</SelectItem>
                      <SelectItem value="severe">חמור</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>מתאריך</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>עד תאריך</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">תאונות נהגי בט"ש</CardTitle>
              <Shield className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.security}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">תאונות נהגי לוחמים</CardTitle>
              <Car className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.combat}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">סה"כ תאונות</CardTitle>
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
                      <TableHead>מספר רכב</TableHead>
                      <TableHead>חומרה</TableHead>
                      <TableHead>מיקום</TableHead>
                      <TableHead>תיאור</TableHead>
                      <TableHead>פעולות</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAccidents.map((accident) => (
                      <TableRow key={accident.id}>
                        <TableCell>{format(parseISO(accident.accident_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell className="font-medium">{getDriverName(accident)}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            accident.driver_type === 'security' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                          }`}>
                            {driverTypeLabels[accident.driver_type]}
                          </span>
                        </TableCell>
                        <TableCell>{accident.vehicle_number || '-'}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs ${severityColors[accident.severity]}`}>
                            {severityLabels[accident.severity]}
                          </span>
                        </TableCell>
                        <TableCell>{accident.location || '-'}</TableCell>
                        <TableCell className="max-w-xs truncate">{accident.description || '-'}</TableCell>
                        <TableCell>
                          <div className="flex gap-2">
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
            <FormContent />
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
      </div>
    </AppLayout>
  );
};

export default AccidentsTracking;
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  XCircle, 
  Truck, 
  User, 
  Calendar, 
  Clock, 
  MapPin,
  Shield,
  FileText,
  Image
} from "lucide-react";
import { format } from "date-fns";
import { he } from "date-fns/locale";

interface ShiftReport {
  id: string;
  report_date: string;
  report_time: string;
  outpost: string;
  driver_name: string;
  vehicle_number: string;
  shift_type: string;
  is_complete: boolean;
  created_at: string;
  emergency_procedure_participation: boolean;
  commander_briefing_attendance: boolean;
  work_card_completed: boolean;
  has_ceramic_vest: boolean;
  has_helmet: boolean;
  has_personal_weapon: boolean;
  has_ammunition: boolean;
  pre_movement_checks_completed: boolean;
  driver_tools_checked: boolean;
  descent_drill_completed: boolean;
  rollover_drill_completed: boolean;
  fire_drill_completed: boolean;
  safety_vulnerabilities?: string;
  vardim_procedure_explanation?: string;
  vardim_points?: string;
  photo_front?: string;
  photo_left?: string;
  photo_right?: string;
  photo_back?: string;
  photo_steering_wheel?: string;
}

interface ReportDetailDialogProps {
  report: ShiftReport | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shiftTypeMap: Record<string, string> = {
  morning: 'בוקר',
  afternoon: 'צהריים',
  evening: 'ערב',
};

const CheckItem = ({ label, checked }: { label: string; checked: boolean }) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm">{label}</span>
    {checked ? (
      <CheckCircle className="w-5 h-5 text-success" />
    ) : (
      <XCircle className="w-5 h-5 text-destructive" />
    )}
  </div>
);

export function ReportDetailDialog({ report, open, onOpenChange }: ReportDetailDialogProps) {
  if (!report) return null;

  const photos = [
    { label: "חזית הרכב", url: report.photo_front },
    { label: "צד שמאל", url: report.photo_left },
    { label: "צד ימין", url: report.photo_right },
    { label: "אחורי הרכב", url: report.photo_back },
    { label: "הגה הרכב", url: report.photo_steering_wheel },
  ].filter(p => p.url);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            פרטי דיווח
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* פרטים כלליים */}
          <div className="glass-card p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              פרטים כלליים
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">נהג:</span>
                <span className="font-medium">{report.driver_name}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">מוצב:</span>
                <Badge variant="outline">{report.outpost}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">רכב:</span>
                <span className="font-medium">{report.vehicle_number}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">משמרת:</span>
                <Badge variant="secondary">{shiftTypeMap[report.shift_type] || report.shift_type}</Badge>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">תאריך:</span>
                <span className="font-medium">
                  {format(new Date(report.report_date), 'dd/MM/yyyy', { locale: he })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">שעה:</span>
                <span className="font-medium">{report.report_time?.slice(0, 5)}</span>
              </div>
            </div>
          </div>

          {/* תדריכים */}
          <div className="glass-card p-4">
            <h3 className="font-bold mb-4">תדריכים</h3>
            <div className="space-y-1">
              <CheckItem label="השתתפות בנוהל חירום" checked={report.emergency_procedure_participation} />
              <CheckItem label="נוכחות בתדריך מפקד" checked={report.commander_briefing_attendance} />
              <CheckItem label="מילוי כרטיס עבודה" checked={report.work_card_completed} />
            </div>
          </div>

          {/* ציוד וכוננות */}
          <div className="glass-card p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Shield className="w-4 h-4 text-primary" />
              ציוד קרבי
            </h3>
            <div className="space-y-1">
              <CheckItem label="ווסט קרמי" checked={report.has_ceramic_vest} />
              <CheckItem label="קסדה" checked={report.has_helmet} />
              <CheckItem label="נשק אישי" checked={report.has_personal_weapon} />
              <CheckItem label="תחמושת" checked={report.has_ammunition} />
            </div>
            <Separator className="my-4" />
            <h4 className="font-medium mb-2">בדיקות רכב</h4>
            <div className="space-y-1">
              <CheckItem label="בדיקות תל״ת לפני תנועה" checked={report.pre_movement_checks_completed} />
              <CheckItem label="כלי נהג" checked={report.driver_tools_checked} />
            </div>
          </div>

          {/* תרגולות */}
          <div className="glass-card p-4">
            <h3 className="font-bold mb-4">תרגולות</h3>
            <div className="space-y-1">
              <CheckItem label="תרגולת ירידה לשול" checked={report.descent_drill_completed} />
              <CheckItem label="תרגולת התהפכות" checked={report.rollover_drill_completed} />
              <CheckItem label="תרגולת שריפה" checked={report.fire_drill_completed} />
            </div>
          </div>

          {/* שדות טקסט */}
          {(report.safety_vulnerabilities || report.vardim_procedure_explanation || report.vardim_points) && (
            <div className="glass-card p-4">
              <h3 className="font-bold mb-4">מידע נוסף</h3>
              {report.safety_vulnerabilities && (
                <div className="mb-4">
                  <h4 className="text-sm text-muted-foreground mb-1">נקודות תורפה בטיחותיות</h4>
                  <p className="text-sm bg-secondary/30 p-3 rounded-lg">{report.safety_vulnerabilities}</p>
                </div>
              )}
              {report.vardim_procedure_explanation && (
                <div className="mb-4">
                  <h4 className="text-sm text-muted-foreground mb-1">הסבר נוהל ורדים</h4>
                  <p className="text-sm bg-secondary/30 p-3 rounded-lg">{report.vardim_procedure_explanation}</p>
                </div>
              )}
              {report.vardim_points && (
                <div>
                  <h4 className="text-sm text-muted-foreground mb-1">נקודות ורדים</h4>
                  <p className="text-sm bg-secondary/30 p-3 rounded-lg">{report.vardim_points}</p>
                </div>
              )}
            </div>
          )}

          {/* תמונות */}
          {photos.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Image className="w-4 h-4 text-primary" />
                תמונות הרכב
              </h3>
              <div className="grid grid-cols-2 gap-4">
                {photos.map((photo, index) => (
                  <div key={index} className="space-y-2">
                    <p className="text-xs text-muted-foreground">{photo.label}</p>
                    <img 
                      src={photo.url} 
                      alt={photo.label}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
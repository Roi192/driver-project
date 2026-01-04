import { useState, useEffect, useRef } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Home, CheckCircle2, AlertTriangle, Shield, FileCheck, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface FormData {
  weaponReset: boolean;
  exitBriefingByOfficer: boolean;
  officerName: string;
  uniformClassA: boolean;
  personalEquipmentChecked: boolean;
  vehicleReturned: boolean;
  notes: string;
  signature: string;
}

export default function TripForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [userName, setUserName] = useState("");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    weaponReset: false,
    exitBriefingByOfficer: false,
    officerName: "",
    uniformClassA: false,
    personalEquipmentChecked: false,
    vehicleReturned: false,
    notes: "",
    signature: "",
  });

  useEffect(() => {
    const fetchUserAndCheck = async () => {
      if (user?.id) {
        // Fetch user name
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (profile?.full_name) {
          setUserName(profile.full_name);
        } else if (user.user_metadata?.full_name) {
          setUserName(user.user_metadata.full_name);
        }
        
        // Check if already submitted this week (since last Thursday)
        const getLastThursday = () => {
          const now = new Date();
          const dayOfWeek = now.getDay();
          // Days since last Thursday: if today is Thu (4), it's 0; if Fri (5), it's 1; etc.
          const daysSinceThursday = (dayOfWeek + 3) % 7;
          const lastThursday = new Date(now);
          lastThursday.setDate(now.getDate() - daysSinceThursday);
          lastThursday.setHours(0, 0, 0, 0);
          return lastThursday;
        };
        
        const lastThursday = getLastThursday();
        const lastThursdayStr = lastThursday.toISOString().split('T')[0];
        
        const { data: existingForm } = await supabase
          .from('trip_forms')
          .select('id')
          .eq('user_id', user.id)
          .gte('form_date', lastThursdayStr)
          .maybeSingle();
        
        if (existingForm) {
          setAlreadySubmitted(true);
        }
      }
    };
    fetchUserAndCheck();
  }, [user]);

  // Canvas drawing functions
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, []);

  const getCanvasCoordinates = (e: React.TouchEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: (touch.clientX - rect.left) * scaleX,
        y: (touch.clientY - rect.top) * scaleY
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY
      };
    }
  };

  const startDrawing = (e: React.TouchEvent | React.MouseEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const { x, y } = getCanvasCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCanvasCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const canvas = canvasRef.current;
    if (canvas) {
      setFormData(prev => ({ ...prev, signature: canvas.toDataURL() }));
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData(prev => ({ ...prev, signature: "" }));
  };

  const handleSubmit = async () => {
    // Validate required fields
    if (!userName.trim()) {
      toast.error("יש להזין את שם החייל");
      return;
    }
    
    if (!formData.weaponReset || !formData.exitBriefingByOfficer || 
        !formData.uniformClassA || !formData.personalEquipmentChecked) {
      toast.error("יש למלא את כל השדות הנדרשים");
      return;
    }
    
    if (!formData.officerName.trim()) {
      toast.error("יש לציין את שם הקצין שערך את התדריך");
      return;
    }
    
    if (!formData.signature) {
      toast.error("יש לחתום על הטופס");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('trip_forms').insert({
        user_id: user?.id,
        soldier_name: userName,
        weapon_reset: formData.weaponReset,
        exit_briefing_by_officer: formData.exitBriefingByOfficer,
        officer_name: formData.officerName,
        uniform_class_a: formData.uniformClassA,
        personal_equipment_checked: formData.personalEquipmentChecked,
        vehicle_returned: formData.vehicleReturned,
        signature: formData.signature,
        notes: formData.notes,
      });

      if (error) throw error;

      setIsSubmitted(true);
      toast.success("הטופס נשלח בהצלחה!");
    } catch (error: any) {
      console.error('Error submitting form:', error);
      toast.error("שגיאה בשליחת הטופס");
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkItems = [
    { key: 'weaponReset', label: 'ביצעתי ווידוא איפסון נשק', icon: Shield, required: true },
    { key: 'exitBriefingByOfficer', label: 'קיבלתי תדריך יציאה מקצין', icon: FileCheck, required: true },
    { key: 'uniformClassA', label: 'יוצא על מדי א\' מדוגמים', icon: CheckCircle2, required: true },
    { key: 'personalEquipmentChecked', label: 'ציוד אישי מאובזר', icon: CheckCircle2, required: true },
    { key: 'vehicleReturned', label: 'רכב הוחזר תקין ונקי', icon: CheckCircle2, required: false },
  ];

  if (alreadySubmitted) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-6 text-center">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-800 mb-2">כבר מילאת טופס טיולים להיום</h2>
              <p className="text-slate-500 mb-6">הטופס יתאפס ביום חמישי הבא</p>
              <Button onClick={() => navigate('/')} className="w-full">
                <Home className="w-5 h-5 ml-2" />
                חזרה לדף הבית
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  if (isSubmitted) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-green-400 to-emerald-500" />
            <CardContent className="pt-8 text-center">
              <div className="relative w-24 h-24 mx-auto mb-4">
                <div className="absolute inset-0 bg-green-200 rounded-full animate-ping opacity-50" />
                <div className="relative w-full h-full rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-xl">
                  <CheckCircle2 className="w-14 h-14 text-white" />
                </div>
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">טופס טיולים נשלח!</h2>
              <p className="text-slate-500 mb-6">נסיעה בטוחה הביתה 🚗</p>
              <Button onClick={() => navigate('/')} className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600">
                <Home className="w-5 h-5 ml-2" />
                חזרה לדף הבית
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50/80 to-cream/20">
        <div className="relative px-4 py-6 space-y-6 pb-24">
          {/* Header */}
          <header className="relative overflow-hidden rounded-3xl bg-white/90 backdrop-blur-2xl border border-slate-200/60 p-5 shadow-lg">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 rounded-3xl" />
            <div className="relative flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                <Home className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-black text-xl text-slate-800 flex items-center gap-2">
                  טופס טיולים לפני יציאה לבית
                  <Sparkles className="w-5 h-5 text-accent" />
                </h1>
                <p className="text-sm text-slate-500">ווידוא ביצוע נהלים לפני יציאה</p>
              </div>
            </div>
          </header>

          {/* User info */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">פרטי החייל</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="soldierName">שם החייל *</Label>
                <Input
                  id="soldierName"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="הזן את שמך המלא"
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
              <div className="text-sm text-slate-500">תאריך: {new Date().toLocaleDateString('he-IL')}</div>
            </CardContent>
          </Card>

          {/* Checklist */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                נהלים נדרשים
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {checkItems.map((item) => {
                const Icon = item.icon;
                const isChecked = formData[item.key as keyof FormData] as boolean;
                
                return (
                  <div key={item.key} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <Checkbox
                      id={item.key}
                      checked={isChecked}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, [item.key]: checked }))
                      }
                      className="w-6 h-6"
                    />
                    <Label 
                      htmlFor={item.key} 
                      className={`flex-1 font-medium cursor-pointer ${isChecked ? 'text-green-600' : 'text-slate-700'}`}
                    >
                      {item.label}
                      {item.required && <span className="text-red-500 mr-1">*</span>}
                    </Label>
                    <Icon className={`w-5 h-5 ${isChecked ? 'text-green-500' : 'text-slate-400'}`} />
                  </div>
                );
              })}

              {/* Officer name */}
              <div className="space-y-2 pt-2">
                <Label htmlFor="officerName">שם הקצין שערך את התדריך *</Label>
                <Input
                  id="officerName"
                  value={formData.officerName}
                  onChange={(e) => setFormData(prev => ({ ...prev, officerName: e.target.value }))}
                  placeholder="הזן את שם הקצין"
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">הערות (אופציונלי)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="הערות נוספות..."
                  rows={2}
                  className="bg-white text-slate-900 placeholder:text-slate-400"
                />
              </div>
            </CardContent>
          </Card>

          {/* Signature */}
          <Card className="border-slate-200/60 shadow-lg">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">חתימה *</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-500">חתום באצבע או בעכבר:</p>
              <div className="relative border-2 border-dashed border-slate-300 rounded-xl overflow-hidden bg-white">
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={150}
                  className="w-full h-[150px] touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSignature}
                className="w-full"
              >
                נקה חתימה
              </Button>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg"
          >
            {isSubmitting ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6 ml-2" />
                שלח טופס טיולים
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
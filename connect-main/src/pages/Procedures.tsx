import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { FileText, Check, ChevronDown, ChevronUp, BookOpen, Sparkles, CheckCircle2, Loader2, Send, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface ProcedureItem {
  id: string;
  text: string;
  checked: boolean;
}

interface ProcedureSection {
  id: string;
  title: string;
  items: ProcedureItem[];
  isOpen: boolean;
}

interface SignatureRecord {
  id: string;
  procedure_type: string;
  full_name: string;
  created_at: string;
}

// Procedure content
const proceduresData = {
  routine: {
    title: "נהלי שגרה",
    items: [
      "בכל שבוע בימי ראשון ושני יתקיימו שיחות פלוגה בשעה 11:00 בחטיבה",
      "כל אירוע שקורה גם בבית על החייל לדווח למפקדיו",
      "כל הגעה לבסיס או יציאה מימנו תיהיה על מדי א' מדוגמים עם דסקיות צוואר ונעליים חולצה לבנה מתחת למדים כומתה וחוגר.",
      "חל איסור להגיע עם רכב פרטי לבסיס, כל יציאה או הגעה לבסיס תתבצע בתחבורה ציבורית בלבד.",
      "חל איסור לנוע עם טבעות/צמידים.",
      "אין לעשן ברכב/בחדר נהגים - העישון הוא רק בפינות העישון המוגדרות",
      "יבוצעו 2 מסדרי ניקיון במהלך השבוע בימי ראשון ורביעי על החדר להיות נקי ומסודר עד השעה 17:00",
      "כל יציאה מהמוצב תיהיה באישור מ\"מ ולאחר תדריך יציאה ע\"י קצין מוצב",
      "כיבוי אורות בשעה 23:00 אין להסתובב מחוץ למגורים ואין להרעיש בחדר.",
      "חולצה מתחת למדי ב' תיהיה בצבע ירוק או לבן",
      "אין לבצע חילופים בסידורי עבודה, כל חילוף באישור מ\"מ",
      "טרם יציאה מהבסיס יש לאפסן את הנשק בנשקיית החטיבה או בארמון הפלוגתי.",
      "ככלל היציאה לבית תיהיה בשעה 14:00 לאחר השלמת שעות שינה.",
      "הנשק הוא נשק אישי, כל חייל אחראי לנשקו, אין להעביר נשק מיד ליד והנשק יהיה צמוד לחייל בכל זמן נתון, בשינה הנשק ימצא מתחת לראשו של החייל, יש לשמור על הנשק נצור עם מק פורק ומחסנית מחוץ לנשק.",
      "ניקוי נשקים יהיה בנקודה מוגדרת במוצב בנוכחות מפקד.",
      "הנשק יהיה במצב שחור מחסנית בהכנס רק בפעילות מבצעית בתחילת הסיור הכנסת המחסנית תיהיה בנוכחות מפקד בסוף הסיור הוצאת המחסנית תיהיה בנוכחות מפקד",
      "תנועה עם פליז תיהיה רק על גבי פליז צבאי ירוק ומדי ב' מלאים מתחת."
    ]
  },
  shift: {
    title: "נהלים במהלך משמרת",
    items: [
      "יש להגיע בזמן שהוגדר ע\"י הפלוגה לנוהל קרב למשימה.",
      "יש לבצע תחקיר ע\"י רמה ממונה ותדריך נהיגה ע\"י מפקד גזרה.",
      "יש להגיע עם ציוד לחימה ומדים מלאים לנוהל קרב ולמשימה",
      "יש לנוע בכל משימה גם באירוע מבצעי עם חגורות בטיחות",
      "אין לצאת למשימה ללא מילוי כרטיס עבודה ומעבר תדריך פרונטלי",
      "יש לוודא טרם יציאה למשימה את תקינות מערכת הענ\"א",
      "יש להעביר בתחילת כל נסיעה את החוגר במערכת הענ\"א",
      "יש לבצע טל\"ת לפני כל יציאה למשמרת",
      "יש לבדוק את כלי הנהג ברכב.",
      "יש לבצע תרגולות מחייבות בתחילת המשימה",
      "עיגון ציוד - יש לוודא עיגון ציוד ברכב כמו ברוסים כלי נהג מטף",
      "יש לוודא נעילה כפולה בדויד",
      "מפקד המשימה הוא מפקד של כל הכוח כולל הנהג,יש להישמע להוראות מפקד המשימה בכל מהלך המשמרת.",
      "בכל מקרה של תקלה חימושית או תאונה יש להעביר דיווח לפלוגה הלוחמת ולסגל הפלוגת הנהגים.",
      "יש לשמור על הרכב נקי לפני ואחרי משמרת",
      "יש לנסוע על פי חוקי התעבורה",
      "נסיעה ברכב תתבצע על מדים מלאים",
      "אין להתעסק בהיסחי דעת במהלך נסיעה (טלפון, רדיו, ניווט, אוכל, שתייה וכו')",
      "לפני כל משימה על הנהג למלא טופס לפני משמרת באפליקצייה."
    ]
  },
  aluf70: {
    title: "נוהל אלוף 70",
    items: [
      "הגעה מהבית עד השעה 11:00 כך שיהיה 9 שעות שינה טרם עלייה למשימה כפי שמוגדר בנוהל אלוף 70.",
      "חל איסור על ביצוע פרסות ברכב ממוגן.",
      "נוהל ורדים (גדם ראשון) - הגשם הראשון מוגדר כגשם שיורד לאחר קיץ או לאחר 3 חודשי יובש, גשם ראשון \"תקופתי\" יורד לאחר מספר ימים של יובש. הגשם הראשון לא מנקה את הכביש מאבק ושמנים אשר הצטברו בימי היובש ולכן, בזמן הגשם הכביש חלק באופן קיצוני וקיימת סכנת החלקה ואובדן שליטה. על הכרזה על נוהל ורדים יש להתמקם בנקודות ורדים וכל אישור נסיעה תיהיה באישור סא\"ל בלבד (מג\"ד/סמח\"ט)",
      "מערכת הענ\"א - חובה להעביר חוגר ולוודא כי מערכת הענ\"א עובדת ברכב, נהג יקבל משוב אחת לחודש, יש לבצע תדריך על פי נתוני הענ\"א, חייל אשר יקבל ציון ראשון מתחת ל75 יגיע לבירור סמח\"ט, חודש שני ברציפות יגיע שוב לבירור סמח\"ט ומבחן שליטה חודש שלישי ברציפות הנהג יהיה שלול מההגה עד מעבר נהיגה מונעת במידה ונהג יותר מ750 קילומטר יהיה שלול בנוסף לחודש ימים."
    ]
  }
};

export default function Procedures() {
  const { user } = useAuth();
  const [sections, setSections] = useState<ProcedureSection[]>([]);
  const [fullName, setFullName] = useState("");
  const [signature, setSignature] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mySignatures, setMySignatures] = useState<SignatureRecord[]>([]);
  const [loadingSignatures, setLoadingSignatures] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    // Initialize sections from proceduresData
    const initialSections: ProcedureSection[] = [
      {
        id: "routine",
        title: proceduresData.routine.title,
        items: proceduresData.routine.items.map((text, idx) => ({
          id: `routine-${idx}`,
          text,
          checked: false
        })),
        isOpen: false
      },
      {
        id: "shift",
        title: proceduresData.shift.title,
        items: proceduresData.shift.items.map((text, idx) => ({
          id: `shift-${idx}`,
          text,
          checked: false
        })),
        isOpen: false
      },
      {
        id: "aluf70",
        title: proceduresData.aluf70.title,
        items: proceduresData.aluf70.items.map((text, idx) => ({
          id: `aluf70-${idx}`,
          text,
          checked: false
        })),
        isOpen: false
      }
    ];
    setSections(initialSections);
    fetchMySignatures();
  }, []);

  const fetchMySignatures = async () => {
    if (!user) return;
    setLoadingSignatures(true);
    const { data, error } = await supabase
      .from("procedure_signatures")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching signatures:", error);
    } else {
      setMySignatures(data || []);
    }
    setLoadingSignatures(false);
  };

  const toggleSection = (sectionId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId 
        ? { ...section, isOpen: !section.isOpen }
        : section
    ));
  };

  const toggleItem = (sectionId: string, itemId: string) => {
    setSections(prev => prev.map(section => 
      section.id === sectionId
        ? {
            ...section,
            items: section.items.map(item =>
              item.id === itemId ? { ...item, checked: !item.checked } : item
            )
          }
        : section
    ));
  };

  const isSectionComplete = (section: ProcedureSection) => {
    return section.items.every(item => item.checked);
  };

  const allSectionsComplete = sections.every(isSectionComplete);
  const canSubmit = allSectionsComplete && fullName.trim() && signature.trim();

  const handleSubmit = async () => {
    if (!user || !canSubmit) return;
    setIsSubmitting(true);

    // Submit signature for each procedure type
    const signaturePromises = sections.map(section => 
      supabase.from("procedure_signatures").insert({
        user_id: user.id,
        procedure_type: section.id,
        full_name: fullName.trim(),
        signature: signature.trim(),
        items_checked: section.items.map(item => item.id)
      })
    );

    const results = await Promise.all(signaturePromises);
    const hasError = results.some(r => r.error);

    if (hasError) {
      toast.error("שגיאה בשמירת החתימה");
      console.error(results);
    } else {
      toast.success("הנהלים נחתמו בהצלחה!");
      // Reset form
      setSections(prev => prev.map(section => ({
        ...section,
        items: section.items.map(item => ({ ...item, checked: false })),
        isOpen: false
      })));
      setFullName("");
      setSignature("");
      fetchMySignatures();
    }
    setIsSubmitting(false);
  };

  const getProcedureLabel = (type: string) => {
    switch (type) {
      case "routine": return "נהלי שגרה";
      case "shift": return "נהלים במהלך משמרת";
      case "aluf70": return "נוהל אלוף 70";
      default: return type;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("he-IL", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <AppLayout>
      <div className="px-4 py-6 max-w-lg mx-auto">
        {/* Header */}
        <div className="relative text-center mb-8 animate-slide-up">
          <div className="absolute top-8 left-10 w-28 h-28 bg-gradient-to-br from-primary/12 to-accent/8 rounded-full blur-3xl animate-float" />
          <div className="absolute top-14 right-8 w-20 h-20 bg-accent/15 rounded-full blur-2xl animate-float" style={{ animationDelay: '2s' }} />
          
          <div className="relative inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gradient-to-r from-primary/20 via-card/50 to-accent/20 border border-primary/40 mb-5 shadow-[0_0_40px_hsl(var(--primary)/0.25)] animate-glow">
            <BookOpen className="w-5 h-5 text-primary animate-bounce-soft" />
            <span className="text-sm font-black text-primary">נהלים</span>
            <Sparkles className="w-4 h-4 text-accent animate-pulse" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-slate-800 via-primary to-slate-800 bg-clip-text text-transparent mb-3">
            נהלים לחתימה
          </h1>
          <p className="text-muted-foreground flex items-center justify-center gap-2">
            <FileText className="w-4 h-4 text-accent" />
            סמן וי על כל סעיף וחתום בסוף
          </p>
        </div>

        {/* History Toggle */}
        <Button
          variant="outline"
          onClick={() => setShowHistory(!showHistory)}
          className="w-full mb-6 h-12 rounded-xl gap-2 border-primary/30 hover:bg-primary/10"
        >
          <History className="w-5 h-5" />
          {showHistory ? "הסתר היסטוריית חתימות" : "הצג היסטוריית חתימות"}
        </Button>

        {/* Signature History */}
        {showHistory && (
          <div className="mb-6 space-y-3 animate-fade-in">
            <h3 className="font-bold text-slate-800 mb-3">החתימות שלי</h3>
            {loadingSignatures ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : mySignatures.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">אין חתימות קודמות</p>
            ) : (
              <div className="space-y-2">
                {mySignatures.map(sig => (
                  <div key={sig.id} className="p-3 rounded-xl bg-card/80 border border-border/30">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800">{getProcedureLabel(sig.procedure_type)}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(sig.created_at)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">נחתם על ידי: {sig.full_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Procedure Sections */}
        <div className="space-y-4 mb-6">
          {sections.map((section, sectionIndex) => (
            <Collapsible 
              key={section.id} 
              open={section.isOpen} 
              onOpenChange={() => toggleSection(section.id)}
              className="animate-slide-up"
              style={{ animationDelay: `${sectionIndex * 100}ms` }}
            >
              <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 overflow-hidden">
                <CollapsibleTrigger asChild>
                  <div className="p-4 cursor-pointer hover:bg-primary/5 transition-colors flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        isSectionComplete(section) 
                          ? 'bg-green-500/20 border-green-500/30' 
                          : 'bg-primary/20 border-primary/30'
                      } border`}>
                        {isSectionComplete(section) ? (
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-800">{section.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {section.items.filter(i => i.checked).length} / {section.items.length} סעיפים
                        </p>
                      </div>
                    </div>
                    {section.isOpen ? (
                      <ChevronUp className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="px-4 pb-4 space-y-2 border-t border-border/20 pt-3">
                    {section.items.map((item, index) => (
                      <div
                        key={item.id}
                        onClick={() => toggleItem(section.id, item.id)}
                        className={`p-3 rounded-xl cursor-pointer transition-all duration-200 flex items-start gap-3 ${
                          item.checked 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : 'bg-secondary/30 border border-transparent hover:border-primary/30'
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors ${
                          item.checked 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-slate-400'
                        }`}>
                          {item.checked && <Check className="w-3.5 h-3.5 text-white" />}
                        </div>
                        <span className={`text-sm leading-relaxed ${
                          item.checked ? 'text-green-700' : 'text-slate-700'
                        }`}>
                          {index + 1}. {item.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        {/* Signature Section */}
        <div className="rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 p-5 space-y-4 animate-slide-up" style={{ animationDelay: '0.3s' }}>
          <h3 className="font-bold text-slate-800 text-center">חתימה על הנהלים</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">שם מלא</label>
              <Input
                placeholder="הזן את שמך המלא..."
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-12 rounded-xl bg-white/80 border-slate-200"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1.5 block">חתימה</label>
              <Input
                placeholder="הזן את חתימתך..."
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                className="h-12 rounded-xl bg-white/80 border-slate-200"
              />
            </div>
          </div>

          {!allSectionsComplete && (
            <p className="text-center text-sm text-amber-600 bg-amber-50 rounded-xl p-3">
              יש לסמן וי על כל הסעיפים בכל הנהלים לפני החתימה
            </p>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || isSubmitting}
            className="w-full h-14 text-base font-bold rounded-xl bg-gradient-to-r from-primary to-accent shadow-emblem hover:shadow-luxury transition-all duration-300 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                שולח...
              </>
            ) : (
              <>
                <Send className="w-5 h-5 ml-2" />
                שלח חתימה
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
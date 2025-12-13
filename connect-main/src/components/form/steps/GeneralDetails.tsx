import { useFormContext } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OUTPOSTS } from "@/lib/constants";
import { Calendar, Clock, MapPin, User, Car, Sun, Moon, CloudSun, Sparkles } from "lucide-react";

const SHIFT_TYPES_ENHANCED = [
  { value: "morning", label: "משמרת בוקר", icon: Sun },
  { value: "afternoon", label: "משמרת צהריים", icon: CloudSun },
  { value: "evening", label: "משמרת ערב", icon: Moon },
];

export function GeneralDetails() {
  const { register, setValue, watch } = useFormContext();
  
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('he-IL', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const formattedTime = currentDate.toLocaleTimeString('he-IL', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-bold text-primary">שלב 1 מתוך 5</span>
        </div>
        <h2 className="text-3xl font-black mb-3 text-foreground">פרטים כלליים</h2>
        <p className="text-muted-foreground">מלא את הפרטים הבסיסיים לפני תחילת המשמרת</p>
      </div>

      {/* Date & Time Display */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg text-foreground">{formattedDate}</div>
              <div className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formattedTime}
              </div>
            </div>
          </div>
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Outpost Selection */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center">
            <MapPin className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-foreground text-lg">שם המוצב *</Label>
            <p className="text-xs text-muted-foreground">בחר את המוצב שלך</p>
          </div>
        </div>
        <Select value={watch("outpost")} onValueChange={(value) => setValue("outpost", value)}>
          <SelectTrigger className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-base rounded-xl">
            <SelectValue placeholder="בחר מוצב" />
          </SelectTrigger>
          <SelectContent className="bg-white border-border/50 rounded-xl shadow-xl">
            {OUTPOSTS.map((outpost) => (
              <SelectItem key={outpost} value={outpost} className="text-base py-3 rounded-lg">
                {outpost}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Driver Name */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-foreground text-lg">שם הנהג *</Label>
            <p className="text-xs text-muted-foreground">שם מלא</p>
          </div>
        </div>
        <Input
          {...register("driverName")}
          placeholder="הזן את שמך המלא"
          className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-base rounded-xl"
        />
      </div>

      {/* Vehicle Number */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center">
            <Car className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-foreground text-lg">מספר רכב *</Label>
            <p className="text-xs text-muted-foreground">מספר הרכב הצבאי</p>
          </div>
        </div>
        <Input
          {...register("vehicleNumber")}
          placeholder="הזן את מספר הרכב"
          className="h-14 bg-muted/30 border-border/50 focus:border-primary/50 text-base rounded-xl"
        />
      </div>

      {/* Shift Type */}
      <div className="bg-white rounded-2xl p-5 border border-border/30 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-500/5 flex items-center justify-center">
            <Sun className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-foreground text-lg">סוג משמרת *</Label>
            <p className="text-xs text-muted-foreground">בחר את סוג המשמרת</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {SHIFT_TYPES_ENHANCED.map((shift) => {
            const isSelected = watch("shiftType") === shift.value;
            const ShiftIcon = shift.icon;
            return (
              <button
                key={shift.value}
                type="button"
                onClick={() => setValue("shiftType", shift.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl font-bold transition-all duration-300 border-2 ${
                  isSelected
                    ? "bg-primary/10 text-primary border-primary/40 shadow-md"
                    : "bg-muted/30 text-muted-foreground border-transparent hover:bg-primary/5 hover:border-primary/20"
                }`}
              >
                <ShiftIcon className={`w-6 h-6 ${isSelected ? "" : ""}`} />
                <span className="text-sm">{shift.label.replace("משמרת ", "")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

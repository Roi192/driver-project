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
        <h2 className="text-3xl font-black mb-3 text-slate-800">פרטים כלליים</h2>
        <p className="text-slate-500">מלא את הפרטים הבסיסיים לפני תחילת המשמרת</p>
      </div>

      {/* Date & Time Display */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center border border-primary/20">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <div>
              <div className="font-bold text-lg text-slate-800">{formattedDate}</div>
              <div className="text-sm text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                {formattedTime}
              </div>
            </div>
          </div>
          <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        </div>
      </div>

      {/* Outpost Selection */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent/15 to-accent/5 flex items-center justify-center border border-accent/20">
            <MapPin className="w-6 h-6 text-accent" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">שם המוצב *</Label>
            <p className="text-xs text-slate-500">בחר את המוצב שלך</p>
          </div>
        </div>
        <Select value={watch("outpost")} onValueChange={(value) => setValue("outpost", value)}>
          <SelectTrigger className="h-14 bg-slate-50 border-slate-200 focus:border-primary text-base rounded-xl text-slate-800">
            <SelectValue placeholder="בחר מוצב" />
          </SelectTrigger>
          <SelectContent className="bg-white border-slate-200 rounded-xl shadow-xl">
            {OUTPOSTS.map((outpost) => (
              <SelectItem key={outpost} value={outpost} className="text-base py-3 rounded-lg text-slate-800">
                {outpost}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Driver Name */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/15 to-blue-500/5 flex items-center justify-center border border-blue-200">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">שם הנהג *</Label>
            <p className="text-xs text-slate-500">שם מלא</p>
          </div>
        </div>
        <Input
          {...register("driverName")}
          placeholder="הזן את שמך המלא"
          className="h-14 bg-slate-50 border-slate-200 focus:border-primary text-base rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Vehicle Number */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500/15 to-orange-500/5 flex items-center justify-center border border-orange-200">
            <Car className="w-6 h-6 text-orange-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">מספר רכב *</Label>
            <p className="text-xs text-slate-500">מספר הרכב הצבאי</p>
          </div>
        </div>
        <Input
          {...register("vehicleNumber")}
          placeholder="הזן את מספר הרכב"
          className="h-14 bg-slate-50 border-slate-200 focus:border-primary text-base rounded-xl text-slate-800 placeholder:text-slate-400"
        />
      </div>

      {/* Shift Type */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/15 to-purple-500/5 flex items-center justify-center border border-purple-200">
            <Sun className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <Label className="font-bold text-slate-800 text-lg">סוג משמרת *</Label>
            <p className="text-xs text-slate-500">בחר את סוג המשמרת</p>
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
                    ? "bg-primary/10 text-primary border-primary shadow-md"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                }`}
              >
                <ShiftIcon className="w-6 h-6" />
                <span className="text-sm">{shift.label.replace("משמרת ", "")}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string;
  onChange: (time: string) => void;
  placeholder?: string;
  className?: string;
}

// Generate time slots from 06:00 to 23:00 in 15-minute intervals
const generateTimeSlots = () => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const h = hour.toString().padStart(2, "0");
      const m = minute.toString().padStart(2, "0");
      slots.push(`${h}:${m}`);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export function TimePicker({ value, onChange, placeholder = "בחר שעה", className }: TimePickerProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (time: string) => {
    onChange(time);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-right font-normal bg-white text-slate-800 border-slate-300 hover:bg-slate-50",
            !value && "text-slate-400",
            className
          )}
        >
          <Clock className="w-4 h-4 ml-2 text-slate-400" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0 bg-white" align="start">
        <ScrollArea className="h-64">
          <div className="p-2 grid grid-cols-2 gap-1">
            {TIME_SLOTS.map((time) => (
              <Button
                key={time}
                variant="ghost"
                size="sm"
                className={cn(
                  "text-slate-700 hover:bg-blue-50 hover:text-blue-700",
                  value === time && "bg-blue-100 text-blue-700 font-bold"
                )}
                onClick={() => handleSelect(time)}
              >
                {time}
              </Button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
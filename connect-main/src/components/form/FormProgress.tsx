import { cn } from "@/lib/utils";
import { Check, Sparkles } from "lucide-react";

interface FormProgressProps {
  currentStep: number;
  totalSteps: number;
  stepLabels: string[];
}

export function FormProgress({ currentStep, totalSteps, stepLabels }: FormProgressProps) {
  return (
    <div className="mx-4 mt-4 mb-6 sticky top-20 z-30">
      <div className="relative p-5 rounded-2xl bg-card/90 backdrop-blur-xl border border-primary/20 shadow-luxury overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-accent/5 pointer-events-none" />
        
        {/* Progress bar background */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/30">
          <div 
            className="h-full bg-gradient-to-r from-primary via-primary to-accent transition-all duration-500 ease-out"
            style={{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }}
          />
        </div>
        
        <div className="relative flex items-center justify-between max-w-md mx-auto">
          {Array.from({ length: totalSteps }, (_, i) => {
            const step = i + 1;
            const isCompleted = step < currentStep;
            const isActive = step === currentStep;
            
            return (
              <div key={i} className="flex items-center">
                <div className="flex flex-col items-center">
                  {/* Step indicator */}
                  <div className="relative">
                    {/* Glow for active step */}
                    {isActive && (
                      <div className="absolute inset-0 bg-primary rounded-xl blur-lg opacity-50 animate-pulse" />
                    )}
                    
                    <div
                      className={cn(
                        "relative w-11 h-11 rounded-xl flex items-center justify-center text-sm font-black transition-all duration-500 border-2",
                        isCompleted && "bg-gradient-to-br from-green-500 to-green-600 text-white border-green-400 shadow-lg",
                        isActive && "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground border-primary/50 shadow-emblem scale-110",
                        !isCompleted && !isActive && "bg-secondary/50 text-muted-foreground border-border/30"
                      )}
                    >
                      {isCompleted ? (
                        <Check className="w-5 h-5" />
                      ) : isActive ? (
                        <Sparkles className="w-5 h-5" />
                      ) : (
                        step
                      )}
                    </div>
                  </div>
                  
                  {/* Step label */}
                  <span className={cn(
                    "text-xs mt-2 text-center max-w-[50px] font-bold transition-colors duration-300",
                    isActive ? "text-primary" : isCompleted ? "text-green-500" : "text-muted-foreground"
                  )}>
                    {stepLabels[i]}
                  </span>
                </div>
                
                {/* Connector line */}
                {i < totalSteps - 1 && (
                  <div className={cn(
                    "w-8 h-1 mx-1 rounded-full transition-all duration-500",
                    step < currentStep 
                      ? "bg-gradient-to-r from-green-500 to-green-400" 
                      : "bg-secondary/30"
                  )} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
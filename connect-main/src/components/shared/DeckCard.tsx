import { ReactNode, CSSProperties } from "react";
import { ChevronLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface DeckCardProps {
  icon?: React.ElementType;
  title: string;
  description?: string;
  onClick?: () => void;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  featured?: boolean;
}

export function DeckCard({ icon: Icon, title, description, onClick, children, className, style, featured }: DeckCardProps) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "group relative overflow-hidden p-5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/30 transition-all duration-500",
        onClick && "cursor-pointer hover:border-primary/50 hover:shadow-[0_20px_60px_-15px_hsl(var(--primary)/0.3),0_0_40px_hsl(var(--accent)/0.15)] hover:bg-card hover:scale-[1.02]",
        className
      )}
    >
      {/* Animated gradient background on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 opacity-0 group-hover:opacity-100 transition-all duration-700 pointer-events-none" />
      
      {/* Premium glow effect */}
      <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 via-accent/20 to-primary/30 rounded-3xl blur-2xl opacity-0 group-hover:opacity-60 transition-all duration-700 pointer-events-none" />
      
      {/* Shimmer effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 pointer-events-none" />

      {/* Sparkle accents */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <Sparkles className="w-4 h-4 text-accent animate-pulse" />
      </div>
      
      <div className="relative flex items-center gap-4">
        {Icon && (
          <div className="relative">
            {/* Multi-layer glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-xl blur-xl opacity-0 group-hover:opacity-70 transition-all duration-500 scale-150" />
            <div className="absolute inset-0 bg-primary/40 rounded-xl blur-lg opacity-0 group-hover:opacity-50 transition-all duration-300" />
            
            <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-primary/25 to-primary/10 flex items-center justify-center shrink-0 border border-primary/25 group-hover:border-accent/60 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 group-hover:shadow-[0_0_30px_hsl(var(--primary)/0.4)]">
              <Icon className="w-8 h-8 text-primary group-hover:text-accent transition-colors duration-500 group-hover:scale-110" />
            </div>
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-all duration-500 group-hover:translate-x-1">
            {title}
          </h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1 group-hover:text-foreground/80 transition-all duration-500 line-clamp-2">{description}</p>
          )}
          {children}
        </div>

        {onClick && (
          <div className="w-12 h-12 rounded-xl bg-secondary/50 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-primary/30 group-hover:to-accent/30 transition-all duration-500 group-hover:scale-110 group-hover:shadow-[0_0_20px_hsl(var(--primary)/0.3)]">
            <ChevronLeft className="w-6 h-6 text-muted-foreground group-hover:text-primary group-hover:-translate-x-2 transition-all duration-500" />
          </div>
        )}
      </div>

      {/* Featured badge */}
      {featured && (
        <div className="absolute top-0 left-0 px-3 py-1 bg-gradient-to-r from-accent to-accent/80 text-accent-foreground text-xs font-bold rounded-br-xl rounded-tl-xl">
          <Sparkles className="w-3 h-3 inline-block mr-1" />
          מומלץ
        </div>
      )}

      {/* Corner accent */}
      <div className="absolute bottom-0 right-0 w-20 h-20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute bottom-0 right-0 w-full h-full bg-gradient-to-tl from-accent/20 to-transparent rounded-tl-3xl" />
      </div>
    </div>
  );
}

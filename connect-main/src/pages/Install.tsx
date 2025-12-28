import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Share, CheckCircle2, ArrowDown } from "lucide-react";
import { cn } from "@/lib/utils";
import unitLogo from "@/assets/unit-logo.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function Install() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    setIsStandalone(standalone);
    setIsInstalled(standalone);

    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
    setIsIOS(ios);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        {/* Logo */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-primary/20 rounded-full blur-3xl scale-150" />
          <img
            src={unitLogo}
            alt="לוגו חטיבת בנימין"
            className="relative w-32 h-32 object-contain"
          />
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2">
          נהגי בט״ש
        </h1>
        <p className="text-lg text-muted-foreground mb-8">
          חטיבת בנימין
        </p>

        {isInstalled || isStandalone ? (
          <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 mb-8">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-green-500 mb-2">
              האפליקציה מותקנת!
            </h2>
            <p className="text-muted-foreground">
              תוכל למצוא אותה במסך הבית שלך
            </p>
          </div>
        ) : (
          <>
            {/* Features */}
            <div className="grid gap-4 mb-8 w-full max-w-sm">
              {[
                { icon: "⚡", text: "גישה מהירה מהמסך הראשי" },
                { icon: "📱", text: "חווית אפליקציה מלאה" },
                { icon: "🔔", text: "התראות ועדכונים" },
                { icon: "📶", text: "עובד גם אופליין" },
              ].map((feature, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 bg-card/50 rounded-xl p-3 text-right"
                >
                  <span className="text-2xl">{feature.icon}</span>
                  <span className="text-foreground">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* Install Instructions */}
            {isIOS ? (
              <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
                <h2 className="text-lg font-bold text-foreground mb-4">
                  כיצד להתקין באייפון
                </h2>
                <div className="space-y-4 text-right">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="text-foreground">לחץ על כפתור השיתוף</p>
                      <div className="flex items-center gap-2 mt-1 text-muted-foreground text-sm">
                        <Share className="w-4 h-4" />
                        <span>בתחתית המסך</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="text-foreground">גלול ובחר</p>
                      <p className="text-primary font-semibold">"הוסף למסך הבית"</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="text-foreground">לחץ "הוסף" בפינה הימנית העליונה</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border flex justify-center">
                  <ArrowDown className="w-6 h-6 text-muted-foreground animate-bounce" />
                </div>
              </div>
            ) : deferredPrompt ? (
              <Button
                onClick={handleInstall}
                size="lg"
                className="w-full max-w-sm h-14 text-lg bg-primary hover:bg-primary/90"
              >
                <Download className="w-5 h-5 ml-2" />
                התקן את האפליקציה
              </Button>
            ) : (
              <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-sm">
                <Smartphone className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-bold text-foreground mb-4">
                  כיצד להתקין
                </h2>
                <div className="space-y-4 text-right">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">1</span>
                    </div>
                    <div>
                      <p className="text-foreground">לחץ על תפריט הדפדפן</p>
                      <p className="text-muted-foreground text-sm">3 נקודות ⋮ בפינה העליונה</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">2</span>
                    </div>
                    <div>
                      <p className="text-foreground">בחר</p>
                      <p className="text-primary font-semibold">"התקן אפליקציה"</p>
                      <p className="text-muted-foreground text-sm">או "הוסף למסך הבית"</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">3</span>
                    </div>
                    <div>
                      <p className="text-foreground">אשר את ההתקנה</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border">
                  <p className="text-xs text-muted-foreground text-center">
                    💡 פתח דף זה בדפדפן Chrome או Edge לחוויה הטובה ביותר
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 text-center text-sm text-muted-foreground">
        <p>© 2024 חטיבת בנימין</p>
      </div>
    </div>
  );
}
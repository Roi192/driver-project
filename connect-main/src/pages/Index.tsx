import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { CommanderDashboard } from "@/components/commander/CommanderDashboard";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";

const Index = () => {
  const { user, isAdmin, loading } = useAuth();

  // Show loading while checking role
  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-accent/40 rounded-full blur-2xl animate-pulse" />
            <div className="relative w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </AppLayout>
    );
  }

  // Show commander dashboard for admins
  if (user && isAdmin) {
    return (
      <AppLayout>
        <CommanderDashboard />
      </AppLayout>
    );
  }

  // Show regular hero section for non-admins
  return (
    <AppLayout>
      <HeroSection />
      <QuickActions />
    </AppLayout>
  );
};

export default Index;
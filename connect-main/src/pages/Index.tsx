import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { CommanderDashboard } from "@/components/commander/CommanderDashboard";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";
import { DriverHomeContent } from "@/components/home/DriverHomeContent";

const Index = () => {
  const { user, isAdmin, isPlatoonCommander, isBattalionAdmin, loading } = useAuth();

  // Check if user has any admin-level role that should see commander dashboard
  const hasAdminAccess = isAdmin || isPlatoonCommander || isBattalionAdmin;

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

  // Show commander dashboard for admins and platoon commanders
  if (user && hasAdminAccess) {
    return (
      <AppLayout>
        <CommanderDashboard />
      </AppLayout>
    );
  }

  // Show driver home page with organized tasks
  return (
    <AppLayout>
      <HeroSection />
      {user && <DriverHomeContent />}
      <QuickActions />
    </AppLayout>
  );
};

export default Index;
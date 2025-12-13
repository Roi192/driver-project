import { AppLayout } from "@/components/layout/AppLayout";
import { HeroSection } from "@/components/home/HeroSection";
import { QuickActions } from "@/components/home/QuickActions";

const Index = () => {
  return (
    <AppLayout>
      <HeroSection />
      <QuickActions />
    </AppLayout>
  );
};

export default Index;

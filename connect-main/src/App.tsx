import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ShiftForm from "./pages/ShiftForm";
import DrillLocations from "./pages/DrillLocations";
import SafetyFiles from "./pages/SafetyFiles";
import SafetyEvents from "./pages/SafetyEvents";
import TrainingVideos from "./pages/TrainingVideos";
import Procedures from "./pages/Procedures";
import MyReports from "./pages/MyReports";
import AdminDashboard from "./pages/AdminDashboard";
import AnnualWorkPlan from "./pages/AnnualWorkPlan";
import BomReport from "./pages/BomReport";
import SoldiersControl from "./pages/SoldiersControl";
import AttendanceTracking from "./pages/AttendanceTracking";
import PunishmentsTracking from "./pages/PunishmentsTracking";
import Inspections from "./pages/Inspections";
import HolidaysManagement from "./pages/HolidaysManagement";
import AccidentsTracking from "./pages/AccidentsTracking";
import KnowTheArea from "./pages/KnowTheArea";
import Install from "./pages/Install";
import UsersManagement from "./pages/UsersManagement";
import CleaningParades from "./pages/CleaningParades";
import CleaningParadesManagement from "./pages/CleaningParadesManagement";
import CleaningParadeHighlightsManagement from "./pages/CleaningParadeHighlightsManagement";
import FitnessReport from "./pages/FitnessReport";
import TripForm from "./pages/TripForm";
import SafetyScoresManagement from "./pages/SafetyScoresManagement";
import DriverInterviews from "./pages/DriverInterviews";
import AdminDriverInterviews from "./pages/AdminDriverInterviews";
import NotFound from "./pages/NotFound";
import { InstallPrompt } from "@/components/pwa/InstallPrompt";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <InstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/install" element={<Install />} />
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              }
            />
            <Route
              path="/shift-form"
              element={
                <ProtectedRoute>
                  <ShiftForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drill-locations"
              element={
                <ProtectedRoute>
                  <DrillLocations />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-files"
              element={
                <ProtectedRoute>
                  <SafetyFiles />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-events"
              element={
                <ProtectedRoute>
                  <SafetyEvents />
                </ProtectedRoute>
              }
            />
            <Route
              path="/training-videos"
              element={
                <ProtectedRoute>
                  <TrainingVideos />
                </ProtectedRoute>
              }
            />
            <Route
              path="/procedures"
              element={
                <ProtectedRoute>
                  <Procedures />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-reports"
              element={
                <ProtectedRoute>
                  <MyReports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/annual-work-plan"
              element={
                <ProtectedRoute>
                  <AnnualWorkPlan />
                </ProtectedRoute>
              }
            />
            <Route
              path="/bom-report"
              element={
                <ProtectedRoute>
                  <BomReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/soldiers-control"
              element={
                <ProtectedRoute>
                  <SoldiersControl />
                </ProtectedRoute>
              }
            />
            <Route
              path="/attendance-tracking"
              element={
                <ProtectedRoute>
                  <AttendanceTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/punishments"
              element={
                <ProtectedRoute>
                  <PunishmentsTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/inspections"
              element={
                <ProtectedRoute>
                  <Inspections />
                </ProtectedRoute>
              }
            />
            <Route
              path="/holidays-management"
              element={
                <ProtectedRoute>
                  <HolidaysManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accidents-tracking"
              element={
                <ProtectedRoute>
                  <AccidentsTracking />
                </ProtectedRoute>
              }
            />
            <Route
              path="/know-the-area"
              element={
                <ProtectedRoute>
                  <KnowTheArea />
                </ProtectedRoute>
              }
            />
            <Route
              path="/users-management"
              element={
                <ProtectedRoute>
                  <UsersManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cleaning-parades"
              element={
                <ProtectedRoute>
                  <CleaningParades />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cleaning-parades-management"
              element={
                <ProtectedRoute>
                  <CleaningParadesManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/cleaning-parade-highlights-management"
              element={
                <ProtectedRoute>
                  <CleaningParadeHighlightsManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/fitness-report"
              element={
                <ProtectedRoute>
                  <FitnessReport />
                </ProtectedRoute>
              }
            />
            <Route
              path="/trip-form"
              element={
                <ProtectedRoute>
                  <TripForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/safety-scores"
              element={
                <ProtectedRoute>
                  <SafetyScoresManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/driver-interviews"
              element={
                <ProtectedRoute>
                  <DriverInterviews />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin-driver-interviews"
              element={
                <ProtectedRoute>
                  <AdminDriverInterviews />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
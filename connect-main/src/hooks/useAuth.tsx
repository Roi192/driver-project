import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

// Updated roles: admin (מ"פ), platoon_commander (מ"מ), battalion_admin (גדוד), driver (נהג)
export type AppRole = 'driver' | 'admin' | 'platoon_commander' | 'battalion_admin';

interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  userType: 'driver' | 'battalion';
  outpost?: string;
  region?: string;
  militaryRole?: string;
  platoon?: string;
  personalNumber?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  userType: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (data: SignUpData) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAdmin: boolean;
  isPlatoonCommander: boolean;
  isBattalionAdmin: boolean;
  canDelete: boolean;
  canEdit: boolean;
  canEditDrillLocations: boolean;
  canEditSafetyFiles: boolean;
  canEditSafetyEvents: boolean;
  canEditTrainingVideos: boolean;
  canEditProcedures: boolean;
  canAccessUsersManagement: boolean;
  canAccessBomReport: boolean;
  canAccessAnnualWorkPlan: boolean;
  canAccessSoldiersControl: boolean;
  canAccessAttendance: boolean;
  canAccessPunishments: boolean;
  canAccessInspections: boolean;
  canAccessHolidays: boolean;
  canAccessFitnessReport: boolean;
  canAccessAccidents: boolean;
  canAccessCourses: boolean;
  canAccessCleaningManagement: boolean;
  canAccessSafetyScores: boolean;
  canAccessDriverInterviews: boolean;
  canAccessAdminDashboard: boolean;
  canAccessWorkSchedule: boolean;
  canAccessWeeklyMeeting: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [userType, setUserType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id);
            fetchUserType(session.user.id);
          }, 0);
        } else {
          setRole(null);
          setUserType(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id);
        fetchUserType(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserRole = async (userId: string) => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setRole(data.role as AppRole);
    }
  };

  const fetchUserType = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('user_type')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      setUserType(data.user_type);
    }
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error as Error | null };
  };

  const signUp = async (data: SignUpData) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: data.fullName,
          user_type: data.userType,
          outpost: data.outpost || null,
          region: data.region || null,
          military_role: data.militaryRole || null,
          platoon: data.platoon || null,
          personal_number: data.personalNumber || null,
        },
      },
    });
    return { error: error as Error | null };
  };

  const signInWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
    setUserType(null);
  };

  // Permission calculations
  const isAdmin = role === 'admin';
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';
  
  // Only admin (מ"פ) can delete
  const canDelete = role === 'admin';
  
  // Admin (מ"פ), platoon_commander (מ"מ), and battalion_admin (גדוד) can add/edit
  // Battalion admin can edit drill locations, safety files, safety events
  const canEdit = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  
  // Battalion admin specific permissions - can edit these specific sections
  const canEditDrillLocations = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditSafetyFiles = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditSafetyEvents = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  // Battalion admin cannot edit training videos or procedures
  const canEditTrainingVideos = role === 'admin' || role === 'platoon_commander';
  const canEditProcedures = role === 'admin' || role === 'platoon_commander';
  
  // Only admin (מ"פ) can access users management
  const canAccessUsersManagement = role === 'admin';
  
  // Only admin (מ"פ) can access BOM report
  const canAccessBomReport = role === 'admin';
  
  // Only admin (מ"פ) and platoon_commander (מ"מ) can access annual work plan
  // battalion_admin cannot
  const canAccessAnnualWorkPlan = role === 'admin' || role === 'platoon_commander';
  
  // Admin and platoon_commander can access soldiers control
  // battalion_admin can see soldier data in dropdowns but not access the page
  const canAccessSoldiersControl = role === 'admin' || role === 'platoon_commander';
  
  // Only admin and platoon_commander can access attendance tracking
  const canAccessAttendance = role === 'admin' || role === 'platoon_commander';
  
  // Only admin and platoon_commander can access punishments tracking
  const canAccessPunishments = role === 'admin' || role === 'platoon_commander';
  
  // Only admin and platoon_commander can access inspections
  const canAccessInspections = role === 'admin' || role === 'platoon_commander';
  
  // Only admin can access holidays management
  const canAccessHolidays = role === 'admin';
  
  // Only admin can access fitness report
  const canAccessFitnessReport = role === 'admin';
  
  // Admin and platoon_commander can access accidents tracking
  const canAccessAccidents = role === 'admin' || role === 'platoon_commander';
  
  // Admin and platoon_commander can access courses management
  const canAccessCourses = role === 'admin' || role === 'platoon_commander';
  
  // Admin and platoon_commander can access cleaning management
  const canAccessCleaningManagement = role === 'admin' || role === 'platoon_commander';
  
  // Admin and platoon_commander can access safety scores
  const canAccessSafetyScores = role === 'admin' || role === 'platoon_commander';
  
  // Admin, platoon_commander, and battalion_admin can access driver interviews
  const canAccessDriverInterviews = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  
  // Battalion admin can access admin dashboard
  const canAccessAdminDashboard = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  
  // Admin and platoon_commander can access work schedule
  const canAccessWorkSchedule = role === 'admin' || role === 'platoon_commander';
  
  // Admin and platoon_commander can access weekly meeting
  const canAccessWeeklyMeeting = role === 'admin' || role === 'platoon_commander';

  const value = {
    user,
    session,
    role,
    userType,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signOut,
    isAdmin,
    isPlatoonCommander,
    isBattalionAdmin,
    canDelete,
    canEdit,
    canEditDrillLocations,
    canEditSafetyFiles,
    canEditSafetyEvents,
    canEditTrainingVideos,
    canEditProcedures,
    canAccessUsersManagement,
    canAccessBomReport,
    canAccessAnnualWorkPlan,
    canAccessSoldiersControl,
    canAccessAttendance,
    canAccessPunishments,
    canAccessInspections,
    canAccessHolidays,
    canAccessFitnessReport,
    canAccessAccidents,
    canAccessCourses,
    canAccessCleaningManagement,
    canAccessSafetyScores,
    canAccessDriverInterviews,
    canAccessAdminDashboard,
    canAccessWorkSchedule,
    canAccessWeeklyMeeting,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
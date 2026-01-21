import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'driver' | 'platoon_commander' | 'battalion_admin';

export function useUserRole() {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setIsLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error fetching role:', error);
          setRole('driver'); // Default to driver
        } else {
          setRole((data?.role as AppRole) || 'driver');
        }
      } catch (err) {
        console.error('Error:', err);
        setRole('driver');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRole();
  }, [user]);

  const isAdmin = role === 'admin';
  const isDriver = role === 'driver';
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';
  
  // Permission helpers
  const canDelete = role === 'admin';
  const canEdit = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditDrillLocations = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditSafetyFiles = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditSafetyEvents = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  const canEditTrainingVideos = role === 'admin' || role === 'platoon_commander';
  const canEditProcedures = role === 'admin' || role === 'platoon_commander';
  const canAccessUsersManagement = role === 'admin'; // Only admin
  const canAccessBomReport = role === 'admin';
  const canAccessAnnualWorkPlan = role === 'admin' || role === 'platoon_commander';
  const canAccessSoldiersControl = role === 'admin' || role === 'platoon_commander';
  const canAccessAttendance = role === 'admin' || role === 'platoon_commander';
  const canAccessPunishments = role === 'admin' || role === 'platoon_commander';
  const canAccessInspections = role === 'admin' || role === 'platoon_commander';
  const canAccessHolidays = role === 'admin'; // Only admin
  const canAccessFitnessReport = role === 'admin'; // Only admin
  const canAccessAccidents = role === 'admin' || role === 'platoon_commander';
  const canAccessCourses = role === 'admin' || role === 'platoon_commander';
  const canAccessCleaningManagement = role === 'admin' || role === 'platoon_commander';
  const canAccessSafetyScores = role === 'admin' || role === 'platoon_commander';
  const canAccessDriverInterviews = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';
  const canAccessAdminDashboard = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin';

  return {
    role,
    isAdmin,
    isDriver,
    isPlatoonCommander,
    isBattalionAdmin,
    isLoading,
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
  };
}
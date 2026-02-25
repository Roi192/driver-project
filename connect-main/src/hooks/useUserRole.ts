import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'driver' | 'platoon_commander' | 'battalion_admin' | 'super_admin' | 'hagmar_admin' | 'ravshatz';

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

  const isSuperAdmin = role === 'super_admin';
  const isAdmin = role === 'admin' || role === 'super_admin';
  const isDriver = role === 'driver';
  const isPlatoonCommander = role === 'platoon_commander';
  const isBattalionAdmin = role === 'battalion_admin';
  const isHagmarAdmin = role === 'hagmar_admin' || role === 'super_admin';
  
  // Permission helpers
  const canDelete = role === 'admin' || role === 'super_admin';
  const canEdit = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditDrillLocations = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditSafetyFiles = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditSafetyEvents = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canEditTrainingVideos = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canEditProcedures = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessUsersManagement = role === 'admin' || role === 'super_admin' || role === 'hagmar_admin';
  const canAccessBomReport = role === 'admin' || role === 'super_admin';
  const canAccessAnnualWorkPlan = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessSoldiersControl = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessAttendance = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessPunishments = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessInspections = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessHolidays = role === 'admin' || role === 'super_admin';
  const canAccessFitnessReport = role === 'admin' || role === 'super_admin';
  const canAccessAccidents = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessCourses = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessCleaningManagement = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessSafetyScores = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessDriverInterviews = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canAccessWeeklyMeeting = role === 'admin' || role === 'platoon_commander' || role === 'super_admin';
  const canAccessAdminDashboard = role === 'admin' || role === 'platoon_commander' || role === 'battalion_admin' || role === 'super_admin';
  const canAccessEquipmentTracking = role === 'admin' || role === 'super_admin' || role === 'battalion_admin';

  return {
    role,
    isSuperAdmin,
    isAdmin,
    isDriver,
    isPlatoonCommander,
    isBattalionAdmin,
    isHagmarAdmin,
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
    canAccessWeeklyMeeting,
    canAccessAdminDashboard,
    canAccessEquipmentTracking,
  };
}
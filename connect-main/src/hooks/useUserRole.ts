import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type AppRole = 'admin' | 'driver' | 'safety_officer';

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
          setRole(data?.role || 'driver');
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
  const isSafetyOfficer = role === 'safety_officer';

  return {
    role,
    isAdmin,
    isDriver,
    isSafetyOfficer,
    isLoading,
  };
}
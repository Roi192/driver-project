import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PushSubscriptionState {
  isSupported: boolean;
  isSubscribed: boolean;
  permission: NotificationPermission | 'unsupported';
  loading: boolean;
}

export function usePushNotifications(soldierId?: string) {
  const [state, setState] = useState<PushSubscriptionState>({
    isSupported: false,
    isSubscribed: false,
    permission: 'unsupported',
    loading: true,
  });

  useEffect(() => {
    checkSupport();
  }, [soldierId]);

  const checkSupport = async () => {
    // Check if notifications are supported
    if (!('Notification' in window)) {
      setState(prev => ({ ...prev, isSupported: false, loading: false }));
      return;
    }

    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      setState(prev => ({ ...prev, isSupported: false, loading: false }));
      return;
    }

    const permission = Notification.permission;
    
    // Check if already subscribed
    let isSubscribed = false;
    if (soldierId && permission === 'granted') {
      const { data } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('soldier_id', soldierId)
        .limit(1);
      
      isSubscribed = (data?.length ?? 0) > 0;
    }

    setState({
      isSupported: true,
      isSubscribed,
      permission,
      loading: false,
    });
  };

  const subscribe = useCallback(async () => {
    if (!state.isSupported || !soldierId) {
      toast.error('התראות לא נתמכות במכשיר זה');
      return false;
    }

    setState(prev => ({ ...prev, loading: true }));

    try {
      // Request permission
      const permission = await Notification.requestPermission();
      
      if (permission !== 'granted') {
        toast.error('נדחתה בקשת ההרשאה להתראות');
        setState(prev => ({ ...prev, permission, loading: false }));
        return false;
      }

      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      // Create a simple subscription record (without VAPID for now)
      // In production, you'd generate proper VAPID keys
      const subscriptionData = {
        soldier_id: soldierId,
        endpoint: `${window.location.origin}/push/${soldierId}`,
        p256dh: 'placeholder-key',
        auth: 'placeholder-auth',
      };

      const { error } = await supabase
        .from('push_subscriptions')
        .upsert(subscriptionData, {
          onConflict: 'soldier_id,endpoint'
        });

      if (error) throw error;

      // Show a test notification to confirm it's working
      if (registration.showNotification) {
        await registration.showNotification('התראות הופעלו! 🎉', {
          body: 'תקבל התראות לפני משמרות',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          dir: 'rtl',
          lang: 'he',
          tag: 'subscription-success',
        });
      }

      setState(prev => ({ 
        ...prev, 
        isSubscribed: true, 
        permission: 'granted',
        loading: false 
      }));

      toast.success('התראות הופעלו בהצלחה!');
      return true;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      toast.error('שגיאה בהפעלת התראות');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [soldierId, state.isSupported]);

  const unsubscribe = useCallback(async () => {
    if (!soldierId) return false;

    setState(prev => ({ ...prev, loading: true }));

    try {
      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('soldier_id', soldierId);

      if (error) throw error;

      setState(prev => ({ ...prev, isSubscribed: false, loading: false }));
      toast.success('התראות בוטלו');
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      toast.error('שגיאה בביטול התראות');
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [soldierId]);

  return {
    ...state,
    subscribe,
    unsubscribe,
    refresh: checkSupport,
  };
}
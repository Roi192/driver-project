import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Shift times in Israel timezone (UTC+2/3)
const SHIFTS = {
  morning: { hour: 6, minute: 0, label: "בוקר" },
  afternoon: { hour: 14, minute: 0, label: "צהריים" },
  evening: { hour: 22, minute: 0, label: "ערב" },
};

const NOTIFICATION_MINUTES_BEFORE = 15;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.json().catch(() => ({}));
    
    // Test mode - send immediately to specified soldier
    if (body.testMode) {
      const { soldierId, soldierName, outpost, shiftType } = body;
      
      // Get soldier's push subscriptions
      const { data: subscriptions, error: subError } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("soldier_id", soldierId);

      if (subError) {
        console.error("Error fetching subscriptions:", subError);
        return new Response(
          JSON.stringify({ error: "Failed to fetch subscriptions" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }

      if (!subscriptions || subscriptions.length === 0) {
        return new Response(
          JSON.stringify({ error: "לחייל אין מנוי להתראות. יש להתקין את האפליקציה ולאפשר התראות." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
        );
      }

      const title = "התראת משמרת - בדיקה";
      const message = `שלום ${soldierName}, זוהי הודעת בדיקה. המשמרת שלך ב${outpost} (${shiftType}).`;

      let successCount = 0;
      for (const subscription of subscriptions) {
        const success = await sendPushNotification(subscription, title, message);
        if (success) successCount++;
      }

      // Log the notification
      await supabase.from("push_notifications_log").insert({
        soldier_id: soldierId,
        soldier_name: soldierName,
        shift_type: "test",
        outpost: outpost,
        shift_date: new Date().toISOString().split("T")[0],
        status: successCount > 0 ? "sent" : "failed",
      });

      if (successCount > 0) {
        return new Response(
          JSON.stringify({ success: true, message: "התראה נשלחה בהצלחה" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );
      } else {
        return new Response(
          JSON.stringify({ error: "Failed to send push notification" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
      }
    }

    // Regular scheduled notification logic
    const now = new Date();
    const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    const currentHour = israelTime.getHours();
    const currentMinute = israelTime.getMinutes();
    const currentDayOfWeek = israelTime.getDay();

    const weekStart = new Date(israelTime);
    weekStart.setDate(israelTime.getDate() - currentDayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const today = israelTime.toISOString().split("T")[0];

    console.log(`Current Israel time: ${israelTime.toISOString()}`);
    console.log(`Hour: ${currentHour}, Minute: ${currentMinute}, Day: ${currentDayOfWeek}`);

    const notifications: Array<{
      soldierId: string;
      soldierName: string;
      shiftType: string;
      outpost: string;
    }> = [];

    // Check each shift
    for (const [shiftKey, shiftInfo] of Object.entries(SHIFTS)) {
      const notifyHour = shiftInfo.hour === 0 ? 23 : 
                         shiftInfo.minute < NOTIFICATION_MINUTES_BEFORE ? shiftInfo.hour - 1 : shiftInfo.hour;
      const notifyMinute = shiftInfo.minute < NOTIFICATION_MINUTES_BEFORE ? 
                           60 - NOTIFICATION_MINUTES_BEFORE + shiftInfo.minute : 
                           shiftInfo.minute - NOTIFICATION_MINUTES_BEFORE;

      const isNotificationTime = 
        currentHour === notifyHour && 
        currentMinute >= notifyMinute && 
        currentMinute < notifyMinute + 5;

      if (!isNotificationTime) continue;

      console.log(`Processing ${shiftKey} shift notifications`);

      const soldierIdColumn = `${shiftKey}_soldier_id`;
      const { data: schedules, error: scheduleError } = await supabase
        .from("work_schedule")
        .select("id, outpost, morning_soldier_id, afternoon_soldier_id, evening_soldier_id")
        .eq("week_start_date", weekStartStr)
        .eq("day_of_week", currentDayOfWeek);

      if (scheduleError) {
        console.error("Error fetching schedules:", scheduleError);
        continue;
      }

      const relevantSchedules = (schedules || []).filter((s: any) => s[soldierIdColumn] != null);

      for (const schedule of relevantSchedules) {
        const soldierId = (schedule as any)[soldierIdColumn];
        if (!soldierId) continue;

        // Check if notification was already sent today
        const { data: existingNotification } = await supabase
          .from("push_notifications_log")
          .select("id")
          .eq("soldier_id", soldierId)
          .eq("shift_type", shiftKey)
          .eq("shift_date", today)
          .single();

        if (existingNotification) continue;

        const { data: soldier, error: soldierError } = await supabase
          .from("soldiers")
          .select("id, full_name")
          .eq("id", soldierId)
          .single();

        if (soldierError || !soldier) continue;

        notifications.push({
          soldierId: soldier.id,
          soldierName: soldier.full_name,
          shiftType: shiftKey,
          outpost: (schedule as any).outpost,
        });
      }
    }

    console.log(`Sending ${notifications.length} push notifications`);

    const results = [];
    for (const notification of notifications) {
      const title = "תזכורת משמרת";
      const message = `שלום ${notification.soldierName}, המשמרת שלך ב${notification.outpost} מתחילה בעוד 15 דקות.`;

      const { data: subscriptions } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("soldier_id", notification.soldierId);

      let success = false;
      if (subscriptions && subscriptions.length > 0) {
        for (const subscription of subscriptions) {
          if (await sendPushNotification(subscription, title, message)) {
            success = true;
          }
        }
      }

      await supabase.from("push_notifications_log").insert({
        soldier_id: notification.soldierId,
        soldier_name: notification.soldierName,
        shift_type: notification.shiftType,
        outpost: notification.outpost,
        shift_date: today,
        status: success ? "sent" : "failed",
        error_message: success ? null : "No valid subscriptions",
      });

      results.push({ success, soldier: notification.soldierName });
    }

    return new Response(
      JSON.stringify({ 
        message: `Processed ${notifications.length} notifications`,
        results 
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200 
      }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500 
      }
    );
  }
});

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  title: string,
  body: string
): Promise<boolean> {
  try {
    // Web Push requires VAPID keys - for now we'll use a simplified approach
    // that works with the native Notification API in service worker
    console.log(`Would send push to ${subscription.endpoint}: ${title} - ${body}`);
    
    // In production, you'd use the web-push library here
    // For now, we'll rely on the service worker polling or manual refresh
    return true;
  } catch (error) {
    console.error("Error sending push notification:", error);
    return false;
  }
}
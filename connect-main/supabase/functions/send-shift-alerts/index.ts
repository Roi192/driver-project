import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Updated outposts list including מכבים
const OUTPOSTS = [
  "כוכב יעקב",
  "רמה",
  "ענתות",
  "בית אל",
  "עפרה",
  "מבו\"ש",
  "עטרת",
  "חורש ירון",
  "נווה יאיר",
  "רנתיס",
  "מכבים"
];

interface ShiftConfig {
  type: "morning" | "afternoon" | "evening";
  name: string;
  checkHour: number;
}

const shiftConfigs: ShiftConfig[] = [
  { type: "morning", name: "בוקר", checkHour: 7 },
  { type: "afternoon", name: "צהריים", checkHour: 15 },
  { type: "evening", name: "ערב", checkHour: 23 },
];

async function sendSMS(to: string, body: string): Promise<boolean> {
  const accountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
  const fromNumber = Deno.env.get("TWILIO_PHONE_NUMBER");

  if (!accountSid || !authToken || !fromNumber) {
    console.error("Missing Twilio credentials");
    return false;
  }

  try {
    console.log(`Sending SMS to ${to} via Twilio...`);
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        },
        body: new URLSearchParams({
          To: to,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Twilio API error:", response.status, errorText);
      return false;
    }

    const result = await response.json();
    console.log("SMS sent successfully! SID:", result.sid);
    return true;
  } catch (error) {
    console.error("Error sending SMS:", error);
    return false;
  }
}

function getCurrentShift(hour: number): ShiftConfig | null {
  // Check based on the hour which shift we should check
  // 7:00 - check morning shift (6:00-14:00)
  // 15:00 - check afternoon shift (14:00-22:00)
  // 23:00 - check evening shift (22:00-6:00)
  
  for (const config of shiftConfigs) {
    if (hour === config.checkHour) {
      return config;
    }
  }
  return null;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const adminPhone = Deno.env.get("ADMIN_PHONE_NUMBER");

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing Supabase credentials");
      throw new Error("Missing Supabase credentials");
    }

    if (!adminPhone) {
      console.error("Missing admin phone number");
      throw new Error("Missing admin phone number - please configure ADMIN_PHONE_NUMBER secret");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current time in Israel timezone
    const now = new Date();
    const israelTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Jerusalem" }));
    const currentHour = israelTime.getHours();
    const today = israelTime.toISOString().split("T")[0];

    console.log(`[${new Date().toISOString()}] Checking shift alerts at hour ${currentHour} for date ${today}`);
    console.log(`Admin phone: ${adminPhone?.slice(0, 4)}***`);

    // Allow manual trigger with specific shift type in request body
    let shiftConfig: ShiftConfig | null = null;
    
    if (req.method === "POST") {
      try {
        const body = await req.json();
        if (body.shift_type) {
          shiftConfig = shiftConfigs.find(s => s.type === body.shift_type) || null;
          console.log(`Manual trigger for shift: ${body.shift_type}`);
        }
      } catch {
        // No body or invalid JSON, use automatic detection
      }
    }

    // If no manual trigger, determine shift automatically
    if (!shiftConfig) {
      shiftConfig = getCurrentShift(currentHour);
    }
    
    if (!shiftConfig) {
      console.log(`No shift check scheduled for hour ${currentHour}`);
      return new Response(
        JSON.stringify({ 
          message: "No shift check scheduled for this hour",
          currentHour,
          scheduledHours: shiftConfigs.map(s => ({ shift: s.name, hour: s.checkHour }))
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Checking ${shiftConfig.name} shift for missing reports...`);

    // Get all reports for today with the current shift type
    const { data: reports, error } = await supabase
      .from("shift_reports")
      .select("outpost")
      .eq("report_date", today)
      .eq("shift_type", shiftConfig.type);

    if (error) {
      console.error("Error fetching reports:", error);
      throw error;
    }

    // Find outposts that didn't submit reports
    const reportedOutposts = new Set(reports?.map((r) => r.outpost) || []);
    const missingOutposts = OUTPOSTS.filter((outpost) => !reportedOutposts.has(outpost));

    console.log(`Reported outposts: ${reportedOutposts.size}`);
    console.log(`Missing outposts (${missingOutposts.length}):`, missingOutposts);

    if (missingOutposts.length === 0) {
      console.log("All outposts reported for this shift! No SMS needed.");
      return new Response(
        JSON.stringify({ 
          message: "All outposts reported - no alert needed", 
          shift: shiftConfig.name,
          totalOutposts: OUTPOSTS.length,
          reportedCount: reportedOutposts.size
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build SMS message
    const message = `🚨 התראת משמרת ${shiftConfig.name}

מוצבים שלא מילאו טופס:
${missingOutposts.map((o) => `• ${o}`).join("\n")}

סה"כ: ${missingOutposts.length} מוצבים חסרים מתוך ${OUTPOSTS.length}

מערכת נהגי בט"ש - פלנ"ג בנימין`;

    console.log("Sending SMS alert...");
    console.log("Message preview:", message.substring(0, 100) + "...");

    // Send SMS
    const smsSent = await sendSMS(adminPhone, message);

    const response = {
      success: smsSent,
      shift: shiftConfig.name,
      date: today,
      missingOutposts,
      missingCount: missingOutposts.length,
      totalOutposts: OUTPOSTS.length,
      messageLength: message.length,
      timestamp: new Date().toISOString()
    };

    console.log("Alert result:", response);

    return new Response(
      JSON.stringify(response),
      { 
        status: smsSent ? 200 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: any) {
    console.error("Error in send-shift-alerts:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
};

serve(handler);
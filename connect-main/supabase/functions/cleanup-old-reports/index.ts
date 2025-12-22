import { createClient } from "https://esm.sh/@supabase/supabase-js@2?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BUCKET = "shift-photos";
const TABLE = "shift_reports";
const DAYS_TO_KEEP = 30;

// מוציא "path" של הקובץ מתוך URL של Supabase Storage.
// לדוגמה:
// https://.../storage/v1/object/public/shift-photos/<folder>/<file>.jpg
// יחזיר: <folder>/<file>.jpg
function extractStoragePathFromUrl(url: string, bucket: string): string | null {
  try {
    const decoded = decodeURIComponent(url);

    // מחפשים את "/shift-photos/" בתוך ה-URL, ולוקחים כל מה שאחריו
    const marker = `/${bucket}/`;
    const idx = decoded.indexOf(marker);
    if (idx === -1) return null;

    let path = decoded.substring(idx + marker.length);

    // חותכים querystring אם יש (?token=...)
    const q = path.indexOf("?");
    if (q !== -1) path = path.substring(0, q);

    path = path.trim();
    if (!path) return null;

    return path;
  } catch {
    return null;
  }
}

// מוחק קבצים ב-batches כדי לא ליפול אם יש הרבה
async function removeInBatches(
  supabase: ReturnType<typeof createClient>,
  bucket: string,
  paths: string[],
  batchSize = 100,
): Promise<number> {
  let deleted = 0;

  for (let i = 0; i < paths.length; i += batchSize) {
    const batch = paths.slice(i, i + batchSize);
    const { error } = await supabase.storage.from(bucket).remove(batch);
    if (error) throw error;
    deleted += batch.length;
  }

  return deleted;
}

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // יצירת client עם Service Role כדי שיוכל למחוק DB + Storage
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // חישוב cutoff (לפני 30 יום) בפורמט YYYY-MM-DD
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);
    const cutoffDate = cutoff.toISOString().split("T")[0];

    console.log(`[cleanup-old-reports] cutoffDate=${cutoffDate}`);

    // 1) מביאים את הדוחות הישנים + URLs של התמונות
    const { data: oldReports, error: fetchError } = await supabase
      .from(TABLE)
      .select("id, photo_front, photo_left, photo_right, photo_back, photo_steering_wheel")
      .lt("report_date", cutoffDate);

    if (fetchError) throw fetchError;

    const reportsCount = oldReports?.length ?? 0;
    console.log(`[cleanup-old-reports] found reports=${reportsCount}`);

    // אין מה למחוק
    if (!oldReports || oldReports.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: "No old shift reports to clean",
          deletedReports: 0,
          deletedPhotos: 0,
          cutoffDate,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
      );
    }

    // 2) אוספים נתיבים למחיקה (path) מתוך ה-URLs
    const pathsSet = new Set<string>();

    for (const report of oldReports) {
      const urls = [
        report.photo_front,
        report.photo_left,
        report.photo_right,
        report.photo_back,
        report.photo_steering_wheel,
      ];

      for (const url of urls) {
        if (!url) continue;

        // מוציא את הנתיב בתוך ה-bucket, לדוגמה:
        // <reportId>/front_123.jpg
        const path = extractStoragePathFromUrl(url, BUCKET);
        if (path) pathsSet.add(path);
      }
    }

    const photoPaths = Array.from(pathsSet);
    console.log(`[cleanup-old-reports] photos to delete=${photoPaths.length}`);

    // 3) מוחקים תמונות מה-Storage (Best-effort: אם נכשל, עדיין מוחקים DB)
    let deletedPhotos = 0;
    if (photoPaths.length > 0) {
      try {
        deletedPhotos = await removeInBatches(supabase, BUCKET, photoPaths, 100);
        console.log(`[cleanup-old-reports] deleted photos=${deletedPhotos}`);
      } catch (storageErr) {
        console.error("[cleanup-old-reports] storage delete failed:", storageErr);
        // ממשיכים למחוק DB גם אם storage נכשל
      }
    }

    // 4) מוחקים את הרשומות מה-DB (הדוחות הישנים)
    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .lt("report_date", cutoffDate);

    if (deleteError) throw deleteError;

    console.log(`[cleanup-old-reports] deleted reports=${reportsCount}`);

    // 5) מחזירים תשובה מסודרת
    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${reportsCount} old shift reports and ${deletedPhotos} photos`,
        deletedReports: reportsCount,
        deletedPhotos,
        cutoffDate,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[cleanup-old-reports] error:", msg);

    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});

// api/admin-users.ts
import { createClient } from "@supabase/supabase-js";
import type { VercelRequest, VercelResponse } from "@vercel/node";

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// helper – לבדוק שמדובר במפקד/אדמין (מאוד בסיסי, אפשר לשפר)
function isAuthorized(req: VercelRequest) {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) return true; // אם אין הגנה – הכל פתוח (לשימוש פנימי בלבד)
  return req.headers["x-admin-secret"] === secret;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (!isAuthorized(req)) {
    return res.status(401).json({ error: "Not authorized" });
  }

  if (req.method === "GET") {
    // רשימת משתמשים
    const page = Number(req.query.page ?? 1);
    const perPage = Number(req.query.perPage ?? 50);

    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({
      users: data.users.map((u) => ({
        id: u.id,
        email: u.email,
        full_name: (u.user_metadata as any)?.full_name ?? "",
        outpost: (u.user_metadata as any)?.outpost ?? "",
        last_sign_in_at: u.last_sign_in_at,
      })),
    });
  }

  if (req.method === "PATCH") {
    const { id, full_name, outpost } = req.body as {
      id: string;
      full_name?: string;
      outpost?: string;
    };

    if (!id) {
      return res.status(400).json({ error: "Missing user id" });
    }

    const { data, error } = await supabaseAdmin.auth.admin.updateUserById(id, {
      user_metadata: {
        ...(full_name !== undefined && { full_name }),
        ...(outpost !== undefined && { outpost }),
      },
    });

    if (error) {
      console.error(error);
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json({ user: data.user });
  }

  return res.status(405).json({ error: "Method not allowed" });
}

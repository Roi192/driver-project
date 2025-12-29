import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // או הדומיין שלך אם תרצה להחמיר
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",  // 👈 חדש
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
if (req.method === "OPTIONS") {
  return new Response("ok", {
    status: 200,
    headers: corsHeaders,
  });
}


  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Get the authorization header to verify the caller is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create client with user's token to verify they're an admin
    const supabaseUser = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user: callerUser }, error: authError } = await supabaseUser.auth.getUser()
    if (authError || !callerUser) {
      throw new Error('Unauthorized')
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single()

    if (!roleData || roleData.role !== 'admin') {
      throw new Error('Only admins can view user emails')
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Get all users
    const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
    
    if (usersError) {
      throw new Error('Failed to fetch users')
    }

    // Map user IDs to emails
    const emailMap: Record<string, string> = {}
    for (const user of users) {
      if (user.email) {
        emailMap[user.id] = user.email
      }
    }

    return new Response(
  JSON.stringify({ emailMap }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
)

  } catch (error: any) {
    console.error('Error:', error.message)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Verify authorization header exists
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('Missing authorization header')
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - missing authorization header' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    // Create a client with the user's auth token to verify their identity
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    })

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabaseUser.auth.getUser()
    if (userError || !user) {
      console.error('User authentication failed:', userError?.message)
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized - invalid token' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 401 
        }
      )
    }

    console.log(`User ${user.id} attempting cleaning parades cleanup operation`)

    // Verify the user has admin or platoon_commander role
    const { data: roleData, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'platoon_commander'])
      .maybeSingle()

    if (roleError || !roleData) {
      console.error('Admin/platoon_commander role check failed for user:', user.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - admin or platoon commander access required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }, 
          status: 403 
        }
      )
    }

    console.log(`Admin user ${user.id} authorized for cleanup operation`)
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const cutoffDate = thirtyDaysAgo.toISOString().split('T')[0]

    console.log(`Cleaning up cleaning parade data older than ${cutoffDate}`)

    // First, get all old submissions to find their photos
    const { data: oldSubmissions, error: fetchError } = await supabase
      .from('cleaning_parade_submissions')
      .select('id, parade_date')
      .lt('parade_date', cutoffDate)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${oldSubmissions?.length || 0} old submissions to delete`)

    if (!oldSubmissions || oldSubmissions.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No old cleaning parade data to clean up',
          deletedSubmissions: 0,
          deletedPhotos: 0
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200
        }
      )
    }

    const submissionIds = oldSubmissions.map(s => s.id)

    // Get all completions (photos) for these submissions
    const { data: completions, error: completionsError } = await supabase
      .from('cleaning_checklist_completions')
      .select('id, photo_url')
      .in('submission_id', submissionIds)

    if (completionsError) {
      console.error('Error fetching completions:', completionsError)
    }

    console.log(`Found ${completions?.length || 0} photos to delete from storage`)

    // Collect storage file paths
    const storagePaths: string[] = []
    completions?.forEach(completion => {
      if (completion.photo_url && completion.photo_url.includes('cleaning-parades')) {
        // Extract the file path from the signed URL
        const match = completion.photo_url.match(/cleaning-parades\/([^?]+)/)
        if (match) {
          storagePaths.push(match[1])
        }
      }
    })

    // Delete photos from storage
    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('cleaning-parades')
        .remove(storagePaths)

      if (storageError) {
        console.error('Error deleting photos from storage:', storageError)
      } else {
        console.log(`Successfully deleted ${storagePaths.length} photos from storage`)
      }
    }

    // Delete completions first (foreign key constraint)
    const { error: deleteCompletionsError } = await supabase
      .from('cleaning_checklist_completions')
      .delete()
      .in('submission_id', submissionIds)

    if (deleteCompletionsError) {
      console.error('Error deleting completions:', deleteCompletionsError)
    }

    // Delete old submissions
    const { error: deleteSubmissionsError, count } = await supabase
      .from('cleaning_parade_submissions')
      .delete()
      .lt('parade_date', cutoffDate)

    if (deleteSubmissionsError) {
      throw deleteSubmissionsError
    }

    console.log(`Successfully deleted ${count || oldSubmissions.length} old cleaning parade submissions`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${oldSubmissions.length} old cleaning parade submissions and ${storagePaths.length} photos`,
        deletedSubmissions: oldSubmissions.length,
        deletedPhotos: storagePaths.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in cleanup-old-cleaning-parades:', errorMessage)
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})
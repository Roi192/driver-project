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

    console.log(`User ${user.id} attempting cleanup operation`)

    // Verify the user has admin role
    const { data: roleData, error: roleError } = await supabaseUser
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single()

    if (roleError || !roleData) {
      console.error('Admin role check failed for user:', user.id)
      return new Response(
        JSON.stringify({ success: false, error: 'Forbidden - admin access required' }),
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

    console.log(`Cleaning up shift reports older than ${cutoffDate}`)

    // First, get all old reports to find their photos
    const { data: oldReports, error: fetchError } = await supabase
      .from('shift_reports')
      .select('id, photo_front, photo_left, photo_right, photo_back, photo_steering_wheel')
      .lt('report_date', cutoffDate)

    if (fetchError) {
      throw fetchError
    }

    console.log(`Found ${oldReports?.length || 0} reports to delete`)

    // Collect all photo URLs to delete from storage
    const photoUrls: string[] = []
    
    oldReports?.forEach(report => {
      const photos = [
        report.photo_front,
        report.photo_left,
        report.photo_right,
        report.photo_back,
        report.photo_steering_wheel
      ]
      
      photos.forEach(photoUrl => {
        if (photoUrl && photoUrl.includes('shift-photos')) {
          // Extract the file path from the URL
          const match = photoUrl.match(/shift-photos\/(.+)/)
          if (match) {
            photoUrls.push(match[1])
          }
        }
      })
    })

    console.log(`Found ${photoUrls.length} photos to delete from storage`)

    // Delete photos from storage
    if (photoUrls.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('shift-photos')
        .remove(photoUrls)

      if (storageError) {
        console.error('Error deleting photos from storage:', storageError)
        // Continue with report deletion even if photo deletion fails
      } else {
        console.log(`Successfully deleted ${photoUrls.length} photos`)
      }
    }

    // Delete old shift reports from database
    const { error: deleteError, count } = await supabase
      .from('shift_reports')
      .delete()
      .lt('report_date', cutoffDate)

    if (deleteError) {
      throw deleteError
    }

    console.log(`Successfully deleted ${count || oldReports?.length || 0} old shift reports`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleaned up ${oldReports?.length || 0} old shift reports and ${photoUrls.length} photos`,
        deletedReports: oldReports?.length || 0,
        deletedPhotos: photoUrls.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error in cleanup-old-reports:', errorMessage)
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
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Extract token from URL regardless of auth headers
    const url = new URL(req.url)
    const token = url.searchParams.get('token')

    if (!token) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing authentication token'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with service role key for admin operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Find the auth token
    const { data: authToken, error: tokenError } = await supabase
      .from('auth_tokens')
      .select('user_id, email, expires_at, used_at')
      .eq('token', token)
      .eq('token_type', 'magic_link')
      .single()

    if (tokenError || !authToken) {
      console.error('Token lookup error:', tokenError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired authentication link'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if token is expired
    if (new Date(authToken.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication link has expired'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if token was already used
    if (authToken.used_at) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Authentication link has already been used'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Mark token as used
    const { error: updateError } = await supabase
      .from('auth_tokens')
      .update({ used_at: new Date().toISOString() })
      .eq('token', token)

    if (updateError) {
      console.error('Token update error:', updateError)
    }

    // Update user email confirmation status
    const { error: userUpdateError } = await supabase
      .from('users')
      .update({
        email_confirmed_at: new Date().toISOString(),
        verification_level: 'verified'
      })
      .eq('user_id', authToken.user_id)

    if (userUpdateError) {
      console.error('User update error:', userUpdateError)
    }

    // Instead of creating a session, redirect to a client-side auth handler
    // that will use the validated token to authenticate the user
    const authCallbackUrl = `${url.origin}/auth/magic-link?token=${token}&email=${encodeURIComponent(authToken.email)}`
    return Response.redirect(authCallbackUrl, 302)

  } catch (error) {
    console.error('Magic link auth error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Authentication failed'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Declare Deno global for TypeScript
declare const Deno: any

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { testEmail, campaignId, subject, html } = await req.json()

    console.log('Function called with:', { testEmail, campaignId })

    // Check if API key exists
    const apiKey = Deno.env.get('RESEND_API_KEY')
    console.log('API Key exists:', !!apiKey)

    if (!apiKey) {
      console.error('RESEND_API_KEY not found')
      return new Response(
        JSON.stringify({
          success: false,
          error: 'RESEND_API_KEY not configured'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (testEmail) {
      console.log('Sending test email to:', testEmail)

      // Create Supabase client for database operations
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      // Generate magic link token for authentication
      const token = crypto.randomUUID()
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

      // Find user by email
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('user_id, email')
        .eq('email', testEmail)
        .single()

      let userId = null
      if (userData) {
        userId = userData.user_id

        // Create or update auth token
        const { error: tokenError } = await supabase
          .from('auth_tokens')
          .upsert({
            user_id: userId,
            email: testEmail,
            token: token,
            token_type: 'magic_link',
            expires_at: expiresAt
          }, {
            onConflict: 'user_id,token_type'
          })

        if (tokenError) {
          console.error('Token creation error:', tokenError)
        }
      }

      // Create magic link URL
      const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/v1', '') || 'http://localhost:54321'
      const magicLink = `${baseUrl}/functions/v1/magic-link-auth?token=${token}`

      // Prepare email content with magic link
      const emailSubject = subject || 'Welcome to HyperApp - Click to Verify & Login'
      const emailHtml = html || `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: rtl;">
          <h1>🎉 Welcome to HyperApp!</h1>
          <p>Click the button below to verify your email and automatically log in to your account:</p>
          <p style="text-align: center; margin: 30px 0;">
            <a href="${magicLink}" style="background: #3b82f6; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold;">
              🚀 Verify Email & Login
            </a>
          </p>
          <p>This link will expire in 24 hours.</p>
          <p>Best regards,<br>The HyperApp Team</p>
        </div>
      `

      try {
        // Send email via Resend API
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [testEmail],
            subject: emailSubject,
            html: emailHtml,
          }),
        })

        console.log('Resend response status:', response.status)

        if (response.ok) {
          const data = await response.json()
          console.log('Test email sent successfully:', data)

          return new Response(
            JSON.stringify({
              success: true,
              message: `Test email sent to ${testEmail}`,
              resendId: data.id
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else {
          const error = await response.text()
          console.error('Resend API error:', response.status, error)

          return new Response(
            JSON.stringify({
              success: false,
              error: `Resend API error: ${response.status} - ${error}`
            }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          )
        }
      } catch (fetchError) {
        console.error('Fetch error:', fetchError)
        return new Response(
          JSON.stringify({
            success: false,
            error: `Network error: ${fetchError.message}`
          }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    if (campaignId) {
      // For now, just return success for campaign (implement later)
      console.log('Campaign sending not implemented yet, but function works!')

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Campaign sending placeholder - function works!',
          stats: { total: 0, successful: 0, failed: 0 }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Either testEmail or campaignId must be provided'
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

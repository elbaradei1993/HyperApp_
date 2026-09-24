import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Declare Deno global for TypeScript
declare const Deno: any

// --- Security helpers ---

// Authenticate the caller via their Supabase JWT (same pattern as hyper-ai).
// The anon key alone is NOT sufficient: getUser() must return a real user.
async function authenticate(req: Request): Promise<{ id: string; email: string } | null> {
  const authorization = req.headers.get('Authorization')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) return null
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.auth.getUser()
  if (error || !data.user?.id || !data.user?.email) return null
  return { id: data.user.id, email: data.user.email }
}

// Server-side admin check. ADMIN_EMAILS is a comma-separated allowlist set as
// a function secret. Fails closed: with the variable unset, nobody is admin.
function isAdmin(email: string): boolean {
  const allowlist = (Deno.env.get('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((e: string) => e.toLowerCase().trim())
    .filter(Boolean)
  return allowlist.includes(email.toLowerCase())
}

// Best-effort in-memory rate limiter (per key).
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 10
const requestWindows = new Map<string, number[]>()

function isRateLimited(key: string): boolean {
  const now = Date.now()
  const active = (requestWindows.get(key) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (active.length >= RATE_LIMIT_MAX) {
    requestWindows.set(key, active)
    return true
  }
  requestWindows.set(key, [...active, now])
  return false
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // SECURITY (critical): this function sends email from the app's identity.
    // Require an authenticated admin (ADMIN_EMAILS allowlist). Previously any
    // anonymous caller could send arbitrary HTML to arbitrary addresses.
    const caller = await authenticate(req)
    if (!caller) {
      return jsonResponse({ success: false, error: 'Authentication required' }, 401)
    }
    if (!isAdmin(caller.email)) {
      return jsonResponse({ success: false, error: 'Admin privileges required' }, 403)
    }
    if (isRateLimited(`send-marketing-email:${caller.id}`)) {
      return jsonResponse({ success: false, error: 'Too many requests. Please try again later.' }, 429)
    }

    const { campaignId } = await req.json()

    console.log('Marketing email function called by admin')

    // Check if API key exists
    const apiKey = Deno.env.get('RESEND_API_KEY')

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

    if (campaignId) {
      // For now, just return success for campaign (implement later).
      // Already admin-gated above.
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

    // Admin self-test: send a fixed branded template to the admin's own
    // address only. Arbitrary recipients/subjects/HTML are not accepted —
    // that was an unauthenticated email cannon.
    {
      const emailSubject = 'HyperApp — test email'
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>HyperApp test email</h1>
          <p>This is a test message from the HyperApp marketing email function.</p>
          <p>If you received this, Resend delivery is working correctly.</p>
          <p>Best regards,<br>The HyperApp Team</p>
        </div>
      `

      try {
        // Send email via Resend API (recipient is always the admin themself)
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'onboarding@resend.dev',
            to: [caller.email],
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
              message: 'Test email sent',
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

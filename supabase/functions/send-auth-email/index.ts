import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Security helpers ---

// HTML-escape user-controlled values before interpolating them into email HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Authenticate the caller via their Supabase JWT (same pattern as hyper-ai).
// Returns the authenticated user's id + email, or null when the request
// carries no valid user JWT (e.g. only the public anon key). Note: the anon
// key IS a syntactically valid JWT, so getUser() succeeding is the real check.
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

// Best-effort in-memory rate limiter (per key). Resets on cold start and is
// not shared across instances — defense in depth, not the only control.
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
const RATE_LIMIT_MAX = 5
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

// Email templates
const getEnglishTemplate = (magicLink: string, userName?: string) => `
<!DOCTYPE html>
<html lang="en" dir="ltr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to HyperApp</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f9fafb;
      color: #000000;
      line-height: 1.6;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      color: #666666;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      transition: all 0.2s ease;
    }
    .cta-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }
    .warning {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .warning-text {
      color: #92400e;
      font-size: 14px;
      margin: 0;
      font-weight: 500;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      color: #666666;
      font-size: 14px;
      margin: 0;
    }
    .brand {
      color: #3b82f6;
      font-weight: 700;
      font-size: 18px;
    }
    @media (max-width: 600px) {
      .container {
        margin: 10px;
        border-radius: 12px;
      }
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 24px;
      }
      .content {
        padding: 30px 20px;
      }
      .cta-button {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 Welcome to HyperApp</h1>
      <p>Your Community Safety Platform</p>
    </div>

    <div class="content">
      <div class="greeting">
        ${userName ? `Hi ${userName}!` : 'Hello!'}
      </div>

      <div class="message">
        Thank you for joining HyperApp! To complete your registration and start exploring your community's safety vibes, please verify your email address by clicking the button below.
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" class="cta-button">
          🚀 Verify Email & Get Started
        </a>
      </div>

      <div class="warning">
        <p class="warning-text">
          ⚠️ This verification link will expire in 24 hours for security reasons.
        </p>
      </div>

      <div class="message">
        If you didn't create an account with HyperApp, you can safely ignore this email.
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        <span class="brand">HyperApp</span> - Community Safety & Vibe Mapping
      </p>
      <p class="footer-text" style="margin-top: 8px;">
        Stay safe, stay connected.
      </p>
    </div>
  </div>
</body>
</html>
`

const getArabicTemplate = (magicLink: string, userName?: string) => `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>مرحباً بك في HyperApp</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: #f9fafb;
      color: #000000;
      line-height: 1.6;
      direction: rtl;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      padding: 40px 30px;
      text-align: center;
      color: #ffffff;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .header p {
      margin: 8px 0 0 0;
      font-size: 16px;
      opacity: 0.9;
    }
    .content {
      padding: 40px 30px;
    }
    .greeting {
      font-size: 20px;
      font-weight: 600;
      color: #000000;
      margin-bottom: 16px;
    }
    .message {
      font-size: 16px;
      color: #666666;
      margin-bottom: 32px;
      line-height: 1.7;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 16px 32px;
      border-radius: 12px;
      font-weight: 600;
      font-size: 16px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      transition: all 0.2s ease;
    }
    .cta-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(59, 130, 246, 0.4);
    }
    .warning {
      background-color: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 12px;
      padding: 20px;
      margin: 24px 0;
    }
    .warning-text {
      color: #92400e;
      font-size: 14px;
      margin: 0;
      font-weight: 500;
    }
    .footer {
      background-color: #f9fafb;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #e5e7eb;
    }
    .footer-text {
      color: #666666;
      font-size: 14px;
      margin: 0;
    }
    .brand {
      color: #3b82f6;
      font-weight: 700;
      font-size: 18px;
    }
    @media (max-width: 600px) {
      .container {
        margin: 10px;
        border-radius: 12px;
      }
      .header {
        padding: 30px 20px;
      }
      .header h1 {
        font-size: 24px;
      }
      .content {
        padding: 30px 20px;
      }
      .cta-button {
        display: block;
        width: 100%;
        box-sizing: border-box;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 مرحباً بك في HyperApp</h1>
      <p>منصة أمان المجتمع الخاصة بك</p>
    </div>

    <div class="content">
      <div class="greeting">
        ${userName ? `مرحباً ${userName}!` : 'مرحباً!'}
      </div>

      <div class="message">
        شكراً لانضمامك إلى HyperApp! لإكمال تسجيلك وبدء استكشاف أجواء أمان مجتمعك، يرجى التحقق من عنوان بريدك الإلكتروني بالنقر على الزر أدناه.
      </div>

      <div style="text-align: center; margin: 32px 0;">
        <a href="${magicLink}" class="cta-button">
          🚀 تحقق من البريد الإلكتروني وابدأ
        </a>
      </div>

      <div class="warning">
        <p class="warning-text">
          ⚠️ ستنتهي صلاحية رابط التحقق خلال 24 ساعة لأسباب أمنية.
        </p>
      </div>

      <div class="message">
        إذا لم تقم بإنشاء حساب مع HyperApp، يمكنك تجاهل هذا البريد الإلكتروني بأمان.
      </div>
    </div>

    <div class="footer">
      <p class="footer-text">
        <span class="brand">HyperApp</span> - أمان المجتمع وتتبع الأجواء
      </p>
      <p class="footer-text" style="margin-top: 8px;">
        كن آمناً، كن متصلاً.
      </p>
    </div>
  </div>
</body>
</html>
`

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, userId, userName, language = 'en' } = await req.json()

    // Create Supabase admin client for database operations (service_role
    // bypasses RLS; auth_tokens is locked down to service_role only).
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // SECURITY: never trust client-supplied identity on its own.
    // - If the caller presents a valid user JWT (e.g. "resend verification"
    //   from settings), identity comes from auth.getUser() and body values
    //   are ignored.
    // - Otherwise this is the signup path: signUp() returns no session, so no
    //   JWT exists yet. Bind server-side instead: the userId must belong to
    //   the auth user whose email matches the requested address. An attacker
    //   can then at most trigger a (rate-limited) email to an address, and can
    //   never mint a token for someone else's account — and the token is
    //   emailed, never returned in the response.
    const jwtUser = await authenticate(req)

    let effectiveUserId: string
    let effectiveEmail: string

    if (jwtUser) {
      effectiveUserId = jwtUser.id
      effectiveEmail = jwtUser.email
    } else {
      const cleanEmail = typeof email === 'string' ? email.toLowerCase().trim() : ''
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || typeof userId !== 'string' || !userId) {
        return jsonResponse({ success: false, error: 'Valid email and userId are required' }, 400)
      }
      const { data: authUserData, error: authUserError } = await supabase.auth.admin.getUserById(userId)
      const authEmail = authUserData?.user?.email?.toLowerCase() ?? ''
      if (authUserError || !authUserData?.user || authEmail !== cleanEmail) {
        return jsonResponse({ success: false, error: 'Email does not match the account' }, 403)
      }
      effectiveUserId = authUserData.user.id
      effectiveEmail = authEmail
    }

    if (isRateLimited(`send-auth-email:${effectiveEmail}`)) {
      return jsonResponse({ success: false, error: 'Too many requests. Please try again later.' }, 429)
    }

    // Sanitize user-controlled template inputs.
    const safeUserName = typeof userName === 'string' ? escapeHtml(userName.slice(0, 100)) : undefined
    const safeLanguage = language === 'ar' ? 'ar' : 'en'

    console.log('Sending auth email. Language:', safeLanguage)

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

    // Generate magic link token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // Create or update auth token
    const { error: tokenError } = await supabase
      .from('auth_tokens')
      .upsert({
        user_id: effectiveUserId,
        email: effectiveEmail,
        token: token,
        token_type: 'magic_link',
        expires_at: expiresAt
      }, {
        onConflict: 'user_id,token_type'
      })

    if (tokenError) {
      console.error('Token creation error:', tokenError)
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Failed to create verification token'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create magic link URL
    const baseUrl = Deno.env.get('SUPABASE_URL')?.replace('/v1', '') || 'http://localhost:54321'
    const magicLink = `${baseUrl}/functions/v1/magic-link-auth?token=${token}`

    // Get appropriate template based on language
    const emailSubject = safeLanguage === 'ar'
      ? 'مرحباً بك في HyperApp - تحقق من بريدك الإلكتروني'
      : 'Welcome to HyperApp - Verify Your Email'

    const emailHtml = safeLanguage === 'ar'
      ? getArabicTemplate(magicLink, safeUserName)
      : getEnglishTemplate(magicLink, safeUserName)

    console.log('Sending email with subject:', emailSubject)

    // Send email via Resend API
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'HyperApp <onboarding@resend.dev>',
        to: [effectiveEmail],
        subject: emailSubject,
        html: emailHtml,
      }),
    })

    console.log('Resend response status:', response.status)

    if (response.ok) {
      const data = await response.json()
      console.log('Auth email sent successfully:', data)

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Verification email sent',
          resendId: data.id
          // SECURITY: the magic-link token is NEVER returned here. It is only
          // delivered to the verified email address above.
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

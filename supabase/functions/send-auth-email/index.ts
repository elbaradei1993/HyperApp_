import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Sending auth email to:', email, 'Language:', language)

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

    // Create Supabase client for database operations
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Generate magic link token
    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours

    // Create or update auth token
    const { error: tokenError } = await supabase
      .from('auth_tokens')
      .upsert({
        user_id: userId,
        email: email,
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
    const emailSubject = language === 'ar'
      ? 'مرحباً بك في HyperApp - تحقق من بريدك الإلكتروني'
      : 'Welcome to HyperApp - Verify Your Email'

    const emailHtml = language === 'ar'
      ? getArabicTemplate(magicLink, userName)
      : getEnglishTemplate(magicLink, userName)

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
        to: [email],
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
          message: `Verification email sent to ${email}`,
          resendId: data.id,
          token: token
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

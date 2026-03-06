import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// FCM v1 API OAuth2 authentication
async function getAccessToken(serviceAccountKey: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const serviceAccount = JSON.parse(serviceAccountKey);

  // Create JWT payload
  const payload = {
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now,
  };

  // Create JWT header
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };

  // Base64url encode header and payload
  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Create signature
  const message = `${encodedHeader}.${encodedPayload}`;
  const privateKey = serviceAccount.private_key.replace(/\\n/g, '\n');

  // Import private key
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKey),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign']
  );

  // Sign the message
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, new TextEncoder().encode(message));
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

  // Create JWT
  const jwt = `${encodedHeader}.${encodedPayload}.${encodedSignature}`;

  // Exchange JWT for access token
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  const data = await response.json();
  return data.access_token;
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');

  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

serve(async (req) => {
  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Firebase service account key
    const serviceAccountKey = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_KEY')!;
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID')!;

    if (!serviceAccountKey || !projectId) {
      throw new Error('Firebase service account credentials not configured');
    }

    // Parse request body
    const { userId, alertType, message, shareLocation, location } = await req.json();

    if (!userId || !alertType) {
      return new Response(
        JSON.stringify({ error: 'Missing userId or alertType' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Processing guardian alert for user:', userId, 'type:', alertType);

    // Get user's guardians with their contact info
    const { data: guardians, error: guardiansError } = await supabase
      .from('user_guardians')
      .select(`
        guardian_id,
        user_profile:users!guardian_id (
          user_id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('user_id', userId)
      .eq('sos_alerts_enabled', true);

    if (guardiansError) {
      console.error('Error fetching guardians:', guardiansError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch guardians' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!guardians || guardians.length === 0) {
      console.log('📤 No guardians found for user');
      return new Response(
        JSON.stringify({ success: true, message: 'No guardians found', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Sending alerts to ${guardians.length} guardians`);

    // Get user's profile for alert context
    const { data: userProfile } = await supabase
      .from('users')
      .select('first_name, last_name')
      .eq('user_id', userId)
      .single();

    const userName = userProfile ?
      `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim() :
      'Someone in your guardian network';

    // Prepare alert details
    const alertTitles = {
      medical: '🚨 Medical Emergency Alert',
      safety: '⚠️ Safety Concern Alert',
      location: '📍 Location Check-in Alert',
      custom: '🚨 Emergency Alert'
    };

    const alertMessages = {
      medical: `${userName} has indicated they need immediate medical attention.`,
      safety: `${userName} has reported feeling unsafe or threatened.`,
      location: `${userName} wants to share their current location with you.`,
      custom: `${userName} has sent you an emergency alert.`
    };

    const alertTitle = alertTitles[alertType as keyof typeof alertTitles] || alertTitles.custom;
    const alertMessage = alertMessages[alertType as keyof typeof alertMessages] || alertMessages.custom;

    // Get OAuth2 access token for FCM
    const accessToken = await getAccessToken(serviceAccountKey);

    // Send push notifications and emails
    let pushSent = 0;
    let emailSent = 0;
    let pushFailed = 0;
    let emailFailed = 0;

    for (const guardian of guardians) {
      const guardianEmail = guardian.user_profile?.email;
      const guardianName = guardian.user_profile ?
        `${guardian.user_profile.first_name || ''} ${guardian.user_profile.last_name || ''}`.trim() :
        'Guardian';

      if (!guardianEmail) {
        console.warn('Guardian has no email:', guardian.guardian_id);
        continue;
      }

      // Send push notification
      try {
        // Get guardian's FCM token
        const { data: pushSubscription } = await supabase
          .from('push_subscriptions')
          .select('fcm_token')
          .eq('user_id', guardian.guardian_id)
          .single();

        if (pushSubscription?.fcm_token) {
          const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: {
                token: pushSubscription.fcm_token,
                notification: {
                  title: alertTitle,
                  body: alertMessage,
                },
                data: {
                  type: 'guardian_alert',
                  alertType: alertType,
                  userId: userId,
                  userName: userName,
                  message: message || '',
                  shareLocation: shareLocation ? 'true' : 'false',
                  latitude: location?.latitude?.toString() || '',
                  longitude: location?.longitude?.toString() || '',
                  timestamp: Date.now().toString()
                },
                android: {
                  priority: 'high',
                  ttl: '3600s'
                },
                apns: {
                  headers: {
                    'apns-priority': '10'
                  },
                  payload: {
                    aps: {
                      alert: {
                        title: alertTitle,
                        body: alertMessage
                      },
                      sound: 'default',
                      badge: 1
                    }
                  }
                },
                webpush: {
                  headers: {
                    TTL: '3600'
                  },
                  notification: {
                    icon: '/icon-192x192.png',
                    badge: '/badge-72x72.png'
                  }
                }
              }
            })
          });

          if (fcmResponse.ok) {
            console.log('✅ Push notification sent to guardian:', guardianEmail);
            pushSent++;
          } else {
            console.error('❌ FCM send failed:', fcmResponse.status);
            pushFailed++;
          }
        }
      } catch (pushError) {
        console.error('Error sending push notification:', pushError);
        pushFailed++;
      }

      // Send email notification
      try {
        const emailHtml = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; direction: ltr;">
            <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800;">${alertTitle}</h1>
            </div>

            <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="font-size: 16px; line-height: 1.6; color: #374151; margin-bottom: 20px;">
                ${alertMessage}
              </p>

              ${message ? `
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                  <h3 style="margin: 0 0 10px 0; color: #ef4444; font-size: 16px;">Additional Message:</h3>
                  <p style="margin: 0; color: #374151; font-style: italic;">"${message}"</p>
                </div>
              ` : ''}

              ${shareLocation && location ? `
                <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e;">
                  <h3 style="margin: 0 0 10px 0; color: #16a34a; font-size: 16px;">📍 Location Shared</h3>
                  <p style="margin: 0; color: #374151;">
                    Latitude: ${location.latitude}<br>
                    Longitude: ${location.longitude}
                  </p>
                  <p style="margin: 10px 0 0 0; font-size: 14px; color: #6b7280;">
                    You can view this location in the HyperApp or on a map service.
                  </p>
                </div>
              ` : ''}

              <div style="text-align: center; margin: 30px 0;">
                <a href="${Deno.env.get('SUPABASE_URL')?.replace('/v1', '')}/guardian/alerts"
                   style="background: #ef4444; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  🚨 View in HyperApp
                </a>
              </div>

              <div style="background: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                <h3 style="margin: 0 0 10px 0; color: #92400e; font-size: 16px;">⚠️ Important</h3>
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  This is an automated emergency alert from the HyperApp guardian system.
                  Please respond immediately if you can assist.
                </p>
              </div>

              <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 20px 0 0 0;">
                Sent at ${new Date().toLocaleString()}
              </p>
            </div>
          </div>
        `;

        // Send email via Resend API
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'alerts@hyperapp.com',
            to: [guardianEmail],
            subject: alertTitle,
            html: emailHtml,
          }),
        });

        if (emailResponse.ok) {
          console.log('✅ Email sent to guardian:', guardianEmail);
          emailSent++;
        } else {
          const errorText = await emailResponse.text();
          console.error('❌ Email send failed:', emailResponse.status, errorText);
          emailFailed++;
        }
      } catch (emailError) {
        console.error('Error sending email:', emailError);
        emailFailed++;
      }
    }

    console.log(`📤 Guardian alert summary: ${pushSent} push notifications sent, ${emailSent} emails sent`);

    return new Response(
      JSON.stringify({
        success: true,
        pushSent,
        emailSent,
        pushFailed,
        emailFailed,
        totalGuardians: guardians.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-guardian-alerts function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

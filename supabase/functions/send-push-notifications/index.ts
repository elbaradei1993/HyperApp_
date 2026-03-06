// Supabase Edge Function for sending Firebase Cloud Messaging v1 push notifications
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface PushMessage {
  title: string;
  body: string;
  data?: {
    type: 'emergency' | 'safety';
    reportId: string;
    latitude: number;
    longitude: number;
    url?: string;
  };
}

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
    const { report, location, radius = 5 } = await req.json();

    if (!report || !location) {
      return new Response(
        JSON.stringify({ error: 'Missing report or location data' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('📤 Processing push notification for report:', report.id);

    // Find users within radius who have push notifications enabled
    const { data: nearbyUsers, error: queryError } = await supabase
      .rpc('find_nearby_users', {
        center_lat: location[0],
        center_lng: location[1],
        radius_km: radius
      });

    if (queryError) {
      console.error('Error finding nearby users:', queryError);
      return new Response(
        JSON.stringify({ error: 'Failed to find nearby users' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Filter users who want notifications for this type of report
    const eligibleUsers = nearbyUsers.filter((user: any) => {
      if (report.emergency) {
        return user.emergency_alerts;
      } else {
        return user.safety_reports;
      }
    });

    if (eligibleUsers.length === 0) {
      console.log('📤 No eligible users found for push notifications');
      return new Response(
        JSON.stringify({ success: true, message: 'No eligible users found', sent: 0 }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`📤 Sending push notifications to ${eligibleUsers.length} users`);

    // Prepare push message
    const pushMessage: PushMessage = {
      title: report.emergency ? '🚨 Emergency Reported Nearby' : '⚠️ Safety Alert',
      body: report.emergency
        ? `Emergency alert reported in your area`
        : `${report.vibe_type || 'Safety'} report in your area`,
      data: {
        type: report.emergency ? 'emergency' : 'safety',
        reportId: report.id,
        latitude: location[0],
        longitude: location[1],
        url: `/map?lat=${location[0]}&lng=${location[1]}`
      }
    };

    // Get OAuth2 access token
    const accessToken = await getAccessToken(serviceAccountKey);

    // Send push notifications individually (FCM v1 API doesn't support batch registration_ids)
    let totalSent = 0;
    let totalFailed = 0;

    for (const user of eligibleUsers) {
      try {
        // FCM v1 API endpoint for individual messages
        const fcmResponse = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token: user.fcm_token,
              notification: {
                title: pushMessage.title,
                body: pushMessage.body,
              },
              data: {
                type: pushMessage.data?.type,
                reportId: pushMessage.data?.reportId,
                latitude: String(pushMessage.data?.latitude || ''),
                longitude: String(pushMessage.data?.longitude || ''),
                url: pushMessage.data?.url || ''
              },
              android: {
                priority: report.emergency ? 'high' : 'normal',
                ttl: report.emergency ? '3600s' : '86400s'
              },
              apns: {
                headers: {
                  'apns-priority': report.emergency ? '10' : '5'
                },
                payload: {
                  aps: {
                    alert: {
                      title: pushMessage.title,
                      body: pushMessage.body
                    },
                    sound: 'default',
                    badge: 1
                  }
                }
              },
              webpush: {
                headers: {
                  TTL: report.emergency ? '3600' : '86400'
                },
                notification: {
                  icon: '/icon-192x192.png',
                  badge: '/badge-72x72.png'
                },
                fcm_options: {
                  link: pushMessage.data?.url
                }
              }
            }
          })
        });

        if (fcmResponse.ok) {
          const fcmResult = await fcmResponse.json();
          console.log('✅ Push sent successfully:', fcmResult.name);
          totalSent++;
        } else {
          const errorText = await fcmResponse.text();
          console.error('❌ FCM send failed:', fcmResponse.status, errorText);
          totalFailed++;
        }

      } catch (error) {
        console.error('Error sending FCM message:', error);
        totalFailed++;
      }
    }

    console.log(`📤 Push notification summary: ${totalSent} sent, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: totalSent,
        failed: totalFailed,
        totalEligible: eligibleUsers.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-push-notifications function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});

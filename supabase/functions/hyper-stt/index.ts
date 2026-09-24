/* global Deno, Request, Response, AbortController, fetch, TextEncoder, btoa, DOMException */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = {
  ...corsHeaders,
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json',
};
const MODEL = '@cf/openai/whisper-large-v3-turbo';
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_LANGUAGE_LENGTH = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 30;
const PROVIDER_TIMEOUT_MS = 20_000;
const requestWindows = new Map<string, number[]>();

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function authenticate(req: Request): Promise<string | null> {
  const authorization = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user?.id || null;
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const active = (requestWindows.get(userId) || [])
    .filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_REQUESTS) {
    requestWindows.set(userId, active);
    return true;
  }
  requestWindows.set(userId, [...active, now]);
  return false;
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function normalizeLanguage(value: string): string {
  const normalized = value.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, MAX_LANGUAGE_LENGTH);
  if (!normalized) return 'en';
  if (normalized.includes('-')) return normalized.split('-')[0];
  return normalized;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  try {
    const userId = await authenticate(req);
    if (!userId) return json({ error: 'Please sign in before using voice input.' }, 401);
    if (isRateLimited(userId)) return json({ error: 'Too many voice requests. Please wait a moment and try again.' }, 429);

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    if (!accountId || !apiToken) return json({ error: 'Hosted voice input is not configured yet.' }, 503);

    const form = await req.formData().catch(() => null);
    const audio = form?.get('audio');
    const requestedLanguage = typeof form?.get('language') === 'string'
      ? String(form?.get('language'))
      : 'en';

    if (!(audio instanceof File) || !audio.type.startsWith('audio/')) {
      return json({ error: 'Please send a valid audio recording.' }, 400);
    }
    if (audio.size <= 0 || audio.size > MAX_AUDIO_BYTES) {
      return json({ error: 'The voice recording is too large. Please speak for a shorter time.' }, 413);
    }

    const audioBytes = new Uint8Array(await audio.arrayBuffer());
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            audio: toBase64(audioBytes),
            task: 'transcribe',
            language: normalizeLanguage(requestedLanguage),
            vad_filter: true,
            condition_on_previous_text: false,
          }),
        },
      );

      if (!response.ok) {
        console.error('Cloudflare Whisper request failed', { status: response.status });
        if (response.status === 429) return json({ error: 'The hosted voice allowance is temporarily exhausted.' }, 503);
        return json({ error: 'The hosted voice input service is temporarily unavailable.' }, 502);
      }

      const payload = await response.json().catch(() => null) as {
        result?: { text?: unknown };
        text?: unknown;
      } | null;
      const transcript = typeof payload?.result?.text === 'string'
        ? payload.result.text.trim()
        : typeof payload?.text === 'string'
          ? payload.text.trim()
          : '';

      if (!transcript) return json({ error: 'No clear speech was detected.' }, 422);
      return json({ transcript: transcript.replace(/\s+/g, ' ').slice(0, 1500) });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return json({ error: 'Voice transcription took too long. Please try again.' }, 504);
    }
    console.error('Hyper STT function failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'Voice transcription could not complete.' }, 502);
  }
});

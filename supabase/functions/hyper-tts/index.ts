/* global Deno, Request, Response, AbortController, fetch, TextEncoder, crypto, DOMException */
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
const audioHeaders = {
  ...corsHeaders,
  'Cache-Control': 'private, max-age=1800',
  'Content-Type': 'audio/mpeg',
  'X-Content-Type-Options': 'nosniff',
};
const MODEL = '@cf/myshell-ai/melotts';
const MAX_TEXT_LENGTH = 1200;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 24;
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_CACHE_ENTRIES = 80;
const SUPPORTED_LANGUAGES = new Set(['en', 'es', 'fr', 'zh', 'ja', 'ko']);
const requestWindows = new Map<string, number[]>();
const audioCache = new Map<string, { audio: Uint8Array; expiresAt: number }>();

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function authenticate(req: Request): Promise<string | null> {
  const authorization = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) {
    return null;
  }

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
  active.push(now);
  requestWindows.set(userId, active);
  return false;
}

async function createCacheKey(userId: string, text: string, language: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${userId}\u0000${language}\u0000${text}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function getCachedAudio(key: string): Uint8Array | null {
  const cached = audioCache.get(key);
  if (!cached) {
    return null;
  }
  if (cached.expiresAt <= Date.now()) {
    audioCache.delete(key);
    return null;
  }
  audioCache.delete(key);
  audioCache.set(key, cached);
  return cached.audio;
}

function cacheAudio(key: string, audio: Uint8Array): void {
  audioCache.set(key, { audio, expiresAt: Date.now() + CACHE_TTL_MS });
  while (audioCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = audioCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    audioCache.delete(oldestKey);
  }
}

function audioResponse(audio: Uint8Array, cacheStatus: 'HIT' | 'MISS'): Response {
  return new Response(audio.slice().buffer, {
    status: 200,
    headers: { ...audioHeaders, 'X-Hyper-TTS-Cache': cacheStatus },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405);
  }

  try {
    const userId = await authenticate(req);
    if (!userId) {
      return json({ error: 'Please sign in before using the hosted voice.' }, 401);
    }
    if (isRateLimited(userId)) {
      return json({ error: 'Too many voice requests. Please wait a moment and try again.' }, 429);
    }

    const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
    const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
    if (!accountId || !apiToken) {
      return json({ error: 'Hosted voice is not configured yet.' }, 503);
    }

    const body = await req.json().catch(() => null) as Record<string, unknown> | null;
    const text = typeof body?.text === 'string' ? body.text.trim() : '';
    const requestedLanguage = typeof body?.language === 'string' ? body.language.toLowerCase() : 'en';
    const language = SUPPORTED_LANGUAGES.has(requestedLanguage) ? requestedLanguage : 'en';
    if (!text || text.length > MAX_TEXT_LENGTH) {
      return json({ error: `Voice text must contain between 1 and ${MAX_TEXT_LENGTH} characters.` }, 400);
    }

    const cacheKey = await createCacheKey(userId, text, language);
    const cached = getCachedAudio(cacheKey);
    if (cached) {
      return audioResponse(cached, 'HIT');
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    let response: Response;
    try {
      response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Accept: 'audio/mpeg',
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: text, lang: language }),
        },
      );
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      console.error('Cloudflare MeloTTS request failed', { status: response.status });
      if (response.status === 429) {
        return json({ error: 'The free hosted voice allowance is temporarily exhausted.' }, 503);
      }
      return json({ error: 'The hosted voice service is temporarily unavailable.' }, 502);
    }

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('audio/')) {
      console.error('Cloudflare MeloTTS returned an unexpected response type');
      return json({ error: 'The hosted voice returned an invalid response.' }, 502);
    }

    const audio = new Uint8Array(await response.arrayBuffer());
    if (audio.byteLength === 0) {
      return json({ error: 'The hosted voice returned empty audio.' }, 502);
    }
    cacheAudio(cacheKey, audio);
    return audioResponse(audio, 'MISS');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return json({ error: 'The hosted voice took too long to respond.' }, 504);
    }
    console.error('Hyper TTS function failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'The hosted voice could not complete this request.' }, 500);
  }
});

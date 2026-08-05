/* global Deno, Request, Response, AbortController, fetch, TextEncoder, crypto, DOMException */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

import {
  extractCloudflareAudio,
  type CloudflareAudioMimeType,
} from '../_shared/cloudflareAudio.ts';

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
  // supabase-js currently treats only application/octet-stream and PDFs as
  // binary responses. Returning audio/mpeg makes it decode the MP3 as text.
  'Content-Type': 'application/octet-stream',
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
const PROVIDER_ATTEMPTS = 3;
const audioCache = new Map<string, {
  audio: Uint8Array;
  mimeType: CloudflareAudioMimeType;
  expiresAt: number;
}>();

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

function getCachedAudio(key: string): { audio: Uint8Array; mimeType: CloudflareAudioMimeType } | null {
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
  return { audio: cached.audio, mimeType: cached.mimeType };
}

function cacheAudio(key: string, audio: Uint8Array, mimeType: CloudflareAudioMimeType): void {
  audioCache.set(key, { audio, mimeType, expiresAt: Date.now() + CACHE_TTL_MS });
  while (audioCache.size > MAX_CACHE_ENTRIES) {
    const oldestKey = audioCache.keys().next().value as string | undefined;
    if (!oldestKey) {
      break;
    }
    audioCache.delete(oldestKey);
  }
}

function audioResponse(
  audio: Uint8Array,
  mimeType: CloudflareAudioMimeType,
  cacheStatus: 'HIT' | 'MISS',
): Response {
  const extension = mimeType === 'audio/wav' ? 'wav' : 'mp3';
  return new Response(audio.slice().buffer, {
    status: 200,
    headers: {
      ...audioHeaders,
      'Content-Disposition': `inline; filename="hyper-ai.${extension}"`,
      'X-Hyper-Audio-Type': mimeType,
      'X-Hyper-TTS-Cache': cacheStatus,
    },
  });
}

async function requestHostedVoice(
  accountId: string,
  apiToken: string,
  text: string,
  language: string,
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 0; attempt < PROVIDER_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/ai/run/${MODEL}`,
        {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Accept: 'application/json, audio/*',
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ prompt: text, lang: language }),
        },
      );
      lastResponse = response;
      if (response.ok || (response.status !== 429 && response.status < 500)) {
        return response;
      }
    } finally {
      clearTimeout(timeoutId);
    }

    if (attempt < PROVIDER_ATTEMPTS - 1) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  if (!lastResponse) {
    throw new Error('The hosted voice provider did not return a response.');
  }
  return lastResponse;
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
      return audioResponse(cached.audio, cached.mimeType, 'HIT');
    }

    const response = await requestHostedVoice(accountId, apiToken, text, language);

    if (!response.ok) {
      console.error('Cloudflare MeloTTS request failed', { status: response.status });
      if (response.status === 429) {
        return json({ error: 'The free hosted voice allowance is temporarily exhausted.' }, 503);
      }
      return json({ error: 'The hosted voice service is temporarily unavailable.' }, 502);
    }

    const hostedAudio = await extractCloudflareAudio(response);
    if (!hostedAudio) {
      console.error('Cloudflare MeloTTS returned invalid audio');
      return json({ error: 'The hosted voice returned an invalid response.' }, 502);
    }

    cacheAudio(cacheKey, hostedAudio.bytes, hostedAudio.mimeType);
    return audioResponse(hostedAudio.bytes, hostedAudio.mimeType, 'MISS');
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return json({ error: 'The hosted voice took too long to respond.' }, 504);
    }
    console.error('Hyper TTS function failed', error instanceof Error ? error.message : 'unknown error');
    return json({ error: 'The hosted voice could not complete this request.' }, 500);
  }
});

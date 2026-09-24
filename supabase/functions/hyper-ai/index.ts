/* global Deno, Request, Response, AbortController, DOMException */
import { createClient, type User } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

import { parseAssistantResponse } from '../_shared/assistantResponse.ts';
import { evaluateSafetyRisk, maxSafetyLevel } from '../_shared/safetyGuard.ts';
import { buildServerAppContext, loadServerConversation, type DeviceLocationHint } from './context.ts';
import { AiProviderError, generateWithConfiguredProvider } from './aiClient.ts';
import {
  buildTurnPrompt,
  HYPER_ASSISTANT_PROMPT,
  HYPER_ASSISTANT_PROMPT_VERSION,
} from './prompt.ts';

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
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_REQUESTS = 12;
const MAX_MESSAGE_LENGTH = 1500;
const requestWindows = new Map<string, number[]>();

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

async function authenticate(req: Request): Promise<{ userId: string; user: User; client: ReturnType<typeof createClient> } | null> {
  const authorization = req.headers.get('Authorization');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!authorization?.startsWith('Bearer ') || !supabaseUrl || !supabaseAnonKey) return null;
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await client.auth.getUser();
  const user = data.user;
  return error || !user ? null : { userId: user.id, user, client };
}

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const active = (requestWindows.get(userId) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_REQUESTS) {
    requestWindows.set(userId, active);
    return true;
  }
  requestWindows.set(userId, [...active, now]);
  return false;
}

function classifyInteractionMode(message: string, safetyLevel: 'LOW' | 'ELEVATED' | 'HIGH' | 'CRITICAL'): 'greeting' | 'acknowledgement' | 'small_talk' | 'local_query' | 'safety_or_task' | 'normal' {
  const text = message.replace(/\s+/g, ' ').trim();
  const lower = text.toLowerCase();

  if (safetyLevel !== 'LOW') return 'safety_or_task';

  if (/^(hi|hello|hey|hiya|heya|good morning|good afternoon|good evening|hey there)[!. ,]*$/i.test(text)) {
    return 'greeting';
  }

  if (/^(ok|okay|thanks|thank you|thx|got it|gotcha|cool|great|sure|yes|yep|yeah|no|nope|alright|all right)[!. ,]*$/i.test(text)) {
    return 'acknowledgement';
  }

  if (/^(how are you|how's it going|what's up|you there|are you there)[?!. ,]*$/i.test(text)
    || (/^.{1,120}\?$/.test(text) && text.split(/\s+/).length <= 10 && !/\b(where|near|around|tonight|event|vibe|safe|danger|report|map)\b/i.test(lower))) {
    return 'small_talk';
  }

  if (/\b(near me|nearby|around here|around me|in my area|local|what's around|what is around|vibe|vibes|tonight|today|events?|happening nearby|what's happening)\b/i.test(lower)) {
    return 'local_query';
  }

  if (text.split(/\s+/).length <= 18 && !/[?]/.test(text)) return 'small_talk';

  return 'normal';
}

function responseTokenBudget(mode: ReturnType<typeof classifyInteractionMode>): number {
  switch (mode) {
    case 'greeting':
    case 'acknowledgement':
      return 140;
    case 'small_talk':
      return 220;
    case 'local_query':
      return 360;
    case 'safety_or_task':
      return 420;
    default:
      return 500;
  }
}

function emergencyFallback(
  level: 'HIGH' | 'CRITICAL',
  availableActions: Array<{ type: string; label: string; requiresConfirmation: boolean }>,
): Record<string, unknown> {
  const emergencyAction = availableActions.find((action) => action.type === 'CALL_EMERGENCY_SERVICES');
  return {
    message: level === 'CRITICAL'
      ? 'Move to immediate safety if you can and call local emergency services now. Do not confront the threat.'
      : 'Move toward a populated, staffed, or secure place and contact local emergency services if the threat is immediate.',
    safetyLevel: level,
    suggestedActions: emergencyAction ? [emergencyAction] : [],
    requiresImmediateAttention: true,
    followUpNeeded: false,
    memoryUpdates: [],
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed.' }, 405);

  const auth = await authenticate(req);
  if (!auth) return json({ error: 'Please sign in before using Hyper AI.' }, 401);
  if (isRateLimited(auth.userId)) return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const latestUserMessage = typeof body?.latestUserMessage === 'string'
    ? body.latestUserMessage.replace(/\s+/g, ' ').trim().slice(0, MAX_MESSAGE_LENGTH)
    : '';
  const conversationId = typeof body?.conversationId === 'string'
    ? body.conversationId.trim().slice(0, 80)
    : '';
  const rawLocation = body?.locationHint && typeof body.locationHint === 'object'
    ? body.locationHint as Record<string, unknown>
    : undefined;
  const locationHint: DeviceLocationHint | undefined = rawLocation
    ? {
      latitude: Number(rawLocation.latitude),
      longitude: Number(rawLocation.longitude),
      capturedAt: typeof rawLocation.capturedAt === 'string' ? rawLocation.capturedAt : undefined,
    }
    : undefined;

  if (!latestUserMessage || !conversationId) return json({ error: 'Please send a valid message.' }, 400);

  const conversation = await loadServerConversation(
    auth.client,
    auth.userId,
    conversationId,
  );
  if (!conversation) return json({ error: 'This Hyper AI conversation is no longer available.' }, 404);

  const appContext = await buildServerAppContext(auth.client, auth.user, locationHint);
  const guard = evaluateSafetyRisk(latestUserMessage);
  const safetyFloor = guard.deescalated && guard.minimumLevel === 'LOW'
    ? 'LOW'
    : maxSafetyLevel(conversation.currentSafetyState, guard.minimumLevel);
  const interactionMode = classifyInteractionMode(latestUserMessage, safetyFloor);

  const turnPrompt = buildTurnPrompt({
    appContext,
    durablePreferences: conversation.durablePreferences,
    activeFacts: conversation.activeFacts,
    unresolvedTopics: conversation.unresolvedTopics,
    rollingSummary: conversation.rollingSummary,
    recentMessages: conversation.recentMessages,
    repetitionState: conversation.repetitionState,
    latestUserMessage,
    deterministicSafety: { ...guard, minimumLevel: safetyFloor },
    interactionMode,
  });

  const accountId = Deno.env.get('CLOUDFLARE_ACCOUNT_ID');
  const apiToken = Deno.env.get('CLOUDFLARE_API_TOKEN');
  if (!accountId || !apiToken) return json({ error: 'Hyper AI is not configured yet.' }, 503);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25_000);
  try {
    const result = await generateWithConfiguredProvider({
      accountId,
      apiToken,
      systemPrompt: HYPER_ASSISTANT_PROMPT,
      turnPrompt,
      signal: controller.signal,
      maxTokens: responseTokenBudget(interactionMode),
    });
    const parsed = parseAssistantResponse({
      providerPayload: result.payload,
      availableActions: appContext.availableAppActions as Array<{ type: string; label: string; requiresConfirmation: boolean }>,
      minimumSafetyLevel: safetyFloor,
      recentAssistantMessages: conversation.recentMessages
        .filter((message) => message.role === 'assistant')
        .slice(-4)
        .map((message) => message.content),
    });
    if (!parsed) return json({ error: 'The hosted AI returned an invalid response. Please try again.' }, 502);
    return json({ response: parsed, model: result.model, promptVersion: HYPER_ASSISTANT_PROMPT_VERSION });
  } catch (error) {
    if (safetyFloor === 'HIGH' || safetyFloor === 'CRITICAL') {
      return json({
        response: emergencyFallback(
          safetyFloor,
          appContext.availableAppActions as Array<{ type: string; label: string; requiresConfirmation: boolean }>,
        ),
        promptVersion: HYPER_ASSISTANT_PROMPT_VERSION,
        fallback: true,
      });
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return json({ error: 'The hosted AI took too long to respond. Please try again.' }, 504);
    }
    if (error instanceof AiProviderError && error.kind === 'rate_limit') {
      return json({ error: 'The free Hyper AI allowance is temporarily exhausted.' }, 503);
    }
    return json({ error: 'Hyper AI could not complete this request.' }, 502);
  } finally {
    clearTimeout(timeoutId);
  }
});

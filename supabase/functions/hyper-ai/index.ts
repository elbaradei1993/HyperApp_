/* global Deno, Request, Response, AbortController, DOMException */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';

import { parseAssistantResponse } from '../_shared/assistantResponse.ts';
import { evaluateSafetyRisk, maxSafetyLevel, type GuardSafetyLevel } from '../_shared/safetyGuard.ts';
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
const MAX_RECENT_MESSAGES = 20;
const requestWindows = new Map<string, number[]>();

const ACTION_TYPES = new Set([
  'SHARE_LOCATION', 'START_SAFETY_TIMER', 'CONTACT_GUARDIAN', 'OPEN_NEARBY_REPORTS',
  'OPEN_MAP', 'CALL_EMERGENCY_SERVICES', 'SHOW_SAFETY_PLAN', 'CHECK_IN',
  'REPORT_INCIDENT', 'NONE',
]);

function json(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

function cleanText(value: unknown, maximum: number): string {
  return typeof value === 'string'
    ? value.replace(/<[^>]*>/g, ' ').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maximum)
    : '';
}

function safeArray(value: unknown, maximum: number): unknown[] {
  return Array.isArray(value) ? value.slice(0, maximum) : [];
}

function sanitizeMessages(value: unknown): Array<{ role: 'user' | 'assistant'; content: string }> {
  return safeArray(value, MAX_RECENT_MESSAGES).flatMap((message) => {
    if (!message || typeof message !== 'object') return [];
    const item = message as Record<string, unknown>;
    const role = item.role === 'assistant' ? 'assistant' as const : item.role === 'user' ? 'user' as const : null;
    const content = cleanText(item.content, MAX_MESSAGE_LENGTH);
    return role && content ? [{ role, content }] : [];
  });
}

function sanitizeActions(value: unknown): Array<{
  type: string;
  label: string;
  requiresConfirmation: boolean;
}> {
  return safeArray(value, 12).flatMap((action) => {
    if (!action || typeof action !== 'object') return [];
    const item = action as Record<string, unknown>;
    const type = cleanText(item.type, 40);
    const label = cleanText(item.label, 80);
    if (!ACTION_TYPES.has(type) || type === 'NONE' || !label) return [];
    return [{ type, label, requiresConfirmation: item.requiresConfirmation !== false }];
  });
}

function sanitizeAppContext(value: unknown): Record<string, unknown> {
  const context = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const locationValue = context.approximateLocation && typeof context.approximateLocation === 'object'
    ? context.approximateLocation as Record<string, unknown>
    : {};
  const latitude = Number(locationValue.latitude);
  const longitude = Number(locationValue.longitude);
  const guardian = context.guardianNetwork && typeof context.guardianNetwork === 'object'
    ? context.guardianNetwork as Record<string, unknown>
    : {};
  const emergency = context.activeEmergencyAction && typeof context.activeEmergencyAction === 'object'
    ? context.activeEmergencyAction as Record<string, unknown>
    : {};
  const reports = safeArray(context.nearbyReports, 6).flatMap((report) => {
    if (!report || typeof report !== 'object') return [];
    const item = report as Record<string, unknown>;
    return [{
      type: cleanText(item.type, 40),
      description: cleanText(item.description, 220),
      distanceMeters: Math.max(0, Math.min(100_000, Number(item.distanceMeters) || 0)) || undefined,
      reportedAt: cleanText(item.reportedAt, 40),
      verificationStatus: cleanText(item.verificationStatus, 60) || 'unverified community report',
    }];
  });

  return {
    currentScreen: cleanText(context.currentScreen, 60),
    locale: cleanText(context.locale, 20),
    preferredLanguage: cleanText(context.preferredLanguage, 20),
    currentTime: cleanText(context.currentTime, 40),
    approximateLocation: {
      latitude: Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 ? latitude : undefined,
      longitude: Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? longitude : undefined,
      capturedAt: cleanText(locationValue.capturedAt, 40) || undefined,
      permissionStatus: ['granted', 'denied', 'prompt', 'unavailable'].includes(String(locationValue.permissionStatus))
        ? locationValue.permissionStatus
        : 'unavailable',
      stale: Boolean(locationValue.stale),
    },
    guardianNetwork: {
      configured: Boolean(guardian.configured),
      availableGuardianCount: Math.max(0, Math.min(100, Number(guardian.availableGuardianCount) || 0)),
      activeAlertStatus: cleanText(guardian.activeAlertStatus, 40) || undefined,
    },
    nearbyReports: reports,
    activeEmergencyAction: emergency.type ? {
      type: cleanText(emergency.type, 40),
      status: ['not_started', 'pending', 'completed', 'failed'].includes(String(emergency.status))
        ? emergency.status
        : 'not_started',
    } : undefined,
    availableAppActions: sanitizeActions(context.availableAppActions),
  };
}

function sanitizeState(value: unknown): Record<string, unknown> {
  const state = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const lastAction = state.lastAssistantAction && typeof state.lastAssistantAction === 'object'
    ? state.lastAssistantAction as Record<string, unknown>
    : {};
  const facts = safeArray(state.knownFacts, 30).flatMap((fact) => {
    if (!fact || typeof fact !== 'object') return [];
    const item = fact as Record<string, unknown>;
    if (item.status !== 'active') return [];
    return [{ key: cleanText(item.key, 80), value: cleanText(item.value, 180), createdAt: cleanText(item.createdAt, 40) }];
  });
  const preferences = safeArray(state.userPreferences, 12).flatMap((preference) => {
    if (!preference || typeof preference !== 'object') return [];
    const item = preference as Record<string, unknown>;
    if (!['user_explicit', 'profile', 'app_setting'].includes(String(item.source))) return [];
    return [{ key: cleanText(item.key, 80), value: cleanText(item.value, 180), source: item.source }];
  });
  const topics = safeArray(state.unresolvedTopics, 12).flatMap((topic) => {
    if (!topic || typeof topic !== 'object') return [];
    const item = topic as Record<string, unknown>;
    if (item.resolvedAt) return [];
    return [{ type: cleanText(item.type, 40), summary: cleanText(item.summary, 220), createdAt: cleanText(item.createdAt, 40) }];
  });
  return {
    activeFacts: facts,
    durablePreferences: preferences,
    unresolvedTopics: topics,
    currentIntent: cleanText(state.currentIntent, 40),
    previousIntent: cleanText(state.previousIntent, 40),
    currentSafetyState: ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'].includes(String(state.currentSafetyState))
      ? state.currentSafetyState
      : 'LOW',
    lastQuestionsAsked: safeArray(state.lastQuestionsAsked, 8).map((item) => cleanText(item, 180)).filter(Boolean),
    lastActionsSuggested: safeArray(state.lastActionsSuggested, 8).map((item) => cleanText(item, 40)).filter(Boolean),
    lastAdviceTopics: safeArray(state.lastAdviceTopics, 8).map((item) => cleanText(item, 80)).filter(Boolean),
    lastAssistantAction: ACTION_TYPES.has(String(lastAction.type))
      && ['suggested', 'pending', 'completed', 'failed'].includes(String(lastAction.status))
      ? { type: lastAction.type, status: lastAction.status }
      : undefined,
  };
}

function sanitizeContextWindow(value: unknown): {
  recentMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  rollingSummary: string;
} {
  const context = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    recentMessages: sanitizeMessages(context.recentMessages),
    rollingSummary: cleanText(context.rollingSummary, 2500),
  };
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
  const active = (requestWindows.get(userId) || []).filter((timestamp) => now - timestamp < RATE_LIMIT_WINDOW_MS);
  if (active.length >= RATE_LIMIT_REQUESTS) {
    requestWindows.set(userId, active);
    return true;
  }
  requestWindows.set(userId, [...active, now]);
  return false;
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

  const userId = await authenticate(req);
  if (!userId) return json({ error: 'Please sign in before using Hyper AI.' }, 401);
  if (isRateLimited(userId)) return json({ error: 'Too many requests. Please wait a moment and try again.' }, 429);

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const latestUserMessage = cleanText(body?.latestUserMessage, MAX_MESSAGE_LENGTH);
  const conversationId = cleanText(body?.conversationId, 80);
  if (!latestUserMessage || !conversationId) return json({ error: 'Please send a valid message.' }, 400);

  const appContext = sanitizeAppContext(body?.appContext);
  const contextWindow = sanitizeContextWindow(body?.contextWindow);
  const state = sanitizeState(body?.state);
  const guard = evaluateSafetyRisk(latestUserMessage);
  const previousSafety = ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'].includes(String(state.currentSafetyState))
    ? state.currentSafetyState as GuardSafetyLevel
    : 'LOW';
  const safetyFloor = guard.deescalated ? 'LOW' : maxSafetyLevel(previousSafety, guard.minimumLevel);
  const availableActions = appContext.availableAppActions as Array<{
    type: string;
    label: string;
    requiresConfirmation: boolean;
  }>;
  const turnPrompt = buildTurnPrompt({
    appContext,
    durablePreferences: state.durablePreferences,
    activeFacts: state.activeFacts,
    unresolvedTopics: state.unresolvedTopics,
    rollingSummary: contextWindow.rollingSummary,
    recentMessages: contextWindow.recentMessages,
    repetitionState: {
      lastQuestionsAsked: state.lastQuestionsAsked,
      lastActionsSuggested: state.lastActionsSuggested,
      lastAdviceTopics: state.lastAdviceTopics,
      lastAssistantAction: state.lastAssistantAction,
    },
    latestUserMessage,
    deterministicSafety: { ...guard, minimumLevel: safetyFloor },
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
    });
    const parsed = parseAssistantResponse({
      providerPayload: result.payload,
      availableActions,
      minimumSafetyLevel: safetyFloor,
      recentAssistantMessages: contextWindow.recentMessages
        .filter((message) => message.role === 'assistant')
        .slice(-4)
        .map((message) => message.content),
      lastAssistantAction: state.lastAssistantAction as { type?: string; status?: string } | undefined,
    });
    if (!parsed) return json({ error: 'The hosted AI returned an invalid response. Please try again.' }, 502);
    return json({ response: parsed, model: result.model, promptVersion: HYPER_ASSISTANT_PROMPT_VERSION });
  } catch (error) {
    if (safetyFloor === 'HIGH' || safetyFloor === 'CRITICAL') {
      return json({
        response: emergencyFallback(safetyFloor, availableActions),
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

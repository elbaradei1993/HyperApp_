import { extractCloudflareText } from './cloudflareResponse.ts';
import { maxSafetyLevel, type GuardSafetyLevel } from './safetyGuard.ts';

const ACTION_TYPES = [
  'SHARE_LOCATION',
  'START_SAFETY_TIMER',
  'CONTACT_GUARDIAN',
  'OPEN_NEARBY_REPORTS',
  'OPEN_MAP',
  'CALL_EMERGENCY_SERVICES',
  'SHOW_SAFETY_PLAN',
  'CHECK_IN',
  'REPORT_INCIDENT',
  'NONE',
] as const;

type ActionType = typeof ACTION_TYPES[number];

export interface ParsedAssistantResponse {
  message: string;
  safetyLevel: GuardSafetyLevel;
  suggestedActions: Array<{
    type: ActionType;
    label: string;
    reason?: string;
    requiresConfirmation: boolean;
  }>;
  requiresImmediateAttention: boolean;
  followUpNeeded: boolean;
  memoryUpdates: Array<{
    key: string;
    value: string;
    source: 'user_explicit' | 'profile' | 'app_setting';
    reason?: string;
  }>;
}

const SAFETY_LEVELS: GuardSafetyLevel[] = ['LOW', 'ELEVATED', 'HIGH', 'CRITICAL'];
const ALLOWED_MEMORY_KEYS = new Set(['preferred_name', 'preferred_language', 'response_detail', 'accessibility_need']);

function cleanText(value: unknown, maximum: number): string {
  return typeof value === 'string'
    ? value.replace(/```(?:json)?/gi, '').replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/\s+/g, ' ').trim().slice(0, maximum)
    : '';
}

function parseJsonObject(text: string): Record<string, unknown> | null {
  const cleaned = text.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function normalizeSentence(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function reduceRepetition(message: string, recentAssistantMessages: string[], safetyLevel: GuardSafetyLevel): string {
  if (safetyLevel === 'CRITICAL') return message;
  const priorSentences = new Set(recentAssistantMessages.flatMap((prior) => (
    prior.split(/(?<=[.!?])\s+/).map(normalizeSentence).filter(Boolean)
  )));
  const sentences = message.split(/(?<=[.!?])\s+/).filter(Boolean);
  const filtered = sentences.filter((sentence, index) => (
    index === sentences.length - 1 || !priorSentences.has(normalizeSentence(sentence))
  ));
  return (filtered.length > 0 ? filtered : sentences.slice(-1)).join(' ').trim();
}

export function parseAssistantResponse(input: {
  providerPayload: unknown;
  availableActions: Array<{ type: string; label: string; requiresConfirmation: boolean }>;
  minimumSafetyLevel: GuardSafetyLevel;
  recentAssistantMessages: string[];
  lastAssistantAction?: { type?: string; status?: string };
}): ParsedAssistantResponse | null {
  const rawText = extractCloudflareText(input.providerPayload);
  if (!rawText) return null;
  const parsed = parseJsonObject(rawText);
  const rawMessage = parsed
    ? cleanText(parsed.message, 1600)
    : cleanText(rawText, 1600);
  if (!rawMessage) return null;
  const modelLevel = SAFETY_LEVELS.includes(parsed?.safetyLevel as GuardSafetyLevel)
    ? parsed?.safetyLevel as GuardSafetyLevel
    : input.minimumSafetyLevel;
  const safetyLevel = maxSafetyLevel(modelLevel, input.minimumSafetyLevel);
  const availableActions = new Map(input.availableActions.map((action) => [action.type, action]));
  const suggestedActions = Array.isArray(parsed?.suggestedActions)
    ? parsed.suggestedActions.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const action = value as Record<string, unknown>;
      const type = typeof action.type === 'string' ? action.type as ActionType : 'NONE';
      const descriptor = availableActions.get(type);
      const recentlyFinished = input.lastAssistantAction?.type === type
        && ['completed', 'failed'].includes(input.lastAssistantAction.status || '');
      if (!ACTION_TYPES.includes(type) || type === 'NONE' || !descriptor || recentlyFinished) return [];
      return [{
        type,
        label: cleanText(descriptor.label, 80),
        reason: cleanText(action.reason, 180) || undefined,
        requiresConfirmation: descriptor.requiresConfirmation,
      }];
    }).slice(0, 3)
    : [];
  const memoryUpdates = Array.isArray(parsed?.memoryUpdates)
    ? parsed.memoryUpdates.flatMap((value) => {
      if (!value || typeof value !== 'object') return [];
      const memory = value as Record<string, unknown>;
      const key = cleanText(memory.key, 80);
      const memoryValue = cleanText(memory.value, 500);
      if (!ALLOWED_MEMORY_KEYS.has(key) || memory.source !== 'user_explicit' || !memoryValue) return [];
      return [{
        key,
        value: memoryValue,
        source: 'user_explicit' as const,
        reason: cleanText(memory.reason, 160) || undefined,
      }];
    }).slice(0, 2)
    : [];

  return {
    message: reduceRepetition(rawMessage, input.recentAssistantMessages, safetyLevel),
    safetyLevel,
    suggestedActions,
    requiresImmediateAttention: safetyLevel === 'HIGH' || safetyLevel === 'CRITICAL'
      || parsed?.requiresImmediateAttention === true,
    followUpNeeded: parsed?.followUpNeeded === true,
    memoryUpdates,
  };
}

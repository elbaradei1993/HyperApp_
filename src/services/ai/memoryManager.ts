import { deriveConversationSafety, evaluateSafetyRisk } from './safetyPolicy';
import type {
  ConversationIntent,
  ConversationMessage,
  ConversationState,
  HyperAppContext,
  UnresolvedTopic,
  UserFact,
} from './types';

function createId(): string {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanFactValue(value: string): string {
  return value.replace(/[.!?]+$/, '').replace(/\s+/g, ' ').trim().slice(0, 180);
}

export function createConversationMessage(
  role: ConversationMessage['role'],
  content: string,
  overrides: Partial<ConversationMessage> = {},
): ConversationMessage {
  return {
    id: createId(),
    role,
    content: content.trim(),
    timestamp: new Date().toISOString(),
    deliveryStatus: 'sent',
    ...overrides,
  };
}

export function createConversationState(
  userId: string,
  appContext: HyperAppContext,
  persistenceEnabled = true,
): ConversationState {
  const now = new Date().toISOString();
  return {
    conversationId: createId(),
    userId,
    recentMessages: [],
    knownFacts: [],
    userPreferences: [],
    unresolvedTopics: [],
    currentSafetyState: 'LOW',
    lastQuestionsAsked: [],
    lastActionsSuggested: [],
    lastAdviceTopics: [],
    appContext,
    persistenceEnabled,
    createdAt: now,
    updatedAt: now,
  };
}

export function extractExplicitFacts(message: ConversationMessage): Array<Omit<UserFact, 'id' | 'status'>> {
  if (message.role !== 'user') {
    return [];
  }
  const text = message.content.trim();
  const facts: Array<Omit<UserFact, 'id' | 'status'>> = [];
  const correctionLocation = text.match(/\b(?:no[, ]+|sorry[, ]+)?(?:i (?:am|'m) |i meant |use )?(?:at|near|in)\s+([^.!?]{2,100})/i);
  const ordinaryLocation = text.match(/\b(?:i am|i'm|we are|we're)\s+(?:at|near|in)\s+([^.!?]{2,100})/i);
  const location = correctionLocation?.[1] || ordinaryLocation?.[1];
  if (location) {
    facts.push({
      key: 'current_location',
      value: cleanFactValue(location),
      sourceMessageId: message.id,
      createdAt: message.timestamp,
    });
  }

  if (/\b(i am|i'm) alone\b/i.test(text)) {
    facts.push({
      key: 'companionship',
      value: 'alone',
      sourceMessageId: message.id,
      createdAt: message.timestamp,
    });
  }
  if (/\b(?:no[, ]+)?i meant my friend\b/i.test(text)) {
    facts.push({
      key: 'referenced_person',
      value: 'the user\'s friend',
      sourceMessageId: message.id,
      createdAt: message.timestamp,
    });
  }
  return facts;
}

function mergeFacts(existing: UserFact[], additions: Array<Omit<UserFact, 'id' | 'status'>>): UserFact[] {
  const next = existing.map((fact) => ({ ...fact }));
  for (const addition of additions) {
    const previous = [...next].reverse().find((fact) => fact.key === addition.key && fact.status === 'active');
    if (previous && previous.value.toLowerCase() === addition.value.toLowerCase()) {
      continue;
    }
    if (previous) {
      previous.status = 'superseded';
    }
    next.push({
      ...addition,
      id: createId(),
      status: 'active',
      replacesFactId: previous?.id,
    });
  }
  return next.slice(-40);
}

function inferIntent(text: string): ConversationIntent {
  if (/\b(attack|weapon|trapped|not breathing|emergency|help me now)\b/i.test(text)) return 'emergency_help';
  if (/\b(guardian|trusted contact|angel)\b/i.test(text)) return 'guardian_help';
  if (/\b(report|nearby|area dangerous|what happened)\b/i.test(text)) return 'nearby_reports';
  if (/\b(location|where i am|share my location)\b/i.test(text)) return 'location_help';
  if (/\b(what should i do|which should i|should i leave)\b/i.test(text)) return 'decision_support';
  if (/\b(set up|prepare|plan|going out)\b/i.test(text)) return 'safety_planning';
  if (/\b(how do i|where is|open the app)\b/i.test(text)) return 'app_help';
  return 'casual';
}

function updateTopics(
  topics: UnresolvedTopic[],
  message: ConversationMessage,
): UnresolvedTopic[] {
  const next = topics.map((topic) => ({ ...topic }));
  const guard = evaluateSafetyRisk(message.content);
  if (guard.deescalated) {
    return next.map((topic) => topic.resolvedAt ? topic : { ...topic, resolvedAt: message.timestamp });
  }
  const type = /\b(did not answer|didn't answer|cannot reach|can't reach)\b/i.test(message.content)
    ? 'failed_contact'
    : /\b(where|location|station|at |near )\b/i.test(message.content)
      ? 'location_uncertainty'
      : guard.minimumLevel !== 'LOW'
        ? 'safety_question'
        : undefined;
  if (type && !next.some((topic) => topic.type === type && !topic.resolvedAt)) {
    next.push({
      id: createId(),
      type,
      summary: message.content.slice(0, 220),
      createdAt: message.timestamp,
    });
  }
  return next.slice(-20);
}

export function applyUserMessageToState(
  state: ConversationState,
  message: ConversationMessage,
): ConversationState {
  const nextIntent = inferIntent(message.content);
  return {
    ...state,
    recentMessages: [...state.recentMessages, message],
    knownFacts: mergeFacts(state.knownFacts, extractExplicitFacts(message)),
    unresolvedTopics: updateTopics(state.unresolvedTopics, message),
    previousIntent: state.currentIntent,
    currentIntent: nextIntent,
    currentSafetyState: deriveConversationSafety(
      [...state.recentMessages, message],
      state.currentSafetyState,
    ),
    updatedAt: message.timestamp,
  };
}

export function getActiveFacts(facts: UserFact[]): UserFact[] {
  return facts.filter((fact) => fact.status === 'active');
}

export function recordAssistantResponse(
  state: ConversationState,
  message: ConversationMessage,
  questions: string[],
): ConversationState {
  return {
    ...state,
    recentMessages: [...state.recentMessages, message],
    lastQuestionsAsked: [...state.lastQuestionsAsked, ...questions].slice(-8),
    updatedAt: message.timestamp,
  };
}

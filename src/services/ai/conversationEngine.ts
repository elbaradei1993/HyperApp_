import { requestAssistantResponse, type DeviceLocationHint } from './aiClient';
import { selectContextWindow, updateRollingSummary } from './contextBudget';
import { conversationRepository } from './conversationRepository';
import {
  applyUserMessageToState,
  createConversationMessage,
  recordAssistantResponse,
} from './memoryManager';
import type {
  ConversationState,
  ConversationTurnResult,
  GenerateAssistantResponseInput,
  HyperAppContext,
  UserPreference,
} from './types';

const MAX_IN_MEMORY_MESSAGES = 200;

function extractQuestions(message: string): string[] {
  return (message.match(/[^?]{3,180}\?/g) || [])
    .map((question) => question.replace(/\s+/g, ' ').trim())
    .slice(-2);
}

function extractAdviceTopics(message: string): string[] {
  const topics = [
    ['staffed_place', /\b(staffed|populated|well-lit|secure place)\b/i],
    ['emergency_services', /\bemergency services\b/i],
    ['location_sharing', /\bshare (?:your )?location\b/i],
    ['guardian', /\bguardian\b/i],
    ['nearby_reports', /\bnearby reports?\b/i],
    ['avoid_confrontation', /\b(do not|don't) confront\b/i],
  ] as const;
  return topics.filter(([, pattern]) => pattern.test(message)).map(([topic]) => topic);
}

function mergePreferences(
  current: UserPreference[],
  additions: UserPreference[],
): UserPreference[] {
  const byKey = new Map<string, UserPreference>();
  for (const preference of [...current, ...additions]) {
    byKey.set(preference.key, preference);
  }
  return Array.from(byKey.values());
}

export class ConversationEngine {
  private states = new Map<string, ConversationState>();
  private pending = new Map<string, {
    normalizedMessage: string;
    promise: Promise<ConversationTurnResult>;
    controller: AbortController;
  }>();

  async initialize(
    userId: string,
    appContext: HyperAppContext,
    preferences: UserPreference[] = [],
    persistenceEnabled = true,
  ): Promise<ConversationState> {
    const loaded = await conversationRepository.loadCurrent(userId, appContext);
    const state = loaded || await conversationRepository.create(userId, appContext, persistenceEnabled);
    const effectivePersistence = loaded?.persistenceEnabled ?? persistenceEnabled;
    const durablePreferences = effectivePersistence
      ? await conversationRepository.loadMemories(userId)
      : [];
    const updated = {
      ...state,
      appContext,
      userPreferences: mergePreferences(durablePreferences, preferences),
      persistenceEnabled: loaded?.persistenceEnabled ?? persistenceEnabled,
    };
    this.states.set(updated.conversationId, updated);
    return updated;
  }

  getState(conversationId: string): ConversationState | undefined {
    return this.states.get(conversationId);
  }

  updateContext(
    conversationId: string,
    appContext: HyperAppContext,
    preferences: UserPreference[] = [],
  ): ConversationState | undefined {
    const current = this.states.get(conversationId);
    if (!current) return undefined;
    const updated = {
      ...current,
      appContext,
      userPreferences: mergePreferences(current.userPreferences, preferences),
    };
    this.states.set(conversationId, updated);
    return updated;
  }

  async createConversation(
    userId: string,
    appContext: HyperAppContext,
    preferences: UserPreference[] = [],
    persistenceEnabled = true,
  ): Promise<ConversationState> {
    const state = await conversationRepository.create(userId, appContext, persistenceEnabled);
    const withPreferences = { ...state, userPreferences: preferences };
    this.states.set(state.conversationId, withPreferences);
    return withPreferences;
  }

  generateAssistantResponse(input: GenerateAssistantResponseInput): Promise<ConversationTurnResult> {
    const normalizedMessage = input.userMessage.replace(/\s+/g, ' ').trim().slice(0, 1500);
    if (!normalizedMessage) {
      return Promise.reject(new Error('Type or say a message first.'));
    }
    const currentPending = this.pending.get(input.conversationId);
    if (currentPending) {
      if (currentPending.normalizedMessage === normalizedMessage) {
        return currentPending.promise;
      }
      return Promise.reject(new Error('Hyper AI is already responding. Stop it before sending another message.'));
    }

    const controller = new AbortController();
    const forwardAbort = () => controller.abort();
    input.signal?.addEventListener('abort', forwardAbort, { once: true });
    const promise = this.runTurn({ ...input, userMessage: normalizedMessage }, controller.signal)
      .finally(() => {
        input.signal?.removeEventListener('abort', forwardAbort);
        this.pending.delete(input.conversationId);
      });
    this.pending.set(input.conversationId, { normalizedMessage, promise, controller });
    return promise;
  }

  private async runTurn(
    input: GenerateAssistantResponseInput,
    signal: AbortSignal,
  ): Promise<ConversationTurnResult> {
    const existing = this.states.get(input.conversationId);
    if (!existing || existing.userId !== input.userId) {
      throw new Error('This conversation is not available for the signed-in user.');
    }

    let state = { ...existing, appContext: input.appContext };
    let userMessage = input.retryMessageId
      ? state.recentMessages.find((message) => (
        message.id === input.retryMessageId && message.role === 'user' && message.deliveryStatus === 'failed'
      ))
      : undefined;

    if (userMessage) {
      userMessage = { ...userMessage, deliveryStatus: 'pending' };
      state = {
        ...state,
        recentMessages: state.recentMessages.map((message) => (
          message.id === userMessage?.id ? userMessage : message
        )),
      };
    } else {
      userMessage = createConversationMessage('user', input.userMessage, { deliveryStatus: 'pending' });
      state = applyUserMessageToState(state, userMessage);
    }

    state = {
      ...state,
      recentMessages: state.recentMessages.map((message) => (
        message.id === userMessage.id ? { ...message, deliveryStatus: 'sent' } : message
      )),
      updatedAt: new Date().toISOString(),
    };
    const window = selectContextWindow(state.recentMessages, state.rollingSummary);
    state.rollingSummary = updateRollingSummary(state.rollingSummary, window.omittedMessages);
    this.states.set(state.conversationId, state);
    await conversationRepository.save(state);
    try {
      if (signal.aborted) {
        throw new DOMException('Request cancelled.', 'AbortError');
      }
      const approximateLocation = input.appContext.approximateLocation;
      const locationHint: DeviceLocationHint | undefined = approximateLocation?.latitude !== undefined
        && approximateLocation.longitude !== undefined
        ? {
          latitude: approximateLocation.latitude,
          longitude: approximateLocation.longitude,
          capturedAt: approximateLocation.capturedAt,
        }
        : undefined;

      const response = await requestAssistantResponse({
        conversationId: state.conversationId,
        latestUserMessage: input.userMessage,
        locationHint,
      }, signal);

      const assistantMessage = createConversationMessage('assistant', response.message, {
        safetyLevel: response.safetyLevel,
        deliveryStatus: 'sent',
      });
      state = recordAssistantResponse(state, assistantMessage, extractQuestions(response.message));

      if (response.memoryUpdates?.length) {
        for (const update of response.memoryUpdates) {
          const memory: UserPreference = {
            key: update.key,
            value: update.value,
            source: update.source,
            updatedAt: assistantMessage.timestamp,
          };
          await conversationRepository.upsertMemory(state.userId, memory);
        }
        state = {
          ...state,
          userPreferences: mergePreferences(
            state.userPreferences,
            response.memoryUpdates.map((update) => ({
              key: update.key,
              value: update.value,
              source: update.source,
              updatedAt: assistantMessage.timestamp,
            })),
          ),
        };
      }

      state = {
        ...state,
        currentSafetyState: response.safetyLevel,
        lastActionsSuggested: [
          ...state.lastActionsSuggested,
          ...response.suggestedActions.map((action) => action.type),
        ].slice(-8),
        lastAdviceTopics: [
          ...state.lastAdviceTopics,
          ...extractAdviceTopics(response.message),
        ].slice(-8),
        lastAssistantAction: response.suggestedActions[0] ? {
          type: response.suggestedActions[0].type,
          status: 'suggested',
          createdAt: assistantMessage.timestamp,
        } : state.lastAssistantAction,
        recentMessages: state.recentMessages.slice(-MAX_IN_MEMORY_MESSAGES),
      };
      this.states.set(state.conversationId, state);
      await conversationRepository.save(state);
      return { response, state, assistantMessage };
    } catch (error) {
      state = {
        ...state,
        recentMessages: state.recentMessages.map((message) => (
          message.id === userMessage.id ? { ...message, deliveryStatus: 'failed' } : message
        )),
        updatedAt: new Date().toISOString(),
      };
      this.states.set(state.conversationId, state);
      await conversationRepository.save(state);
      throw error;
    }
  }

  cancel(conversationId: string): void {
    this.pending.get(conversationId)?.controller.abort();
  }

  async recordActionOutcome(
    conversationId: string,
    type: ConversationState['lastActionsSuggested'][number],
    status: 'completed' | 'failed',
  ): Promise<void> {
    const state = this.states.get(conversationId);
    if (!state) return;
    const now = new Date().toISOString();
    const updated = {
      ...state,
      lastAssistantAction: { type, status, createdAt: now },
      updatedAt: now,
    } satisfies ConversationState;
    this.states.set(conversationId, updated);
    await conversationRepository.save(updated);
  }

  async setPersistence(conversationId: string, enabled: boolean): Promise<ConversationState> {
    const state = this.states.get(conversationId);
    if (!state) throw new Error('Conversation not found.');
    const updated = { ...state, persistenceEnabled: enabled, updatedAt: new Date().toISOString() };
    this.states.set(conversationId, updated);
    const persisted = await conversationRepository.setPersistence(updated, enabled);
    if (!persisted) {
      this.states.set(conversationId, state);
      throw new Error(enabled
        ? 'Account conversation sync could not be enabled. Try again.'
        : 'The saved conversation could not be removed from your account. Try again.');
    }
    return updated;
  }

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    this.cancel(conversationId);
    this.states.delete(conversationId);
    return conversationRepository.deleteConversation(userId, conversationId);
  }

  async clearHistory(userId: string): Promise<boolean> {
    for (const [conversationId, state] of this.states) {
      if (state.userId === userId) {
        this.cancel(conversationId);
        this.states.delete(conversationId);
      }
    }
    return conversationRepository.clearHistory(userId);
  }
}

export const conversationEngine = new ConversationEngine();

export const generateAssistantResponse = (
  input: GenerateAssistantResponseInput,
): Promise<ConversationTurnResult> => conversationEngine.generateAssistantResponse(input);

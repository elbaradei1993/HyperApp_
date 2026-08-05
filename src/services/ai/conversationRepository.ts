import { supabase } from '../../lib/supabase';

import { createConversationState } from './memoryManager';
import type {
  AssistantActionType,
  ConversationIntent,
  ConversationMessage,
  ConversationState,
  HyperAppContext,
  UnresolvedTopic,
  UserFact,
  UserPreference,
} from './types';

interface ConversationRow {
  id: string;
  user_id: string;
  rolling_summary: string | null;
  current_safety_level: ConversationState['currentSafetyState'];
  state_metadata: Record<string, unknown> | null;
  persistence_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  role: ConversationMessage['role'];
  content: string;
  delivery_status: ConversationMessage['deliveryStatus'];
  safety_level: ConversationMessage['safetyLevel'];
  referenced_message_id: string | null;
  created_at: string;
}

interface StateMetadata {
  knownFacts: UserFact[];
  userPreferences: UserPreference[];
  unresolvedTopics: UnresolvedTopic[];
  currentIntent?: ConversationIntent;
  previousIntent?: ConversationIntent;
  lastAssistantAction?: ConversationState['lastAssistantAction'];
  lastQuestionsAsked: string[];
  lastActionsSuggested: AssistantActionType[];
  lastAdviceTopics: string[];
}

const LOCAL_PREFIX = 'hyper-ai-conversation-v3';

function localConversationKey(userId: string, conversationId: string): string {
  return `${LOCAL_PREFIX}:${userId}:${conversationId}`;
}

function localCurrentKey(userId: string): string {
  return `${LOCAL_PREFIX}:current:${userId}`;
}

function parseMetadata(value: Record<string, unknown> | null): StateMetadata {
  const metadata = value || {};
  return {
    knownFacts: Array.isArray(metadata.knownFacts) ? metadata.knownFacts as UserFact[] : [],
    userPreferences: Array.isArray(metadata.userPreferences) ? metadata.userPreferences as UserPreference[] : [],
    unresolvedTopics: Array.isArray(metadata.unresolvedTopics) ? metadata.unresolvedTopics as UnresolvedTopic[] : [],
    currentIntent: typeof metadata.currentIntent === 'string'
      ? metadata.currentIntent as ConversationIntent
      : undefined,
    previousIntent: typeof metadata.previousIntent === 'string'
      ? metadata.previousIntent as ConversationIntent
      : undefined,
    lastAssistantAction: metadata.lastAssistantAction
      && typeof metadata.lastAssistantAction === 'object'
      ? metadata.lastAssistantAction as ConversationState['lastAssistantAction']
      : undefined,
    lastQuestionsAsked: Array.isArray(metadata.lastQuestionsAsked)
      ? metadata.lastQuestionsAsked.filter((item): item is string => typeof item === 'string').slice(-8)
      : [],
    lastActionsSuggested: Array.isArray(metadata.lastActionsSuggested)
      ? metadata.lastActionsSuggested.filter((item): item is AssistantActionType => typeof item === 'string').slice(-8)
      : [],
    lastAdviceTopics: Array.isArray(metadata.lastAdviceTopics)
      ? metadata.lastAdviceTopics.filter((item): item is string => typeof item === 'string').slice(-8)
      : [],
  };
}

function stateMetadata(state: ConversationState): StateMetadata {
  return {
    knownFacts: state.knownFacts,
    userPreferences: state.userPreferences,
    unresolvedTopics: state.unresolvedTopics,
    currentIntent: state.currentIntent,
    previousIntent: state.previousIntent,
    lastAssistantAction: state.lastAssistantAction,
    lastQuestionsAsked: state.lastQuestionsAsked,
    lastActionsSuggested: state.lastActionsSuggested,
    lastAdviceTopics: state.lastAdviceTopics,
  };
}

export class ConversationRepository {
  private persistenceWarning = false;

  hasPersistenceWarning(): boolean {
    return this.persistenceWarning;
  }

  private saveLocal(state: ConversationState): void {
    if (typeof window === 'undefined' || !state.userId) return;
    try {
      window.sessionStorage.setItem(localConversationKey(state.userId, state.conversationId), JSON.stringify(state));
      window.sessionStorage.setItem(localCurrentKey(state.userId), state.conversationId);
    } catch {
      this.persistenceWarning = true;
    }
  }

  private loadLocal(userId: string): ConversationState | null {
    if (typeof window === 'undefined') return null;
    try {
      const conversationId = window.sessionStorage.getItem(localCurrentKey(userId));
      if (!conversationId) return null;
      const raw = window.sessionStorage.getItem(localConversationKey(userId, conversationId));
      if (!raw) return null;
      const state = JSON.parse(raw) as ConversationState;
      return state.userId === userId ? state : null;
    } catch {
      this.persistenceWarning = true;
      return null;
    }
  }

  async create(
    userId: string,
    appContext: HyperAppContext,
    persistenceEnabled = true,
  ): Promise<ConversationState> {
    const state = createConversationState(userId, appContext, persistenceEnabled);
    await this.save(state);
    return state;
  }

  async loadCurrent(userId: string, appContext: HyperAppContext): Promise<ConversationState | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('ai_conversations')
        .select('id,user_id,rolling_summary,current_safety_level,state_metadata,persistence_enabled,created_at,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      if (!conversation) return this.loadLocal(userId);

      const row = conversation as ConversationRow;
      const { data: messageRows, error: messagesError } = await supabase
        .from('ai_messages')
        .select('id,role,content,delivery_status,safety_level,referenced_message_id,created_at')
        .eq('conversation_id', row.id)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (messagesError) throw messagesError;
      const metadata = parseMetadata(row.state_metadata);
      const messages = [...(messageRows || [])].reverse().map((message) => {
        const item = message as MessageRow;
        return {
          id: item.id,
          role: item.role,
          content: item.content,
          timestamp: item.created_at,
          deliveryStatus: item.delivery_status,
          safetyLevel: item.safety_level,
          referencedMessageId: item.referenced_message_id || undefined,
        } satisfies ConversationMessage;
      });

      const state: ConversationState = {
        conversationId: row.id,
        userId,
        recentMessages: messages,
        rollingSummary: row.rolling_summary || undefined,
        ...metadata,
        currentSafetyState: row.current_safety_level,
        appContext,
        persistenceEnabled: row.persistence_enabled,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
      this.saveLocal(state);
      return state;
    } catch {
      this.persistenceWarning = true;
      return this.loadLocal(userId);
    }
  }

  async save(state: ConversationState): Promise<boolean> {
    this.saveLocal(state);
    if (!state.persistenceEnabled || !state.userId) return false;

    try {
      const { error: conversationError } = await supabase.from('ai_conversations').upsert({
        id: state.conversationId,
        user_id: state.userId,
        rolling_summary: state.rollingSummary || null,
        current_safety_level: state.currentSafetyState,
        state_metadata: stateMetadata(state),
        persistence_enabled: true,
        updated_at: state.updatedAt,
      });
      if (conversationError) throw conversationError;

      if (state.recentMessages.length > 0) {
        const { error: messagesError } = await supabase.from('ai_messages').upsert(
          state.recentMessages.slice(-6).map((message) => ({
            id: message.id,
            conversation_id: state.conversationId,
            user_id: state.userId,
            role: message.role,
            content: message.content.slice(0, 4000),
            delivery_status: message.deliveryStatus || 'sent',
            safety_level: message.safetyLevel || null,
            referenced_message_id: message.referencedMessageId || null,
            created_at: message.timestamp,
          })),
        );
        if (messagesError) throw messagesError;
      }
      this.persistenceWarning = false;
      return true;
    } catch {
      this.persistenceWarning = true;
      return false;
    }
  }

  async setPersistence(state: ConversationState, enabled: boolean): Promise<boolean> {
    const updated = { ...state, persistenceEnabled: enabled };
    this.saveLocal(updated);
    if (!state.userId) return false;
    if (enabled) return this.save(updated);

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', state.conversationId)
        .eq('user_id', state.userId);
      if (error) throw error;
      this.persistenceWarning = false;
      return true;
    } catch {
      this.persistenceWarning = true;
      return false;
    }
  }

  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId)
        .eq('user_id', userId);
      if (error) throw error;
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(localConversationKey(userId, conversationId));
        if (window.sessionStorage.getItem(localCurrentKey(userId)) === conversationId) {
          window.sessionStorage.removeItem(localCurrentKey(userId));
        }
      }
      return true;
    } catch {
      this.persistenceWarning = true;
      return false;
    }
  }

  async clearHistory(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('ai_conversations').delete().eq('user_id', userId);
      if (error) throw error;
      if (typeof window !== 'undefined') {
        const keys = Array.from({ length: window.sessionStorage.length }, (_, index) => (
          window.sessionStorage.key(index)
        )).filter((key): key is string => Boolean(key?.startsWith(`${LOCAL_PREFIX}:`) && key.includes(userId)));
        keys.forEach((key) => window.sessionStorage.removeItem(key));
      }
      return true;
    } catch {
      this.persistenceWarning = true;
      return false;
    }
  }

  async removeMemory(userId: string, memoryKey: string): Promise<boolean> {
    const { error } = await supabase
      .from('ai_user_memories')
      .delete()
      .eq('user_id', userId)
      .eq('memory_key', memoryKey);
    return !error;
  }
}

export const conversationRepository = new ConversationRepository();

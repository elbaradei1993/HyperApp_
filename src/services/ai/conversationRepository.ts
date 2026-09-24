import { supabase } from '../../lib/supabase';

import { createConversationState } from './memoryManager';
import type {
  AssistantActionType,
  ConversationIntent,
  ConversationMessage,
  ConversationState,
  ConversationSummary,
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
  title?: string;
  preview?: string;
}

const LOCAL_PREFIX = 'hyper-ai-conversation-v3';
const EPHEMERAL_TTL_MS = 2 * 60 * 60 * 1000;

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
    title: typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title.trim().slice(0, 80) : undefined,
    preview: typeof metadata.preview === 'string' && metadata.preview.trim() ? metadata.preview.trim().slice(0, 120) : undefined,
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
    ...(state.title ? { title: state.title } : {}),
    ...(state.recentMessages.find((message) => message.role === 'user')?.content
      ? { preview: state.recentMessages.find((message) => message.role === 'user')?.content.slice(0, 120) }
      : {}),
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
      window.localStorage.setItem(localCurrentKey(state.userId), state.conversationId);
    } catch {
      this.persistenceWarning = true;
    }
  }

  private loadLocal(userId: string): ConversationState | null {
    if (typeof window === 'undefined') return null;
    try {
      const conversationId = window.localStorage.getItem(localCurrentKey(userId)) || window.sessionStorage.getItem(localCurrentKey(userId));
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

  async loadMemories(userId: string): Promise<UserPreference[]> {
    try {
      const { data, error } = await supabase
        .from('ai_user_memories')
        .select('memory_key,memory_value,source,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []).flatMap((row) => {
        const item = row as {
          memory_key?: unknown;
          memory_value?: unknown;
          source?: unknown;
          updated_at?: unknown;
        };
        if (
          typeof item.memory_key !== 'string'
          || typeof item.memory_value !== 'string'
          || !['user_explicit', 'profile', 'app_setting'].includes(String(item.source))
        ) {
          return [];
        }
        return [{
          key: item.memory_key,
          value: item.memory_value,
          source: item.source as UserPreference['source'],
          updatedAt: typeof item.updated_at === 'string' ? item.updated_at : new Date().toISOString(),
        }];
      });
    } catch {
      this.persistenceWarning = true;
      return [];
    }
  }

  async upsertMemory(userId: string, memory: UserPreference): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('ai_user_memories')
        .upsert({
          user_id: userId,
          memory_key: memory.key,
          memory_value: memory.value,
          source: memory.source,
          updated_at: memory.updatedAt,
        }, { onConflict: 'user_id,memory_key' });
      if (error) throw error;
      this.persistenceWarning = false;
      return true;
    } catch {
      this.persistenceWarning = true;
      return false;
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

  async listConversations(userId: string, limit = 50): Promise<ConversationSummary[]> {
    try {
      const { data: conversations, error } = await supabase
        .from('ai_conversations')
        .select('id,user_id,rolling_summary,state_metadata,persistence_enabled,created_at,updated_at')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(Math.max(1, Math.min(limit, 100)));
      if (error) throw error;
      return (conversations || []).map((item) => {
        const metadata = item.state_metadata && typeof item.state_metadata === 'object'
          ? item.state_metadata as Record<string, unknown>
          : {};
        const title = typeof metadata.title === 'string' && metadata.title.trim()
          ? metadata.title.trim().slice(0, 80)
          : 'New conversation';
        const preview = typeof metadata.preview === 'string' && metadata.preview.trim()
          ? metadata.preview.trim().slice(0, 120)
          : (item.rolling_summary || '').trim().slice(0, 120);
        return {
          conversationId: item.id,
          title,
          preview,
          persistenceEnabled: Boolean(item.persistence_enabled),
          createdAt: item.created_at,
          updatedAt: item.updated_at,
        } satisfies ConversationSummary;
      });
    } catch {
      this.persistenceWarning = true;
      return [];
    }
  }

  async loadConversation(userId: string, conversationId: string, appContext: HyperAppContext): Promise<ConversationState | null> {
    try {
      const { data: conversation, error } = await supabase
        .from('ai_conversations')
        .select('id,user_id,rolling_summary,current_safety_level,state_metadata,persistence_enabled,created_at,updated_at')
        .eq('id', conversationId)
        .eq('user_id', userId)
        .maybeSingle();
      if (error || !conversation) return null;

      const now = Date.now();
      const metadata = conversation.state_metadata && typeof conversation.state_metadata === 'object'
        ? conversation.state_metadata as Record<string, unknown>
        : {};
      const expiry = typeof metadata.ephemeralExpiresAt === 'string' ? Date.parse(metadata.ephemeralExpiresAt) : Number.NaN;
      if (!conversation.persistence_enabled && Number.isFinite(expiry) && expiry <= now) {
        await supabase.from('ai_conversations').delete().eq('id', conversationId).eq('user_id', userId);
        return null;
      }

      const { data: messageRows, error: messagesError } = await supabase
        .from('ai_messages')
        .select('id,role,content,delivery_status,safety_level,referenced_message_id,created_at')
        .eq('conversation_id', conversationId)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(200);
      if (messagesError) throw messagesError;

      const parsedMetadata = parseMetadata(conversation.state_metadata);
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
        conversationId: conversation.id,
        userId,
        title: typeof metadata.title === 'string' && metadata.title.trim() ? metadata.title.trim() : undefined,
        recentMessages: messages,
        rollingSummary: conversation.rolling_summary || undefined,
        ...parsedMetadata,
        currentSafetyState: conversation.current_safety_level,
        appContext,
        persistenceEnabled: Boolean(conversation.persistence_enabled),
        createdAt: conversation.created_at,
        updatedAt: conversation.updated_at,
      };
      this.saveLocal(state);
      return state;
    } catch {
      this.persistenceWarning = true;
      return null;
    }
  }

  async loadCurrent(userId: string, appContext: HyperAppContext): Promise<ConversationState | null> {
    const list = await this.listConversations(userId, 50);
    if (!list.length) return this.loadLocal(userId);
    let preferredId: string | null = null;
    if (typeof window !== 'undefined') {
      preferredId = window.localStorage.getItem(localCurrentKey(userId)) || window.sessionStorage.getItem(localCurrentKey(userId));
    }
    const selected = list.find((item) => item.conversationId === preferredId) || list[0];
    return this.loadConversation(userId, selected.conversationId, appContext);
  }

  async save(state: ConversationState): Promise<boolean> {
    this.saveLocal(state);
    if (!state.userId) return false;

    const ephemeralExpiresAt = state.persistenceEnabled
      ? undefined
      : new Date(Date.now() + EPHEMERAL_TTL_MS).toISOString();

    try {
      const { error: conversationError } = await supabase.from('ai_conversations').upsert({
        id: state.conversationId,
        user_id: state.userId,
        rolling_summary: state.rollingSummary || null,
        current_safety_level: state.currentSafetyState,
        state_metadata: {
          ...stateMetadata(state),
          ...(ephemeralExpiresAt ? { ephemeralExpiresAt } : {}),
        },
        persistence_enabled: state.persistenceEnabled,
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

    try {
      const { error } = await supabase
        .from('ai_conversations')
        .update({
          persistence_enabled: enabled,
          state_metadata: {
            ...stateMetadata(updated),
            ...(enabled
              ? {}
              : { ephemeralExpiresAt: new Date(Date.now() + EPHEMERAL_TTL_MS).toISOString() }),
          },
          updated_at: updated.updatedAt,
        })
        .eq('id', state.conversationId)
        .eq('user_id', state.userId);
      if (error) throw error;

      if (!enabled && typeof window !== 'undefined') {
        window.sessionStorage.setItem(
          localConversationKey(state.userId, state.conversationId),
          JSON.stringify(updated),
        );
      }
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
        if (window.localStorage.getItem(localCurrentKey(userId)) === conversationId) {
          window.localStorage.removeItem(localCurrentKey(userId));
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
      const { error: conversationError } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('user_id', userId);
      if (conversationError) throw conversationError;

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

  async clearMemories(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('ai_user_memories').delete().eq('user_id', userId).eq('source', 'user_explicit');
      if (error) throw error;
      this.persistenceWarning = false;
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

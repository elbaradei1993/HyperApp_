import { supabase } from '../../lib/supabase';

import type { AssistantResponse, ConversationState, ContextWindow, HyperAppContext } from './types';

interface AssistantFunctionResponse {
  response?: AssistantResponse;
  model?: string;
  promptVersion?: string;
  error?: string;
}

export interface AssistantProviderRequest {
  conversationId: string;
  latestUserMessage: string;
  contextWindow: ContextWindow;
  state: Pick<ConversationState,
    | 'knownFacts'
    | 'userPreferences'
    | 'unresolvedTopics'
    | 'currentIntent'
    | 'previousIntent'
    | 'currentSafetyState'
    | 'lastAssistantAction'
    | 'lastQuestionsAsked'
    | 'lastActionsSuggested'
    | 'lastAdviceTopics'>;
  appContext: HyperAppContext;
}

const REQUEST_TIMEOUT_MS = 30_000;
const MAX_ATTEMPTS = 2;

function wait(milliseconds: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener('abort', () => {
      window.clearTimeout(timeoutId);
      reject(new DOMException('Request cancelled.', 'AbortError'));
    }, { once: true });
  });
}

function publicError(status: number, fallback?: string): Error {
  if (status === 401) return new Error('Your session expired. Sign in again to continue this conversation.');
  if (status === 429) return new Error('Hyper AI is receiving too many requests. Wait a moment and try again.');
  if (status === 503) return new Error('The free Hyper AI allowance is temporarily unavailable. Try again shortly.');
  if (status === 504) return new Error('Hyper AI took too long to respond. Your conversation is still available.');
  return new Error(fallback || 'I couldn’t generate a response right now. Your previous messages are still available. Try again.');
}

export async function requestAssistantResponse(
  request: AssistantProviderRequest,
  signal?: AbortSignal,
): Promise<AssistantResponse> {
  if (signal?.aborted) {
    throw new DOMException('Request cancelled.', 'AbortError');
  }
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
  if (!supabaseUrl || !anonKey) {
    throw new Error('Hyper AI is not configured for this installation.');
  }
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (!accessToken) {
    throw new Error('Sign in before using Hyper AI.');
  }
  if (signal?.aborted) {
    throw new DOMException('Request cancelled.', 'AbortError');
  }

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const forwardAbort = () => controller.abort();
    signal?.addEventListener('abort', forwardAbort, { once: true });
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/hyper-ai`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });
      const payload = await response.json().catch(() => null) as AssistantFunctionResponse | null;
      if (response.ok && payload?.response?.message?.trim()) {
        return payload.response;
      }
      const transient = [502, 503, 504].includes(response.status);
      if (!transient || attempt === MAX_ATTEMPTS - 1) {
        throw publicError(response.status, payload?.error);
      }
    } catch (error) {
      if (signal?.aborted) {
        throw new DOMException('Request cancelled.', 'AbortError');
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new Error('Hyper AI took too long to respond. Your conversation is still available.');
      }
      if (error instanceof TypeError) {
        if (attempt === MAX_ATTEMPTS - 1) {
          throw new Error('Hyper AI could not connect. Check your network and try again.');
        }
      } else {
        throw error;
      }
    } finally {
      window.clearTimeout(timeoutId);
      signal?.removeEventListener('abort', forwardAbort);
    }

    await wait(400 * (2 ** attempt), signal);
  }

  throw new Error('I couldn’t generate a response right now. Your previous messages are still available. Try again.');
}

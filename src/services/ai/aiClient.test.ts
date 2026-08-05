import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { auth: { getSession: mocks.getSession } },
}));

import { requestAssistantResponse } from './aiClient';
import type { AssistantProviderRequest } from './aiClient';

const request: AssistantProviderRequest = {
  conversationId: 'conversation-a',
  latestUserMessage: 'Hello',
  contextWindow: { recentMessages: [], omittedMessages: [], characterCount: 0 },
  state: {
    knownFacts: [],
    userPreferences: [],
    unresolvedTopics: [],
    currentSafetyState: 'LOW',
    lastQuestionsAsked: [],
    lastActionsSuggested: [],
    lastAdviceTopics: [],
  },
  appContext: { availableAppActions: [] },
};

describe('browser AI client failure handling', () => {
  beforeEach(() => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'public-anon-key');
    mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'user-jwt' } } });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('does not retry a free-tier rate limit', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ error: 'provider detail' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAssistantResponse(request)).rejects.toThrow('too many requests');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('retries a transient gateway failure only once', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAssistantResponse(request)).rejects.toThrow('free Hyper AI allowance');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('turns a network failure into a safe user-facing error after one retry', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new TypeError('browser network detail'));
    vi.stubGlobal('fetch', fetchMock);

    await expect(requestAssistantResponse(request)).rejects.toThrow('Check your network');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('turns a provider timeout into a safe user-facing error', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url: string, options: RequestInit) => new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
    })));
    const pending = requestAssistantResponse(request);
    const assertion = expect(pending).rejects.toThrow('took too long');
    await vi.advanceTimersByTimeAsync(30_000);

    await assertion;
  });
});

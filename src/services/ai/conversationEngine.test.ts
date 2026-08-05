import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createConversationState } from './memoryManager';
import type { AssistantResponse, HyperAppContext } from './types';

const mocks = vi.hoisted(() => ({
  request: vi.fn(),
  repository: {
    loadCurrent: vi.fn(),
    create: vi.fn(),
    save: vi.fn(),
    setPersistence: vi.fn(),
    deleteConversation: vi.fn(),
    clearHistory: vi.fn(),
  },
}));

vi.mock('./aiClient', () => ({ requestAssistantResponse: mocks.request }));
vi.mock('./conversationRepository', () => ({ conversationRepository: mocks.repository }));

import { ConversationEngine } from './conversationEngine';

const context: HyperAppContext = { availableAppActions: [] };
const response: AssistantResponse = {
  message: 'Move toward the staffed entrance.',
  safetyLevel: 'ELEVATED',
  suggestedActions: [],
  requiresImmediateAttention: false,
  followUpNeeded: true,
  memoryUpdates: [],
};

describe('ConversationEngine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.repository.loadCurrent.mockResolvedValue(null);
    mocks.repository.create.mockImplementation((userId: string, appContext: HyperAppContext) => (
      Promise.resolve(createConversationState(userId, appContext))
    ));
    mocks.repository.save.mockResolvedValue(true);
    mocks.repository.setPersistence.mockResolvedValue(true);
    mocks.repository.deleteConversation.mockResolvedValue(true);
    mocks.repository.clearHistory.mockResolvedValue(true);
    mocks.request.mockResolvedValue(response);
  });

  it('sends prior turns and answered-question state with the next request', async () => {
    const engine = new ConversationEngine();
    const state = await engine.initialize('user-a', context);
    await engine.generateAssistantResponse({
      conversationId: state.conversationId,
      userId: 'user-a',
      userMessage: 'A man is following me.',
      appContext: context,
    });
    await engine.generateAssistantResponse({
      conversationId: state.conversationId,
      userId: 'user-a',
      userMessage: 'He crossed when I crossed.',
      appContext: context,
    });

    const secondRequest = mocks.request.mock.calls[1][0];
    expect(secondRequest.contextWindow.recentMessages.map((item: { content: string }) => item.content)).toEqual([
      'A man is following me.',
      'Move toward the staffed entrance.',
      'He crossed when I crossed.',
    ]);
  });

  it('coalesces duplicate sends into one provider request', async () => {
    let resolveResponse: ((value: AssistantResponse) => void) | undefined;
    mocks.request.mockReturnValue(new Promise((resolve) => { resolveResponse = resolve; }));
    const engine = new ConversationEngine();
    const state = await engine.initialize('user-a', context);
    const first = engine.generateAssistantResponse({
      conversationId: state.conversationId,
      userId: 'user-a',
      userMessage: 'What should I do now?',
      appContext: context,
    });
    const duplicate = engine.generateAssistantResponse({
      conversationId: state.conversationId,
      userId: 'user-a',
      userMessage: 'What should I do now?',
      appContext: context,
    });
    resolveResponse?.(response);

    await Promise.all([first, duplicate]);
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });

  it('cancels without appending a partial assistant message', async () => {
    mocks.request.mockImplementation((_request: unknown, signal: AbortSignal) => new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(new DOMException('cancelled', 'AbortError')));
    }));
    const engine = new ConversationEngine();
    const state = await engine.initialize('user-a', context);
    const pending = engine.generateAssistantResponse({
      conversationId: state.conversationId,
      userId: 'user-a',
      userMessage: 'Stop this response.',
      appContext: context,
    });
    engine.cancel(state.conversationId);

    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    const messages = engine.getState(state.conversationId)?.recentMessages || [];
    expect(messages.filter((message) => message.role === 'assistant')).toHaveLength(0);
    expect(messages.find((message) => message.role === 'user')?.deliveryStatus).toBe('failed');
  });

  it('deletes persisted data instead of only hiding the conversation', async () => {
    const engine = new ConversationEngine();
    const state = await engine.initialize('user-a', context);
    await expect(engine.deleteConversation('user-a', state.conversationId)).resolves.toBe(true);
    expect(mocks.repository.deleteConversation).toHaveBeenCalledWith('user-a', state.conversationId);
    expect(engine.getState(state.conversationId)).toBeUndefined();
  });
});

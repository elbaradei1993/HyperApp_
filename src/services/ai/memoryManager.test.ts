import { describe, expect, it } from 'vitest';

import {
  applyUserMessageToState,
  createConversationMessage,
  createConversationState,
  getActiveFacts,
} from './memoryManager';
import type { HyperAppContext } from './types';

const context: HyperAppContext = { availableAppActions: [] };

describe('conversation memory', () => {
  it('supersedes an old location when the user corrects it', () => {
    let state = createConversationState('user-a', context);
    state = applyUserMessageToState(state, createConversationMessage('user', 'I am near King George Station.'));
    state = applyUserMessageToState(state, createConversationMessage('user', 'No, I am at Surrey Central.'));

    expect(getActiveFacts(state.knownFacts)).toEqual([
      expect.objectContaining({ key: 'current_location', value: 'Surrey Central' }),
    ]);
    expect(state.knownFacts.find((fact) => fact.value === 'King George Station')?.status).toBe('superseded');
  });

  it('resolves active safety topics when the user reports being safe', () => {
    let state = createConversationState('user-a', context);
    state = applyUserMessageToState(state, createConversationMessage('user', 'Someone is following me right now.'));
    expect(state.currentSafetyState).toBe('ELEVATED');
    expect(state.unresolvedTopics.some((topic) => !topic.resolvedAt)).toBe(true);

    state = applyUserMessageToState(state, createConversationMessage('user', 'I am safe now. They left.'));
    expect(state.currentSafetyState).toBe('LOW');
    expect(state.unresolvedTopics.every((topic) => Boolean(topic.resolvedAt))).toBe(true);
  });

  it('keeps the active risk level through an ambiguous continuation', () => {
    let state = createConversationState('user-a', context);
    state = applyUserMessageToState(state, createConversationMessage('user', 'Someone is attacking me right now.'));
    state = applyUserMessageToState(state, createConversationMessage('user', 'What should I do now?'));
    expect(state.currentSafetyState).toBe('CRITICAL');
  });

  it('does not carry temporary state into a new conversation', () => {
    const first = applyUserMessageToState(
      createConversationState('user-a', context),
      createConversationMessage('user', 'I am at Waterfront Station.'),
    );
    const second = createConversationState('user-a', context);

    expect(first.knownFacts).toHaveLength(1);
    expect(second.knownFacts).toHaveLength(0);
    expect(second.conversationId).not.toBe(first.conversationId);
  });

  it('does not turn emotion or model-style inference into durable facts', () => {
    const state = applyUserMessageToState(
      createConversationState('user-a', context),
      createConversationMessage('user', 'I feel frightened and overwhelmed right now.'),
    );
    expect(state.knownFacts).toEqual([]);
    expect(state.userPreferences).toEqual([]);
  });
});

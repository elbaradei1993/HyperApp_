import { describe, expect, it } from 'vitest';

import { AI_CONTEXT_BUDGET, selectContextWindow, updateRollingSummary } from './contextBudget';
import type { ConversationMessage } from './types';

function message(index: number, content = `message ${index}`): ConversationMessage {
  return {
    id: String(index),
    role: index % 2 ? 'user' : 'assistant',
    content,
    timestamp: new Date(1_700_000_000_000 + index).toISOString(),
  };
}

describe('AI context budgeting', () => {
  it('keeps recent messages in chronological order within the character budget', () => {
    const messages = Array.from({ length: 12 }, (_, index) => message(index, 'x'.repeat(900)));
    const window = selectContextWindow(messages);

    expect(window.recentMessages.map((item) => Number(item.id))).toEqual(
      [...window.recentMessages.map((item) => Number(item.id))].sort((left, right) => left - right),
    );
    expect(window.recentMessages.at(-1)?.id).toBe('11');
    expect(window.characterCount).toBeLessThanOrEqual(AI_CONTEXT_BUDGET.recentMessageCharacters + 32);
    expect(window.characterCount + AI_CONTEXT_BUDGET.appContextCharacters + AI_CONTEXT_BUDGET.maxMessageCharacters)
      .toBeLessThanOrEqual(AI_CONTEXT_BUDGET.totalCharacters + 32);
    expect(window.omittedMessages.length).toBeGreaterThan(0);
  });

  it('compresses omitted content without duplicating prior summary lines', () => {
    const omitted = [message(1, 'I am at Central Station.'), message(2, 'Move to a staffed area.')];
    const first = updateRollingSummary(undefined, omitted);
    const second = updateRollingSummary(first, omitted);

    expect(second).toBe(first);
    expect(second).toContain('Central Station');
  });
});

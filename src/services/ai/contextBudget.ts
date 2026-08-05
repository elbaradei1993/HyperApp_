import type { ContextWindow, ConversationMessage } from './types';

export const AI_CONTEXT_BUDGET = {
  totalCharacters: 12_000,
  recentMessageCharacters: 6_500,
  rollingSummaryCharacters: 2_500,
  appContextCharacters: 2_000,
  maxMessageCharacters: 1_500,
  maxNearbyReports: 6,
} as const;

function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function messageCost(message: ConversationMessage): number {
  return compactWhitespace(message.content).length + 32;
}

export function selectContextWindow(
  messages: ConversationMessage[],
  rollingSummary?: string,
): ContextWindow {
  const selected: ConversationMessage[] = [];
  let characterCount = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const cost = messageCost(message);
    if (selected.length > 0 && characterCount + cost > AI_CONTEXT_BUDGET.recentMessageCharacters) {
      break;
    }
    selected.unshift({
      ...message,
      content: compactWhitespace(message.content).slice(0, AI_CONTEXT_BUDGET.maxMessageCharacters),
    });
    characterCount += Math.min(cost, AI_CONTEXT_BUDGET.maxMessageCharacters + 32);
  }

  const selectedIds = new Set(selected.map((message) => message.id));
  const omittedMessages = messages.filter((message) => !selectedIds.has(message.id));
  const remainingSummaryBudget = Math.max(0, Math.min(
    AI_CONTEXT_BUDGET.rollingSummaryCharacters,
    AI_CONTEXT_BUDGET.totalCharacters
      - AI_CONTEXT_BUDGET.appContextCharacters
      - AI_CONTEXT_BUDGET.maxMessageCharacters
      - characterCount,
  ));
  const summary = remainingSummaryBudget > 0
    ? compactWhitespace(rollingSummary || '').slice(-remainingSummaryBudget)
    : '';

  return {
    recentMessages: selected,
    rollingSummary: summary || undefined,
    omittedMessages,
    characterCount: characterCount + summary.length,
  };
}

function summaryLine(message: ConversationMessage): string {
  const content = compactWhitespace(message.content);
  if (!content) {
    return '';
  }
  const prefix = message.role === 'user' ? 'User' : message.role === 'assistant' ? 'Hyper' : 'System';
  return `${prefix}: ${content.slice(0, 320)}`;
}

export function updateRollingSummary(
  existingSummary: string | undefined,
  omittedMessages: ConversationMessage[],
): string | undefined {
  if (omittedMessages.length === 0) {
    return existingSummary;
  }

  const existingLines = compactWhitespace(existingSummary || '')
    ? (existingSummary || '').split('\n').map(compactWhitespace).filter(Boolean)
    : [];
  const newLines = omittedMessages.map(summaryLine).filter(Boolean);
  const deduplicated: string[] = [];
  const seen = new Set<string>();

  for (const line of [...existingLines, ...newLines]) {
    const normalized = line.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
    if (!normalized || seen.has(normalized)) {
      continue;
    }
    seen.add(normalized);
    deduplicated.push(line);
  }

  while (deduplicated.join('\n').length > AI_CONTEXT_BUDGET.rollingSummaryCharacters) {
    deduplicated.shift();
  }
  return deduplicated.join('\n') || undefined;
}

import { evaluateSafetyRisk, maxSafetyLevel } from '../../../supabase/functions/_shared/safetyGuard';

import type { ConversationMessage, SafetyLevel } from './types';

export { evaluateSafetyRisk };

export function deriveConversationSafety(
  messages: ConversationMessage[],
  previousLevel: SafetyLevel,
): SafetyLevel {
  const latestUserMessage = [...messages].reverse().find((message) => message.role === 'user');
  if (!latestUserMessage) {
    return previousLevel;
  }
  const guard = evaluateSafetyRisk(latestUserMessage.content);
  if (guard.deescalated) {
    return 'LOW';
  }
  return maxSafetyLevel(previousLevel, guard.minimumLevel);
}

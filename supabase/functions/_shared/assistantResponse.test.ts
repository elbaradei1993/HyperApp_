import { describe, expect, it } from 'vitest';

import { parseAssistantResponse } from './assistantResponse';

describe('assistant response validation', () => {
  it('keeps the deterministic safety floor and drops unsupported actions', () => {
    const response = parseAssistantResponse({
      providerPayload: {
        result: { response: JSON.stringify({
          message: '<b>Move into the staffed store now.</b>',
          safetyLevel: 'LOW',
          suggestedActions: [
            { type: 'OPEN_MAP', label: 'Open map', requiresConfirmation: false },
            { type: 'CONTACT_GUARDIAN', label: 'Contact guardian', requiresConfirmation: false },
          ],
          memoryUpdates: [{ key: 'diagnosis', value: 'anxious', source: 'user_explicit' }],
        }) },
      },
      availableActions: [{ type: 'OPEN_MAP', label: 'Open the HyperApp map', requiresConfirmation: false }],
      minimumSafetyLevel: 'HIGH',
      recentAssistantMessages: [],
    });

    expect(response?.message).toBe('Move into the staffed store now.');
    expect(response?.safetyLevel).toBe('HIGH');
    expect(response?.suggestedActions).toEqual([expect.objectContaining({
      type: 'OPEN_MAP',
      label: 'Open the HyperApp map',
      requiresConfirmation: false,
    })]);
    expect(response?.memoryUpdates).toEqual([]);
  });

  it('falls back to safe plain text and removes repeated non-critical sentences', () => {
    const response = parseAssistantResponse({
      providerPayload: { result: { response: 'Move to a staffed place. Open the map now.' } },
      availableActions: [],
      minimumSafetyLevel: 'ELEVATED',
      recentAssistantMessages: ['Move to a staffed place.'],
    });
    expect(response?.message).toBe('Open the map now.');
  });

  it('returns null for malformed empty output instead of crashing', () => {
    expect(parseAssistantResponse({
      providerPayload: { result: { response: '{"safetyLevel":"LOW"}' } },
      availableActions: [],
      minimumSafetyLevel: 'LOW',
      recentAssistantMessages: [],
    })).toBeNull();
  });

  it('does not repeat an action that just completed or failed', () => {
    const response = parseAssistantResponse({
      providerPayload: { result: { response: JSON.stringify({
        message: 'Try sharing again.',
        suggestedActions: [{ type: 'SHARE_LOCATION', label: 'Share', requiresConfirmation: false }],
      }) } },
      availableActions: [{ type: 'SHARE_LOCATION', label: 'Turn on location sharing', requiresConfirmation: true }],
      minimumSafetyLevel: 'ELEVATED',
      recentAssistantMessages: [],
      lastAssistantAction: { type: 'SHARE_LOCATION', status: 'failed' },
    });
    expect(response?.suggestedActions).toEqual([]);
  });
});

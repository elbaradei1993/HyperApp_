import { describe, expect, it } from 'vitest';

import { evaluateSafetyRisk } from './safetyGuard';

describe('deterministic safety guard', () => {
  it.each([
    ['Someone is attacking me right now.', 'CRITICAL'],
    ['There is smoke inside the apartment right now.', 'CRITICAL'],
    ['He is holding a knife at me outside.', 'HIGH'],
    ["I am trapped and they won't let me leave.", 'HIGH'],
    ['A man has been following me for three blocks.', 'ELEVATED'],
  ])('classifies active danger: %s', (text, expected) => {
    expect(evaluateSafetyRisk(text).minimumLevel).toBe(expected);
  });

  it.each([
    'What if someone followed me?',
    'I saw a fire in a movie.',
    'Yesterday a man had a knife.',
    'The news discussed an overdose.',
  ])('does not treat hypothetical or historical material as an active emergency', (text) => {
    expect(evaluateSafetyRisk(text).minimumLevel).toBe('LOW');
  });

  it('de-escalates a resolved situation', () => {
    expect(evaluateSafetyRisk('I reached a safe place and the person left.')).toMatchObject({
      minimumLevel: 'LOW',
      deescalated: true,
    });
  });
});

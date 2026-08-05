import { describe, expect, it } from 'vitest';

import type { Vibe } from '../types';
import { VibeType } from '../types';

import { buildCommunityOverview, isCommunityVerified } from './communityAnalytics';

const NOW = new Date('2026-08-04T12:00:00.000Z');

function report(overrides: Partial<Vibe> & Pick<Vibe, 'id' | 'vibe_type' | 'created_at'>): Vibe {
  return {
    user_id: `user-${overrides.id}`,
    latitude: 49.2,
    longitude: -122.8,
    emergency: false,
    upvotes: 0,
    downvotes: 0,
    updated_at: overrides.created_at,
    ...overrides,
  };
}

describe('buildCommunityOverview', () => {
  it('uses only valid reports from the displayed seven-day period', () => {
    const reports = [
      report({ id: 1, vibe_type: VibeType.Safe, created_at: '2026-08-04T10:00:00.000Z', user_id: 'a', credibility_score: 0.8, validation_count: 3 }),
      report({ id: 2, vibe_type: VibeType.Dangerous, created_at: '2026-08-03T10:00:00.000Z', user_id: 'b' }),
      report({ id: 3, vibe_type: VibeType.Calm, created_at: '2026-07-27T10:00:00.000Z' }),
      report({ id: 4, vibe_type: VibeType.Suspicious, created_at: '2026-08-05T10:00:00.000Z' }),
      report({ id: 5, vibe_type: VibeType.Crowded, created_at: 'not-a-date' }),
    ];
    const originalOrder = reports.map(({ id }) => id);

    const overview = buildCommunityOverview(reports, NOW, 'en-CA');

    expect(overview.weeklyReports.map(({ id }) => id)).toEqual([1, 2]);
    expect(overview.safetyScore).toBe(50);
    expect(overview.previousSafetyScore).toBe(100);
    expect(overview.scoreDelta).toBe(-50);
    expect(overview.attentionReports).toBe(1);
    expect(overview.unverifiedReports).toBe(1);
    expect(overview.contributors).toBe(2);
    expect(reports.map(({ id }) => id)).toEqual(originalOrder);
  });

  it('returns null scores instead of inventing a neutral score when no data exists', () => {
    const overview = buildCommunityOverview([], NOW);

    expect(overview.safetyScore).toBeNull();
    expect(overview.previousSafetyScore).toBeNull();
    expect(overview.scoreDelta).toBeNull();
    expect(overview.distribution).toEqual([]);
  });
});

describe('isCommunityVerified', () => {
  it('requires both two validations and a credibility score of at least 0.65', () => {
    expect(isCommunityVerified(report({ id: 1, vibe_type: VibeType.Safe, created_at: NOW.toISOString(), credibility_score: 0.65, validation_count: 2 }))).toBe(true);
    expect(isCommunityVerified(report({ id: 2, vibe_type: VibeType.Safe, created_at: NOW.toISOString(), credibility_score: 0.9, validation_count: 1 }))).toBe(false);
    expect(isCommunityVerified(report({ id: 3, vibe_type: VibeType.Safe, created_at: NOW.toISOString(), credibility_score: 0.64, validation_count: 4 }))).toBe(false);
  });
});

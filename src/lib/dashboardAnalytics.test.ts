import { describe, expect, it } from 'vitest';

import { VibeType, type SOS, type Vibe } from '../types';

import {
  buildAreaSummaries,
  buildAttentionItems,
  buildDashboardMetrics,
  buildVibeDistribution,
  buildWeeklyTrend,
} from './dashboardAnalytics';

const NOW = new Date('2026-08-03T12:00:00.000Z');

function report(
  id: number,
  vibeType: VibeType,
  createdAt: string,
  overrides: Partial<Vibe> = {},
): Vibe {
  return {
    id,
    user_id: `user-${id}`,
    vibe_type: vibeType,
    notes: '',
    location: 'Central Park',
    latitude: 49.19,
    longitude: -122.83,
    emergency: false,
    upvotes: 0,
    downvotes: 0,
    created_at: createdAt,
    updated_at: createdAt,
    ...overrides,
  };
}

describe('dashboard analytics', () => {
  it('builds live KPI metrics from real report and alert data', () => {
    const vibes = [
      report(1, VibeType.Safe, '2026-08-03T10:00:00.000Z', { user_id: 'me' }),
      report(2, VibeType.Calm, '2026-08-02T10:00:00.000Z', { user_id: 'me' }),
      report(3, VibeType.Dangerous, '2026-08-01T10:00:00.000Z'),
      report(4, VibeType.Quiet, '2026-07-01T10:00:00.000Z', { user_id: 'me' }),
    ];
    const alerts: SOS[] = [
      report(5, VibeType.Dangerous, '2026-08-03T11:00:00.000Z', { emergency: true }) as SOS,
    ];

    expect(buildDashboardMetrics(vibes, alerts, 'me', NOW)).toEqual({
      reportsToday: 2,
      weeklyReports: 4,
      safetyScore: 50,
      contributors: 3,
      activeAlerts: 1,
      monthlyUserReports: 2,
      monthlyGoal: 4,
      monthlyGoalProgress: 50,
    });
  });

  it('returns seven trend points and keeps empty days nullable', () => {
    const trend = buildWeeklyTrend([
      report(1, VibeType.Safe, '2026-08-03T10:00:00.000Z'),
      report(2, VibeType.Dangerous, '2026-08-03T11:00:00.000Z'),
    ], NOW, 'en-CA');

    expect(trend).toHaveLength(7);
    expect(trend.slice(0, 6).every((point) => point.score === null)).toBe(true);
    expect(trend[6]).toMatchObject({ reports: 2, positive: 1, score: 50 });
  });

  it('groups recent areas and reports the latest coordinates', () => {
    const areas = buildAreaSummaries([
      report(1, VibeType.Safe, '2026-08-01T10:00:00.000Z'),
      report(2, VibeType.Calm, '2026-08-03T09:00:00.000Z', { latitude: 49.2, longitude: -122.8 }),
      report(3, VibeType.Dangerous, '2026-08-02T09:00:00.000Z', { location: 'Market Square' }),
    ], NOW);

    expect(areas[0]).toMatchObject({ label: 'Central Park', reports: 2, safetyScore: 100, latitude: 49.2 });
    expect(areas[1]).toMatchObject({ label: 'Market Square', reports: 1, safetyScore: 0 });
  });

  it('prioritizes recent alerts and risky vibes while ignoring stale signals', () => {
    const attention = buildAttentionItems([
      report(1, VibeType.Suspicious, '2026-08-03T10:00:00.000Z'),
      report(2, VibeType.Safe, '2026-08-03T11:00:00.000Z'),
      report(3, VibeType.Dangerous, '2026-07-30T10:00:00.000Z'),
    ], [
      report(4, VibeType.Dangerous, '2026-08-03T11:30:00.000Z', { emergency: true }) as SOS,
    ], NOW);

    expect(attention.map((item) => item.id)).toEqual([4, 1]);
    expect(attention[0].type).toBe('alert');
  });

  it('calculates the current vibe distribution', () => {
    const distribution = buildVibeDistribution([
      report(1, VibeType.Safe, '2026-08-03T10:00:00.000Z'),
      report(2, VibeType.Safe, '2026-08-02T10:00:00.000Z'),
      report(3, VibeType.Calm, '2026-08-01T10:00:00.000Z'),
    ], NOW);

    expect(distribution).toEqual([
      { type: 'safe', count: 2, percentage: 67 },
      { type: 'calm', count: 1, percentage: 33 },
    ]);
  });
});

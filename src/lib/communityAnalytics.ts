import type { Report, Vibe } from '../types';

import { buildWeeklyTrend, type WeeklyTrendPoint } from './dashboardAnalytics';
import { calculateSafetyScore } from './safetyAnalytics';

const DAY_MS = 24 * 60 * 60 * 1000;
const ATTENTION_VIBES = new Set(['dangerous', 'suspicious']);

export interface CommunityDistributionItem {
  type: string;
  count: number;
  percentage: number;
}

export interface CommunityOverview {
  weeklyReports: Vibe[];
  recentReports: Vibe[];
  trend: WeeklyTrendPoint[];
  distribution: CommunityDistributionItem[];
  safetyScore: number | null;
  previousSafetyScore: number | null;
  scoreDelta: number | null;
  contributors: number;
  activeDays: number;
  aboveTargetDays: number;
  attentionReports: number;
  crowdedReports: number;
  unverifiedReports: number;
}

function timestamp(report: Report): number | null {
  const value = new Date(report.created_at).getTime();
  return Number.isFinite(value) ? value : null;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isCommunityVerified(report: Report): boolean {
  return (report.validation_count ?? 0) >= 2 && (report.credibility_score ?? 0) >= 0.65;
}

export function selectReviewableReports(
  reports: Vibe[],
  currentUserId?: string,
  limit = 10,
): Vibe[] {
  return [...reports]
    .filter((report) => !currentUserId || report.user_id !== currentUserId)
    .sort((a, b) => (timestamp(b) ?? 0) - (timestamp(a) ?? 0))
    .slice(0, Math.max(0, limit));
}

export function buildCommunityOverview(
  reports: Vibe[],
  now: Date = new Date(),
  locale = 'en-CA',
): CommunityOverview {
  const periodStart = startOfLocalDay(new Date(now.getTime() - (6 * DAY_MS))).getTime();
  const periodEnd = now.getTime() + 1;
  const previousStart = periodStart - (7 * DAY_MS);

  const validReports = reports.filter((report) => timestamp(report) !== null);
  const weeklyReports = validReports.filter((report) => {
    const value = timestamp(report)!;
    return value >= periodStart && value < periodEnd;
  });
  const previousReports = validReports.filter((report) => {
    const value = timestamp(report)!;
    return value >= previousStart && value < periodStart;
  });

  const safetyScore = weeklyReports.length > 0 ? calculateSafetyScore(weeklyReports) : null;
  const previousSafetyScore = previousReports.length > 0 ? calculateSafetyScore(previousReports) : null;
  const counts = new Map<string, number>();

  weeklyReports.forEach((report) => {
    counts.set(report.vibe_type, (counts.get(report.vibe_type) ?? 0) + 1);
  });

  const distribution = Array.from(counts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / weeklyReports.length) * 100),
    }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type));

  const trend = buildWeeklyTrend(weeklyReports, now, locale);

  return {
    weeklyReports,
    recentReports: [...weeklyReports]
      .sort((a, b) => timestamp(b)! - timestamp(a)!)
      .slice(0, 10),
    trend,
    distribution,
    safetyScore,
    previousSafetyScore,
    scoreDelta: safetyScore !== null && previousSafetyScore !== null
      ? safetyScore - previousSafetyScore
      : null,
    contributors: new Set(weeklyReports.map((report) => report.user_id).filter(Boolean)).size,
    activeDays: trend.filter((point) => point.reports > 0).length,
    aboveTargetDays: trend.filter((point) => point.score !== null && point.score >= 70).length,
    attentionReports: weeklyReports.filter((report) => ATTENTION_VIBES.has(report.vibe_type)).length,
    crowdedReports: weeklyReports.filter((report) => report.vibe_type === 'crowded').length,
    unverifiedReports: weeklyReports.filter((report) => !isCommunityVerified(report)).length,
  };
}

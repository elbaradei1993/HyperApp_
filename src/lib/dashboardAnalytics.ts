import type { Report, SOS, Vibe } from '../types';

import { calculateSafetyScore } from './safetyAnalytics';

const DAY_MS = 24 * 60 * 60 * 1000;
const POSITIVE_VIBES = new Set(['safe', 'calm', 'quiet']);
const ATTENTION_VIBES = new Set(['dangerous', 'suspicious', 'crowded']);

export interface DashboardMetrics {
  reportsToday: number;
  weeklyReports: number;
  safetyScore: number | null;
  contributors: number;
  activeAlerts: number;
  monthlyUserReports: number;
  monthlyGoal: number;
  monthlyGoalProgress: number;
}

export interface WeeklyTrendPoint {
  date: string;
  label: string;
  score: number | null;
  reports: number;
  positive: number;
}

export interface VibeDistributionItem {
  type: string;
  count: number;
  percentage: number;
}

export interface AreaSummary {
  key: string;
  label: string;
  reports: number;
  safetyScore: number;
  lastUpdated: string;
  latitude: number;
  longitude: number;
}

export interface AttentionItem {
  id: number;
  type: 'alert' | 'report';
  vibeType: string;
  location: string;
  createdAt: string;
  notes?: string;
  latitude: number;
  longitude: number;
}

function isValidDate(date: Date): boolean {
  return !Number.isNaN(date.getTime());
}

function reportTime(report: Report): number {
  const date = new Date(report.created_at);
  return isValidDate(date) ? date.getTime() : 0;
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function reportsSince(reports: Report[], from: number, to: number): Report[] {
  return reports.filter((report) => {
    const timestamp = reportTime(report);
    return timestamp >= from && timestamp < to;
  });
}

export function buildDashboardMetrics(
  vibes: Vibe[],
  sosAlerts: SOS[],
  userId?: string,
  now: Date = new Date(),
  monthlyGoal = 4,
): DashboardMetrics {
  const allReports: Report[] = [...vibes, ...sosAlerts];
  const nowTime = now.getTime();
  const todayStart = startOfLocalDay(now).getTime();
  const weekStart = nowTime - (7 * DAY_MS);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

  const reportsToday = reportsSince(allReports, todayStart, nowTime + 1);
  const weeklyReports = reportsSince(allReports, weekStart, nowTime + 1);
  const activeAlerts = reportsSince(sosAlerts, nowTime - DAY_MS, nowTime + 1);
  const monthlyUserReports = vibes.filter((report) => (
    report.user_id === userId
    && reportTime(report) >= monthStart
    && reportTime(report) <= nowTime
  ));

  return {
    reportsToday: reportsToday.length,
    weeklyReports: weeklyReports.length,
    safetyScore: weeklyReports.length > 0 ? calculateSafetyScore(weeklyReports) : null,
    contributors: new Set(weeklyReports.map((report) => report.user_id).filter(Boolean)).size,
    activeAlerts: activeAlerts.length,
    monthlyUserReports: monthlyUserReports.length,
    monthlyGoal,
    monthlyGoalProgress: Math.min(100, Math.round((monthlyUserReports.length / monthlyGoal) * 100)),
  };
}

export function buildWeeklyTrend(
  reports: Report[],
  now: Date = new Date(),
  locale = 'en-CA',
): WeeklyTrendPoint[] {
  const today = startOfLocalDay(now);

  return Array.from({ length: 7 }, (_, index) => {
    const dayStart = new Date(today.getTime() - ((6 - index) * DAY_MS));
    const dayEnd = new Date(dayStart.getTime() + DAY_MS);
    const dailyReports = reportsSince(reports, dayStart.getTime(), dayEnd.getTime());
    const positive = dailyReports.filter((report) => POSITIVE_VIBES.has(report.vibe_type)).length;

    return {
      date: dayStart.toISOString(),
      label: dayStart.toLocaleDateString(locale, { weekday: 'short' }).slice(0, 2),
      score: dailyReports.length > 0 ? calculateSafetyScore(dailyReports) : null,
      reports: dailyReports.length,
      positive,
    };
  });
}

export function buildVibeDistribution(reports: Report[], now: Date = new Date()): VibeDistributionItem[] {
  const monthReports = reportsSince(reports, now.getTime() - (30 * DAY_MS), now.getTime() + 1);
  const counts = new Map<string, number>();

  monthReports.forEach((report) => {
    counts.set(report.vibe_type, (counts.get(report.vibe_type) ?? 0) + 1);
  });

  return Array.from(counts.entries())
    .map(([type, count]) => ({
      type,
      count,
      percentage: monthReports.length > 0 ? Math.round((count / monthReports.length) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 4);
}

export function buildAreaSummaries(reports: Report[], now: Date = new Date()): AreaSummary[] {
  const recentReports = reportsSince(reports, now.getTime() - (30 * DAY_MS), now.getTime() + 1);
  const groups = new Map<string, Report[]>();

  recentReports.forEach((report) => {
    const location = report.location?.trim();
    const key = location || `${report.latitude.toFixed(2)},${report.longitude.toFixed(2)}`;
    groups.set(key, [...(groups.get(key) ?? []), report]);
  });

  return Array.from(groups.entries())
    .map(([key, areaReports]) => {
      const sorted = [...areaReports].sort((a, b) => reportTime(b) - reportTime(a));
      const latest = sorted[0];

      return {
        key,
        label: latest.location?.trim() || key,
        reports: areaReports.length,
        safetyScore: calculateSafetyScore(areaReports),
        lastUpdated: latest.created_at,
        latitude: latest.latitude,
        longitude: latest.longitude,
      };
    })
    .sort((a, b) => b.reports - a.reports || new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime())
    .slice(0, 3);
}

export function buildAttentionItems(
  vibes: Vibe[],
  sosAlerts: SOS[],
  now: Date = new Date(),
): AttentionItem[] {
  const from = now.getTime() - (48 * 60 * 60 * 1000);
  const items: AttentionItem[] = [
    ...sosAlerts.map((report) => ({ report, type: 'alert' as const })),
    ...vibes
      .filter((report) => ATTENTION_VIBES.has(report.vibe_type))
      .map((report) => ({ report, type: 'report' as const })),
  ]
    .filter(({ report }) => reportTime(report) >= from && reportTime(report) <= now.getTime())
    .sort((a, b) => reportTime(b.report) - reportTime(a.report))
    .slice(0, 3)
    .map(({ report, type }) => ({
      id: report.id,
      type,
      vibeType: report.vibe_type,
      location: report.location?.trim() || `${report.latitude.toFixed(2)}, ${report.longitude.toFixed(2)}`,
      createdAt: report.created_at,
      notes: report.notes,
      latitude: report.latitude,
      longitude: report.longitude,
    }));

  return items;
}

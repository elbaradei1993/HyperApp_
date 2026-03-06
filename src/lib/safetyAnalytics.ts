import type { Report } from '../types';

// Safety-related vibe types
const POSITIVE_SAFETY_VIBES = ['safe', 'calm', 'quiet'];
const NEGATIVE_SAFETY_VIBES = ['dangerous', 'suspicious'];

export interface SafetyDataPoint {
  time: Date;
  safetyScore: number;
  totalReports: number;
  positiveReports: number;
  negativeReports: number;
  hourLabel: string;
}

/**
 * Calculate safety score for a set of reports
 * Returns a percentage (0-100) where higher is safer
 */
export function calculateSafetyScore(reports: Report[]): number {
  if (reports.length === 0) {
    return 50;
  } // Neutral score when no data

  const positiveCount = reports.filter(r => POSITIVE_SAFETY_VIBES.includes(r.vibe_type)).length;
  const totalCount = reports.length;

  return Math.round((positiveCount / totalCount) * 100);
}

/**
 * Group reports by hour and calculate safety trends over time
 */
export function calculateSafetyTrends(reports: Report[], hoursBack: number = 24): SafetyDataPoint[] {
  const now = new Date();
  const dataPoints: SafetyDataPoint[] = [];

  // Create data points for each hour
  for (let i = hoursBack - 1; i >= 0; i--) {
    const hourStart = new Date(now.getTime() - (i * 60 * 60 * 1000));
    const hourEnd = new Date(hourStart.getTime() + (60 * 60 * 1000));

    // Filter reports for this hour
    const hourReports = reports.filter(report => {
      const reportTime = new Date(report.created_at);
      return reportTime >= hourStart && reportTime < hourEnd;
    });

    // Calculate safety metrics
    const positiveReports = hourReports.filter(r => POSITIVE_SAFETY_VIBES.includes(r.vibe_type)).length;
    const negativeReports = hourReports.filter(r => NEGATIVE_SAFETY_VIBES.includes(r.vibe_type)).length;
    const totalReports = hourReports.length;

    const safetyScore = totalReports > 0
      ? Math.round((positiveReports / totalReports) * 100)
      : null; // null when no reports

    // Format hour label
    const hourLabel = hourStart.toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: true,
    });

    dataPoints.push({
      time: hourStart,
      safetyScore: safetyScore !== null ? safetyScore : 50, // Default to 50 when no data
      totalReports,
      positiveReports,
      negativeReports,
      hourLabel,
    });
  }

  return dataPoints;
}

/**
 * Get safety level description based on score
 */
export function getSafetyLevel(score: number): {
  level: 'safe' | 'moderate' | 'caution' | 'unknown';
  color: string;
  description: string;
} {
  if (score >= 70) {
    return {
      level: 'safe',
      color: '#10b981',
      description: 'Safe',
    };
  } else if (score >= 40) {
    return {
      level: 'moderate',
      color: '#f59e0b',
      description: 'Moderate',
    };
  } else if (score >= 0) {
    return {
      level: 'caution',
      color: '#ef4444',
      description: 'Caution',
    };
  } else {
    return {
      level: 'unknown',
      color: '#6b7280',
      description: 'Unknown',
    };
  }
}

/**
 * Get trend direction based on recent data points
 */
export function getSafetyTrend(dataPoints: SafetyDataPoint[]): 'improving' | 'declining' | 'stable' | 'unknown' {
  if (dataPoints.length < 3) {
    return 'unknown';
  }

  const recent = dataPoints.slice(-3); // Last 3 hours
  const scores = recent.map(d => d.safetyScore).filter(s => s !== null);

  if (scores.length < 2) {
    return 'unknown';
  }

  const first = scores[0];
  const last = scores[scores.length - 1];
  const diff = last - first;

  if (diff > 5) {
    return 'improving';
  }
  if (diff < -5) {
    return 'declining';
  }
  return 'stable';
}

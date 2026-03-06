import type { Report } from '../types';
import { VibeType } from '../types';

export interface TimePattern {
  hour: number;
  dayOfWeek: number;
  reportCount: number;
  percentage: number;
  peakHours: boolean;
}

export interface Hotspot {
  latitude: number;
  longitude: number;
  locationName?: string;
  activityChange: number; // percentage change
  currentReports: number;
  previousReports: number;
  timeframe: string;
}

export interface VibeCorrelation {
  vibeA: VibeType;
  vibeB: VibeType;
  correlation: number; // -1 to 1, where 1 means they always appear together
  confidence: number; // based on sample size
  sampleSize: number;
  description: string;
}

export interface AnalyticsResult {
  busiestHours: TimePattern[];
  emergingHotspots: Hotspot[];
  vibeCorrelations: VibeCorrelation[];
  totalReports: number;
  analyzedTimeframe: {
    start: Date;
    end: Date;
  };
}

/**
 * Advanced analytics engine for community insights
 */
export class CommunityAnalytics {

  /**
   * Analyze time patterns in reporting activity
   */
  static analyzeTimePatterns(reports: Report[]): TimePattern[] {
    if (reports.length === 0) {
      return [];
    }

    // Group reports by hour of day and day of week
    const hourlyStats: Record<string, number> = {};
    const totalReports = reports.length;

    reports.forEach(report => {
      const date = new Date(report.created_at);
      const hour = date.getHours();
      const dayOfWeek = date.getDay(); // 0 = Sunday, 6 = Saturday

      const key = `${dayOfWeek}-${hour}`;
      hourlyStats[key] = (hourlyStats[key] || 0) + 1;
    });

    // Convert to TimePattern array
    const patterns: TimePattern[] = [];
    const maxReports = Math.max(...Object.values(hourlyStats));

    for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
      for (let hour = 0; hour < 24; hour++) {
        const key = `${dayOfWeek}-${hour}`;
        const reportCount = hourlyStats[key] || 0;
        const percentage = totalReports > 0 ? (reportCount / totalReports) * 100 : 0;

        patterns.push({
          hour,
          dayOfWeek,
          reportCount,
          percentage,
          peakHours: reportCount >= maxReports * 0.7, // Top 30% of busiest times
        });
      }
    }

    return patterns.sort((a, b) => b.reportCount - a.reportCount);
  }

  /**
   * Detect emerging hotspots by comparing recent activity to historical baseline
   */
  static detectEmergingHotspots(reports: Report[], daysBack: number = 7): Hotspot[] {
    if (reports.length === 0) {
      return [];
    }

    const now = new Date();
    const cutoffDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    // Split reports into recent and historical
    const recentReports = reports.filter(r => new Date(r.created_at) >= cutoffDate);
    const historicalReports = reports.filter(r => new Date(r.created_at) < cutoffDate);

    // Group by location clusters (simplified grid-based clustering)
    const gridSize = 0.01; // ~1km grid

    const getGridKey = (lat: number, lng: number) => {
      const gridLat = Math.round(lat / gridSize);
      const gridLng = Math.round(lng / gridSize);
      return `${gridLat}-${gridLng}`;
    };

    const recentClusters: Record<string, { reports: Report[], center: [number, number] }> = {};
    const historicalClusters: Record<string, { reports: Report[], center: [number, number] }> = {};

    // Build recent clusters
    recentReports.forEach(report => {
      if (report.latitude == null || report.longitude == null) {
        return;
      }

      const key = getGridKey(report.latitude, report.longitude);
      if (!recentClusters[key]) {
        recentClusters[key] = {
          reports: [],
          center: [report.latitude, report.longitude],
        };
      }
      recentClusters[key].reports.push(report);
    });

    // Build historical clusters
    historicalReports.forEach(report => {
      if (report.latitude == null || report.longitude == null) {
        return;
      }

      const key = getGridKey(report.latitude, report.longitude);
      if (!historicalClusters[key]) {
        historicalClusters[key] = {
          reports: [],
          center: [report.latitude, report.longitude],
        };
      }
      historicalClusters[key].reports.push(report);
    });

    // Calculate hotspots
    const hotspots: Hotspot[] = [];

    Object.entries(recentClusters).forEach(([key, recentCluster]) => {
      const historicalCluster = historicalClusters[key];
      const currentReports = recentCluster.reports.length;
      const previousReports = historicalCluster ? historicalCluster.reports.length : 0;

      if (currentReports >= 3) { // Minimum threshold for significance
        const baseline = Math.max(previousReports, 1); // Avoid division by zero
        const activityChange = ((currentReports - previousReports) / baseline) * 100;

        if (activityChange >= 25) { // 25% increase threshold
          hotspots.push({
            latitude: recentCluster.center[0],
            longitude: recentCluster.center[1],
            activityChange,
            currentReports,
            previousReports,
            timeframe: `${daysBack} days`,
          });
        }
      }
    });

    return hotspots.sort((a, b) => b.activityChange - a.activityChange);
  }

  /**
   * Calculate correlations between different vibe types
   */
  static calculateVibeCorrelations(reports: Report[]): VibeCorrelation[] {
    if (reports.length === 0) {
      return [];
    }

    // Group reports by location clusters to find co-occurring vibes
    const gridSize = 0.005; // Smaller grid for correlation analysis
    const clusters: Record<string, Report[]> = {};

    reports.forEach(report => {
      if (report.latitude == null || report.longitude == null) {
        return;
      }

      const key = `${Math.round(report.latitude / gridSize)}-${Math.round(report.longitude / gridSize)}`;
      if (!clusters[key]) {
        clusters[key] = [];
      }
      clusters[key].push(report);
    });

    // Calculate vibe co-occurrence matrix
    const vibePairs: Record<string, { together: number, total: number }> = {};
    const allVibes = Object.values(VibeType);

    Object.values(clusters).forEach(clusterReports => {
      if (clusterReports.length < 2) {
        return;
      } // Need at least 2 reports for correlation

      const vibesInCluster = new Set(clusterReports.map(r => r.vibe_type));

      // Check all possible vibe pairs
      allVibes.forEach(vibeA => {
        allVibes.forEach(vibeB => {
          if (vibeA >= vibeB) {
            return;
          } // Avoid duplicate pairs

          const key = `${vibeA}-${vibeB}`;
          if (!vibePairs[key]) {
            vibePairs[key] = { together: 0, total: 0 };
          }

          vibePairs[key].total++;

          if (vibesInCluster.has(vibeA) && vibesInCluster.has(vibeB)) {
            vibePairs[key].together++;
          }
        });
      });
    });

    // Calculate correlation coefficients
    const correlations: VibeCorrelation[] = [];

    Object.entries(vibePairs).forEach(([key, stats]) => {
      if (stats.total < 5) {
        return;
      } // Minimum sample size

      const [vibeA, vibeB] = key.split('-') as [VibeType, VibeType];
      const pAB = stats.together / stats.total; // P(A and B)
      const pA = stats.together / stats.total; // Simplified - assuming equal distribution
      const pB = stats.together / stats.total;

      // Phi coefficient for binary correlation
      const numerator = pAB - (pA * pB);
      const denominator = Math.sqrt(pA * (1 - pA) * pB * (1 - pB));

      const correlation = denominator !== 0 ? numerator / denominator : 0;
      const confidence = Math.min(stats.total / 10, 1); // Confidence based on sample size

      if (Math.abs(correlation) >= 0.1) { // Minimum correlation threshold
        correlations.push({
          vibeA,
          vibeB,
          correlation,
          confidence,
          sampleSize: stats.total,
          description: this.generateCorrelationDescription(vibeA, vibeB, correlation),
        });
      }
    });

    return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
  }

  /**
   * Generate human-readable correlation descriptions
   */
  private static generateCorrelationDescription(vibeA: VibeType, vibeB: VibeType, correlation: number): string {
    const strength = Math.abs(correlation);
    const direction = correlation > 0 ? 'tend to appear together' : 'rarely appear together';

    let strengthText = '';
    if (strength >= 0.7) {
      strengthText = 'strongly';
    } else if (strength >= 0.4) {
      strengthText = 'moderately';
    } else {
      strengthText = 'weakly';
    }

    return `${vibeA} and ${vibeB} ${strengthText} ${direction}`;
  }

  /**
   * Run complete analytics suite
   */
  static async analyzeCommunity(reports: Report[]): Promise<AnalyticsResult> {
    const busiestHours = this.analyzeTimePatterns(reports);
    const emergingHotspots = this.detectEmergingHotspots(reports);
    const vibeCorrelations = this.calculateVibeCorrelations(reports);

    // Calculate timeframe
    const timestamps = reports.map(r => new Date(r.created_at));
    const startDate = timestamps.length > 0 ? new Date(Math.min(...timestamps.map(d => d.getTime()))) : new Date();
    const endDate = timestamps.length > 0 ? new Date(Math.max(...timestamps.map(d => d.getTime()))) : new Date();

    return {
      busiestHours,
      emergingHotspots,
      vibeCorrelations,
      totalReports: reports.length,
      analyzedTimeframe: {
        start: startDate,
        end: endDate,
      },
    };
  }
}

export default CommunityAnalytics;

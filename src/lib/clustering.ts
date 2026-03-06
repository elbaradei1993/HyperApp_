import type { Vibe } from '../types';

export interface LocationCluster {
  id: string;
  center: [number, number];
  reports: Vibe[];
  locationName: string;
  dominantVibe: {
    type: string;
    percentage: number;
    count: number;
  };
  topVibes: Array<{
    type: string;
    percentage: number;
    count: number;
  }>;
  reportCount: number;
  distance: number; // distance from user location in km
}

/**
 * Calculate distance between two coordinates using Haversine formula
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Simple clustering algorithm using distance-based grouping
 * Groups reports within 1km radius of each other
 * Handles reports without coordinates by grouping by location text
 */
export function clusterReports(
  reports: Vibe[],
  userLocation: [number, number] | null,
  maxDistanceKm: number = 1,
): LocationCluster[] {
  const clusters: LocationCluster[] = [];
  const processed = new Set<number>();

  // Separate reports with and without coordinates
  const reportsWithCoords = reports.filter(r => r.latitude != null && r.longitude != null);
  const reportsWithoutCoords = reports.filter(r => r.latitude == null || r.longitude == null);

  // First, cluster reports with coordinates AND location names using distance-based grouping
  for (const report of reportsWithCoords) {
    if (processed.has(report.id) || !report.location || report.location.trim() === '') {
      continue;
    }

    // Start a new cluster with this report
    const clusterReports = [report];
    processed.add(report.id);

    // Find all reports within maxDistanceKm of this report that also have location names
    for (const otherReport of reportsWithCoords) {
      if (processed.has(otherReport.id) || !otherReport.location || otherReport.location.trim() === '') {
        continue;
      }

      const distance = calculateDistance(
        report.latitude!,
        report.longitude!,
        otherReport.latitude!,
        otherReport.longitude!,
      );

      if (distance <= maxDistanceKm) {
        clusterReports.push(otherReport);
        processed.add(otherReport.id);
      }
    }

    // Calculate cluster center (centroid)
    const centerLat = clusterReports.reduce((sum, r) => sum + r.latitude!, 0) / clusterReports.length;
    const centerLng = clusterReports.reduce((sum, r) => sum + r.longitude!, 0) / clusterReports.length;

    // Calculate distance from user location
    let distance = 0;
    if (userLocation) {
      distance = calculateDistance(
        userLocation[0],
        userLocation[1],
        centerLat,
        centerLng,
      );
    }

    // Analyze vibes in this cluster
    const vibeAnalysis = analyzeClusterVibes(clusterReports);

    const cluster: LocationCluster = {
      id: `cluster_coord_${report.id}_${Date.now()}`,
      center: [centerLat, centerLng],
      reports: clusterReports,
      locationName: report.location,
      dominantVibe: vibeAnalysis.dominantVibe,
      topVibes: vibeAnalysis.topVibes,
      reportCount: clusterReports.length,
      distance,
    };

    clusters.push(cluster);
  }

  // Then, group reports without coordinates by location text (only if they have location names)
  const locationGroups: Record<string, Vibe[]> = {};
  for (const report of reportsWithoutCoords) {
    if (processed.has(report.id) || !report.location || report.location.trim() === '') {
      continue;
    }

    const locationKey = report.location;
    if (!locationGroups[locationKey]) {
      locationGroups[locationKey] = [];
    }
    locationGroups[locationKey].push(report);
    processed.add(report.id);
  }

  // Create clusters for location-based groups (only if we have user location)
  if (userLocation) {
    for (const [locationName, locationReports] of Object.entries(locationGroups)) {
      if (locationReports.length === 0 || !locationName || locationName.trim() === '') {
        continue;
      }

      // Use user location as center for location-based clusters
      const centerLat = userLocation[0];
      const centerLng = userLocation[1];

      // For location-based clusters, assume they're at user location
      const distance = 0;

      // Analyze vibes in this cluster
      const vibeAnalysis = analyzeClusterVibes(locationReports);

      const cluster: LocationCluster = {
        id: `cluster_location_${locationName.replace(/\s+/g, '_')}_${Date.now()}`,
        center: [centerLat, centerLng],
        reports: locationReports,
        locationName,
        dominantVibe: vibeAnalysis.dominantVibe,
        topVibes: vibeAnalysis.topVibes,
        reportCount: locationReports.length,
        distance,
      };

      clusters.push(cluster);
    }
  }

  // Sort clusters by distance from user (closest first), then by report count
  return clusters.sort((a, b) => {
    if (a.distance !== b.distance) {
      return a.distance - b.distance;
    }
    return b.reportCount - a.reportCount;
  });
}

/**
 * Analyze the vibe distribution in a cluster
 */
export function analyzeClusterVibes(reports: Vibe[]): {
  dominantVibe: { type: string; percentage: number; count: number };
  topVibes: Array<{ type: string; percentage: number; count: number }>;
} {
  if (reports.length === 0) {
    return {
      dominantVibe: { type: 'unknown', percentage: 0, count: 0 },
      topVibes: [],
    };
  }

  // Count vibes
  const vibeCounts: Record<string, number> = {};
  for (const report of reports) {
    const vibeType = report.vibe_type;
    vibeCounts[vibeType] = (vibeCounts[vibeType] || 0) + 1;
  }

  // Calculate percentages and sort
  const totalReports = reports.length;
  const vibeStats = Object.entries(vibeCounts)
    .map(([type, count]) => ({
      type,
      count,
      percentage: Math.round((count / totalReports) * 100),
    }))
    .sort((a, b) => b.count - a.count);

  const dominantVibe = vibeStats[0] || { type: 'unknown', percentage: 0, count: 0 };
  const topVibes = vibeStats.slice(1, 4); // Top 3 additional vibes

  return {
    dominantVibe,
    topVibes,
  };
}

/**
 * Get a human-readable distance string
 */
export function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) {
    return `${Math.round(distanceKm * 1000)}m`;
  }
  return `${distanceKm.toFixed(1)}km`;
}

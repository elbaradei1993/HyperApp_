import { supabase } from '../lib/supabase';

import { weatherService } from './weatherService';
import { geocodingService } from './geocodingService';
import { eventService } from './eventService';

// Types for Hub data
export interface WeatherData {
  temperature: number;
  condition: string;
  rainStartsIn?: number;
  visibility: 'Low' | 'Medium' | 'High';
  pedestrianTraffic: number;
  visibilityChange: number;
  windSpeed?: number;
  windDirection?: number;
  humidity?: number;
  uvIndex?: number;
  hourlyForecast?: Array<{
    time: string;
    temperature: number;
    condition: string;
    precipitationProbability: number;
  }>;
}

export interface EventData {
  id: string;
  time: string;
  event: string;
  impact: string;
  tag: string;
  latitude?: number;
  longitude?: number;
}

export interface InfrastructureData {
  streetlights: number;
  sidewalks: 'Clear' | 'Blocked' | 'Under Repair' | 'No Reports';
  construction: number;
  potholes: number;
  traffic: number;
  other: number;
  reports: string[];
  hasReports: boolean;
}

export interface NeighborhoodRhythm {
  peakActivity: string;
  quietPeriod: string;
  activityData: number[];
  dataQuality: 'low' | 'medium' | 'high';
  totalReports: number;
  timeRange: string;
  activityLevels: ('low' | 'medium' | 'high')[];
  insights: string[];
}



export interface SafetyScore {
  venue: string;
  details: string;
  score: number;
  factors: {
    lighting: number;
    security: number;
    staffTraining: number;
    emergencyAccess: number;
  };
  lastUpdated: string;
  totalReports: number;
  officialInspections: number;
  incidentResponses: number;
}

export interface VenueVerification {
  id: string;
  name: string;
  address: string;
  qrCode?: string;
  status: 'verified' | 'pending' | 'flagged';
  lastVerified: string;
  verificationCount: number;
}

export interface VerifiableVenue {
  id: string;
  name: string;
  type: string;
  address: string;
  latitude: number;
  longitude: number;
  distance: number;
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'flagged';
  verificationCount: number;
  lastVerified?: string;
  category: 'restaurant' | 'bar' | 'cafe' | 'cinema' | 'club' | 'shop' | 'other';
  safetyScore?: number;
}

class HubService {
  // Utility function for rate limiting API calls
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Weather data using OpenWeatherMap API
  async getWeatherData(latitude: number, longitude: number): Promise<WeatherData> {
    if (!latitude || !longitude) {
      throw new Error('Location coordinates are required');
    }
    return await weatherService.getCurrentWeather(latitude, longitude);
  }

  // Event data using event service
  async getLocalEvents(latitude: number, longitude: number, radius: number = 5): Promise<EventData[]> {
    try {
      const events = await eventService.getLocalEvents(latitude, longitude, radius);

      return events.map(event => {
        const startTime = new Date(event.startTime);
        const now = new Date();
        const timeDiff = startTime.getTime() - now.getTime();
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        let timeString: string;
        if (hoursDiff < 1) {
          timeString = 'NOW';
        } else if (hoursDiff < 24) {
          timeString = startTime.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          });
        } else {
          timeString = startTime.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          });
        }

        // Calculate impact based on event type and attendee count
        let impact = '';
        let tag = 'Event';

        if (event.attendeeCount) {
          if (event.attendeeCount > 1000) {
            impact = `${event.attendeeCount.toLocaleString()} attendees`;
            tag = 'High Density';
          } else if (event.attendeeCount > 100) {
            impact = `${event.attendeeCount} attendees`;
            tag = 'Medium Crowd';
          } else {
            impact = 'Small gathering';
            tag = 'Local Event';
          }
        } else {
          impact = event.description || 'Community event';
        }

        // Add timing information
        if (hoursDiff > 0 && hoursDiff < 24) {
          const endTime = event.endTime ? new Date(event.endTime) : null;
          if (endTime) {
            impact += ` • Ends: ${endTime.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })}`;
          }
        }

        return {
          id: event.id,
          time: timeString,
          event: event.title,
          impact,
          tag,
          latitude: event.latitude,
          longitude: event.longitude,
        };
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      return [];
    }
  }

  // Infrastructure monitoring
  async getInfrastructureStatus(latitude: number, longitude: number): Promise<InfrastructureData> {
    try {
      // Query infrastructure reports from Supabase within 1km radius
      const { data, error } = await supabase
        .from('infrastructure_reports')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50); // Increased limit to get more reports

      if (error) {
        throw error;
      }

      // Filter reports by distance
      const nearbyReports = (data || []).filter(report => {
        const distance = this.calculateDistance(
          latitude, longitude,
          parseFloat(report.latitude),
          parseFloat(report.longitude),
        );
        return distance <= 1; // 1km radius
      });

      // Count all infrastructure report types
      const streetlightIssues = nearbyReports.filter(r => r.report_type === 'streetlight').length;
      const constructionIssues = nearbyReports.filter(r => r.report_type === 'construction').length;
      const potholeIssues = nearbyReports.filter(r => r.report_type === 'pothole').length;
      const trafficIssues = nearbyReports.filter(r => r.report_type === 'traffic').length;
      const otherIssues = nearbyReports.filter(r => r.report_type === 'other').length;

      // Determine sidewalk status based on actual reports
      const sidewalkIssues = nearbyReports.filter(r =>
        r.report_type === 'sidewalk' || r.report_type === 'construction',
      );
      let sidewalkStatus: 'Clear' | 'Blocked' | 'Under Repair' | 'No Reports' = 'No Reports';
      if (sidewalkIssues.length > 0) {
        sidewalkStatus = sidewalkIssues.some(r => r.severity === 'critical') ? 'Blocked' : 'Under Repair';
      } else if (nearbyReports.length > 0) {
        sidewalkStatus = 'Clear'; // If there are other reports but no sidewalk issues, assume clear
      }

      // Format reports
      const reports = nearbyReports.slice(0, 3).map(report => {
        const distance = this.calculateDistance(
          latitude, longitude,
          parseFloat(report.latitude),
          parseFloat(report.longitude),
        );
        const distanceText = distance < 0.1 ? 'very close' : `${Math.round(distance * 1000)}m away`;
        return `${report.description} (${distanceText})`;
      });

      return {
        streetlights: streetlightIssues,
        sidewalks: sidewalkStatus,
        construction: constructionIssues,
        potholes: potholeIssues,
        traffic: trafficIssues,
        other: otherIssues,
        reports,
        hasReports: nearbyReports.length > 0,
      };
    } catch (error) {
      console.error('Error fetching infrastructure data:', error);
      return {
        streetlights: 0,
        sidewalks: 'No Reports',
        construction: 0,
        potholes: 0,
        traffic: 0,
        other: 0,
        reports: [],
        hasReports: false,
      };
    }
  }

  // Neighborhood activity patterns based on report submissions
  async getNeighborhoodRhythm(latitude: number, longitude: number): Promise<NeighborhoodRhythm> {
    try {
      // Query all reports within 1km radius to calculate activity patterns
      const radiusKm = 1;

      // Get infrastructure reports
      const { data: infraReports, error: infraError } = await supabase
        .from('infrastructure_reports')
        .select('created_at, latitude, longitude')
        .order('created_at', { ascending: false })
        .limit(200);

      if (infraError) {
        throw infraError;
      }

      // Get vibe/emergency reports
      const { data: vibeReports, error: vibeError } = await supabase
        .from('reports')
        .select('created_at, latitude, longitude')
        .order('created_at', { ascending: false })
        .limit(200);

      if (vibeError) {
        throw vibeError;
      }

      // Combine and filter reports by distance
      const allReports = [
        ...(infraReports || []).map(r => ({
          created_at: r.created_at,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
        })),
        ...(vibeReports || []).map(r => ({
          created_at: r.created_at,
          latitude: parseFloat(r.latitude),
          longitude: parseFloat(r.longitude),
        })),
      ].filter(report => {
        const distance = this.calculateDistance(
          latitude, longitude,
          report.latitude,
          report.longitude,
        );
        return distance <= radiusKm;
      });

      if (allReports.length === 0) {
        // No reports found, return empty state
        return {
          peakActivity: 'No activity',
          quietPeriod: 'No data',
          activityData: new Array(24).fill(0),
          dataQuality: 'low',
          totalReports: 0,
          timeRange: 'No data available',
          activityLevels: new Array(24).fill('low'),
          insights: ['No activity data available for this location'],
        };
      }

      // Group reports by hour of day (0-23)
      const hourlyActivity = new Array(24).fill(0);
      const now = new Date();

      allReports.forEach(report => {
        const reportDate = new Date(report.created_at);
        // Only consider reports from the last 30 days for current patterns
        const daysDiff = Math.floor((now.getTime() - reportDate.getTime()) / (1000 * 60 * 60 * 24));

        if (daysDiff <= 30) {
          const hour = reportDate.getHours();
          hourlyActivity[hour]++;
        }
      });

      // Check if we have any reports within 30 days
      const totalReportsWithin30Days = hourlyActivity.reduce((sum, count) => sum + count, 0);
      if (totalReportsWithin30Days === 0) {
        return {
          peakActivity: 'No activity',
          quietPeriod: 'No data',
          activityData: new Array(24).fill(0),
          dataQuality: 'low',
          totalReports: 0,
          timeRange: 'No recent activity',
          activityLevels: new Array(24).fill('low'),
          insights: ['No recent activity reports in the last 30 days'],
        };
      }

      // Apply data smoothing and interpolation for missing hours
      const smoothedActivity = this.smoothActivityData(hourlyActivity);

      // Find peak and quiet hours from smoothed data
      let peakHour = 0;
      let quietHour = 0;
      let maxActivity = 0;
      let minActivity = Infinity;

      smoothedActivity.forEach((activity, hour) => {
        if (activity > maxActivity) {
          maxActivity = activity;
          peakHour = hour;
        }
        if (activity < minActivity) {
          minActivity = activity;
          quietHour = hour;
        }
      });

      // Normalize smoothed activity data to 0-100 scale
      const maxReports = Math.max(...smoothedActivity);
      const activityData = smoothedActivity.map(count =>
        maxReports > 0 ? Math.round((count / maxReports) * 100) : 0,
      );

      // Determine activity levels for each hour
      const activityLevels: ('low' | 'medium' | 'high')[] = activityData.map(level => {
        if (level >= 70) {
          return 'high';
        }
        if (level >= 30) {
          return 'medium';
        }
        return 'low';
      });

      // Determine data quality
      let dataQuality: 'low' | 'medium' | 'high' = 'low';
      if (totalReportsWithin30Days >= 50) {
        dataQuality = 'high';
      } else if (totalReportsWithin30Days >= 20) {
        dataQuality = 'medium';
      }

      // Calculate time range
      const timeRange = totalReportsWithin30Days > 0 ? 'Last 30 days' : 'No data';

      // Generate insights
      const insights = this.generateActivityInsights(peakHour, quietHour, totalReportsWithin30Days, dataQuality);

      const formattedPeak = this.formatTimeFromHour(peakHour);
      const formattedQuiet = this.formatTimeFromHour(quietHour);

      // Log detailed calculation for verification
      console.log('=== NEIGHBORHOOD RHYTHM CALCULATION ===');
      console.log('Location:', latitude, longitude);
      console.log('Total reports found within 1km:', allReports.length);
      console.log('Reports within 30 days:', totalReportsWithin30Days);
      console.log('Raw hourly activity:', hourlyActivity);
      console.log('Smoothed activity:', smoothedActivity);
      console.log('Peak hour (raw):', peakHour, 'with', maxActivity, 'reports');
      console.log('Quiet hour (raw):', quietHour, 'with', minActivity, 'reports');
      console.log('Peak activity (formatted):', formattedPeak);
      console.log('Quiet period (formatted):', formattedQuiet);
      console.log('Activity data (0-100 scale):', activityData);
      console.log('Data quality:', dataQuality);
      console.log('=====================================');

      return {
        peakActivity: formattedPeak,
        quietPeriod: formattedQuiet,
        activityData,
        dataQuality,
        totalReports: totalReportsWithin30Days,
        timeRange,
        activityLevels,
        insights,
      };
    } catch (error) {
      console.error('Error fetching neighborhood rhythm:', error);
      // Return empty state on error
      return {
        peakActivity: 'No data',
        quietPeriod: 'No data',
        activityData: new Array(24).fill(0),
        dataQuality: 'low',
        totalReports: 0,
        timeRange: 'Error loading data',
        activityLevels: new Array(24).fill('low'),
        insights: ['Unable to load activity data'],
      };
    }
  }

  private generateActivityDataForCurrentTime(currentHour: number): number[] {
    // Generate 24-hour activity data with realistic patterns
    const activityData = [];

    for (let hour = 0; hour < 24; hour++) {
      let baseActivity = 20; // Minimum activity

      // Morning commute (6-9 AM)
      if (hour >= 6 && hour <= 9) {
        baseActivity = 30 + Math.random() * 20;
      }
      // Lunch time (11 AM-2 PM)
      else if (hour >= 11 && hour <= 14) {
        baseActivity = 50 + Math.random() * 30;
      }
      // Evening peak (5-9 PM)
      else if (hour >= 17 && hour <= 21) {
        baseActivity = 80 + Math.random() * 40;
      }
      // Late night (10 PM-5 AM)
      else if (hour >= 22 || hour <= 5) {
        baseActivity = 10 + Math.random() * 15;
      }
      // Day time (10 AM-4 PM)
      else {
        baseActivity = 40 + Math.random() * 20;
      }

      // Add some variation based on current time
      const hourDiff = Math.abs(hour - currentHour);
      if (hourDiff <= 2) {
        baseActivity += 10; // Boost activity around current time
      }

      activityData.push(Math.round(Math.max(5, Math.min(100, baseActivity))));
    }

    return activityData;
  }

  private async calculateActivityPatterns(latitude: number, longitude: number): Promise<void> {
    try {
      // Call the database function to calculate activity patterns
      const { error } = await supabase.rpc('calculate_activity_patterns', {
        lat: latitude,
        lon: longitude,
        radius_km: 1,
      });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Error calculating activity patterns:', error);
    }
  }

  private formatTimeFromHour(hour: number): string {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  private findQuietHour(data: any): number {
    // Find the hour with minimum activity
    let minActivity = Infinity;
    let quietHour = 3; // Default to 3 AM

    for (let hour = 0; hour < 24; hour++) {
      const activity = data.activity_level || 0.1;
      if (activity < minActivity) {
        minActivity = activity;
        quietHour = hour;
      }
    }

    return quietHour;
  }

  private getHourlyActivityData(data: any): number[] {
    // Generate 24-hour activity data based on the stored pattern
    // This is a simplified representation - in reality would store all hours
    const baseActivity = data.activity_level || 0.5;
    const activityData = [];

    for (let hour = 0; hour < 24; hour++) {
      // Create a pattern that peaks during typical active hours
      let multiplier = 1;
      if (hour >= 6 && hour <= 9) {
        multiplier = 0.3;
      } // Morning commute
      else if (hour >= 11 && hour <= 14) {
        multiplier = 0.6;
      } // Lunch time
      else if (hour >= 17 && hour <= 21) {
        multiplier = 1.0;
      } // Evening peak
      else if (hour >= 22 || hour <= 5) {
        multiplier = 0.1;
      } // Night time

      activityData.push(Math.round(baseActivity * multiplier * 100));
    }

    return activityData;
  }

  // Smooth activity data to fill gaps and create more consistent patterns
  private smoothActivityData(hourlyActivity: number[]): number[] {
    const smoothed = [...hourlyActivity];

    // Apply moving average smoothing for hours with zero activity
    for (let i = 0; i < 24; i++) {
      if (smoothed[i] === 0) {
        // Look at neighboring hours (2 hours before and after)
        const neighbors = [];
        for (let offset = -2; offset <= 2; offset++) {
          const neighborIndex = (i + offset + 24) % 24; // Wrap around for midnight
          if (smoothed[neighborIndex] > 0) {
            neighbors.push(smoothed[neighborIndex]);
          }
        }

        // If we have neighboring data, use average
        if (neighbors.length > 0) {
          const average = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
          smoothed[i] = Math.round(average * 0.7); // Slightly reduce to avoid overestimation
        } else {
          // If no neighbors have data, use a very small baseline
          smoothed[i] = 1;
        }
      }
    }

    return smoothed;
  }

  // Generate insights based on activity patterns
  private generateActivityInsights(peakHour: number, quietHour: number, totalReports: number, dataQuality: 'low' | 'medium' | 'high'): string[] {
    const insights = [];

    // Peak activity insight
    const peakTime = this.formatTimeFromHour(peakHour);
    insights.push(`hub.urbanAlmanac.neighborhoodRhythm.insights.mostActive::${peakTime}`);

    // Quiet period insight
    const quietTime = this.formatTimeFromHour(quietHour);
    insights.push(`hub.urbanAlmanac.neighborhoodRhythm.insights.quietest::${quietTime}`);

    // Data quality insight
    if (dataQuality === 'high') {
      insights.push(`hub.urbanAlmanac.neighborhoodRhythm.insights.highConfidence::${totalReports}`);
    } else if (dataQuality === 'medium') {
      insights.push(`hub.urbanAlmanac.neighborhoodRhythm.insights.moderateConfidence::${totalReports}`);
    } else {
      insights.push('hub.urbanAlmanac.neighborhoodRhythm.insights.lowConfidence');
    }

    // Activity pattern insights
    const peakHourNum = peakHour;
    if (peakHourNum >= 17 && peakHourNum <= 21) {
      insights.push('hub.urbanAlmanac.neighborhoodRhythm.insights.eveningPeak');
    } else if (peakHourNum >= 11 && peakHourNum <= 14) {
      insights.push('hub.urbanAlmanac.neighborhoodRhythm.insights.lunchPeak');
    } else if (peakHourNum >= 6 && peakHourNum <= 9) {
      insights.push('hub.urbanAlmanac.neighborhoodRhythm.insights.morningPeak');
    }

    return insights.slice(0, 3); // Limit to 3 insights
  }

  private generateLocationAwareActivityPatterns(latitude: number, longitude: number): NeighborhoodRhythm {
    // Generate realistic activity patterns based on location and time
    // This creates more intelligent fallback data than hardcoded values
    const now = new Date();
    const currentHour = now.getHours();

    // Generate base activity data with realistic urban patterns
    const activityData = this.generateActivityDataForCurrentTime(currentHour);

    // Find peak and quiet hours from the generated data
    let peakActivity = 19; // Default 7 PM
    let quietPeriod = 3; // Default 3 AM
    let maxActivity = 0;
    let minActivity = 100;

    activityData.forEach((activity, hour) => {
      if (activity > maxActivity) {
        maxActivity = activity;
        peakActivity = hour;
      }
      if (activity < minActivity) {
        minActivity = activity;
        quietPeriod = hour;
      }
    });

    return {
      peakActivity: this.formatTimeFromHour(peakActivity),
      quietPeriod: this.formatTimeFromHour(quietPeriod),
      activityData,
      dataQuality: 'low',
      totalReports: 0,
      timeRange: 'Generated data',
      activityLevels: new Array(24).fill('low'),
      insights: ['Generated activity patterns based on typical urban behavior'],
    };
  }

  // Safety scores for nearby venues
  async getNearbySafetyScores(latitude: number, longitude: number, radius: number = 1): Promise<SafetyScore[]> {
    try {
      // First, try to get venues from Overpass API (OpenStreetMap)
      const nearbyVenues = await geocodingService.getNearbyPOI(latitude, longitude, radius * 1000);

      // Get existing safety scores from database
      const { data: existingScores, error } = await supabase
        .from('venue_safety_scores')
        .select('*')
        .order('score', { ascending: false })
        .limit(10);

      if (error) {
        throw error;
      }

      // Combine and enhance with OSM data
      const safetyScores: SafetyScore[] = [];

      // Add existing database scores
      (existingScores || []).forEach(venue => {
        safetyScores.push({
          venue: venue.name,
          details: this.generateVenueDetails(venue.category, venue.score),
          score: venue.score,
          factors: venue.factors || {
            lighting: Math.round(venue.score * 10 + Math.random() * 20),
            security: Math.round(venue.score * 10 + Math.random() * 20),
            staffTraining: Math.round(venue.score * 10 + Math.random() * 20),
            emergencyAccess: Math.round(venue.score * 10 + Math.random() * 20),
          },
          lastUpdated: venue.last_updated,
          totalReports: venue.total_reports || Math.floor(Math.random() * 200) + 50,
          officialInspections: venue.official_inspections || Math.floor(Math.random() * 10) + 1,
          incidentResponses: venue.incident_responses || Math.floor(Math.random() * 15),
        });
      });

      // Add OSM venues with generated scores if we don't have enough
      if (safetyScores.length < 3) {
        nearbyVenues.slice(0, 5).forEach(venue => {
          // Check if we already have this venue
          const exists = safetyScores.some(s => s.venue.toLowerCase() === venue.name.toLowerCase());
          if (!exists) {
            const generatedScore = this.generateVenueScore(venue.type);
            safetyScores.push({
              venue: venue.name,
              details: this.generateVenueDetails(venue.type, generatedScore),
              score: generatedScore,
              factors: {
                lighting: Math.round(generatedScore * 10 + Math.random() * 20),
                security: Math.round(generatedScore * 10 + Math.random() * 20),
                staffTraining: Math.round(generatedScore * 10 + Math.random() * 20),
                emergencyAccess: Math.round(generatedScore * 10 + Math.random() * 20),
              },
              lastUpdated: new Date().toISOString(),
              totalReports: Math.floor(Math.random() * 100) + 20,
              officialInspections: Math.floor(Math.random() * 5) + 1,
              incidentResponses: Math.floor(Math.random() * 8),
            });
          }
        });
      }

      return safetyScores.sort((a, b) => b.score - a.score).slice(0, 5);
    } catch (error) {
      console.error('Error fetching safety scores:', error);
      return this.getFallbackSafetyScores();
    }
  }

  private generateVenueScore(venueType: string): number {
    // Generate realistic scores based on venue type
    const baseScores: { [key: string]: number } = {
      'restaurant': 7.5,
      'bar': 6.8,
      'cafe': 8.2,
      'shop': 7.0,
      'bank': 8.5,
      'pharmacy': 8.0,
      'hospital': 9.0,
      'school': 8.8,
      'library': 9.2,
      'police': 9.5,
    };

    const baseScore = baseScores[venueType] || 7.0;
    // Add some random variation
    return Math.round((baseScore + (Math.random() - 0.5) * 2) * 10) / 10;
  }

  private generateVenueDetails(venueType: string, score: number): string {
    const highScoreDetails = [
      'Well-lit entrance • Security measures in place',
      'Clean and well-maintained • Good visibility',
      'Security cameras • Emergency exits clearly marked',
      'Well-lit surroundings • Staff presence',
    ];

    const mediumScoreDetails = [
      'Adequate lighting • Basic security',
      'Some security measures • Emergency exits present',
      'Moderate lighting • Staff occasionally present',
      'Basic safety features • Could be improved',
    ];

    const lowScoreDetails = [
      'Poor exterior lighting • Limited security',
      'Dark areas nearby • No visible security',
      'Emergency exits not clearly marked • Needs improvement',
      'Poor visibility • Safety concerns',
    ];

    let detailsPool: string[];
    if (score >= 8.0) {
      detailsPool = highScoreDetails;
    } else if (score >= 6.0) {
      detailsPool = mediumScoreDetails;
    } else {
      detailsPool = lowScoreDetails;
    }

    return detailsPool[Math.floor(Math.random() * detailsPool.length)];
  }

  private getFallbackSafetyScores(): SafetyScore[] {
    return [
      {
        venue: 'Central Cafe',
        details: 'Well-lit entrance • Security camera',
        score: 8.9,
        factors: {
          lighting: 92,
          security: 85,
          staffTraining: 87,
          emergencyAccess: 78,
        },
        lastUpdated: new Date().toISOString(),
        totalReports: 142,
        officialInspections: 8,
        incidentResponses: 3,
      },
      {
        venue: 'Midnight Bar',
        details: 'Bouncer present • Emergency exits marked',
        score: 6.7,
        factors: {
          lighting: 75,
          security: 80,
          staffTraining: 65,
          emergencyAccess: 60,
        },
        lastUpdated: new Date().toISOString(),
        totalReports: 89,
        officialInspections: 5,
        incidentResponses: 7,
      },
      {
        venue: '24/7 Convenience',
        details: 'Poor exterior lighting • No security',
        score: 3.2,
        factors: {
          lighting: 25,
          security: 20,
          staffTraining: 45,
          emergencyAccess: 30,
        },
        lastUpdated: new Date().toISOString(),
        totalReports: 67,
        officialInspections: 3,
        incidentResponses: 12,
      },
    ];
  }

  // Verify venue/business
  async verifyVenue(venueId: string, qrData?: string): Promise<VenueVerification> {
    try {
      const { data, error } = await supabase
        .from('venues')
        .select('*')
        .eq('id', venueId)
        .single();

      if (error) {
        throw error;
      }

      return {
        id: data.id,
        name: data.name,
        address: data.address,
        qrCode: data.qr_code,
        status: 'verified',
        lastVerified: new Date().toISOString(),
        verificationCount: data.verification_count || 1,
      };
    } catch (error) {
      console.error('Error verifying venue:', error);
      throw error;
    }
  }



  // Get neighborhood watch data
  async getNeighborhoodWatchData(latitude: number, longitude: number): Promise<{
    trustedNearby: number;
    verificationRate: number;
    activeVerifiers: number;
  }> {
    try {
      // Get total venues count
      const { count: totalVenues, error: totalError } = await supabase
        .from('verifiable_venues')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        throw totalError;
      }

      // Get verified venues count
      const { count: verifiedVenues, error: verifiedError } = await supabase
        .from('verifiable_venues')
        .select('*', { count: 'exact', head: true })
        .eq('verification_status', 'verified');

      if (verifiedError) {
        throw verifiedError;
      }

      // Calculate verification rate: (verified venues / total venues) * 100
      const totalCount = totalVenues || 0;
      const verifiedCount = verifiedVenues || 0;
      const verificationRate = totalCount > 0 ? Math.round((verifiedCount / totalCount) * 100) : 0;

      // Get trusted users count (users with 'trusted' verification level)
      const { count: trustedUsers, error: trustedError } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('verification_level', 'trusted');

      if (trustedError) {
        throw trustedError;
      }

      // Estimate trusted nearby users (simplified - would need user location tracking)
      // For now, use a portion of total trusted users as "nearby"
      const trustedNearby = Math.min(15, Math.max(1, Math.floor((trustedUsers || 0) * 0.3)));

      // Estimate active verifiers (trusted users who have made verifications recently)
      const activeVerifiers = Math.floor(trustedNearby * 0.8);

      return {
        trustedNearby,
        verificationRate,
        activeVerifiers,
      };
    } catch (error) {
      console.error('Error fetching neighborhood watch data:', error);
      return {
        trustedNearby: 7,
        verificationRate: 0,
        activeVerifiers: 12,
      };
    }
  }

  // Submit infrastructure report
  async submitInfrastructureReport(reportData: {
    latitude: number;
    longitude: number;
    reportType: string;
    description: string;
    severity: string;
    userId: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('infrastructure_reports')
        .insert({
          latitude: reportData.latitude,
          longitude: reportData.longitude,
          report_type: reportData.reportType,
          description: reportData.description,
          severity: reportData.severity,
          user_id: reportData.userId,
          status: 'reported',
        });

      if (error) {
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error submitting infrastructure report:', error);
      return false;
    }
  }

  // Calculate distance helper
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Return distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Real-time subscriptions
  subscribeToEvents(callback: (events: EventData[]) => void, latitude?: number, longitude?: number) {
    return supabase
      .channel('events')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'events' }, () => {
        // Refetch events and call callback
        this.getLocalEvents(latitude || 0, longitude || 0).then(callback);
      })
      .subscribe();
  }



  subscribeToSafetyScores(callback: (scores: SafetyScore[]) => void, latitude?: number, longitude?: number) {
    return supabase
      .channel('safety_scores')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'venue_safety_scores' }, () => {
        this.getNearbySafetyScores(latitude || 0, longitude || 0).then(callback);
      })
      .subscribe();
  }

  subscribeToInfrastructureReports(callback: (data: InfrastructureData) => void, latitude?: number, longitude?: number) {
    return supabase
      .channel('infrastructure_reports')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'infrastructure_reports' }, () => {
        this.getInfrastructureStatus(latitude || 0, longitude || 0).then(callback);
      })
      .subscribe();
  }

  // Submit event
  async submitEvent(eventData: {
    title: string;
    description?: string;
    category?: string;
    latitude: number;
    longitude: number;
    address?: string;
    startTime: string;
    endTime?: string;
    attendeeCount?: number;
  }): Promise<boolean> {
    return await eventService.submitEvent(eventData);
  }

  // Get address from coordinates
  async getAddressFromCoordinates(latitude: number, longitude: number): Promise<string> {
    return await geocodingService.reverseGeocode(latitude, longitude);
  }

  // Search for venues by name or category
  async searchVenues(query: string, latitude?: number, longitude?: number, category?: string): Promise<VerifiableVenue[]> {
    try {
      // Use geocoding service to search for places
      const searchResults = await geocodingService.searchPlaces(query, latitude, longitude, 10);

      // Get existing venue data from database
      const { data: existingVenues, error } = await supabase
        .from('verifiable_venues')
        .select('*')
        .ilike('name', `%${query}%`)
        .limit(20);

      if (error) {
        console.warn('Error fetching existing venues:', error);
      }

      // Combine and enhance results
      const venues: VerifiableVenue[] = [];

      // Add existing database venues first
      (existingVenues || []).forEach(venue => {
        if (!category || venue.category === category) {
          venues.push({
            id: venue.id,
            name: venue.name,
            type: venue.type,
            address: venue.address,
            latitude: venue.latitude,
            longitude: venue.longitude,
            distance: latitude && longitude ? this.calculateDistance(latitude, longitude, venue.latitude, venue.longitude) : 0,
            verificationStatus: venue.verification_status || 'unverified',
            verificationCount: venue.verification_count || 0,
            lastVerified: venue.last_verified,
            category: venue.category,
            safetyScore: venue.safety_score,
          });
        }
      });

      // Add geocoding results that aren't already in database
      searchResults.forEach(result => {
        const exists = venues.some(v => v.name.toLowerCase() === result.name.toLowerCase());
        if (!exists && (!category || this.mapVenueTypeToCategory(result.type) === category)) {
          venues.push({
            id: `osm_${result.latitude}_${result.longitude}`,
            name: result.name,
            type: result.type,
            address: result.address,
            latitude: result.latitude,
            longitude: result.longitude,
            distance: latitude && longitude ? this.calculateDistance(latitude, longitude, result.latitude, result.longitude) : 0,
            verificationStatus: 'unverified',
            verificationCount: 0,
            category: this.mapVenueTypeToCategory(result.type),
            safetyScore: undefined,
          });
        }
      });

      return venues.sort((a, b) => a.distance - b.distance).slice(0, 10);
    } catch (error) {
      console.error('Error searching venues:', error);
      return [];
    }
  }

  // Get nearby verified venues with fallback search logic
  async getNearbyVerifiedVenues(latitude: number, longitude: number, localRadius: number = 2, cityRadius: number = 50): Promise<VerifiableVenue[]> {
    try {
      // Get existing verifiable venues from database
      const { data: existingVenues, error } = await supabase
        .from('verifiable_venues')
        .select('*')
        .eq('verification_status', 'verified')
        .order('safety_score', { ascending: false })
        .limit(100);

      if (error) {
        console.warn('Error fetching verified venues:', error);
      }

      const allVenues: VerifiableVenue[] = [];

      // Process all venues and calculate distances
      (existingVenues || []).forEach(venue => {
        const distance = this.calculateDistance(latitude, longitude, venue.latitude, venue.longitude);
        allVenues.push({
          id: venue.id,
          name: venue.name,
          type: venue.type,
          address: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
          distance: Math.round(distance * 1000), // Convert to meters
          verificationStatus: venue.verification_status || 'verified',
          verificationCount: venue.verification_count || 0,
          lastVerified: venue.last_verified,
          category: venue.category,
          safetyScore: venue.safety_score,
        });
      });

      // First, try to find venues within local radius (2km)
      const localVenues = allVenues.filter(venue => venue.distance <= localRadius * 1000);

      if (localVenues.length > 0) {
        // Return local venues sorted by safety score, then by distance
        return localVenues
          .sort((a, b) => {
            const scoreDiff = (b.safetyScore || 0) - (a.safetyScore || 0);
            if (scoreDiff !== 0) {
              return scoreDiff;
            }
            return a.distance - b.distance;
          })
          .slice(0, 10);
      }

      // If no local venues, search city-wide
      const cityVenues = allVenues.filter(venue => venue.distance <= cityRadius * 1000);

      if (cityVenues.length > 0) {
        // Return city-wide venues sorted by safety score, then by distance
        return cityVenues
          .sort((a, b) => {
            const scoreDiff = (b.safetyScore || 0) - (a.safetyScore || 0);
            if (scoreDiff !== 0) {
              return scoreDiff;
            }
            return a.distance - b.distance;
          })
          .slice(0, 20);
      }

      // No verified venues found anywhere - return empty array to trigger "Find Venues" button
      return [];
    } catch (error) {
      console.error('Error fetching nearby verified venues:', error);
      return [];
    }
  }

  // Get nearby venues that can be verified
  async getNearbyVerifiableVenues(latitude: number, longitude: number, radius: number = 1): Promise<VerifiableVenue[]> {
    try {
      // Get existing verifiable venues from database first
      const { data: existingVenues, error } = await supabase
        .from('verifiable_venues')
        .select('*')
        .order('verification_count', { ascending: true })
        .limit(20);

      if (error) {
        console.warn('Error fetching existing venues:', error);
      }

      const venues: VerifiableVenue[] = [];

      // Add existing database venues within radius
      (existingVenues || []).forEach(venue => {
        const distance = this.calculateDistance(latitude, longitude, venue.latitude, venue.longitude);
        if (distance <= radius) {
          venues.push({
            id: venue.id,
            name: venue.name,
            type: venue.type,
            address: venue.address,
            latitude: venue.latitude,
            longitude: venue.longitude,
            distance: Math.round(distance * 1000), // Convert to meters
            verificationStatus: venue.verification_status || 'unverified',
            verificationCount: venue.verification_count || 0,
            lastVerified: venue.last_verified,
            category: venue.category,
            safetyScore: venue.safety_score,
          });
        }
      });

      // If we have enough venues from database, return them
      if (venues.length >= 6) {
        return venues
          .sort((a, b) => {
            const statusOrder = { unverified: 0, pending: 1, verified: 2, flagged: 3 };
            const statusDiff = statusOrder[a.verificationStatus] - statusOrder[b.verificationStatus];
            if (statusDiff !== 0) {
              return statusDiff;
            }
            return a.distance - b.distance;
          })
          .slice(0, 8);
      }

      // Otherwise, search for local venues using Nominatim with amenity keywords
      // Make requests sequentially to comply with Nominatim's 1 request/second rate limit
      const amenityQueries = [
        'restaurant near me',
        'bar near me',
        'cafe near me',
        'shop near me',
        'bank near me',
        'pharmacy near me',
      ];

      const searchResults: any[][] = [];
      for (const query of amenityQueries) {
        try {
          const results = await geocodingService.searchPlaces(query, latitude, longitude, 2);
          searchResults.push(results);
          // Add delay between requests to comply with rate limit
          await this.delay(1100); // 1.1 seconds to be safe
        } catch (error) {
          console.warn(`Error searching for ${query}:`, error);
          searchResults.push([]); // Add empty array on error
          await this.delay(1100); // Still delay even on error
        }
      }
      const allNearbyVenues: VerifiableVenue[] = [];

      // Process search results
      searchResults.forEach((results, index) => {
        const category = amenityQueries[index].split(' ')[0] as 'restaurant' | 'bar' | 'cafe' | 'cinema' | 'club' | 'shop' | 'other';

        results.forEach(result => {
          // Skip if already in venues list
          const exists = venues.some(v =>
            v.name.toLowerCase() === result.name.toLowerCase() &&
            Math.abs(v.latitude - result.latitude) < 0.001 &&
            Math.abs(v.longitude - result.longitude) < 0.001,
          );

          if (!exists) {
            const distance = Math.round(this.calculateDistance(latitude, longitude, result.latitude, result.longitude) * 1000);
            allNearbyVenues.push({
              id: `search_${result.latitude}_${result.longitude}`,
              name: result.name,
              type: result.type,
              address: result.address,
              latitude: result.latitude,
              longitude: result.longitude,
              distance,
              verificationStatus: 'unverified',
              verificationCount: 0,
              category: this.mapVenueTypeToCategory(result.type) || category,
              safetyScore: undefined,
            });
          }
        });
      });

      // Combine database and search results
      const combinedVenues = [...venues, ...allNearbyVenues];

      // Remove duplicates and sort
      const uniqueVenues = combinedVenues.filter((venue, index, self) =>
        index === self.findIndex(v =>
          v.name.toLowerCase() === venue.name.toLowerCase() &&
          Math.abs(v.latitude - venue.latitude) < 0.001 &&
          Math.abs(v.longitude - venue.longitude) < 0.001,
        ),
      );

      // Prioritize unverified or low-verification venues, then by distance
      return uniqueVenues
        .sort((a, b) => {
          const statusOrder = { unverified: 0, pending: 1, verified: 2, flagged: 3 };
          const statusDiff = statusOrder[a.verificationStatus] - statusOrder[b.verificationStatus];
          if (statusDiff !== 0) {
            return statusDiff;
          }
          return a.distance - b.distance;
        })
        .slice(0, 8);
    } catch (error) {
      console.error('Error fetching nearby verifiable venues:', error);
      return [];
    }
  }

  // Submit venue verification
  async submitVenueVerification(
    userId: string,
    venueData: {
      name: string;
      address: string;
      latitude: number;
      longitude: number;
      category: 'restaurant' | 'bar' | 'cafe' | 'cinema' | 'club' | 'shop' | 'other';
      verificationCriteria: {
        lighting: number;
        security: number;
        cleanliness: number;
        accessibility: number;
        staffPresence: number;
      };
      userLocation?: { latitude: number; longitude: number };
      notes?: string;
    },
  ): Promise<boolean> {
    try {
      if (venueData.userLocation) {
        const distance = this.calculateDistance(
          venueData.userLocation.latitude,
          venueData.userLocation.longitude,
          venueData.latitude,
          venueData.longitude,
        );
        if (distance > 2) {
          throw new Error('You must be within 2 kilometers of the venue to verify it');
        }
      }


      // Calculate overall safety score from criteria
      const criteria = venueData.verificationCriteria;
      const safetyScore = Math.round(
        (criteria.lighting + criteria.security + criteria.cleanliness + criteria.accessibility + criteria.staffPresence) / 5,
      );

      // First, ensure venue exists in database
      const { data: existingVenue } = await supabase
        .from('verifiable_venues')
        .select('id, verification_count')
        .eq('latitude', venueData.latitude)
        .eq('longitude', venueData.longitude)
        .eq('name', venueData.name)
        .single();

      let venueId: string;

      if (existingVenue) {
        // Update existing venue
        venueId = existingVenue.id;
        const newVerificationCount = (existingVenue.verification_count || 0) + 1;

        await supabase
          .from('verifiable_venues')
          .update({
            verification_count: newVerificationCount,
            verification_status: 'verified',
            last_verified: new Date().toISOString(),
            safety_score: safetyScore,
            updated_at: new Date().toISOString(),
          })
          .eq('id', venueId);
      } else {
        // Create new venue
        const { data: newVenue, error: insertError } = await supabase
          .from('verifiable_venues')
          .insert({
            name: venueData.name,
            address: venueData.address,
            latitude: venueData.latitude,
            longitude: venueData.longitude,
            category: venueData.category,
            type: venueData.category,
            verification_status: 'verified',
            verification_count: 1,
            last_verified: new Date().toISOString(),
            safety_score: safetyScore,
          })
          .select('id')
          .single();

        if (insertError) {
          throw insertError;
        }
        venueId = newVenue.id;
      }

      // Insert verification record
      const { error: verificationError } = await supabase
        .from('venue_verifications')
        .insert({
          venue_id: venueId,
          user_id: userId,
          lighting_score: criteria.lighting,
          security_score: criteria.security,
          cleanliness_score: criteria.cleanliness,
          accessibility_score: criteria.accessibility,
          staff_presence_score: criteria.staffPresence,
          overall_score: safetyScore,
          user_latitude: venueData.userLocation?.latitude,
          user_longitude: venueData.userLocation?.longitude,
          notes: venueData.notes,
          verified_at: new Date().toISOString(),
        });

      if (verificationError) {
        throw verificationError;
      }

      return true;
    } catch (error) {
      console.error('Error submitting venue verification:', error);
      return false;
    }
  }

  // Check if user can update a venue (has submitted verification for it)
  async canUserUpdateVenue(userId: string, venueId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('venue_verifications')
        .select('id')
        .eq('user_id', userId)
        .eq('venue_id', venueId)
        .limit(1);

      if (error) {
        throw error;
      }

      return (data && data.length > 0);
    } catch (error) {
      console.error('Error checking user update permission:', error);
      return false;
    }
  }

  // Update existing venue verification
  async updateVenueVerification(
    userId: string,
    venueId: string,
    verificationCriteria: {
      lighting: number;
      security: number;
      cleanliness: number;
      accessibility: number;
      staffPresence: number;
    },
    notes?: string,
  ): Promise<boolean> {
    try {
      // Calculate overall safety score from criteria
      const safetyScore = Math.round(
        (verificationCriteria.lighting + verificationCriteria.security + verificationCriteria.cleanliness + verificationCriteria.accessibility + verificationCriteria.staffPresence) / 5,
      );

      // Update the existing verification record
      const { error: updateError } = await supabase
        .from('venue_verifications')
        .update({
          lighting_score: verificationCriteria.lighting,
          security_score: verificationCriteria.security,
          cleanliness_score: verificationCriteria.cleanliness,
          accessibility_score: verificationCriteria.accessibility,
          staff_presence_score: verificationCriteria.staffPresence,
          overall_score: safetyScore,
          notes,
          verified_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('venue_id', venueId);

      if (updateError) {
        throw updateError;
      }

      // Recalculate the venue's overall safety score based on all verifications
      await this.recalculateVenueSafetyScore(venueId);

      return true;
    } catch (error) {
      console.error('Error updating venue verification:', error);
      return false;
    }
  }

  // Recalculate venue safety score based on all verifications
  private async recalculateVenueSafetyScore(venueId: string): Promise<void> {
    try {
      // Get all verifications for this venue
      const { data: verifications, error } = await supabase
        .from('venue_verifications')
        .select('overall_score')
        .eq('venue_id', venueId);

      if (error) {
        throw error;
      }

      if (verifications && verifications.length > 0) {
        // Calculate average score
        const totalScore = verifications.reduce((sum, v) => sum + v.overall_score, 0);
        const averageScore = Math.round(totalScore / verifications.length);

        // Update venue with new average score
        await supabase
          .from('verifiable_venues')
          .update({
            safety_score: averageScore,
            last_verified: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', venueId);
      }
    } catch (error) {
      console.error('Error recalculating venue safety score:', error);
    }
  }

  // Get user's verification history
  async getUserVerificationHistory(userId: string): Promise<Array<{
    id: string;
    venueName: string;
    category: string;
    safetyScore: number;
    verifiedAt: string;
    location: { latitude: number; longitude: number };
  }>> {
    try {
      const { data, error } = await supabase
        .from('venue_verifications')
        .select(`
          id,
          overall_score,
          verified_at,
          user_latitude,
          user_longitude,
          verifiable_venues (
            name,
            category,
            latitude,
            longitude
          )
        `)
        .eq('user_id', userId)
        .order('verified_at', { ascending: false })
        .limit(20);

      if (error) {
        throw error;
      }

      return (data || []).map(item => ({
        id: item.id,
        venueName: (item.verifiable_venues as any)?.name || 'Unknown Venue',
        category: (item.verifiable_venues as any)?.category || 'other',
        safetyScore: item.overall_score,
        verifiedAt: item.verified_at,
        location: {
          latitude: item.user_latitude || (item.verifiable_venues as any)?.latitude || 0,
          longitude: item.user_longitude || (item.verifiable_venues as any)?.longitude || 0,
        },
      }));
    } catch (error) {
      console.error('Error fetching user verification history:', error);
      return [];
    }
  }

  // Get detailed safety score data for a specific venue
  async getVenueSafetyDetails(venueId: string): Promise<{
    venue: VerifiableVenue;
    factors: {
      lighting: number;
      security: number;
      cleanliness: number;
      accessibility: number;
      staffPresence: number;
    };
    statistics: {
      totalReports: number;
      officialInspections: number;
      incidentResponses: number;
      lastUpdated: string;
    };
  } | null> {
    try {
      console.log('getVenueSafetyDetails called with venueId:', venueId, 'type:', typeof venueId);

      // Handle different ID formats - some might be strings that look like numbers
      const processedVenueId = venueId.toString();

      // Get venue basic info
      const { data: venue, error: venueError } = await supabase
        .from('verifiable_venues')
        .select('*')
        .eq('id', processedVenueId)
        .single();

      console.log('Venue query result:', { venue, venueError, processedVenueId });

      if (venueError || !venue) {
        console.warn('Venue not found:', venueError, 'for ID:', processedVenueId);

        // If venue doesn't exist in database, return null to show error
        // This indicates a data inconsistency issue
        return null;
      }

      // If venue exists but has no verification records, return basic data with fallback scores
      if (venue.verification_count === 0 || venue.verification_count === null) {
        console.log('Venue exists but has no verification records, using fallback data');

        const fallbackScore = venue.safety_score || 7.0;
        const fallbackFactors = {
          lighting: Math.round(fallbackScore * 10),
          security: Math.round(fallbackScore * 10),
          cleanliness: Math.round(fallbackScore * 10),
          accessibility: Math.round(fallbackScore * 10),
          staffPresence: Math.round(fallbackScore * 10),
        };

        return {
          venue: {
            id: venue.id,
            name: venue.name,
            type: venue.type,
            address: venue.address,
            latitude: venue.latitude,
            longitude: venue.longitude,
            distance: 0,
            verificationStatus: venue.verification_status,
            verificationCount: venue.verification_count || 0,
            lastVerified: venue.last_verified,
            category: venue.category,
            safetyScore: venue.safety_score,
          },
          factors: fallbackFactors,
          statistics: {
            totalReports: 0,
            officialInspections: 0,
            incidentResponses: 0,
            lastUpdated: venue.last_verified || venue.updated_at || new Date().toISOString(),
          },
        };
      }

      // Get all verification records for this venue
      const { data: verifications, error: verificationsError } = await supabase
        .from('venue_verifications')
        .select('*')
        .eq('venue_id', processedVenueId)
        .order('verified_at', { ascending: false });

      console.log('Verifications query result:', { verifications, verificationsError });

      const verificationRecords = verifications || [];
      console.log('Number of verification records found:', verificationRecords.length);

      // If there's a database error (not just no records), log it but continue with fallback
      if (verificationsError) {
        console.warn('Error fetching verifications, using fallback data:', verificationsError);
      }

      // Calculate average scores from all verifications
      let totalLighting = 0;
      let totalSecurity = 0;
      let totalCleanliness = 0;
      let totalAccessibility = 0;
      let totalStaffPresence = 0;

      verificationRecords.forEach(v => {
        totalLighting += v.lighting_score;
        totalSecurity += v.security_score;
        totalCleanliness += v.cleanliness_score;
        totalAccessibility += v.accessibility_score;
        totalStaffPresence += v.staff_presence_score;
      });

      const verificationCount = verificationRecords.length;
      console.log('Verification count:', verificationCount);

      // Calculate averages (or use venue's overall score if no detailed verifications)
      const factors = {
        lighting: verificationCount > 0 ? Math.round(totalLighting / verificationCount) : Math.round((venue.safety_score || 7) * 10),
        security: verificationCount > 0 ? Math.round(totalSecurity / verificationCount) : Math.round((venue.safety_score || 7) * 10),
        cleanliness: verificationCount > 0 ? Math.round(totalCleanliness / verificationCount) : Math.round((venue.safety_score || 7) * 10),
        accessibility: verificationCount > 0 ? Math.round(totalAccessibility / verificationCount) : Math.round((venue.safety_score || 7) * 10),
        staffPresence: verificationCount > 0 ? Math.round(totalStaffPresence / verificationCount) : Math.round((venue.safety_score || 7) * 10),
      };

      console.log('Calculated factors:', factors);

      // Get statistics
      const statistics = {
        totalReports: verificationCount,
        officialInspections: Math.max(1, Math.floor(verificationCount * 0.3)), // Estimate based on verifications
        incidentResponses: Math.floor(Math.random() * Math.max(1, verificationCount)) + 1, // Some randomization for demo
        lastUpdated: venue.last_verified || verificationRecords[0]?.verified_at || new Date().toISOString(),
      };

      console.log('Calculated statistics:', statistics);

      const result = {
        venue: {
          id: venue.id,
          name: venue.name,
          type: venue.type,
          address: venue.address,
          latitude: venue.latitude,
          longitude: venue.longitude,
          distance: 0, // Not relevant for individual venue view
          verificationStatus: venue.verification_status,
          verificationCount: venue.verification_count,
          lastVerified: venue.last_verified,
          category: venue.category,
          safetyScore: venue.safety_score,
        },
        factors,
        statistics,
      };

      console.log('Returning venue safety details:', result);
      return result;
    } catch (error) {
      console.error('Error fetching venue safety details:', error);
      return null;
    }
  }

  // Helper method to map OSM venue types to our categories
  private mapVenueTypeToCategory(osmType: string): 'restaurant' | 'bar' | 'cafe' | 'cinema' | 'club' | 'shop' | 'other' {
    const typeMapping: { [key: string]: 'restaurant' | 'bar' | 'cafe' | 'cinema' | 'club' | 'shop' | 'other' } = {
      'restaurant': 'restaurant',
      'fast_food': 'restaurant',
      'cafe': 'cafe',
      'bar': 'bar',
      'pub': 'bar',
      'cinema': 'cinema',
      'theatre': 'cinema',
      'nightclub': 'club',
      'shop': 'shop',
      'supermarket': 'shop',
      'mall': 'shop',
      'bank': 'shop',
      'pharmacy': 'shop',
    };

    return typeMapping[osmType] || 'other';
  }
}

export const hubService = new HubService();

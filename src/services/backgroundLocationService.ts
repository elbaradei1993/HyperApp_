import { Capacitor } from '@capacitor/core';

import { supabase } from '../lib/supabase';

import { locationService, LocationResult } from './locationService';

export interface LocationChangeCallback {
  (newLocation: [number, number], oldLocation: [number, number] | null): void;
}

class BackgroundLocationService {
  private static instance: BackgroundLocationService;
  private currentLocation: [number, number] | null = null;
  private lastSignificantUpdate: number = 0;
  private watchId: string | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private locationChangeCallbacks: Set<LocationChangeCallback> = new Set();
  private isInitialized = false;

  // Configuration
  private readonly SIGNIFICANT_DISTANCE_THRESHOLD = 100; // meters - only update if moved > 100m
  private readonly MIN_UPDATE_INTERVAL = 5 * 60 * 1000; // 5 minutes minimum between significant updates
  private readonly BACKGROUND_REFRESH_INTERVAL = 2 * 60 * 1000; // 2 minutes background check

  private constructor() {}

  static getInstance(): BackgroundLocationService {
    if (!BackgroundLocationService.instance) {
      BackgroundLocationService.instance = new BackgroundLocationService();
    }
    return BackgroundLocationService.instance;
  }

  // Initialize background location tracking
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      console.log('🔄 Initializing background location service...');

      // Get initial location
      const initialPosition = await locationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
      });

      this.currentLocation = [initialPosition.latitude, initialPosition.longitude];
      this.lastSignificantUpdate = Date.now();

      console.log(`📍 Background location initialized: ${initialPosition.latitude.toFixed(6)}, ${initialPosition.longitude.toFixed(6)}`);

      // Start background monitoring
      await this.startBackgroundMonitoring();

      this.isInitialized = true;
    } catch (error: any) {
      console.error('Failed to initialize background location service:', error?.message || error);
      throw error;
    }
  }

  // Start background location monitoring
  private async startBackgroundMonitoring(): Promise<void> {
    // Start watching for location changes
    this.watchId = await locationService.watchPosition(
      (result) => {
        this.handleLocationUpdate(result);
      },
      (error) => {
        console.log('⚠️ Background location watch error:', error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 30000,
      },
    );

    // Set up periodic background refresh
    this.refreshInterval = setInterval(async () => {
      try {
        const position = await locationService.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 10000,
        });
        this.handleLocationUpdate(position);
      } catch (error: any) {
        console.log('⚠️ Background location refresh failed:', error?.message || error);
      }
    }, this.BACKGROUND_REFRESH_INTERVAL);
  }

  // Handle location updates with change detection
  private async handleLocationUpdate(result: LocationResult): Promise<void> {
    const newLocation: [number, number] = [result.latitude, result.longitude];
    const now = Date.now();

    // Check if this is a significant location change
    if (this.isSignificantLocationChange(newLocation, this.currentLocation)) {
      const oldLocation = this.currentLocation;
      this.currentLocation = newLocation;
      this.lastSignificantUpdate = now;

      console.log(`🔄 Significant location change detected: ${newLocation[0].toFixed(6)}, ${newLocation[1].toFixed(6)}`);

      // Send location update to Supabase for admin monitoring
      await this.sendLocationUpdateToSupabase(result);

      // Notify all subscribers of the location change
      this.notifyLocationChangeSubscribers(newLocation, oldLocation);
    } else {
      // Update current location but don't notify subscribers
      this.currentLocation = newLocation;
    }
  }

  // Send location update to Supabase
  private async sendLocationUpdateToSupabase(result: LocationResult): Promise<void> {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.log('No authenticated user, skipping location update');
        return;
      }

      // Send location update to Supabase
      const { error } = await supabase.rpc('update_user_location', {
        p_user_id: user.id,
        p_latitude: result.latitude,
        p_longitude: result.longitude,
        p_accuracy: result.accuracy,
        p_heading: null,
        p_speed: null,
        p_altitude: null,
        p_location_source: 'gps',
      });

      if (error) {
        console.error('Failed to update location in Supabase:', error);
      } else {
        console.log('📍 Location updated in Supabase');
      }
    } catch (error) {
      console.error('Error sending location update to Supabase:', error);
    }
  }

  // Check if location change is significant enough to trigger updates
  private isSignificantLocationChange(newLocation: [number, number], oldLocation: [number, number] | null): boolean {
    if (!oldLocation) {
      return true;
    } // First location is always significant

    // Calculate distance in meters
    const distance = this.calculateDistance(newLocation, oldLocation);

    // Check distance threshold
    if (distance > this.SIGNIFICANT_DISTANCE_THRESHOLD) {
      return true;
    }

    // Check time threshold (force update if too long since last significant update)
    const timeSinceLastUpdate = Date.now() - this.lastSignificantUpdate;
    if (timeSinceLastUpdate > this.MIN_UPDATE_INTERVAL) {
      return true;
    }

    return false;
  }

  // Calculate distance between two coordinates in meters
  private calculateDistance(coord1: [number, number], coord2: [number, number]): number {
    const [lat1, lon1] = coord1;
    const [lat2, lon2] = coord2;

    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }

  // Subscribe to location changes
  onLocationChange(callback: LocationChangeCallback): () => void {
    this.locationChangeCallbacks.add(callback);

    // Return unsubscribe function
    return () => {
      this.locationChangeCallbacks.delete(callback);
    };
  }

  // Notify all subscribers of location changes
  private notifyLocationChangeSubscribers(newLocation: [number, number], oldLocation: [number, number] | null): void {
    this.locationChangeCallbacks.forEach(callback => {
      try {
        callback(newLocation, oldLocation);
      } catch (error) {
        console.error('Error in location change callback:', error);
      }
    });
  }

  // Get current location (for immediate access)
  getCurrentLocation(): [number, number] | null {
    return this.currentLocation;
  }

  // Force a location update (for manual refresh)
  async forceLocationUpdate(): Promise<[number, number] | null> {
    try {
      const position = await locationService.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
      });

      const newLocation: [number, number] = [position.latitude, position.longitude];
      const oldLocation = this.currentLocation;

      this.currentLocation = newLocation;
      this.lastSignificantUpdate = Date.now();

      // Always notify subscribers on forced update
      this.notifyLocationChangeSubscribers(newLocation, oldLocation);

      return newLocation;
    } catch (error: any) {
      console.error('Failed to force location update:', error?.message || error);
      return null;
    }
  }

  // Stop background location monitoring
  stop(): void {
    if (this.watchId) {
      locationService.clearWatch(this.watchId);
      this.watchId = null;
    }

    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }

    this.locationChangeCallbacks.clear();
    this.isInitialized = false;

    console.log('🛑 Background location service stopped');
  }

  // Check if service is initialized
  isActive(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const backgroundLocationService = BackgroundLocationService.getInstance();
export default backgroundLocationService;

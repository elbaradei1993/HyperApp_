// Unified Location Service - Capacitor Geolocation on mobile, navigator on web
import { Capacitor } from '@capacitor/core';
import { Geolocation, Position, PositionOptions } from '@capacitor/geolocation';

export interface LocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface LocationError {
  code: number;
  message: string;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

class LocationService {
  private static instance: LocationService;
  private watchId: string | null = null;

  private constructor() {}

  static getInstance(): LocationService {
    if (!LocationService.instance) {
      LocationService.instance = new LocationService();
    }
    return LocationService.instance;
  }

  // Get current position
  async getCurrentPosition(options: LocationOptions = {}): Promise<LocationResult> {
    try {
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Using Capacitor Geolocation for current position');

        const capacitorOptions: PositionOptions = {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 30000,
          maximumAge: options.maximumAge ?? 30000,
        };

        const position: Position = await Geolocation.getCurrentPosition(capacitorOptions);

        return {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };

      } else {
        console.log('🌐 Using navigator.geolocation for current position');

        return new Promise((resolve, reject) => {
          if (!navigator.geolocation) {
            reject({ code: 2, message: 'Geolocation not supported' });
            return;
          }

          navigator.geolocation.getCurrentPosition(
            (position) => {
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: position.timestamp,
              });
            },
            (error) => {
              reject({
                code: error.code,
                message: error.message,
              });
            },
            {
              enableHighAccuracy: options.enableHighAccuracy ?? true,
              timeout: options.timeout ?? 30000,
              maximumAge: options.maximumAge ?? 30000,
            },
          );
        });
      }
    } catch (error: any) {
      console.error('Error getting current position:', error);
      throw {
        code: error.code || 1,
        message: error.message || 'Unknown location error',
      };
    }
  }

  // Watch position changes
  async watchPosition(
    callback: (result: LocationResult) => void,
    errorCallback: (error: LocationError) => void,
    options: LocationOptions = {},
  ): Promise<string> {
    try {
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Using Capacitor Geolocation for position watching');

        const capacitorOptions: PositionOptions = {
          enableHighAccuracy: options.enableHighAccuracy ?? true,
          timeout: options.timeout ?? 30000,
          maximumAge: options.maximumAge ?? 30000,
        };

        const id = await Geolocation.watchPosition(capacitorOptions, (position, error) => {
          if (position) {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          } else if (error) {
            errorCallback({
              code: error.code || 1,
              message: error.message || 'Watch position error',
            });
          }
        });

        this.watchId = id;
        return id;

      } else {
        console.log('🌐 Using navigator.geolocation for position watching');

        if (!navigator.geolocation) {
          errorCallback({ code: 2, message: 'Geolocation not supported' });
          return '';
        }

        const id = navigator.geolocation.watchPosition(
          (position) => {
            callback({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              timestamp: position.timestamp,
            });
          },
          (error) => {
            errorCallback({
              code: error.code,
              message: error.message,
            });
          },
          {
            enableHighAccuracy: options.enableHighAccuracy ?? true,
            timeout: options.timeout ?? 30000,
            maximumAge: options.maximumAge ?? 30000,
          },
        );

        this.watchId = id.toString();
        return id.toString();
      }
    } catch (error: any) {
      console.error('Error watching position:', error);
      errorCallback({
        code: error.code || 1,
        message: error.message || 'Unknown watch error',
      });
      return '';
    }
  }

  // Clear watch
  clearWatch(watchId?: string): void {
    const idToClear = watchId || this.watchId;

    if (!idToClear) {
      return;
    }

    try {
      if (Capacitor.isNativePlatform()) {
        Geolocation.clearWatch({ id: idToClear });
        console.log('📱 Cleared Capacitor geolocation watch');
      } else {
        navigator.geolocation.clearWatch(parseInt(idToClear));
        console.log('🌐 Cleared navigator geolocation watch');
      }
    } catch (error) {
      console.error('Error clearing watch:', error);
    }

    if (idToClear === this.watchId) {
      this.watchId = null;
    }
  }

  // Check if geolocation is available
  isAvailable(): boolean {
    if (Capacitor.isNativePlatform()) {
      // Capacitor Geolocation is always available on mobile
      return true;
    } else {
      return !!navigator.geolocation;
    }
  }

  // Request permissions (mainly for web, mobile handles this automatically)
  async requestPermissions(): Promise<boolean> {
    try {
      if (Capacitor.isNativePlatform()) {
        // On mobile, permissions are requested automatically when getting location
        console.log('📱 Capacitor handles permissions automatically');
        return true;
      } else {
        // On web, check permissions API
        if (navigator.permissions && navigator.permissions.query) {
          const result = await navigator.permissions.query({ name: 'geolocation' });
          console.log('🌐 Location permission status:', result.state);
          return result.state === 'granted';
        }
        return true; // Assume available if permissions API not supported
      }
    } catch (error) {
      console.error('Error requesting location permissions:', error);
      return false;
    }
  }
}

// Export singleton instance
export const locationService = LocationService.getInstance();
export default locationService;

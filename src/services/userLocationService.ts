import { supabase } from '../lib/supabase';

export interface NearbyUser {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  latitude: number;
  longitude: number;
  distance: number; // in kilometers
  last_updated: string;
}

class UserLocationService {
  private static instance: UserLocationService;

  private constructor() {}

  static getInstance(): UserLocationService {
    if (!UserLocationService.instance) {
      UserLocationService.instance = new UserLocationService();
    }
    return UserLocationService.instance;
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Find nearby users within a specified radius
   */
  async findNearbyUsers(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 10,
    excludeUserId?: string,
    limit: number = 50,
  ): Promise<NearbyUser[]> {
    console.log('🚨 findNearbyUsers CALLED with params:', { centerLat, centerLng, radiusKm, excludeUserId, limit });
    try {
      console.log('🔍 Finding nearby users for location:', centerLat, centerLng, 'within', radiusKm, 'km');

      // First get all users with recent locations
      const { data: locationData, error: locationError } = await supabase
        .from('user_locations')
        .select('user_id, latitude, longitude, last_updated')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
        .gt('last_updated', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()); // Last 24 hours

      if (locationError) {
        console.error('❌ Error fetching locations from database:', locationError);
        return [];
      }

      if (!locationData || locationData.length === 0) {
        console.log('⚠️ No users with locations found in database');
        return [];
      }

      // Get user IDs and filter by location sharing preference
      const userIds = locationData.map((user: any) => user.user_id);
      console.log('👤 Checking location sharing preferences for user IDs:', userIds);

      const { data: sharingUsers, error: sharingError } = await supabase
        .from('users')
        .select('user_id')
        .in('user_id', userIds)
        .eq('location_sharing', true);

      if (sharingError) {
        console.error('❌ Error checking location sharing preferences:', sharingError);
        return [];
      }

      // Filter location data to only include users with sharing enabled
      const sharingUserIds = new Set((sharingUsers || []).map((user: any) => user.user_id));
      const filteredLocationData = locationData.filter((user: any) => sharingUserIds.has(user.user_id));

      // Deduplicate by user_id in case there are multiple location records (shouldn't happen but safety check)
      const uniqueUsers = new Map();
      filteredLocationData.forEach((user: any) => {
        if (!uniqueUsers.has(user.user_id)) {
          uniqueUsers.set(user.user_id, user);
        }
      });
      const deduplicatedLocationData = Array.from(uniqueUsers.values());

      console.log('📊 Found', deduplicatedLocationData.length, 'unique users with locations and sharing enabled');

      if (deduplicatedLocationData.length === 0) {
        console.log('⚠️ No users with locations and sharing enabled found');
        return [];
      }

      // Get user profiles for the found users
      const deduplicatedUserIds = deduplicatedLocationData.map((user: any) => user.user_id);
      console.log('👤 Fetching profiles for user IDs:', deduplicatedUserIds);

      const { data: profiles, error: profileError } = await supabase
        .from('users')
        .select('user_id, username, first_name, last_name')
        .in('user_id', deduplicatedUserIds);

      if (profileError) {
        console.error('❌ Error fetching user profiles:', profileError);
      }

      // Create a map of user profiles for quick lookup
      const profileMap = new Map();
      if (profiles) {
        profiles.forEach((profile: any) => {
          profileMap.set(profile.user_id, profile);
        });
      }

      console.log('📍 Processing', deduplicatedLocationData.length, 'users for distance calculation');

      // Calculate distances and filter by radius
      const nearbyUsers: NearbyUser[] = [];
      let excludedCount = 0;

      for (const user of deduplicatedLocationData) {
        // Exclude current user from nearby users list
        if (excludeUserId && user.user_id === excludeUserId) {
          excludedCount++;
          continue;
        }

        const distance = this.calculateDistance(
          centerLat,
          centerLng,
          user.latitude,
          user.longitude,
        );

        console.log(`📍 User ${user.user_id}: ${user.latitude}, ${user.longitude} - Distance: ${distance.toFixed(2)}km`);

        // Only include users within the specified radius
        if (distance <= radiusKm) {
          const profile = profileMap.get(user.user_id);
          nearbyUsers.push({
            id: user.user_id,
            username: profile?.username || null,
            first_name: profile?.first_name || null,
            last_name: profile?.last_name || null,
            latitude: user.latitude,
            longitude: user.longitude,
            distance,
            last_updated: user.last_updated,
          });
        }
      }

      console.log(`✅ Found ${nearbyUsers.length} nearby users (excluded ${excludedCount} current user)`);

      // Sort by distance and limit results
      nearbyUsers.sort((a, b) => a.distance - b.distance);
      const result = nearbyUsers.slice(0, limit);

      console.log('🎯 Returning', result.length, 'nearby users');
      return result;

    } catch (error) {
      console.error('❌ Error finding nearby users:', error);
      return [];
    }
  }

  /**
   * Update user's location using direct table operations
   */
  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
  ): Promise<boolean> {
    try {
      console.log('📍 Updating user location:', { userId, latitude, longitude, accuracy });

      // First try to update existing record
      const { data: existing, error: selectError } = await supabase
        .from('user_locations')
        .select('user_id, created_at')
        .eq('user_id', userId)
        .single();

      if (selectError && selectError.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error checking existing location:', selectError);
        return false;
      }

      const locationData = {
        user_id: userId,
        latitude,
        longitude,
        location: null, // No PostGIS geometry available
        accuracy,
        last_updated: new Date().toISOString(),
      };

      let result;
      if (existing) {
        // Update existing record
        console.log('📝 Updating existing location record');
        result = await supabase
          .from('user_locations')
          .update({
            ...locationData,
            created_at: existing.created_at, // Keep original created_at
          })
          .eq('user_id', userId);
      } else {
        // Insert new record
        console.log('📝 Inserting new location record');
        result = await supabase
          .from('user_locations')
          .insert({
            ...locationData,
            created_at: new Date().toISOString(),
          });
      }

      if (result.error) {
        console.error('❌ Error saving user location:', result.error);
        return false;
      }

      console.log('✅ User location saved successfully');
      return true;
    } catch (error) {
      console.error('❌ Failed to save user location:', error);
      return false;
    }
  }

  /**
   * Update user's location sharing preference on the server
   */
  async updateLocationSharingPreference(userId: string, enabled: boolean): Promise<boolean> {
    try {
      console.log('🔄 Updating location sharing preference:', { userId, enabled });

      const { error } = await supabase
        .from('users')
        .update({ location_sharing: enabled })
        .eq('user_id', userId);

      if (error) {
        console.error('❌ Error updating location sharing preference:', error);
        return false;
      }

      console.log('✅ Location sharing preference updated successfully');

      // If sharing is disabled, the next location update will clean up the data
      // But let's also immediately clean up existing data if disabled
      if (!enabled) {
        console.log('🧹 Cleaning up location data for disabled sharing');
        const { error: deleteError } = await supabase
          .from('user_locations')
          .delete()
          .eq('user_id', userId);

        if (deleteError) {
          console.error('❌ Error cleaning up location data:', deleteError);
          // Don't return false here as the preference was updated successfully
        } else {
          console.log('✅ Location data cleaned up');
        }
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to update location sharing preference:', error);
      return false;
    }
  }

  /**
   * Refresh nearby users for a given location (used for periodic updates)
   */
  async refreshNearbyUsers(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 10,
    excludeUserId?: string,
    limit: number = 50,
  ): Promise<NearbyUser[]> {
    // This is essentially the same as findNearbyUsers but can be optimized for frequent calls
    return this.findNearbyUsers(centerLat, centerLng, radiusKm, excludeUserId, limit);
  }
}

// Export singleton instance
export const userLocationService = UserLocationService.getInstance();
export default userLocationService;

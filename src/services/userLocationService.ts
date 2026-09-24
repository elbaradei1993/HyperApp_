import { supabase } from '../lib/supabase';

export interface NearbyUser {
  id: string;
  username: string | null;
  first_name: string | null;
  last_name: string | null;
  profile_picture_url: string | null;
  verification_level: string | null;
  latitude: number;
  longitude: number;
  distance: number;
  last_updated: string;
}

class UserLocationService {
  private static instance: UserLocationService;

  private constructor() {}

  static getInstance(): UserLocationService {
    if (!UserLocationService.instance) UserLocationService.instance = new UserLocationService();
    return UserLocationService.instance;
  }

  async findNearbyUsers(
    centerLat: number,
    centerLng: number,
    radiusKm: number = 10,
    excludeUserId?: string,
    limit: number = 50,
  ): Promise<NearbyUser[]> {
    try {
      const { data, error } = await supabase.rpc('get_nearby_users_for_map', {
        center_lat: centerLat,
        center_lng: centerLng,
        radius_km: radiusKm,
        exclude_user_id: excludeUserId || null,
      });

      if (error) throw error;

      return ((data || []) as Array<{
        user_id: string;
        user_location_lat: number;
        user_location_lng: number;
        distance: number;
        username: string | null;
        first_name: string | null;
        last_name: string | null;
        profile_picture_url: string | null;
        verification_level: string | null;
      }>).slice(0, limit).map((user) => ({
        id: user.user_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        profile_picture_url: user.profile_picture_url,
        verification_level: user.verification_level,
        latitude: user.user_location_lat,
        longitude: user.user_location_lng,
        distance: user.distance,
        last_updated: new Date().toISOString(),
      }));
    } catch (error) {
      console.error('Error finding nearby users:', error);
      return [];
    }
  }

  async updateUserLocation(
    userId: string,
    latitude: number,
    longitude: number,
    accuracy?: number,
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_locations')
        .upsert(
          {
            user_id: userId,
            latitude,
            longitude,
            location: null,
            accuracy,
            last_updated: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        );
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to save user location:', error);
      return false;
    }
  }

  async deleteUserLocation(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase.from('user_locations').delete().eq('user_id', userId);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Failed to delete user location:', error);
      return false;
    }
  }

  async updateLocationSharingPreference(userId: string, enabled: boolean): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('users')
        .update({ location_sharing: enabled })
        .eq('user_id', userId)
        .select('user_id');

      if (error || !data || data.length !== 1) return false;
      if (!enabled) await this.deleteUserLocation(userId);
      return true;
    } catch (error) {
      console.error('Failed to update location sharing preference:', error);
      return false;
    }
  }

  async refreshNearbyUsers(
    centerLat: number,
    centerLng: number,
    radiusKm = 10,
    excludeUserId?: string,
    limit = 50,
  ): Promise<NearbyUser[]> {
    return this.findNearbyUsers(centerLat, centerLng, radiusKm, excludeUserId, limit);
  }
}

export const userLocationService = UserLocationService.getInstance();
export default userLocationService;

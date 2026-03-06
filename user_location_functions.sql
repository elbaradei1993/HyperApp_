-- User Location Functions for HyperApp User App
-- These functions handle user location tracking and nearby user discovery

-- Drop existing functions if they exist with different signatures
DROP FUNCTION IF EXISTS find_nearby_users_for_map(double precision, double precision, double precision) CASCADE;
DROP FUNCTION IF EXISTS update_user_location(text, numeric, numeric, numeric, numeric, numeric, numeric, text) CASCADE;
DROP FUNCTION IF EXISTS update_user_location(uuid, double precision, double precision, real, real, real, real, text) CASCADE;

-- Function to update user location in user_locations table
CREATE OR REPLACE FUNCTION update_user_location(
  p_user_id UUID,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_accuracy REAL DEFAULT NULL,
  p_heading REAL DEFAULT NULL,
  p_speed REAL DEFAULT NULL,
  p_altitude REAL DEFAULT NULL,
  p_location_source TEXT DEFAULT 'gps'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_sharing_enabled BOOLEAN := false; -- Default to false for safety
BEGIN
  -- Check if user has location sharing enabled
  SELECT location_sharing INTO user_sharing_enabled
  FROM users
  WHERE user_id = p_user_id::text;

  -- If location sharing is disabled, remove any existing location data and return
  IF user_sharing_enabled IS FALSE THEN
    RAISE LOG 'Location sharing disabled for user %, removing location data', p_user_id;
    DELETE FROM user_locations WHERE user_id = p_user_id;
    RETURN TRUE;
  END IF;

  -- If location sharing is enabled, ensure we don't create duplicate records
  -- Delete any existing records first to prevent duplicates
  DELETE FROM user_locations WHERE user_id = p_user_id;

  -- Store location as separate lat/lng columns (PostGIS not available)
  RAISE LOG 'Storing user location with lat/lng columns for user %', p_user_id;

  -- Insert or update location
  INSERT INTO user_locations (
    user_id,
    latitude,
    longitude,
    location,
    accuracy,
    last_updated,
    created_at
  ) VALUES (
    p_user_id,
    p_latitude,
    p_longitude,
    NULL,  -- No PostGIS geometry available
    p_accuracy,
    NOW(),
    NOW()
  )
  ON CONFLICT (user_id)
  DO UPDATE SET
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    location = EXCLUDED.location,
    accuracy = EXCLUDED.accuracy,
    last_updated = NOW();

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error updating user location for user %: %', p_user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Function to find nearby users for map display (without PostGIS)
CREATE OR REPLACE FUNCTION find_nearby_users_for_map(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km DOUBLE PRECISION DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  user_location_lat DOUBLE PRECISION,
  user_location_lng DOUBLE PRECISION,
  distance DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Return all users with recent locations (within 24 hours)
  -- Distance calculation will be done in JavaScript
  RETURN QUERY
  SELECT
    ul.user_id,
    ul.latitude as user_location_lat,
    ul.longitude as user_location_lng,
    0.0 as distance -- Placeholder, will be calculated client-side
  FROM user_locations ul
  WHERE ul.latitude IS NOT NULL
    AND ul.longitude IS NOT NULL
    AND ul.last_updated > NOW() - INTERVAL '24 hours' -- Only recent locations
  ORDER BY ul.last_updated DESC;
END;
$$;

-- Function to get user location statistics
CREATE OR REPLACE FUNCTION get_user_location_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE (
  user_id UUID,
  total_locations BIGINT,
  avg_accuracy REAL,
  last_location TIMESTAMPTZ,
  location_count_last_24h BIGINT,
  location_count_last_7d BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.user_id,
    COUNT(*) as total_locations,
    ROUND(AVG(ul.accuracy), 2) as avg_accuracy,
    MAX(ul.last_updated) as last_location,
    COUNT(CASE WHEN ul.last_updated > NOW() - INTERVAL '24 hours' THEN 1 END) as location_count_last_24h,
    COUNT(CASE WHEN ul.last_updated > NOW() - INTERVAL '7 days' THEN 1 END) as location_count_last_7d
  FROM user_locations ul
  WHERE (p_user_id IS NULL OR ul.user_id = p_user_id)
  GROUP BY ul.user_id
  ORDER BY last_location DESC;
END;
$$;

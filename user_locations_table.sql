-- User Locations Table for HyperApp
-- Stores user location data for nearby user discovery

CREATE TABLE IF NOT EXISTS public.user_locations (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  location GEOMETRY(POINT, 4326), -- PostGIS geometry (NULL when PostGIS not available)
  accuracy REAL,
  heading REAL,
  speed REAL,
  altitude REAL,
  location_source TEXT DEFAULT 'gps',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS user_locations_lat_lng_idx ON public.user_locations(latitude, longitude);
CREATE INDEX IF NOT EXISTS user_locations_last_updated_idx ON public.user_locations(last_updated DESC);
CREATE INDEX IF NOT EXISTS user_locations_user_id_idx ON public.user_locations(user_id);

-- Row Level Security
ALTER TABLE public.user_locations ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own location
DROP POLICY IF EXISTS user_locations_select_own ON public.user_locations;
CREATE POLICY user_locations_select_own ON public.user_locations
  FOR SELECT TO authenticated
  USING (user_id::text = auth.uid()::text);

-- Allow users to insert/update their own location
DROP POLICY IF EXISTS user_locations_insert_own ON public.user_locations;
CREATE POLICY user_locations_insert_own ON public.user_locations
  FOR INSERT TO authenticated
  WITH CHECK (user_id::text = auth.uid()::text);

DROP POLICY IF EXISTS user_locations_update_own ON public.user_locations;
CREATE POLICY user_locations_update_own ON public.user_locations
  FOR UPDATE TO authenticated
  USING (user_id::text = auth.uid()::text)
  WITH CHECK (user_id::text = auth.uid()::text);

-- Allow functions to manage locations (for RPC calls)
DROP POLICY IF EXISTS user_locations_function_access ON public.user_locations;
CREATE POLICY user_locations_function_access ON public.user_locations
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

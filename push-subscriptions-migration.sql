-- Push Notifications Subscription Table
-- This table stores FCM tokens and user preferences for push notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  fcm_token TEXT NOT NULL UNIQUE,
  user_location_lat DOUBLE PRECISION,
  user_location_lng DOUBLE PRECISION,
  notification_radius INTEGER DEFAULT 5, -- in kilometers
  emergency_alerts BOOLEAN DEFAULT true,
  safety_reports BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one token per user (users can have multiple devices)
  UNIQUE(user_id, fcm_token)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_location ON push_subscriptions(user_location_lat, user_location_lng);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_token ON push_subscriptions(fcm_token);

-- RLS (Row Level Security) policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see/modify their own subscriptions
CREATE POLICY "Users can view own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_push_subscription_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER trigger_update_push_subscription_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_push_subscription_updated_at();

-- Function to find users within radius of a location (for push notifications)
CREATE OR REPLACE FUNCTION find_nearby_users(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_km INTEGER DEFAULT 5
)
RETURNS TABLE (
  user_id UUID,
  fcm_token TEXT,
  distance DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.user_id,
    ps.fcm_token,
    -- Haversine distance calculation
    (6371 * acos(
      cos(radians(center_lat)) * cos(radians(ps.user_location_lat)) *
      cos(radians(ps.user_location_lng) - radians(center_lng)) +
      sin(radians(center_lat)) * sin(radians(ps.user_location_lat))
    )) as distance
  FROM push_subscriptions ps
  WHERE
    ps.user_location_lat IS NOT NULL
    AND ps.user_location_lng IS NOT NULL
    AND (
      6371 * acos(
        cos(radians(center_lat)) * cos(radians(ps.user_location_lat)) *
        cos(radians(ps.user_location_lng) - radians(center_lng)) +
        sin(radians(center_lat)) * sin(radians(ps.user_location_lat))
      )
    ) <= radius_km;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup script for users with location sharing disabled
-- This removes location data for users who have disabled location sharing

-- Delete location data for users who have location_sharing = false
-- Note: user_locations.user_id is UUID, users.user_id is text, so we cast
DELETE FROM public.user_locations
WHERE user_id::text IN (
  SELECT user_id
  FROM public.users
  WHERE location_sharing = false
);

-- Optional: Log the cleanup operation
DO $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Get the count of deleted rows (this would need to be done before the delete in a real scenario)
  -- For now, just log that cleanup was performed
  RAISE LOG 'Location data cleanup completed for users with disabled location sharing';
END $$;

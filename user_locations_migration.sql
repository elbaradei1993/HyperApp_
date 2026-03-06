-- Migration to add location_sharing column to users table
-- This ensures location sharing preferences are stored server-side

-- Add location_sharing column to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS location_sharing BOOLEAN DEFAULT FALSE;

-- Create index for performance when filtering by location sharing
CREATE INDEX IF NOT EXISTS users_location_sharing_idx ON public.users(location_sharing);

-- Update RLS policies to allow users to update their own location_sharing setting
-- (This assumes users can already update their own profile data)

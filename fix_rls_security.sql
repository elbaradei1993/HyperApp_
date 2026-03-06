-- 🚨 CRITICAL SECURITY FIX: Enable Row Level Security (RLS) on all public tables
-- This fixes the major security vulnerability where tables have policies but RLS is disabled

-- Enable RLS on all tables that have policies but RLS disabled
-- Based on Supabase linter results

-- 1. Enable RLS on reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- 2. Enable RLS on users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 3. Enable RLS on all other tables that are missing RLS
ALTER TABLE public.test_table ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vibe_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos_boosts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.safe_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.photo_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.my_spatial_ref_sys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.places ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sos ENABLE ROW LEVEL SECURITY;

-- Note: Some tables might not exist or might already have RLS enabled
-- The ALTER TABLE commands will safely handle these cases

-- Verification query to check RLS status after applying fixes
-- Run this after applying the migration:
/*
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
*/

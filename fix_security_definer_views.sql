-- 🚨 CRITICAL SECURITY FIX: Remove SECURITY DEFINER from views
-- This fixes the security vulnerability where views enforce permissions of the view creator instead of the querying user

-- Based on Supabase linter results, these views have SECURITY DEFINER:
-- - system_health_status
-- - post_comments_with_profiles
-- - community_resources_with_profiles
-- - community_photos_with_profiles
-- - community_events_with_profiles
-- - active_alerts

-- SECURITY DEFINER views are dangerous because they run with the privileges of the view creator,
-- not the user executing the query. This can lead to privilege escalation.

-- Option 1: Change to SECURITY INVOKER (recommended for most cases)
-- This makes views run with the privileges of the calling user

-- Option 2: Remove SECURITY DEFINER entirely (if not needed)
-- Views without explicit security settings default to SECURITY INVOKER

-- Let's change them to SECURITY INVOKER for better security

-- 1. system_health_status view
ALTER VIEW public.system_health_status SET (security_invoker = true);

-- 2. post_comments_with_profiles view
ALTER VIEW public.post_comments_with_profiles SET (security_invoker = true);

-- 3. community_resources_with_profiles view
ALTER VIEW public.community_resources_with_profiles SET (security_invoker = true);

-- 4. community_photos_with_profiles view
ALTER VIEW public.community_photos_with_profiles SET (security_invoker = true);

-- 5. community_events_with_profiles view
ALTER VIEW public.community_events_with_profiles SET (security_invoker = true);

-- 6. active_alerts view
ALTER VIEW public.active_alerts SET (security_invoker = true);

-- Note: If any of these views don't exist, the ALTER VIEW commands will fail safely
-- You can check which views exist with:
/*
SELECT
    schemaname,
    viewname,
    definition
FROM pg_views
WHERE schemaname = 'public'
    AND viewname IN (
        'system_health_status',
        'post_comments_with_profiles',
        'community_resources_with_profiles',
        'community_photos_with_profiles',
        'community_events_with_profiles',
        'active_alerts'
    );
*/

-- Verification query to check view security settings:
/*
SELECT
    schemaname,
    viewname,
    obj_description((schemaname || '.' || viewname)::regclass, 'pg_class') as comment,
    (SELECT reloptions FROM pg_class WHERE oid = (schemaname || '.' || viewname)::regclass) as options
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;
*/

-- 🔍 VERIFICATION SCRIPT: Check database security fixes after applying migrations
-- Run this after applying fix_rls_security.sql and fix_security_definer_views.sql

-- 1. Check RLS status on all public tables
SELECT
    'RLS Status Check' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE
        WHEN rowsecurity = true THEN '✅ SECURE'
        ELSE '❌ VULNERABLE - RLS DISABLED'
    END as security_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'  -- Exclude system tables
    AND tablename NOT LIKE 'spatial_%'  -- Exclude spatial system tables
ORDER BY tablename;

-- 2. Check view security settings
SELECT
    'View Security Check' as check_type,
    schemaname,
    viewname,
    CASE
        WHEN (SELECT reloptions FROM pg_class WHERE oid = (schemaname || '.' || viewname)::regclass) @> ARRAY['security_invoker=true'] THEN '✅ SECURE - INVOKER'
        WHEN (SELECT reloptions FROM pg_class WHERE oid = (schemaname || '.' || viewname)::regclass) @> ARRAY['security_definer=true'] THEN '❌ VULNERABLE - DEFINER'
        ELSE '⚠️ UNKNOWN - Check manually'
    END as security_status,
    (SELECT reloptions FROM pg_class WHERE oid = (schemaname || '.' || viewname)::regclass) as options
FROM pg_views
WHERE schemaname = 'public'
ORDER BY viewname;

-- 3. Check for tables with policies but RLS disabled (should be empty after fix)
SELECT
    'Critical Security Check' as check_type,
    n.nspname as schema_name,
    c.relname as table_name,
    '❌ CRITICAL: Policies exist but RLS disabled' as issue,
    COUNT(p.*) as policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE n.nspname = 'public'
    AND c.relkind = 'r'  -- regular tables
    AND c.relrowsecurity = false  -- RLS disabled
    AND p.polname IS NOT NULL  -- has policies
GROUP BY n.nspname, c.relname
HAVING COUNT(p.*) > 0;

-- 4. Summary statistics
SELECT
    'Security Summary' as check_type,
    COUNT(*) as total_tables,
    COUNT(CASE WHEN rowsecurity = true THEN 1 END) as tables_with_rls,
    COUNT(CASE WHEN rowsecurity = false THEN 1 END) as tables_without_rls,
    ROUND(
        (COUNT(CASE WHEN rowsecurity = true THEN 1 END)::decimal / COUNT(*)::decimal) * 100,
        1
    ) || '%' as rls_coverage_percentage
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE 'spatial_%';

-- 5. Check for SECURITY DEFINER views (should be empty after fix)
SELECT
    'Security Definer Views Check' as check_type,
    COUNT(*) as definer_views_found,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ ALL CLEAR - No SECURITY DEFINER views'
        ELSE '❌ SECURITY ISSUE - ' || COUNT(*) || ' views still use SECURITY DEFINER'
    END as status
FROM pg_views v
WHERE v.schemaname = 'public'
    AND (SELECT reloptions FROM pg_class WHERE oid = (v.schemaname || '.' || v.viewname)::regclass) @> ARRAY['security_definer=true'];

-- 6. Overall security score
WITH security_stats AS (
    SELECT
        COUNT(*) as total_tables,
        COUNT(CASE WHEN rowsecurity = true THEN 1 END) as rls_tables,
        (SELECT COUNT(*) FROM pg_views v WHERE v.schemaname = 'public'
         AND (SELECT reloptions FROM pg_class WHERE oid = (v.schemaname || '.' || v.viewname)::regclass) @> ARRAY['security_definer=true']) as definer_views
    FROM pg_tables
    WHERE schemaname = 'public'
        AND tablename NOT LIKE 'pg_%'
        AND tablename NOT LIKE 'spatial_%'
)
SELECT
    'Overall Security Score' as check_type,
    CASE
        WHEN rls_tables = total_tables AND definer_views = 0 THEN '🟢 EXCELLENT - All security issues resolved'
        WHEN rls_tables >= total_tables * 0.9 AND definer_views <= 1 THEN '🟡 GOOD - Minor issues remain'
        ELSE '🔴 CRITICAL - Security vulnerabilities present'
    END as security_score,
    'RLS Coverage: ' || rls_tables || '/' || total_tables ||
    ', Definer Views: ' || definer_views as details
FROM security_stats;

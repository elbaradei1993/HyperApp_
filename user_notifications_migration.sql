-- ============================================================
-- Migration: user_notifications table
-- Purpose: Replace localStorage-only notification storage with
--          Supabase-backed persistent notifications that sync
--          across devices and support Supabase Realtime.
-- ============================================================

-- Create the user_notifications table
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type          TEXT NOT NULL CHECK (type IN (
    'guardian_alert',
    'achievement',
    'safety_report',
    'community_update',
    'system',
    'welcome'
  )),
  title         TEXT NOT NULL,
  body          TEXT NOT NULL,
  data          JSONB DEFAULT '{}'::jsonb,
  read          BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at    TIMESTAMPTZ DEFAULT NULL  -- NULL means never expires
);

-- Indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id
  ON public.user_notifications (user_id);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_unread
  ON public.user_notifications (user_id, read)
  WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_user_notifications_created_at
  ON public.user_notifications (created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policy: users can only see their own notifications
CREATE POLICY "Users can view own notifications"
  ON public.user_notifications
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: users can mark their own notifications as read
CREATE POLICY "Users can update own notifications"
  ON public.user_notifications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policy: users can delete their own notifications
CREATE POLICY "Users can delete own notifications"
  ON public.user_notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policy: service role can insert notifications for any user
-- (used by Edge Functions and server-side triggers)
CREATE POLICY "Service role can insert notifications"
  ON public.user_notifications
  FOR INSERT
  WITH CHECK (TRUE);  -- Restricted to service_role key at API level

-- Enable Realtime for live notification updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;

-- Helper function: mark all unread notifications as read for a user
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE public.user_notifications
  SET read = TRUE
  WHERE user_id = p_user_id AND read = FALSE;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- Helper function: clean up expired or old notifications (run periodically)
-- Deletes notifications older than 30 days for a given user
CREATE OR REPLACE FUNCTION public.cleanup_old_notifications(p_days_old INTEGER DEFAULT 30)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  DELETE FROM public.user_notifications
  WHERE created_at < NOW() - (p_days_old || ' days')::INTERVAL
     OR (expires_at IS NOT NULL AND expires_at < NOW());
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- ============================================================
-- Usage notes:
--
-- Insert a notification (from Edge Function using service_role key):
--   INSERT INTO user_notifications (user_id, type, title, body, data)
--   VALUES (
--     'user-uuid-here',
--     'guardian_alert',
--     'Guardian Alert',
--     'Your guardian sent an SOS',
--     '{"alert_id": "abc123"}'::jsonb
--   );
--
-- Mark as read (from client):
--   UPDATE user_notifications SET read = TRUE WHERE id = 'notif-uuid';
--
-- Mark all read (from client using helper):
--   SELECT mark_all_notifications_read(auth.uid());
--
-- Realtime subscription (from client):
--   supabase
--     .channel('user-notifications')
--     .on('postgres_changes', {
--       event: 'INSERT',
--       schema: 'public',
--       table: 'user_notifications',
--       filter: `user_id=eq.${userId}`
--     }, handleNewNotification)
--     .subscribe();
-- ============================================================

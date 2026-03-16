-- ============================================================
-- Migration 0020 — Sync Notifications Schema with Backend
-- Project: Sortt
-- Depends: 0006_messaging.sql
-- ============================================================

BEGIN;

-- Add missing columns expected by backend and frontend store
ALTER TABLE notifications 
  ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Sync is_read from existing read_at data if any
UPDATE notifications SET is_read = true WHERE read_at IS NOT NULL;

-- Create index for performance on unread lookups
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE is_read = false;

COMMIT;

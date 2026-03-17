-- Migration 0023: add last_seen to users table
-- TRD §7.1: Tracks user activity for analytics + inactivity warnings

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN users.last_seen IS
  'Last login/activity timestamp. Set on account creation and updated on each login.';

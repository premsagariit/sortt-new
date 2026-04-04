-- ============================================================
-- Migration 0034 — Admin Password Change Required
-- Project: Sortt
-- Purpose: force admins to rotate the default password on first login
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_change_required BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;

UPDATE users
SET password_change_required = true
WHERE user_type = 'admin'
  AND password_hash IS NOT NULL;
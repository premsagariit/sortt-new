-- ============================================================
-- Migration 0033 — Users Email Columns
-- Project: Sortt
-- Purpose: separate admin email identity from phone columns
-- ============================================================

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS email_normalized TEXT,
  ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Backfill admin records that previously reused display_phone for email
UPDATE users
SET
  email = display_phone,
  email_normalized = lower(trim(display_phone))
WHERE
  user_type = 'admin'
  AND email IS NULL
  AND display_phone IS NOT NULL
  AND display_phone LIKE '%@%';

UPDATE users
SET email_normalized = lower(trim(email))
WHERE email IS NOT NULL;

UPDATE users
SET
  email = NULL,
  email_normalized = NULL
WHERE trim(COALESCE(email, '')) = '';

CREATE UNIQUE INDEX IF NOT EXISTS users_email_normalized_unique
  ON users (email_normalized)
  WHERE email_normalized IS NOT NULL;

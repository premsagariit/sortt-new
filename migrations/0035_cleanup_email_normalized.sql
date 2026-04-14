-- migrations/0035_cleanup_email_normalized.sql
-- ─────────────────────────────────────────────────────────────────
-- Drop the redundant email_normalized column.
-- The email column now always stores the normalized (lowercase, trimmed) email.
-- All backend routes updated to query/write using email directly.
-- ─────────────────────────────────────────────────────────────────

-- First, copy any email_normalized values that are missing from email
UPDATE users
SET email = email_normalized
WHERE email IS NULL AND email_normalized IS NOT NULL;

-- Drop the now-redundant column
ALTER TABLE users DROP COLUMN IF EXISTS email_normalized;

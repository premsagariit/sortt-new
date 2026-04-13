-- ============================================================
-- Migration 0009 — Remove clerk_user_id (Clerk integration removed)
-- Depends: 0002_users.sql
-- ============================================================

-- Drop the unique constraint on clerk_user_id (if it exists)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_clerk_user_id_key;

-- Drop the column entirely
ALTER TABLE users DROP COLUMN IF EXISTS clerk_user_id;

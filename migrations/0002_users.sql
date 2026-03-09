-- ============================================================
-- Migration 0002 — Users + Helper Function
-- Project: Sortt / [APP_NAME]
-- Depends: 0001_reference_tables.sql
-- ============================================================

-- ------------------------------------------------------------
-- HELPER FUNCTION (must be first object — every RLS policy depends on this)
-- TRD §8.0: current_app_user_id() reads the per-request user ID
-- set by Express via: SET LOCAL app.current_user_id = $userId
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ------------------------------------------------------------
-- USERS
-- Note: Auth sessions managed by Clerk; user records synced here on first login.
-- phone_hash: HMAC-SHA256 of phone number — never raw phone (V24)
-- clerk_user_id: used for JWT cross-reference — never exposed in public view (V24)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id     TEXT NOT NULL UNIQUE,
  phone_hash        TEXT NOT NULL,
  phone_last4       TEXT NOT NULL,
  name              TEXT NOT NULL,
  user_type         TEXT NOT NULL
                      CHECK (user_type IN ('seller','aggregator','admin')),
  is_active         BOOLEAN NOT NULL DEFAULT true,
  preferred_language TEXT DEFAULT 'en',
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- USERS_PUBLIC VIEW
-- Excludes phone_hash and clerk_user_id — these are NEVER returned
-- to any client via this view (V24, V-CLERK-1)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW users_public AS
  SELECT
    id,
    name,
    phone_last4,
    user_type,
    is_active,
    preferred_language,
    created_at
  FROM users;

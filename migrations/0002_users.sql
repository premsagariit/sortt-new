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
-- Note: Auth sessions managed via custom JWT (OTP-based phone auth).
-- phone_hash: HMAC-SHA256 of phone number — never raw phone (V24)
-- clerk_user_id was removed in migration 0009 (Clerk integration removed).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                TEXT PRIMARY KEY,
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
-- Excludes phone_hash — never returned to any client (V24)
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

-- Migration 0013 — Add profile_photo_url to users

ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_photo_url TEXT;

DROP VIEW IF EXISTS users_public;

CREATE OR REPLACE VIEW users_public AS
  SELECT
    id,
    name,
    phone_last4,
    user_type,
    is_active,
    preferred_language,
    created_at,
    profile_photo_url
  FROM users;

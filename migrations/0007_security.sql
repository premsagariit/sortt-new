-- ============================================================
-- Migration 0007 — Security / Audit Tables
-- Project: Sortt / [APP_NAME]
-- ============================================================

-- ------------------------------------------------------------
-- SELLER FLAGS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_flags (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id   UUID NOT NULL REFERENCES users(id),
  reason      TEXT NOT NULL,
  flagged_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE seller_flags ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- ADMIN AUDIT LOG
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_user_id UUID NOT NULL REFERENCES users(id),
  action        TEXT NOT NULL,
  target_table  TEXT NOT NULL,
  target_id     UUID,
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;

-- Note: No user-facing INSERT, SELECT, UPDATE, DELETE policies.
-- These tables are only accessed via the backend service connection
-- with service-role level privileges, enforcing admin context checks.

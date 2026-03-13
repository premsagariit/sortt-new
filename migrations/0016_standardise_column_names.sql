-- ============================================================
-- MIGRATION: Standardise column names to match TRD schema
-- Run from psql connected to Azure PostgreSQL
-- Date: 2026-03-13
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. ratings
--    rated_by   → rater_id   (UUID FK col must end in _id)
--    rated_user → ratee_id   (missing _id suffix)
-- ----------------------------------------------------------------
ALTER TABLE ratings
  RENAME COLUMN rated_by   TO rater_id;

ALTER TABLE ratings
  RENAME COLUMN rated_user TO ratee_id;


-- ----------------------------------------------------------------
-- 2. otp_log
--    action → otp_hmac   (TRD §X3: stores HMAC-SHA256, not a generic action)
-- ----------------------------------------------------------------
ALTER TABLE otp_log
  RENAME COLUMN action TO otp_hmac;


-- ----------------------------------------------------------------
-- 3. admin_audit_log
--    admin_user_id → actor_id       (TRD: actor_id; redundant prefix removed)
--    target_table  → target_entity  (TRD: target_entity; not always a table)
-- ----------------------------------------------------------------
ALTER TABLE admin_audit_log
  RENAME COLUMN admin_user_id TO actor_id;

ALTER TABLE admin_audit_log
  RENAME COLUMN target_table  TO target_entity;


-- ----------------------------------------------------------------
-- 4. seller_flags
--    flagged_by (UUID) is wrong column entirely.
--    TRD defines flagged_at (TIMESTAMPTZ), suspension_until, resolved_at.
--    Cannot rename — different type. Drop and rebuild correctly.
-- ----------------------------------------------------------------
ALTER TABLE seller_flags
  DROP   COLUMN flagged_by,
  ADD    COLUMN flagged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ADD    COLUMN suspension_until TIMESTAMPTZ,
  ADD    COLUMN resolved_at      TIMESTAMPTZ;

-- ----------------------------------------------------------------
-- Verify all renames applied cleanly
-- ----------------------------------------------------------------
DO $$
DECLARE
  issues INT := 0;
BEGIN
  -- ratings
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ratings' AND column_name='rater_id') THEN
    RAISE WARNING 'FAIL: ratings.rater_id missing'; issues := issues + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ratings' AND column_name='ratee_id') THEN
    RAISE WARNING 'FAIL: ratings.ratee_id missing'; issues := issues + 1;
  END IF;
  -- otp_log
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='otp_log' AND column_name='otp_hmac') THEN
    RAISE WARNING 'FAIL: otp_log.otp_hmac missing'; issues := issues + 1;
  END IF;
  -- admin_audit_log
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='actor_id') THEN
    RAISE WARNING 'FAIL: admin_audit_log.actor_id missing'; issues := issues + 1;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='admin_audit_log' AND column_name='target_entity') THEN
    RAISE WARNING 'FAIL: admin_audit_log.target_entity missing'; issues := issues + 1;
  END IF;
  -- seller_flags
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='seller_flags' AND column_name='flagged_at') THEN
    RAISE WARNING 'FAIL: seller_flags.flagged_at missing'; issues := issues + 1;
  END IF;

  IF issues = 0 THEN
    RAISE NOTICE 'All column renames verified — PASS';
  ELSE
    RAISE EXCEPTION '% verification checks failed — rolling back', issues;
  END IF;
END;
$$;

COMMIT;
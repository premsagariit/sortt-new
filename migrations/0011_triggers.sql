-- ============================================================
-- Migration 0011 — Triggers
-- Project: Sortt / [APP_NAME]
-- ============================================================

-- ------------------------------------------------------------
-- KYC STATUS GUARD
-- V35 — kyc_status DB trigger prevents non-service updates
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION kyc_status_guard()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status THEN
    IF current_setting('app.is_admin_context', true) IS DISTINCT FROM 'true' THEN
      RAISE EXCEPTION 'kyc_status updates require admin context. Set app.is_admin_context=true via admin route.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER kyc_status_guard_trigger
BEFORE UPDATE ON aggregator_profiles
FOR EACH ROW
EXECUTE FUNCTION kyc_status_guard();

-- ------------------------------------------------------------
-- UPDATE TIMESTAMPS
-- Ensure updated_at is universally applied cleanly
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at_trigger
BEFORE UPDATE ON orders
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

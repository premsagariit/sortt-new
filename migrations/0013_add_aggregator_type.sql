-- 0013_add_aggregator_type.sql
-- Ensures the aggregator_type column exists and KYC status trigger is in place.
-- Safe to run multiple times (idempotent pattern via DO block).

DO $$
BEGIN
  -- Add aggregator_type column if not present (idempotent)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aggregator_profiles' AND column_name = 'aggregator_type'
  ) THEN
    ALTER TABLE aggregator_profiles
      ADD COLUMN aggregator_type TEXT NOT NULL DEFAULT 'mobile'
      CHECK (aggregator_type IN ('shop', 'mobile'));
  END IF;
END;
$$;

-- Ensure KYC status update trigger exists (from 0002_rls_policies.sql — idempotent)
CREATE OR REPLACE FUNCTION block_kyc_status_client_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status
     AND current_setting('app.is_admin_context', true) != 'true' THEN
    RAISE EXCEPTION 'kyc_status may only be updated by admin backend routes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_block_kyc_update ON aggregator_profiles;
CREATE TRIGGER trg_block_kyc_update
  BEFORE UPDATE OF kyc_status ON aggregator_profiles
  FOR EACH ROW EXECUTE FUNCTION block_kyc_status_client_update();

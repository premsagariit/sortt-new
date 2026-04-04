-- ============================================================
-- Migration 0031 — Add kyc_reviewed_at to aggregator_profiles
-- Required by: admin KYC approval route (G16.7)
--   PATCH /api/admin/aggregators/:id/kyc sets this timestamp
-- ============================================================

ALTER TABLE aggregator_profiles
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at TIMESTAMPTZ;

-- Verification
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'aggregator_profiles'
      AND column_name = 'kyc_reviewed_at'
  ) THEN
    RAISE EXCEPTION 'FAIL: aggregator_profiles.kyc_reviewed_at missing after migration';
  END IF;
  RAISE NOTICE 'OK: aggregator_profiles.kyc_reviewed_at present';
END;
$$;

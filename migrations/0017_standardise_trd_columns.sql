-- ============================================================
-- MIGRATION: Standardise TRD-native column names
-- Run AFTER 0013_standardise_column_names.sql
-- Save as: backend/db/migrations/0014_standardise_trd_columns.sql
-- Date: 2026-03-13
-- ============================================================

BEGIN;

-- ----------------------------------------------------------------
-- 1. cities
--    display_name → name
--    (No other table has a competing `name` column — prefix is misleading)
-- ----------------------------------------------------------------
ALTER TABLE cities
  RENAME COLUMN display_name TO name;


-- ----------------------------------------------------------------
-- 2. orders
--    pickup_address_text → pickup_address
--    (_text suffix is redundant; column type TEXT is already obvious)
-- ----------------------------------------------------------------
ALTER TABLE orders
  RENAME COLUMN pickup_address_text TO pickup_address;


-- ----------------------------------------------------------------
-- 3. aggregator_profiles
--    operating_area_text → operating_area  (_text suffix anti-pattern)
--    member_since        → created_at      (every other table uses created_at)
-- ----------------------------------------------------------------
ALTER TABLE aggregator_profiles
  RENAME COLUMN operating_area_text TO operating_area;

ALTER TABLE aggregator_profiles
  RENAME COLUMN member_since TO created_at;


-- ----------------------------------------------------------------
-- 4. material_types
--    colour_token → color_token
--    (American English is the code convention — matches JS/TS throughout)
-- ----------------------------------------------------------------
ALTER TABLE material_types
  RENAME COLUMN colour_token TO color_token;


-- ----------------------------------------------------------------
-- 5. ratings
--    review_text → review
--    (_text suffix anti-pattern; char_length CHECK still valid)
-- ----------------------------------------------------------------
ALTER TABLE ratings
  RENAME COLUMN review_text TO review;


-- ----------------------------------------------------------------
-- Verify
-- ----------------------------------------------------------------
DO $$
DECLARE issues INT := 0;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='cities'               AND column_name='name')          THEN RAISE WARNING 'FAIL: cities.name';               issues := issues+1; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders'               AND column_name='pickup_address') THEN RAISE WARNING 'FAIL: orders.pickup_address';      issues := issues+1; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aggregator_profiles'  AND column_name='operating_area') THEN RAISE WARNING 'FAIL: agg_profiles.operating_area'; issues := issues+1; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='aggregator_profiles'  AND column_name='created_at')     THEN RAISE WARNING 'FAIL: agg_profiles.created_at';     issues := issues+1; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='material_types'       AND column_name='color_token')    THEN RAISE WARNING 'FAIL: material_types.color_token';   issues := issues+1; END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='ratings'              AND column_name='review')         THEN RAISE WARNING 'FAIL: ratings.review';               issues := issues+1; END IF;

  IF issues = 0 THEN RAISE NOTICE 'All column renames verified — PASS';
  ELSE RAISE EXCEPTION '% verification checks failed — rolling back', issues;
  END IF;
END;
$$;

COMMIT;
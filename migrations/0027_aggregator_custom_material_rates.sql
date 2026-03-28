-- ============================================================
-- Migration 0027 — Custom material rates for aggregators
-- Allows aggregators to set rates for materials outside the standard
-- material_types reference table (e.g. "Copper Wire", "Wood", etc.)
-- ============================================================

-- 1. Add columns for custom materials
ALTER TABLE aggregator_material_rates
  ADD COLUMN IF NOT EXISTS is_custom    BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_label TEXT;

-- 2. Make material_code nullable so custom rows don't need a FK reference.
--    Standard materials still supply a valid material_code; custom ones
--    set material_code = NULL and populate custom_label instead.
ALTER TABLE aggregator_material_rates
  ALTER COLUMN material_code DROP NOT NULL;

-- 3. Drop the old FK on material_code (no longer enforced for custom rows).
--    If the constraint doesn't exist this is a no-op (IF EXISTS guard).
ALTER TABLE aggregator_material_rates
  DROP CONSTRAINT IF EXISTS aggregator_material_rates_material_code_fkey;

-- 4. Add a CHECK: every row must have either a material_code OR a custom_label.
ALTER TABLE aggregator_material_rates
  ADD CONSTRAINT chk_material_identity
    CHECK (
      (is_custom = FALSE AND material_code IS NOT NULL)
      OR
      (is_custom = TRUE  AND custom_label  IS NOT NULL)
    );

-- 5. Keep the original unique constraint for standard materials;
--    custom materials are identified by (aggregator_id, custom_label).
--    Drop old unique to recreate with a partial index approach.
ALTER TABLE aggregator_material_rates
  DROP CONSTRAINT IF EXISTS aggregator_material_rates_aggregator_id_material_code_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agg_material_std
  ON aggregator_material_rates (aggregator_id, material_code)
  WHERE is_custom = FALSE AND material_code IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_agg_material_custom
  ON aggregator_material_rates (aggregator_id, custom_label)
  WHERE is_custom = TRUE AND custom_label IS NOT NULL;

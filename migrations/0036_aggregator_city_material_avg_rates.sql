-- ============================================================
-- Migration 0036 — Aggregator City Material Average Rates
-- Stores per-city, per-material average buy rates from verified active aggregators.
-- Kept in sync whenever aggregator_material_rates changes.
-- ============================================================

CREATE TABLE IF NOT EXISTS aggregator_city_material_avg_rates (
  city_code         TEXT NOT NULL REFERENCES cities(code),
  material_code     TEXT NOT NULL REFERENCES material_types(code),
  avg_rate_per_kg   NUMERIC(10,2) NOT NULL CHECK (avg_rate_per_kg > 0),
  contributor_count INTEGER NOT NULL CHECK (contributor_count >= 0),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (city_code, material_code)
);

CREATE INDEX IF NOT EXISTS idx_agg_city_material_avg_city
  ON aggregator_city_material_avg_rates (city_code);

CREATE OR REPLACE FUNCTION refresh_aggregator_city_material_avg_rate(
  p_city_code TEXT,
  p_material_code TEXT
)
RETURNS void AS $$
DECLARE
  v_city_code TEXT;
  v_material_code TEXT;
  v_avg NUMERIC(10,2);
  v_count INTEGER;
BEGIN
  v_city_code := UPPER(TRIM(COALESCE(p_city_code, '')));
  v_material_code := LOWER(TRIM(COALESCE(p_material_code, '')));

  IF v_city_code = '' OR v_material_code = '' THEN
    RETURN;
  END IF;

  SELECT
    ROUND(AVG(r.rate_per_kg)::numeric, 2) AS avg_rate_per_kg,
    COUNT(*)::int AS contributor_count
  INTO v_avg, v_count
  FROM aggregator_material_rates r
  JOIN users u ON u.id = r.aggregator_id
  JOIN aggregator_profiles ap ON ap.user_id = r.aggregator_id
  WHERE u.user_type = 'aggregator'
    AND u.is_active = true
    AND LOWER(TRIM(COALESCE(ap.kyc_status, ''))) = 'verified'
    AND UPPER(TRIM(COALESCE(ap.city_code, ''))) = v_city_code
    AND LOWER(TRIM(COALESCE(r.material_code, ''))) = v_material_code
    AND COALESCE(r.is_custom, false) = false
    AND r.rate_per_kg > 0;

  IF COALESCE(v_count, 0) > 0 THEN
    INSERT INTO aggregator_city_material_avg_rates (
      city_code,
      material_code,
      avg_rate_per_kg,
      contributor_count,
      updated_at
    )
    VALUES (
      v_city_code,
      v_material_code,
      v_avg,
      v_count,
      NOW()
    )
    ON CONFLICT (city_code, material_code)
    DO UPDATE SET
      avg_rate_per_kg = EXCLUDED.avg_rate_per_kg,
      contributor_count = EXCLUDED.contributor_count,
      updated_at = NOW();
  ELSE
    DELETE FROM aggregator_city_material_avg_rates
    WHERE city_code = v_city_code
      AND material_code = v_material_code;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_aggregator_city_material_avg_rates()
RETURNS TRIGGER AS $$
DECLARE
  v_new_city_code TEXT;
  v_old_city_code TEXT;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE')
     AND NEW.material_code IS NOT NULL
     AND COALESCE(NEW.is_custom, false) = false THEN
    SELECT city_code
    INTO v_new_city_code
    FROM aggregator_profiles
    WHERE user_id = NEW.aggregator_id;

    PERFORM refresh_aggregator_city_material_avg_rate(v_new_city_code, NEW.material_code);
  END IF;

  IF TG_OP IN ('DELETE', 'UPDATE')
     AND OLD.material_code IS NOT NULL
     AND COALESCE(OLD.is_custom, false) = false THEN
    SELECT city_code
    INTO v_old_city_code
    FROM aggregator_profiles
    WHERE user_id = OLD.aggregator_id;

    PERFORM refresh_aggregator_city_material_avg_rate(v_old_city_code, OLD.material_code);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_aggregator_city_material_avg_rates ON aggregator_material_rates;
CREATE TRIGGER trg_sync_aggregator_city_material_avg_rates
AFTER INSERT OR UPDATE OR DELETE ON aggregator_material_rates
FOR EACH ROW
EXECUTE FUNCTION sync_aggregator_city_material_avg_rates();

-- Backfill current averages.
INSERT INTO aggregator_city_material_avg_rates (
  city_code,
  material_code,
  avg_rate_per_kg,
  contributor_count,
  updated_at
)
SELECT
  UPPER(TRIM(ap.city_code)) AS city_code,
  LOWER(TRIM(r.material_code)) AS material_code,
  ROUND(AVG(r.rate_per_kg)::numeric, 2) AS avg_rate_per_kg,
  COUNT(*)::int AS contributor_count,
  NOW() AS updated_at
FROM aggregator_material_rates r
JOIN users u ON u.id = r.aggregator_id
JOIN aggregator_profiles ap ON ap.user_id = r.aggregator_id
WHERE u.user_type = 'aggregator'
  AND u.is_active = true
  AND LOWER(TRIM(COALESCE(ap.kyc_status, ''))) = 'verified'
  AND COALESCE(r.is_custom, false) = false
  AND r.material_code IS NOT NULL
  AND r.rate_per_kg > 0
  AND TRIM(COALESCE(ap.city_code, '')) <> ''
GROUP BY UPPER(TRIM(ap.city_code)), LOWER(TRIM(r.material_code))
ON CONFLICT (city_code, material_code)
DO UPDATE SET
  avg_rate_per_kg = EXCLUDED.avg_rate_per_kg,
  contributor_count = EXCLUDED.contributor_count,
  updated_at = NOW();

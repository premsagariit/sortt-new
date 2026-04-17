-- ============================================================
-- Migration 0037 — Price Previous Values and Change Percent
-- Adds previous/current change tracking for price_index and
-- aggregator_city_material_avg_rates.
-- ============================================================

ALTER TABLE price_index
  ADD COLUMN IF NOT EXISTS previous_rate_per_kg NUMERIC,
  ADD COLUMN IF NOT EXISTS change_percent NUMERIC(10,2);

ALTER TABLE aggregator_city_material_avg_rates
  ADD COLUMN IF NOT EXISTS previous_avg_rate_per_kg NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS change_percent NUMERIC(10,2);

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
  v_previous NUMERIC(10,2);
  v_change NUMERIC(10,2);
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
    SELECT avg_rate_per_kg
      INTO v_previous
      FROM aggregator_city_material_avg_rates
     WHERE city_code = v_city_code
       AND material_code = v_material_code;

    IF v_previous IS NOT NULL AND v_previous > 0 AND v_avg IS NOT NULL THEN
      v_change := ROUND(((v_avg - v_previous) / v_previous) * 100.0, 2);
    ELSE
      v_change := NULL;
    END IF;

    INSERT INTO aggregator_city_material_avg_rates (
      city_code,
      material_code,
      avg_rate_per_kg,
      previous_avg_rate_per_kg,
      change_percent,
      contributor_count,
      updated_at
    )
    VALUES (
      v_city_code,
      v_material_code,
      v_avg,
      v_previous,
      v_change,
      v_count,
      NOW()
    )
    ON CONFLICT (city_code, material_code)
    DO UPDATE SET
      avg_rate_per_kg = EXCLUDED.avg_rate_per_kg,
      previous_avg_rate_per_kg = EXCLUDED.previous_avg_rate_per_kg,
      change_percent = EXCLUDED.change_percent,
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

-- Backfill average rows with historical values absent and zero change.
WITH avg_rows AS (
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
)
INSERT INTO aggregator_city_material_avg_rates (
  city_code,
  material_code,
  avg_rate_per_kg,
  previous_avg_rate_per_kg,
  change_percent,
  contributor_count,
  updated_at
)
SELECT
  city_code,
  material_code,
  avg_rate_per_kg,
  NULL,
  NULL,
  contributor_count,
  updated_at
FROM avg_rows
ON CONFLICT (city_code, material_code)
DO UPDATE SET
  avg_rate_per_kg = EXCLUDED.avg_rate_per_kg,
  previous_avg_rate_per_kg = NULL,
  change_percent = NULL,
  contributor_count = EXCLUDED.contributor_count,
  updated_at = NOW();

-- Backfill price history columns from existing rows.
WITH ordered_prices AS (
  SELECT
    id,
    city_code,
    material_code,
    rate_per_kg,
    LAG(rate_per_kg) OVER (
      PARTITION BY city_code, LOWER(material_code)
      ORDER BY scraped_at, id
    ) AS previous_rate_per_kg
  FROM price_index
)
UPDATE price_index p
SET previous_rate_per_kg = o.previous_rate_per_kg,
    change_percent = CASE
      WHEN o.previous_rate_per_kg IS NOT NULL AND o.previous_rate_per_kg > 0 AND o.rate_per_kg IS NOT NULL
        THEN ROUND(((o.rate_per_kg - o.previous_rate_per_kg) / o.previous_rate_per_kg) * 100.0, 2)
      ELSE NULL
    END
FROM ordered_prices o
WHERE p.id = o.id;
-- ============================================================
-- Migration 0038 — Average Rates from Active Aggregators
-- Switches seller average-rate computation to include all active
-- aggregators in the city (not only verified aggregators), which
-- matches the product requirement for live buy-rate averaging.
-- ============================================================

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

-- Rebuild all seller average rows using active aggregators only.
TRUNCATE TABLE aggregator_city_material_avg_rates;

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
  UPPER(TRIM(ap.city_code)) AS city_code,
  LOWER(TRIM(r.material_code)) AS material_code,
  ROUND(AVG(r.rate_per_kg)::numeric, 2) AS avg_rate_per_kg,
  NULL,
  NULL,
  COUNT(*)::int AS contributor_count,
  NOW() AS updated_at
FROM aggregator_material_rates r
JOIN users u ON u.id = r.aggregator_id
JOIN aggregator_profiles ap ON ap.user_id = r.aggregator_id
WHERE u.user_type = 'aggregator'
  AND u.is_active = true
  AND COALESCE(r.is_custom, false) = false
  AND r.material_code IS NOT NULL
  AND r.rate_per_kg > 0
  AND TRIM(COALESCE(ap.city_code, '')) <> ''
GROUP BY UPPER(TRIM(ap.city_code)), LOWER(TRIM(r.material_code))
ON CONFLICT (city_code, material_code)
DO UPDATE SET
  avg_rate_per_kg = EXCLUDED.avg_rate_per_kg,
  previous_avg_rate_per_kg = NULL,
  change_percent = NULL,
  contributor_count = EXCLUDED.contributor_count,
  updated_at = NOW();
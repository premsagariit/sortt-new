-- ============================================================
-- Migration 0012 — Materialized Views
-- Project: Sortt / [APP_NAME]
-- ============================================================

-- ------------------------------------------------------------
-- AGGREGATOR RATING STATS
-- ------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS aggregator_rating_stats AS
  SELECT
    rated_user                    AS aggregator_id,
    COUNT(*)                      AS total_ratings,
    ROUND(AVG(score)::numeric, 2) AS avg_score
  FROM ratings
  GROUP BY rated_user;

CREATE UNIQUE INDEX IF NOT EXISTS
  idx_agg_rating_stats
  ON aggregator_rating_stats(aggregator_id);

-- ------------------------------------------------------------
-- CURRENT PRICE INDEX
-- ------------------------------------------------------------
CREATE MATERIALIZED VIEW IF NOT EXISTS current_price_index AS
  SELECT DISTINCT ON (city_code, material_code)
    city_code,
    material_code,
    rate_per_kg,
    is_manual_override,
    source,
    scraped_at
  FROM price_index
  ORDER BY city_code, material_code, scraped_at DESC;

CREATE UNIQUE INDEX IF NOT EXISTS
  idx_current_price_index
  ON current_price_index(city_code, material_code);

-- ------------------------------------------------------------
-- REFRESH FUNCTION
-- Both views are refreshed by node-cron on the Express backend (Day 7)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY aggregator_rating_stats;
  REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Migration 0008 — Prices
-- Project: Sortt / [APP_NAME]
-- ============================================================

-- ------------------------------------------------------------
-- PRICE INDEX
-- Stores current and historical rates per material per city
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS price_index (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_code          TEXT NOT NULL REFERENCES cities(code),
  material_code      TEXT NOT NULL REFERENCES material_types(code),
  rate_per_kg        NUMERIC NOT NULL CHECK (rate_per_kg > 0),
  source             TEXT,
  is_manual_override BOOLEAN DEFAULT false,
  scraped_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE price_index ENABLE ROW LEVEL SECURITY;

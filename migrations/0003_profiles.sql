-- ============================================================
-- Migration 0003 — Profile Tables
-- Project: Sortt / [APP_NAME]
-- Depends: 0002_users.sql, 0001_reference_tables.sql
-- ============================================================

-- ------------------------------------------------------------
-- SELLER PROFILES
-- profile_type: 'individual' or 'business' (NOT account_type — TRD §8.1)
-- recurring_schedule JSONB canonical shape:
-- {
--   "frequency": "weekly" | "biweekly" | "monthly",
--   "days": ["Mon", "Wed", "Fri"],
--   "preferred_time_start": "09:00",
--   "preferred_time_end": "12:00",
--   "active": true
-- }
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id            UUID PRIMARY KEY REFERENCES users(id),
  profile_type       TEXT NOT NULL
                       CHECK (profile_type IN ('individual','business')),
  business_name      TEXT,
  gstin              TEXT CHECK (gstin IS NULL OR length(gstin) = 15),
  locality           TEXT,
  city_code          TEXT REFERENCES cities(code),
  recurring_schedule JSONB
);

ALTER TABLE seller_profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- AGGREGATOR PROFILES
-- No GEOGRAPHY column — city_code used for matching (PostGIS removed)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aggregator_profiles (
  user_id             UUID PRIMARY KEY REFERENCES users(id),
  business_name       TEXT,
  city_code           TEXT REFERENCES cities(code),
  operating_area_text TEXT,
  kyc_status          TEXT NOT NULL DEFAULT 'pending'
                        CHECK (kyc_status IN ('pending','verified','rejected')),
  operating_hours     JSONB,
  member_since        TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aggregator_profiles ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- AGGREGATOR MATERIAL RATES
-- id UUID PK (not composite PK — TRD §8.1 Fix 5 from audit)
-- DEPENDENCY: must exist BEFORE 0009_rls.sql (referenced in aggregator_city_orders policy)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aggregator_material_rates (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregator_id UUID NOT NULL REFERENCES users(id),
  material_code TEXT NOT NULL REFERENCES material_types(code),
  rate_per_kg   NUMERIC NOT NULL CHECK (rate_per_kg > 0),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aggregator_id, material_code)
);

ALTER TABLE aggregator_material_rates ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- BUSINESS MEMBERS (R1 — Business Mode sub-users)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS business_members (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_seller_id UUID NOT NULL REFERENCES users(id),
  member_user_id     UUID NOT NULL REFERENCES users(id),
  role               TEXT NOT NULL
                       CHECK (role IN ('admin','viewer','operator')),
  invited_by         UUID REFERENCES users(id),
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE business_members ENABLE ROW LEVEL SECURITY;

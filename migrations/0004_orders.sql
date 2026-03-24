-- ============================================================
-- Migration 0004 — Order Tables
-- Project: Sortt / [APP_NAME]
-- Depends: 0003_profiles.sql
-- ============================================================

-- ------------------------------------------------------------
-- ORDERS
-- No GEOGRAPHY column — city_code + pickup_locality for matching
-- pickup_address_text: full address revealed post-acceptance only (V25)
-- pickup_locality: neighbourhood name always visible (V25)
-- deleted_at: soft delete column (never hard-DELETE)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id               UUID NOT NULL REFERENCES users(id),
  aggregator_id           UUID REFERENCES users(id),
  city_code               TEXT NOT NULL REFERENCES cities(code),
  status                  TEXT NOT NULL DEFAULT 'created'
                            CHECK (status IN (
                              'created',
                              'accepted',
                              'en_route',
                              'arrived',
                              'weighing_in_progress',
                              'completed',
                              'cancelled',
                              'disputed'
                            )),
  pickup_address_text     TEXT,
  pickup_locality         TEXT NOT NULL,
  preferred_pickup_window JSONB,
  seller_note             TEXT CHECK (char_length(seller_note) <= 500),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- ORDER ITEMS
-- confirmed_snapshot_hmac: HMAC binding the OTP to confirmed values (C1)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_items (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id              UUID NOT NULL REFERENCES orders(id),
  material_code         TEXT NOT NULL REFERENCES material_types(code),
  estimated_weight_kg   NUMERIC,
  confirmed_weight_kg   NUMERIC,
  rate_per_kg           NUMERIC,
  amount                NUMERIC,
  confirmed_snapshot_hmac TEXT
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- ORDER STATUS HISTORY (R3)
-- changed_by: set by Express from JWT — never auto-populated by trigger
-- created_at: always DB-set DEFAULT NOW() — never client-supplied (V30)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_status_history ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- ORDER MEDIA
-- storage_path: Cloudflare R2 object key — used to generate signed URLs (V27)
-- uploaded_by: TRD column name (not uploader_id)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS order_media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id),
  media_type   TEXT NOT NULL
                 CHECK (media_type IN (
                   'scrap_photo',
                   'scale_photo',
                   'kyc_aadhaar',
                   'kyc_shop',
                   'invoice'
                 )),
  storage_path TEXT NOT NULL,
  uploaded_by  UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE order_media ENABLE ROW LEVEL SECURITY;

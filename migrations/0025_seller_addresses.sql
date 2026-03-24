CREATE TABLE IF NOT EXISTS seller_addresses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label           TEXT NOT NULL DEFAULT 'Home',
  building_name   TEXT,
  street          TEXT,
  colony          TEXT,
  city            TEXT NOT NULL,
  pincode         TEXT NOT NULL CHECK (char_length(pincode) = 6),
  city_code       TEXT REFERENCES cities(code),
  pickup_locality TEXT,
  latitude        NUMERIC(10, 7),
  longitude       NUMERIC(10, 7),
  is_default      BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_addresses_default
  ON seller_addresses (seller_id)
  WHERE is_default = true;

CREATE INDEX IF NOT EXISTS idx_seller_addresses_seller_id
  ON seller_addresses (seller_id, created_at DESC);

ALTER TABLE seller_addresses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS seller_addresses_self ON seller_addresses;
CREATE POLICY seller_addresses_self ON seller_addresses
  FOR ALL USING (current_app_user_id() = seller_id)
  WITH CHECK (current_app_user_id() = seller_id);

DROP TRIGGER IF EXISTS set_updated_at_seller_addresses_trigger ON seller_addresses;
CREATE TRIGGER set_updated_at_seller_addresses_trigger
BEFORE UPDATE ON seller_addresses
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
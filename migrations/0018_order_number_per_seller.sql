-- ============================================================
-- Migration 0018 — Per-seller human-readable order numbers
-- ============================================================

BEGIN;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS order_number INTEGER;

CREATE TABLE IF NOT EXISTS user_order_counters (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  next_value INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

WITH ranked AS (
  SELECT
    id,
    seller_id,
    ROW_NUMBER() OVER (
      PARTITION BY seller_id
      ORDER BY created_at ASC, id ASC
    ) AS rn
  FROM orders
)
UPDATE orders o
SET order_number = r.rn
FROM ranked r
WHERE o.id = r.id
  AND o.order_number IS NULL;

INSERT INTO user_order_counters (user_id, next_value)
SELECT
  seller_id,
  COALESCE(MAX(order_number), 0) + 1 AS next_value
FROM orders
GROUP BY seller_id
ON CONFLICT (user_id)
DO UPDATE SET
  next_value = EXCLUDED.next_value,
  updated_at = NOW();

ALTER TABLE orders
  ALTER COLUMN order_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS ux_orders_seller_order_number
  ON orders (seller_id, order_number);

CREATE OR REPLACE FUNCTION assign_order_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  assigned_number INTEGER;
BEGIN
  IF NEW.order_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  LOOP
    UPDATE user_order_counters
       SET next_value = next_value + 1,
           updated_at = NOW()
     WHERE user_id = NEW.seller_id
     RETURNING next_value - 1 INTO assigned_number;

    IF FOUND THEN
      EXIT;
    END IF;

    BEGIN
      INSERT INTO user_order_counters (user_id, next_value)
      VALUES (NEW.seller_id, 2);
      assigned_number := 1;
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      -- concurrent insert for same seller_id; retry loop
    END;
  END LOOP;

  NEW.order_number := assigned_number;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_order_number ON orders;

CREATE TRIGGER trg_assign_order_number
BEFORE INSERT ON orders
FOR EACH ROW
EXECUTE FUNCTION assign_order_number();

COMMIT;

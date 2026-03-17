-- Migration 0021: Canonical order values for consistency
-- Adds provisional + final totals to orders for immutable post-weighing display.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS estimated_value NUMERIC,
  ADD COLUMN IF NOT EXISTS confirmed_value NUMERIC;

COMMENT ON COLUMN orders.estimated_value IS
  'Provisional order total computed from estimated weights and current rates.';

COMMENT ON COLUMN orders.confirmed_value IS
  'Final immutable order total set at weighing finalization.';

CREATE INDEX IF NOT EXISTS idx_orders_confirmed_value
  ON orders (confirmed_value);

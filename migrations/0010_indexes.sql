-- ============================================================
-- Migration 0010 — Indexes
-- Project: Sortt / [APP_NAME]
-- Performance indices for common query patterns
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_orders_city_status
  ON orders(city_code, status)
  WHERE status='created' AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_seller_id
  ON orders(seller_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_aggregator_id
  ON orders(aggregator_id)
  WHERE aggregator_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_device_tokens_user_id
  ON device_tokens(user_id)
  WHERE is_active=true;

CREATE INDEX IF NOT EXISTS idx_agg_availability_online
  ON aggregator_availability(user_id)
  WHERE is_online=true;

CREATE INDEX IF NOT EXISTS idx_agg_rates_aggregator
  ON aggregator_material_rates(aggregator_id);

CREATE INDEX IF NOT EXISTS idx_agg_rates_material
  ON aggregator_material_rates(material_code);

CREATE INDEX IF NOT EXISTS idx_status_history_order_id
  ON order_status_history(order_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_price_index_city_material
  ON price_index(city_code, material_code);

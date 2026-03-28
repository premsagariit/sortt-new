BEGIN;

CREATE TABLE IF NOT EXISTS aggregator_order_dismissals (
  aggregator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  dismissed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (aggregator_id, order_id)
);

CREATE INDEX IF NOT EXISTS idx_agg_order_dismissals_order_id
  ON aggregator_order_dismissals (order_id);

COMMIT;

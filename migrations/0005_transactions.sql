-- ============================================================
-- Migration 0005 — Transaction Tables
-- Project: Sortt / [APP_NAME]
-- Depends: 0004_orders.sql
-- NOTE: price_index, seller_flags, admin_audit_log are Day 5 scope
--       (0007_security.sql + 0008_prices.sql) — NOT in this file.
-- ============================================================

-- ------------------------------------------------------------
-- RATINGS
-- rated_by / rated_user: TRD §8.1 column names (not rater_id/ratee_id)
-- UNIQUE on order_id per rater: one rating per party per order
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  rated_by    UUID NOT NULL REFERENCES users(id),
  rated_user  UUID NOT NULL REFERENCES users(id),
  score       INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  review_text TEXT CHECK (char_length(review_text) <= 500),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- INVOICES
-- invoice_data JSONB NOT NULL: the legal GST record (TRD §14.4.5)
-- PDF is a rendering artifact only — storage_path is the Uploadthing key
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id           UUID NOT NULL REFERENCES orders(id),
  seller_gstin       TEXT,
  aggregator_details JSONB,
  total_amount       NUMERIC NOT NULL,
  storage_path       TEXT,
  invoice_data       JSONB NOT NULL DEFAULT '{}',
  created_at         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- DISPUTES
-- order_item_id: nullable FK — links dispute to specific line item (Fix 5 audit)
-- issue_type: 5 specific values per TRD §8.1
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  order_item_id   UUID REFERENCES order_items(id),   -- nullable
  raised_by       UUID NOT NULL REFERENCES users(id),
  issue_type      TEXT NOT NULL
                    CHECK (issue_type IN (
                      'wrong_weight',
                      'payment_not_made',
                      'no_show',
                      'abusive_behaviour',
                      'other'
                    )),
  description     TEXT NOT NULL CHECK (char_length(description) <= 2000),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','resolved','dismissed')),
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- DISPUTE EVIDENCE
-- storage_path: Uploadthing file key (private, served via signed URLs)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispute_evidence (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id   UUID NOT NULL REFERENCES disputes(id),
  submitted_by UUID NOT NULL REFERENCES users(id),
  storage_path TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE dispute_evidence ENABLE ROW LEVEL SECURITY;

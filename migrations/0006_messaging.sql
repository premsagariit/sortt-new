-- ============================================================
-- Migration 0006 — Messaging, Availability, Tokens, OTP, Notifications
-- Project: Sortt / [APP_NAME]
-- Depends: 0004_orders.sql, 0002_users.sql
-- ============================================================

-- ------------------------------------------------------------
-- MESSAGES (range-partitioned by created_at)
-- content: server-side phone regex filter applied BEFORE insert (V26, V26-DB)
-- The stored value is already-filtered — raw original never persisted
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS messages (
  id         UUID NOT NULL DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id),
  sender_id  UUID NOT NULL REFERENCES users(id),
  content    TEXT NOT NULL CHECK (char_length(content) <= 1000),
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Pre-create 3 monthly partitions
CREATE TABLE IF NOT EXISTS messages_2026_03
  PARTITION OF messages
  FOR VALUES FROM ('2026-03-01') TO ('2026-04-01');

CREATE TABLE IF NOT EXISTS messages_2026_04
  PARTITION OF messages
  FOR VALUES FROM ('2026-04-01') TO ('2026-05-01');

CREATE TABLE IF NOT EXISTS messages_2026_05
  PARTITION OF messages
  FOR VALUES FROM ('2026-05-01') TO ('2026-06-01');

-- Compound index on each partition: (order_id, created_at ASC)
CREATE INDEX IF NOT EXISTS idx_messages_2026_03_order_created
  ON messages_2026_03 (order_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_2026_04_order_created
  ON messages_2026_04 (order_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_messages_2026_05_order_created
  ON messages_2026_05 (order_id, created_at ASC);

-- ------------------------------------------------------------
-- AGGREGATOR AVAILABILITY + HEARTBEAT (C2)
-- is_online: flipped false by node-cron every 5 min if last_ping_at stale
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS aggregator_availability (
  user_id      UUID PRIMARY KEY REFERENCES users(id),
  is_online    BOOLEAN DEFAULT true,
  last_ping_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE aggregator_availability ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- DEVICE TOKENS (dual-token strategy)
-- expo_token: for Expo Push Service
-- raw_token: native FCM/APNs token for future migration
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS device_tokens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id),
  token_type   TEXT NOT NULL DEFAULT 'expo'
                 CHECK (token_type IN ('expo','fcm','apns')),
  expo_token   TEXT,
  raw_token    TEXT,
  is_active    BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE device_tokens ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- OTP LOG (audit trail only — authoritative HMAC lives in Upstash Redis)
-- SECURITY: otp_hmac is NOT stored here (BSE concern — Issue 4 fix)
-- action: records lifecycle event only ('otp_sent','otp_verified','otp_failed')
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS otp_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES orders(id),   -- nullable: auth OTPs not order-linked
  phone_hash    TEXT NOT NULL,
  action        TEXT NOT NULL
                  CHECK (action IN ('otp_sent','otp_verified','otp_failed')),
  attempt_count INT DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE otp_log ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- NOTIFICATIONS (persistent notification history for notification screen)
-- data JSONB: non-PII payload only — { order_id, event_type } (D2)
-- Backend inserts as a privileged operation; regular users cannot INSERT
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',
  read_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_self_read ON notifications
  FOR SELECT
  USING (current_app_user_id() = user_id);

CREATE POLICY notifications_self_update ON notifications
  FOR UPDATE
  USING (current_app_user_id() = user_id);
-- INSERT is backend-only (privileged path via service connection / SECURITY DEFINER)

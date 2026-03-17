-- ============================================================
-- Migration 0022 — Aggregator Availability Default Online
-- Purpose: make aggregator online status default to true
-- ============================================================

BEGIN;

ALTER TABLE aggregator_availability
  ALTER COLUMN is_online SET DEFAULT true;

UPDATE aggregator_availability
SET is_online = true
WHERE is_online = false;

COMMIT;

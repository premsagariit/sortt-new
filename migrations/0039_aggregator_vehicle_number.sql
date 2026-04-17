-- ============================================================
-- Migration 0039 — Aggregator Vehicle Number
-- Adds vehicle_number to aggregator_profiles for mobile aggregators.
-- ============================================================

ALTER TABLE aggregator_profiles
  ADD COLUMN IF NOT EXISTS vehicle_number TEXT;

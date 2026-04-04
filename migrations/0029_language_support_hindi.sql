-- ============================================================
-- Migration 0029 — Language support hardening (Hindi + validation)
-- Project: Sortt
-- Depends: 0001_reference_tables.sql, 0002_users.sql
-- ============================================================

-- Add Hindi labels for material reference data.
ALTER TABLE material_types
  ADD COLUMN IF NOT EXISTS label_hi TEXT;

UPDATE material_types
SET label_hi = CASE code
  WHEN 'metal' THEN 'धातु'
  WHEN 'plastic' THEN 'प्लास्टिक'
  WHEN 'paper' THEN 'कागज़'
  WHEN 'ewaste' THEN 'ई-कचरा'
  WHEN 'fabric' THEN 'कपड़ा'
  WHEN 'glass' THEN 'कांच'
  ELSE label_hi
END
WHERE label_hi IS NULL OR btrim(label_hi) = '';

-- Normalize legacy values before check constraint.
UPDATE users
SET preferred_language = 'en'
WHERE preferred_language IS NULL
   OR preferred_language NOT IN ('en', 'te', 'hi');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_preferred_language_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_preferred_language_check
      CHECK (preferred_language IN ('en', 'te', 'hi'));
  END IF;
END $$;

ALTER TABLE users
  ALTER COLUMN preferred_language SET DEFAULT 'en';

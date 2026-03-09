-- ============================================================
-- Migration 0001 — Reference Tables
-- Project: Sortt / [APP_NAME]
-- Depends: none (first migration)
-- Run before: 0002_users.sql
-- ============================================================

-- Extensions (must already be enabled in Azure Portal → Server Parameters → azure.extensions)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------
-- CITIES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cities (
  code             TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  state            TEXT,
  timezone         TEXT DEFAULT 'Asia/Kolkata',
  default_language TEXT DEFAULT 'en',
  is_active        BOOLEAN DEFAULT false,
  launched_at      TIMESTAMPTZ
);

ALTER TABLE cities ENABLE ROW LEVEL SECURITY;

-- Seed Hyderabad — the only MVP pilot city
INSERT INTO cities (code, display_name, state, is_active, launched_at)
VALUES ('HYD', 'Hyderabad', 'Telangana', true, NOW())
ON CONFLICT (code) DO NOTHING;

-- ------------------------------------------------------------
-- MATERIAL TYPES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS material_types (
  code          TEXT PRIMARY KEY,
  label_en      TEXT NOT NULL,
  label_te      TEXT,              -- Telugu label (post-MVP localisation)
  colour_token  TEXT,              -- maps to design token in tokens.ts
  min_weight_kg NUMERIC NOT NULL DEFAULT 1
);

ALTER TABLE material_types ENABLE ROW LEVEL SECURITY;

-- Seed all 6 materials
INSERT INTO material_types (code, label_en, label_te, colour_token, min_weight_kg) VALUES
  ('metal',   'Metal',   'మెటల్',     'material_metal',   1),
  ('plastic',  'Plastic',  'ప్లాస్టిక్', 'material_plastic',  1),
  ('paper',    'Paper',    'కాగితం',    'material_paper',    1),
  ('ewaste',   'E-Waste',  'ఇ-వ్యర్థం', 'material_ewaste',   1),
  ('fabric',   'Fabric',   'వస్త్రం',   'material_fabric',   1),
  ('glass',    'Glass',    'గాజు',      'material_glass',    1)
ON CONFLICT (code) DO NOTHING;

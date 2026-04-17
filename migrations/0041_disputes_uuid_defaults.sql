-- ============================================================
-- Migration 0041 - Restore UUID defaults for dispute IDs
-- Root cause fix: some environments lost DEFAULT on UUID PK columns,
-- causing NULL id inserts when app omits explicit id values.
-- ============================================================

BEGIN;

DO $$
BEGIN
  BEGIN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  BEGIN
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
  EXCEPTION
    WHEN OTHERS THEN
      NULL;
  END;

  IF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'gen_random_uuid'
  ) THEN
    EXECUTE 'ALTER TABLE disputes ALTER COLUMN id SET DEFAULT gen_random_uuid()';
    EXECUTE 'ALTER TABLE dispute_evidence ALTER COLUMN id SET DEFAULT gen_random_uuid()';
  ELSIF EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'uuid_generate_v4'
  ) THEN
    EXECUTE 'ALTER TABLE disputes ALTER COLUMN id SET DEFAULT uuid_generate_v4()';
    EXECUTE 'ALTER TABLE dispute_evidence ALTER COLUMN id SET DEFAULT uuid_generate_v4()';
  ELSE
    RAISE EXCEPTION 'No UUID generator function available (gen_random_uuid or uuid_generate_v4)';
  END IF;
END
$$;

COMMIT;

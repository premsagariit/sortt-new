-- 0014_kyc_media_types.sql
-- Ensures order_media.media_type CHECK constraint includes all KYC photo types.
-- The order_media table allows order_id = NULL for KYC rows.

-- Verify CHECK constraint includes KYC types (read-only probe — no-op if exists)
DO $$
DECLARE
  constr_def text;
BEGIN
  -- BLOCK B: allow NULL order_id for KYC media
  ALTER TABLE order_media ALTER COLUMN order_id DROP NOT NULL;

  SELECT pg_get_constraintdef(oid) INTO constr_def
  FROM pg_constraint
  WHERE conname = 'order_media_media_type_check'
    AND conrelid = 'order_media'::regclass;

  IF constr_def NOT LIKE '%kyc_aadhaar_front%' THEN
    -- Drop and recreate with full list
    ALTER TABLE order_media DROP CONSTRAINT IF EXISTS order_media_media_type_check;
    ALTER TABLE order_media
      ADD CONSTRAINT order_media_media_type_check
      CHECK (media_type IN (
        'scrap_photo', 'scale_photo',
        'kyc_aadhaar_front',
        'kyc_aadhaar_back',
        'kyc_selfie',
        'kyc_shop',
        'kyc_vehicle',
        'invoice'
      ));
  END IF;
END;
$$;

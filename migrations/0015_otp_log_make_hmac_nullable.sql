-- 0015_otp_log_make_hmac_nullable.sql
-- Makes otp_hmac nullable per Security X3 (never persist HMAC).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'otp_log' AND column_name = 'otp_hmac'
  ) THEN
    ALTER TABLE otp_log ALTER COLUMN otp_hmac DROP NOT NULL;
  END IF;
END;
$$;

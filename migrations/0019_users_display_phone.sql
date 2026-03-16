-- Migration 0019: add display_phone to users table
-- SP1: One copy of phone, fetched from Clerk at order acceptance time.
-- DPDP erasure: UPDATE users SET display_phone = NULL WHERE id = $1

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_phone VARCHAR(20) NULL;

COMMENT ON COLUMN users.display_phone IS
  'Cached from Clerk at first order acceptance. Nullable — populated lazily. '
  'Never stored on orders. Single copy for DPDP erasure compliance.';

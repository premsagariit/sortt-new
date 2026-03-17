-- Enforce one account per phone number across all user types
-- Backend logic also gates login/signup mode, but this DB constraint is final enforcement.

ALTER TABLE users
ADD CONSTRAINT users_phone_hash_unique UNIQUE (phone_hash);

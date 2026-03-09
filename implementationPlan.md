# Day 5 Implementation Plan: Migrations 0007–0012

## Section 1 — File list
- `migrations/0007_security.sql`: Creates `seller_flags` and `admin_audit_log` tables with basic RLS but no user-facing policies.
- `migrations/0008_prices.sql`: Creates the `price_index` table for storing material prices with basic RLS.
- `migrations/0009_rls.sql`: Applies detailed Row Level Security policies to all tables except those covered in 0001-0008 or 0006.
- `migrations/0010_indexes.sql`: Creates necessary performance and querying indexes for orders, aggregators, device tokens, and history.
- `migrations/0011_triggers.sql`: Creates triggers to guard `kyc_status` updates and automatically set `updated_at` on orders.
- `migrations/0012_materialized_views.sql`: Creates `aggregator_rating_stats` and `current_price_index` materialized views along with a refresh function.

## Section 2 — Execution commands
The following commands will be executed in order:
```bash
psql "<DATABASE_URL from backend/.env>" -f migrations/0007_security.sql
psql "<DATABASE_URL from backend/.env>" -f migrations/0008_prices.sql
psql "<DATABASE_URL from backend/.env>" -f migrations/0009_rls.sql
psql "<DATABASE_URL from backend/.env>" -f migrations/0010_indexes.sql
psql "<DATABASE_URL from backend/.env>" -f migrations/0011_triggers.sql
psql "<DATABASE_URL from backend/.env>" -f migrations/0012_materialized_views.sql
```

## Section 3 — Security rules in scope
- **V35** — `kyc_status` trigger guard: DB trigger prevents non-service-role updates to aggregator KYC status.
- **V30** — All `order_status_history` timestamps set by DB `DEFAULT NOW()`; no client-supplied timestamps.
- **V25** — Order address revelation: Two-phase address revelation handled across the backend and UI (with RLS ensuring access is tightly controlled for participating aggregators).
- **V24** — `phone_hash` never returned in responses (enforced via `users_public` view already, and respected in our RLS and logic).
- **R2** — Split `orders` RLS policy: separate `USING` for SELECT/UPDATE/DELETE and `WITH CHECK` for INSERT.
- **R1** — `business_members` table role-based RLS: Enforcing proper access controls for business mode sub-users.
- **C2** — Aggregator heartbeat: Access and visibility restricted appropriately for `aggregator_availability`.

## Section 4 — Day 5 gate checks
The following checks will be executed after all migrations wrap up:
- **G5.1:** RLS completeness (`SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity=false;`) → expecting 0 rows.
- **G5.2:** `kyc_status` trigger exists (`SELECT trigger_name, event_object_table, action_timing FROM information_schema.triggers WHERE event_object_table = 'aggregator_profiles';`) → must show `kyc_status_guard`.
- **G5.3:** All indexes created (`SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname LIKE 'idx_%' ORDER BY indexname;`) → must confirm the 9 new indexes from 0010.
- **G5.4:** Materialized views exist (`SELECT matviewname FROM pg_matviews WHERE schemaname = 'public';`) → must show `aggregator_rating_stats`, `current_price_index`.
- **G5.5:** `price_index` table has correct columns (`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'price_index' ORDER BY ordinal_position;`) → id, city_code, material_code, rate_per_kg, source, is_manual_override, scraped_at.
- **BONUS CHECK:** `seller_flags` and `admin_audit_log` exist (`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('seller_flags', 'admin_audit_log');`) → must return 2 rows.

## Section 5 — Completion steps
1. Update PLAN.md (mark Day 5 steps complete and gate PASSED).
2. Update MEMORY.md §9 with learned lessons from the day (e.g. quirks in trigger logic, RLS policy naming).
3. Request BSE and SCR sign-off.
4. Final report indicating "Day 5 complete. Next is Day 6 — Express backend."

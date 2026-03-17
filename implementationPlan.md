# Sortt Auth Flow Overhaul — Implementation Plan (Pre-Execution)

This plan is prepared after mandatory reads and before any code/SQL/config edits.

**Mandatory reads completed:**
1. `MEMORY.md` (full)
2. `structure.md` (full)
3. `PLAN.md` (current state reviewed: Days 1–8 complete, Day 9 current)
4. `PRD.md` (auth/onboarding/user-flow sections)
5. `TRD.md` (auth flow + §13 security/privacy patches + related OTP/auth route sections)

---

## Section 1 — File Inventory

### Database
- `migrations/0022_unique_phone_hash.sql` — add unique constraint `users_phone_hash_unique` on `users.phone_hash`; uses next available migration number (0019 already exists). **Status: NEW**

### Backend
- `backend/src/routes/auth.ts` — add `mode` validation to `request-otp`, Redis mode key handling, `verify-otp` login/signup branching, and `is_new_user` response shaping. **Status: MODIFY**

### Mobile Auth Flow
- `apps/mobile/app/(auth)/phone.tsx` — full rewrite to unified two-tab/two-step phone+OTP flow. **Status: MODIFY**
- `apps/mobile/app/(auth)/otp.tsx` — deprecated screen removal. **Status: DELETE**
- `apps/mobile/app/(auth)/_layout.tsx` — remove/de-link deprecated otp route if explicitly registered. **Status: MODIFY**
- `apps/mobile/app/index.tsx` — verify/fix onboarding gate to `/(auth)/onboarding` vs `/(auth)/phone`. **Status: MODIFY (conditional)**
- `apps/mobile/app/(auth)/onboarding.tsx` — verify/fix `onboarding_complete` write + route to `/(auth)/phone`. **Status: MODIFY (conditional)**

### Mobile Store/Guards/Logout
- `apps/mobile/store/authStore.ts` — add/align `token`, `user`, `isNewUser`, `setSession`, `clearSession` with non-persistent token policy. **Status: MODIFY**
- `apps/mobile/app/(auth)/user-type.tsx` — add guard to redirect returning users away from user-type screen. **Status: MODIFY**
- `apps/mobile/app/(aggregator)/settings.tsx` — standardize logout: Clerk signout + clearSession + `router.replace('/(auth)/phone')`. **Status: MODIFY**
- `apps/mobile/app/(seller)/settings.tsx` — standardize logout: Clerk signout + clearSession + `router.replace('/(auth)/phone')`. **Status: MODIFY**

### Documentation / Tracking
- `implementationPlan.md` — execution tracking and final status update. **Status: MODIFY**
- `PLAN.md` — add auth overhaul status note. **Status: MODIFY**
- `MEMORY.md` — append learned lessons in §9. **Status: MODIFY**
- `structure.md` — remove `otp.tsx`, update `phone.tsx` description, add new migration entry. **Status: MODIFY**
- `TRD.md` — document mode-split auth behavior, `is_new_user`, Redis mode key lifecycle, migration constraint, unified phone screen. **Status: MODIFY**
- `PRD.md` — update launch/auth user flow and one-phone-one-account constraints. **Status: MODIFY**
- `README.md` — confirm unchanged unless new env vars are introduced. **Status: MODIFY (conditional)**

---

## Section 2 — Sub-Agent Assignments

**Relevant skills identified (from `.agent/skills`) for this task:**
- `planner` (execution sequencing + gates)
- `react-native-expert` (Expo Router + auth UI/state patterns)
- `senior-backend` (Express auth route correctness)
- `database-schema-designer` (constraint migration hygiene)
- `senior-security` (auth/privacy enforcement)
- `verifier` (evidence-based gate validation)

### Sub-Agent 1 — Database Constraint Workstream
- **Scope:** `migrations/0022_unique_phone_hash.sql` only; apply + verify unique constraint.
- **Dependency:** none.
- **Outputs:** migration file, DB apply output, constraint query proof.

### Sub-Agent 2 — Backend Auth Route Workstream
- **Scope:** `backend/src/routes/auth.ts` only.
- **Depends on:** Sub-Agent 1 gate pass (constraint exists).
- **Outputs:** mode-aware `request-otp`, mode-aware `verify-otp`, `is_new_user` response contract, curl evidence.

### Sub-Agent 3 — Mobile Unified Auth Screen Workstream
- **Scope:** `phone.tsx`, `otp.tsx` delete, auth layout references, onboarding gate verification files.
- **Routing requirement:** `handleVerifyOtp` must implement all three branches — `is_new_user=true` → `/(auth)/user-type`; `is_new_user=false` + `user_type='aggregator'` → `/(aggregator)/home`; `is_new_user=false` + `user_type='seller'` → `/(seller)/home`.
- **Depends on:** Sub-Agent 2 gate pass (backend contract stabilized).
- **Outputs:** single-screen login/signup + OTP flow, zero dangling otp-route refs, mobile type-check pass.

### Sub-Agent 4 — Store/Guard/Logout Workstream
- **Scope:** `authStore.ts`, `user-type.tsx`, seller/aggregator settings logout handlers.
- **Depends on:** Sub-Agent 3 gate pass.
- **Outputs:** `isNewUser`-aware routing guard, standardized logout behavior, mobile type-check pass.

### Sub-Agent 5 — Documentation & Closeout Workstream
- **Scope:** `PLAN.md`, `MEMORY.md`, `structure.md`, `TRD.md`, `PRD.md`, `README.md`, final `implementationPlan.md` status.
- **Depends on:** Sub-Agents 1–4 pass + root `pnpm type-check` pass.
- **Outputs:** synchronized docs + completion report.

**Execution policy note:** Per `MEMORY.md §0.2`, implementation is sequential with hard dependency gates; only read-only discovery may run in parallel.

---

## Section 3 — Execution Sequence

1. Create migration `migrations/0022_unique_phone_hash.sql` with `users_phone_hash_unique`.
2. Apply migration against DB using `DATABASE_URL` from `backend/.env`.
3. Run DB self-verification query for unique constraint.
4. **Gate A:** proceed only if constraint query returns exactly one row.
5. Modify `backend/src/routes/auth.ts` for `mode` (`login|signup`) request validation in `request-otp`.
6. Add pre-OTP existence checks by mode and Redis mode key `otp:mode:{phone_hash}` TTL 600.
7. Modify `verify-otp` to read/delete mode key and branch login/signup user handling.
8. Return `{ token: { jwt }, user: { id, user_type }, is_new_user }` without sensitive internals.
9. Run backend curl verifications (missing mode, login unknown, signup existing, verify response shape).
10. **Gate B:** proceed only if backend verification scenarios pass.
11. Rewrite `apps/mobile/app/(auth)/phone.tsx` to unified two-step flow with tabbed mode and inline errors.
12. Delete `apps/mobile/app/(auth)/otp.tsx`; remove all route references.
13. Update `apps/mobile/app/(auth)/_layout.tsx` if otp route is explicitly listed.
14. Verify/fix onboarding gate in `apps/mobile/app/index.tsx` and `apps/mobile/app/(auth)/onboarding.tsx`.
15. Run auth-route grep checks and `pnpm --filter mobile type-check`.
16. **Gate C:** proceed only if otp file/refs are gone and mobile type-check passes.
17. Update `apps/mobile/store/authStore.ts` with `setSession/clearSession/isNewUser` contract.
18. Guard `apps/mobile/app/(auth)/user-type.tsx` against returning-user access.
19. Standardize logout handlers in seller/aggregator settings screens with `router.replace`.
20. Run `pnpm --filter mobile type-check` again.
21. **Gate D:** proceed only if auth store/guard/logout checks pass.
22. Run global verification gates G1–G8.
23. If any gate fails: fix root cause and re-run failed gate(s) then rerun impacted downstream gate(s).
24. Execute completion steps in required order (Section 6).

---

## Section 4 — Security Rules In Scope

- **V7:** Privileged role decisions use DB values only; backend auth flow reads `user_type` from DB row in verify path.
- **V24:** Never expose `phone_hash` or `clerk_user_id` in auth responses; response DTO only returns allowed fields.
- **V35:** No changes that allow client updates of `kyc_status`; auth overhaul does not widen this surface.
- **V-OTP-1:** OTP verification must delete OTP-mode key and OTP key after successful verify (one-time use cleanup).
- **X3:** OTP persistence remains HMAC-only in Redis; raw OTP never stored.
- **A3:** No secrets in client or docs; `.env.example` remains key-only, no values committed.
- **R2:** No new policy regressions; if SQL policy touched, keep `USING`/`WITH CHECK` separation and `current_app_user_id()` convention.
- **I2:** Existing global sanitize-html middleware remains in effect; no new free-text bypass introduced.
- **C1-equivalent:** Any new interval (OTP countdown/resend) includes cleanup in `useEffect` return.

---

## Section 5 — Verification Gate Checklist

### G1 — DB Constraint Live
```bash
psql "$DATABASE_URL" -c "SELECT conname, contype FROM pg_constraint WHERE conrelid = 'users'::regclass AND conname = 'users_phone_hash_unique';"
```
Expected: exactly 1 row.

### G2 — Login Mode Unknown Phone → 404
```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/auth/request-otp -H "Content-Type: application/json" -d '{"phone": "+919000000099", "mode": "login"}'
```
Expected: HTTP 404 + `no_account`.

### G3 — Signup Mode Existing Phone → 409
```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/auth/request-otp -H "Content-Type: application/json" -d '{"phone": "<EXISTING_PHONE>", "mode": "signup"}'
```
Expected: HTTP 409 + `account_exists`.

### G4 — Missing Mode → 400
```bash
curl -s -w "\nHTTP %{http_code}" -X POST http://localhost:3001/api/auth/request-otp -H "Content-Type: application/json" -d '{"phone": "+919000000001"}'
```
Expected: HTTP 400.

### G5 — verify-otp Response Shape
Action: run full signup OTP flow on clean number and inspect response JSON.
Expected:
- `token.jwt` exists and non-empty
- `is_new_user === true`
- no `phone_hash`
- no `clerk_user_id`

### G5b — Login verify-otp Existing User Shape + Navigation
Action: run full login OTP flow on an existing phone and inspect response + mobile routing behavior.
Expected:
- `is_new_user === false`
- `user.user_type` is non-null (`seller` or `aggregator`)
- no `phone_hash`
- mobile navigates to the correct role home screen (`/(seller)/home` or `/(aggregator)/home`).

### G6 — `otp.tsx` Deleted + No Dangling References
```bash
find apps/mobile -name "otp.tsx" -path "*/(auth)/*"
grep -r "/(auth)/otp" apps/mobile/
grep -r '"otp"' apps/mobile/app/\(auth\)/
```
Expected: no results.

### G7 — TypeScript Zero Errors
```bash
pnpm type-check
```
Expected: exit code 0.

### G8 — Redis Mode Key Cleanup
Action: after successful `verify-otp`, check key `otp:mode:{phone_hash}` in Upstash (dashboard or direct GET).
Expected: key not found.

---

## Section 6 — Completion Steps

1. Update `implementationPlan.md` with final execution status.
2. Update `PLAN.md` auth-overhaul note.
3. Append learned lessons in `MEMORY.md` §9.
4. Update `structure.md` auth/migration tree entries.
5. Update `TRD.md` auth flow documentation.
6. Update `PRD.md` user flow + auth constraints.
7. Update `README.md` only if env/setup changed; otherwise record unchanged rationale.
8. Run `pnpm type-check` and fix any auth-overhaul regressions.
9. Commit + push with message: `feat: auth overhaul — unified phone+OTP screen, login/signup modes, phone uniqueness enforcement`.
10. Report completion status for each step and include security sign-off table (V24, V7, V35, X3, V-OTP-1, A3, R2, I2, C1).


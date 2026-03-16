# Day 12 — Agent Context File
## Atomic Operations: First-Accept-Wins + OTP Verify

> Created: 2026-03-16 | Based on Day 11 execution session.
> Place this file at `/agent/day-context/day-12.md`.
> This file supplements PLAN.md §12. It does NOT override MEMORY.md or PLAN.md.

---

## 1. State of the Codebase at Day 12 Start

### What is already built and working

- **Full mobile UI wired to live API** (Day 11 complete): all seller and aggregator
  screens make real API calls. Stores are wired. Loading/error/empty states working.
- **All API routes live** (Days 6–11):
  - `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`
  - `PATCH /api/orders/:id/status` — handles all status transitions EXCEPT 'completed'
  - `GET /api/orders/feed`, `POST /api/orders/:id/media`
  - `GET /api/orders/:id/media/:mediaId/url`
  - `POST /api/aggregators/heartbeat`, `PATCH /api/aggregators/profile`
  - `PATCH /api/aggregators/rates`, `GET /api/rates`
  - `POST /api/messages`, `POST /api/ratings`, `POST /api/disputes`
- **Migrations 0001–0018 applied** to Azure PostgreSQL:
  - 0018_users_display_phone.sql adds `display_phone varchar(20) NULL` to users
- **orderStateMachine.ts exists** at `backend/src/utils/orderStateMachine.ts`
- **orderDto.ts** at `backend/src/utils/orderDto.ts` — `buildOrderDto` strips
  `phone_hash`, `clerk_user_id`, gates `pickup_address` and `seller_phone` by role
- **`db.ts`** at `backend/src/lib/db.ts` — exports `query()` helper and `pool`
  (the raw pg Pool). Both are needed for Day 12.

### What Day 12 must create (does NOT exist yet)

- `POST /api/orders/:orderId/accept` — first-accept-wins atomic route
- `POST /api/orders/:orderId/verify-otp` — OTP verification + order completion
- Mobile wiring: accept button → accept route, OTP screen → verify-otp route

### What does NOT need to be created (already exists or is out of scope)

- `PATCH /api/orders/:id/status` already handles en_route, arrived,
  weighing_in_progress transitions. Do NOT refactor this route today.
- `POST /api/orders/:id/media` with `media_type: 'scale_photo'` already
  generates the OTP and stores its HMAC in Redis. Do NOT change this logic.
- Ably publish calls are Day 13. Add a `// TODO Day 13: publish Ably event`
  comment at the relevant points but do not implement.

---

## 2. Resolved Ambiguities — Read Before Writing Any Code

### 2.1 FOR UPDATE SKIP LOCKED requires raw pool connection — NOT withUser()

The `withUser()` helper (if it exists) uses `SET LOCAL app.current_user_id`
which requires the connection to remain within a single transaction block.
`FOR UPDATE SKIP LOCKED` must also be inside the SAME transaction on the SAME
connection.

**The correct pattern for the accept route:**

```typescript
import { pool } from '../lib/db';  // raw pg Pool — NOT the query() helper

const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query(`SET LOCAL app.current_user_id = '${aggregatorId}'`);

  const lockResult = await client.query(
    `SELECT id FROM orders
     WHERE id = $1 AND status = 'created'
     FOR UPDATE SKIP LOCKED`,
    [orderId]
  );

  if (lockResult.rows.length === 0) {
    await client.query('ROLLBACK');
    return res.status(409).json({ error: 'order_already_taken' });
  }

  await client.query(
    `UPDATE orders SET status = 'accepted', aggregator_id = $1, updated_at = NOW()
     WHERE id = $2`,
    [aggregatorId, orderId]
  );

  await client.query(
    `INSERT INTO order_status_history (id, order_id, old_status, new_status, changed_by, note)
     VALUES (gen_random_uuid(), $1, 'created', 'accepted', $2, 'Aggregator accepted')`,
    [orderId, aggregatorId]
  );

  await client.query('COMMIT');
} catch (err) {
  await client.query('ROLLBACK');
  throw err;
} finally {
  client.release();  // ALWAYS release — even on error
}
```

**Hard rule:** `client.release()` MUST be in the `finally` block. A missed
release leaks the connection permanently until the pool exhausts.

### 2.2 old_status column in order_status_history — CONFIRM BEFORE CODING

Day 9/10 gates only verified `new_status`, `changed_by`, and `note` columns.
The `old_status` column appears in PLAN.md §12 INSERT example but may not
exist in the live schema.

**The agent MUST run this before writing any INSERT:**

```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'order_status_history'
ORDER BY ordinal_position;
```

- If `old_status` exists → include it in the INSERT as shown above.
- If `old_status` does NOT exist → omit it from the INSERT and add a migration
  `0019_add_old_status_to_history.sql` before the route code.

Do not assume. Check first.

### 2.3 OTP Redis key naming — confirmed pattern

From MEMORY.md §9 (2026-03-13) and Day 10 gate verification:
- `POST /api/orders/:id/media` with `media_type: 'scale_photo'` stores the
  OTP HMAC in Redis at key: `otp:order:{orderId}`
- Day 12's `verify-otp` route reads from the SAME key: `otp:order:{orderId}`

Verify this is consistent by grepping before writing the verify-otp route:
```bash
grep -rn "otp:order:" backend/src/
```
Expected: at least one hit in the media upload handler. Use the exact same
key string in verify-otp — no variation.

### 2.4 ALLOWED_TRANSITIONS in orderStateMachine.ts

The accept route bypasses `orderStateMachine.ts` (it uses its own transaction),
but the verify-otp route must confirm `weighing_in_progress → completed` is
a valid transition before executing the UPDATE.

**The agent must open `backend/src/utils/orderStateMachine.ts` and confirm:**
- `'created' → 'accepted'` is present (for the accept route guard)
- `'weighing_in_progress' → 'completed'` is present (for verify-otp guard)

If either is missing, add it to `ALLOWED_TRANSITIONS` before the route code.

### 2.5 snapshotHmac — what it binds to and whether to implement

PLAN.md §12.2 step 8 mentions `snapshotHmac` which "binds the OTP to the
confirmed weight snapshot."

**Decision for Day 12:** This is an integrity check that prevents an OTP
from being replayed against a different weight value than the one the seller
confirmed. However, the mobile weighing screen (`execution/weighing.tsx`)
does not yet compute or store a weight snapshot HMAC — that is Day 13+
execution flow work.

**For Day 12:** Skip `snapshotHmac` validation. The verify-otp route will
validate the OTP HMAC only. Add a comment:
```typescript
// TODO Day 13: validate snapshotHmac binding once weighing screen
// computes and sends the weight snapshot HMAC.
```
Do NOT block Day 12 on this.

### 2.6 Clerk phone fetch on acceptance — wired in Day 11

The accept route must also trigger the Clerk phone cache (added in Day 11's
seller phone reveal feature). This runs via `setImmediate` (non-blocking)
after COMMIT. The pattern is already in `PATCH /api/orders/:id/status`.
The accept route must replicate the same `setImmediate` block. Do not skip it.

### 2.7 Post-acceptance DTO — full address revealed (V25)

After a successful accept, the response must return the full order DTO
including `pickup_address` (no longer null). This is V25: address is
revealed to the aggregator post-acceptance.

The accept route response must call `buildOrderDto(order, aggregatorId)`
which already implements the `canSeeAddress` logic. Do not return a raw
DB row — always go through `buildOrderDto`.

### 2.8 verify-otp caller must be the assigned aggregator (V8)

The verify-otp route must check:
```typescript
if (order.aggregator_id !== req.user.id) {
  await client.query('ROLLBACK');
  return res.status(403).json({ error: 'not_assigned_aggregator' });
}
```
This is security mitigation V8. A seller calling verify-otp on their own
order must get 403. Test this explicitly in G12.4.

### 2.9 Test material code used for G11.1 and G12 tests

From Day 11 backend logs:
```
PATCH /api/aggregators/rates { userId: 'a613f713...', ratesCount: 3 }
```
The aggregator has 3 rates set. From the pre-requisite step, `iron` was
confirmed as one of them with `buy_rate: 25`. Use `iron` as the test
material for all Day 12 gate tests.

---

## 3. Known Gotchas

- **`query()` helper vs `pool.connect()`:** The `query()` helper from
  `backend/src/lib/db.ts` uses a pool checkout internally — it is fine for
  single-statement queries. It CANNOT be used for multi-statement transactions
  because each call gets a potentially different connection. For any `BEGIN /
  COMMIT` block, always use `pool.connect()` directly.

- **`SET LOCAL` scope:** `SET LOCAL app.current_user_id` only applies within
  the current transaction. If the transaction is committed or rolled back,
  the setting disappears. This is correct behaviour — do not try to persist it.

- **Redis DEL after OTP verify:** After a successful OTP verification, the
  Redis key `otp:order:{orderId}` MUST be deleted immediately to enforce
  one-time use (V-OTP-1). Use `await redis.del('otp:order:' + orderId)`.
  Do this AFTER the DB COMMIT, not before.

- **`order.status` check before COMMIT:** In verify-otp, check
  `status === 'weighing_in_progress'` BEFORE starting the transaction to
  fail fast with a 400 if the order is in the wrong state. Then re-check
  with `FOR UPDATE` inside the transaction to prevent race conditions.

- **Mobile 409 handling:** The aggregator feed "Accept Order" button must
  handle HTTP 409 gracefully with a bottom sheet: "Order already taken —
  just now." This must not crash the app. The aggregatorStore action must
  catch 409 specifically and set a distinct error state.

- **`client.release()` in finally:** Without this, a connection leak will
  exhaust the Azure PostgreSQL B1ms connection pool (max ~20 connections)
  in minutes under concurrent load. This is a hard requirement, not optional.

- **Do not use `PATCH /api/orders/:id/status` to set 'completed':** The only
  path to 'completed' is `verify-otp`. PLAN.md §12 and V13 both prohibit this.
  The `PATCH` route must still return 400 if `{ status: 'completed' }` is sent.
  Confirm this guard exists in the PATCH handler before Day 12 closes.

---

## 4. Files Permitted Today

### Backend (create or modify)
- `backend/src/routes/orders/index.ts` — add accept and verify-otp routes
- `backend/src/utils/orderStateMachine.ts` — add missing transitions if needed
- `backend/src/utils/orderDto.ts` — no changes expected, but permitted if DTO
  needs a field added for the post-acceptance response
- `migrations/0019_add_old_status_to_history.sql` — ONLY if Step 2.2 audit
  confirms `old_status` column is missing

### Mobile (modify only — no new files)
- `apps/mobile/store/aggregatorStore.ts` — add `acceptOrder`, `verifyOtp` actions
- `apps/mobile/app/(aggregator)/order-detail.tsx` — wire Accept button
- `apps/mobile/app/(aggregator)/execution/otp.tsx` — wire OTP submission
- `apps/mobile/app/(shared)/order/[id].tsx` — handle post-acceptance address reveal

### Must NOT touch today
- Any auth routes
- Any seller-side listing screens (Day 11 complete)
- Any Ably/realtime code (Day 13)
- Any invoice generation code (Day 15)
- `backend/src/routes/aggregators.ts` (heartbeat, profile — Day 11 complete)

---

## 5. Environment Variables

No new env vars are required for Day 12. All required keys already exist:

| Key | Location | Used for |
|---|---|---|
| `DATABASE_URL` | `backend/.env` | Pool connection |
| `REDIS_URL` | `backend/.env` | OTP HMAC retrieval and DEL |
| `OTP_HMAC_SECRET` | `backend/.env` | `crypto.timingSafeEqual` comparison |
| `CLERK_SECRET_KEY` | `backend/.env` | Clerk phone fetch (setImmediate block) |

---

## 6. API Contracts

### POST /api/orders/:orderId/accept
- **Auth:** Clerk JWT, aggregator only (verifyUserRole check)
- **Success:** HTTP 200, full post-acceptance order DTO (pickup_address populated)
- **Already taken:** HTTP 409 `{ error: 'order_already_taken' }`
- **Wrong role:** HTTP 403
- **Order not found:** HTTP 404

### POST /api/orders/:orderId/verify-otp
- **Auth:** Clerk JWT, aggregator only
- **Body:** `{ otp: string }` — 6 digits
- **Success:** HTTP 200 `{ success: true }`
- **Wrong OTP:** HTTP 400 `{ error: 'invalid_otp' }`
- **OTP expired (Redis key gone):** HTTP 400 `{ error: 'otp_expired' }`
- **Wrong status:** HTTP 400 `{ error: 'invalid_order_status' }`
- **Not assigned aggregator:** HTTP 403 `{ error: 'not_assigned_aggregator' }`

---

## 7. Sub-Agent Split Recommendation

Day 12 splits into two sequential domains plus one parallel mobile domain:

| Sub-agent | Scope | Depends on |
|---|---|---|
| **Sub-agent A: Schema audit** | Check old_status column, check ALLOWED_TRANSITIONS, check Redis key pattern. Output: audit report + migration file if needed. | None — runs first. |
| **Sub-agent B: Backend routes** | `POST /api/orders/:id/accept` and `POST /api/orders/:id/verify-otp` in `orders/index.ts`. | Sub-agent A complete and confirmed. |
| **Sub-agent C: Mobile wiring** | aggregatorStore actions + Accept button + OTP screen. | Sub-agent B routes deployed/running locally. |

Sub-agents B and C must be strictly sequential — mobile cannot be wired
until the backend routes exist and return the correct shapes.

---

## 8. Verification Gate Quick Reference

| Gate | What to test | Method |
|---|---|---|
| **G12.1** | Two devices accept same order simultaneously → exactly one 200, one 409 | Two devices, manual simultaneous tap |
| **G12.2** | Correct OTP → `orders.status = 'completed'` in DB | Device test + Azure Portal SQL |
| **G12.3** | Same OTP submitted twice → second attempt returns 400 | curl or device test |
| **G12.4** | Seller JWT calls verify-otp → 403 | curl with seller token |
| **G12.5** | `PATCH /api/orders/:id/status` with `{ status: 'completed' }` → 400 | curl |
| **G12.6** | Post-acceptance DTO from accept route: `pickup_address` populated | curl + visual |

**G12.1 PowerShell/curl test:**
```bash
# Run both of these within 1 second of each other from two terminals:
# Terminal 1 (Aggregator device A):
curl -X POST http://192.168.1.100:8080/api/orders/<ORDER_ID>/accept \
  -H "Authorization: Bearer <AGG_JWT_1>"

# Terminal 2 (Aggregator device B — different aggregator account if possible,
# or same account second request):
curl -X POST http://192.168.1.100:8080/api/orders/<ORDER_ID>/accept \
  -H "Authorization: Bearer <AGG_JWT_2>"

# Expected: one returns 200, one returns 409
```

**G12.2 DB check after OTP verify:**
```sql
SELECT id, status, updated_at
FROM orders
WHERE id = '<ORDER_ID>';
-- Expected: status = 'completed'
```

**G12.3 One-time use check:**
```sql
-- After first successful verify-otp, check Redis key is gone:
-- In backend logs, confirm: DEL otp:order:<ORDER_ID> executed
-- Then re-submit same OTP → expect 400 { error: 'otp_expired' }
```

**G12.5 V13 guard:**
```bash
curl -X PATCH http://192.168.1.100:8080/api/orders/<ORDER_ID>/status \
  -H "Authorization: Bearer <AGG_JWT>" \
  -H "Content-Type: application/json" \
  -d '{ "status": "completed" }'
# Expected: 400
```

---

## 9. Open Questions for Day 13

Before Day 13 (Ably Realtime + Push Notifications) begins, resolve these:

1. **Ably channel name for order events:** PLAN.md §13 specifies
   `order:{orderId}:{hmacSuffix}` where the suffix is
   `hmac_sha256(orderId + userId + OTP_HMAC_SECRET).slice(0,8)`.
   Confirm `OTP_HMAC_SECRET` is the right secret to use here, or if a
   dedicated `ABLY_CHANNEL_SECRET` should be added.

2. **`chatChannelToken` in order DTO:** Day 13 requires returning
   `chatChannelToken` in the order detail API response so the mobile
   can subscribe to the correct private channel. This field is not in
   `buildOrderDto` yet. Day 13 agent must add it.

3. **Ably credential injection on mobile:** `ABLY_API_KEY` needs to be
   available in `apps/mobile/.env` as `EXPO_PUBLIC_ABLY_KEY` (public key
   only — the subscribe-only key, not the full API key). Confirm which
   Ably key type is appropriate for the mobile client.

4. **Push token registration:** `device_tokens` table stores `expo_token`
   (confirmed column name from MEMORY.md). The `POST /api/users/device-token`
   route is already live (visible in Day 11 backend logs). Confirm the
   route correctly uses `expo_token` column (not `device_token` — the old
   column name that was a known bug).

5. **snapshotHmac for verify-otp:** Deferred from Day 12. Day 13 agent
   should clarify what data this HMAC binds to once the weighing screen
   computes a confirmed weight. The TODO comment in verify-otp will mark
   the exact line to complete.

6. **`removeAllChannels()` on AppState background:** PLAN.md §13 requires
   this in root `_layout.tsx`. Confirm that `IRealtimeProvider` interface
   already has `removeAllChannels()` defined in `packages/realtime/` —
   or note it needs to be added on Day 13.
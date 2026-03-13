# Day 9 — Agent Context File
## Core Order Routes

> Created by Claude on 2026-03-12. Place this file at `/agent/day-context/day-09.md`.
> This file supplements PLAN.md §9. It does NOT override MEMORY.md or PLAN.md.

---

## 1. State of the Codebase at Day 9 Start

### What is already built and working

- **All mobile UI screens** (Days 1–3): static, hardcoded mock data.
- **Full DB schema** (Days 4–5): Azure PostgreSQL with all 12 migrations applied, RLS active, triggers operational. The `orders`, `order_items`, `order_status_history`, `cities`, `material_types` tables are all live.
- **Express backend** (Days 6–7): live on Azure App Service. `backend/src/lib/db.ts` (pool), `backend/src/lib/redis.ts` (Upstash), `backend/src/middleware/auth.ts` (Clerk), `backend/src/middleware/verifyRole.ts`, `backend/src/middleware/sanitize.ts`, `backend/src/middleware/errorHandler.ts` are all present.
- **Auth routes** (Day 7): `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, aggregator profile + KYC routes.
- **Mobile auth wiring + users route** (Day 8):
  - `apps/mobile/lib/clerk.ts` — Clerk Expo initialisation.
  - `apps/mobile/lib/api.ts` — Axios wrapper with JWT attach + 401 interceptor.
  - `backend/src/routes/users.ts` — `POST /api/users/device-token`, `POST /api/users/profile`, `PATCH /api/users/profile`.
  - Auth wizard screens wired to real backend endpoints.
  - `ClerkProvider` wrapper added to `apps/mobile/app/_layout.tsx`.

### What does NOT exist yet (Day 9 must create it)

- `backend/src/routes/orders/` directory — does not exist. All order CRUD must be created here.
- `backend/src/providers/maps.ts` — local `IMapProvider` stub for geocoding. Does not exist.
- `backend/src/utils/orderDto.ts` — DTO builder enforcing two-phase address reveal. Does not exist.
- `backend/src/utils/orderStateMachine.ts` — valid transition validator. Does not exist.
- `GET /api/users/me` — missing from `backend/src/routes/users.ts`. Must be added today.
- `orderCreateLimiter` — not yet in `backend/src/utils/rateLimit.ts` (or `backend/src/lib/redis.ts`). Must be added today.
- `withUser(userId, fn)` helper — **MAY OR MAY NOT EXIST** in `backend/src/lib/db.ts`. Verify before writing it. See §2a.

---

## 2. Resolved Ambiguities

### 2a. `withUser()` helper location and existence

**Decision:** The `withUser()` helper lives in `backend/src/lib/db.ts`, NOT at `backend/src/db.ts`.
`structure.md` shows the file at `backend/src/lib/db.ts`. PLAN.md's reference to `backend/src/db.ts` is a path error — use the actual path.

**Before writing it:** check if `withUser` is already exported from `backend/src/lib/db.ts`. If Day 7 added a pool but not `withUser`, add only the helper — do not recreate the pool.

**Canonical implementation:**
```typescript
// backend/src/lib/db.ts — ADD if not already present
export async function withUser<T>(
  userId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('SET LOCAL app.current_user_id = $1', [userId]);
    return await fn(client);
  } finally {
    client.release();
  }
}
```

This helper MUST be called on every DB interaction in protected order routes. It sets the RLS context so PostgreSQL policies fire correctly.

### 2b. `IMapProvider` — how to use it before Day 14

**Decision:** Day 14 formalises `packages/maps` as a full provider abstraction. For Day 9, create a local backend wrapper at `backend/src/providers/maps.ts` that implements the same `IMapProvider` interface (geocode + reverseGeocode). This is the same pattern used for `@sortt/storage` stub in Day 7.

The wrapper calls the Google Maps Geocoding REST API directly via `node-fetch` or `axios`. Day 14's `packages/maps` agent will then replace this file with an `IMapProvider` import, which is a one-line swap.

**Interface shape (define locally for now):**
```typescript
export interface IMapProvider {
  geocode(addressText: string): Promise<{
    lat: number;
    lng: number;
    cityCode: string;       // mapped from geocode result → cities table lookup
    locality: string;       // neighbourhood/locality name from geocode
    formattedAddress: string;
  }>;
}
```

**City-code mapping:** After geocoding, query `SELECT code FROM cities WHERE name ILIKE $1` (or a pre-seeded mapping). For the Hyderabad MVP, `cityCode` should always resolve to `'HYD'`. If the geocoded city cannot be mapped to a `cities.code` → return HTTP 422 `{ error: 'unsupported_city' }`. Do not default to a hardcoded value.

**Failure handling:** If Google Maps API returns no results or returns an error, `POST /api/orders` must return HTTP 422 with `{ error: 'geocode_failed', message: 'We couldn\'t find that address — please check and try again.' }`. Never silently fall back to a default city_code.

### 2c. `POST /api/users/profile` — confirm it exists from Day 8

Day 9 §9.3 adds `GET /api/users/me` to the users router. Before starting, check `backend/src/routes/users.ts` to confirm that `POST /api/users/profile` and `PATCH /api/users/profile` were created in Day 8. If they exist, add only the GET route. If they do not exist (Day 8 incomplete), flag to user before proceeding — Day 9 cannot run seller onboarding tests without them.

### 2d. Allowed PATCH status transitions (state machine)

Only the following transitions are valid through `PATCH /api/orders/:id/status`. All others are rejected with 400.

```typescript
// backend/src/utils/orderStateMachine.ts
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  'accepted':            ['en_route'],
  'en_route':            ['weighing_in_progress'],
};

// These are ALWAYS hard-rejected regardless of current status (V13):
export const IMMUTABLE_STATUSES = ['completed', 'disputed'] as const;

// Who can trigger which transition:
// 'accepted' → 'en_route'          : aggregator only
// 'en_route' → 'weighing_in_progress' : aggregator only
// Note: 'created' → 'accepted' goes through POST /api/orders/:id/accept (Day 12, FOR UPDATE SKIP LOCKED)
// Note: 'weighing_in_progress' → 'completed' goes through POST /api/orders/:id/verify-otp (Day 12)
// Note: any → 'cancelled' goes through DELETE /api/orders/:id (soft delete)
```

The PATCH route must also validate that the requesting user has the correct role for the transition. `en_route` and `weighing_in_progress` can only be set by the order's `aggregator_id`. Mismatched actor → 403.

### 2e. Two-phase address reveal — enforced in DTO, not just in UI

`GET /api/orders/:id` must enforce the reveal at the DTO layer — not the UI. The raw JSON body returned by the API must have `pickup_address_text: null` for any caller who is not the assigned aggregator. This is gate G9.2.

```typescript
// backend/src/utils/orderDto.ts
export function buildOrderDto(order: DbOrder, requestingUserId: string) {
  const isAssignedAggregator = order.aggregator_id === requestingUserId;
  return {
    ...order,
    // Two-phase reveal: full address only for assigned aggregator (V25)
    pickup_address_text: isAssignedAggregator ? order.pickup_address_text : null,
    // Strip sensitive fields from every response (V24, V-CLERK-1)
    phone_hash: undefined,
    clerk_user_id: undefined,
  };
}
```

Apply `buildOrderDto` to EVERY order response: single GET, list GET, and post-creation response (the seller who just created the order IS the owner, so they see their own address; the DTO correctly returns it for them since `order.seller_id === requestingUserId` — but wait, the condition should be: show if requester is `seller_id` OR `aggregator_id`).

**Correction:** The reveal logic is:
- Show full `pickup_address_text` if: `requestingUserId === order.seller_id` (the creator always sees their own) OR `requestingUserId === order.aggregator_id` (the assigned aggregator post-acceptance).
- Hide (set null) for: all other aggregators browsing the feed, admin reads (unless explicitly needed), anyone else.

```typescript
export function buildOrderDto(order: DbOrder, requestingUserId: string) {
  const canSeeAddress =
    order.seller_id === requestingUserId ||
    order.aggregator_id === requestingUserId;
  return {
    ...order,
    pickup_address_text: canSeeAddress ? order.pickup_address_text : null,
    phone_hash: undefined,
    clerk_user_id: undefined,
  };
}
```

### 2f. Push notification on order creation — placeholder implementation

`POST /api/orders` must trigger push notifications to nearby online aggregators. Day 13 wires Ably fully. For Day 9, use the Expo Push API directly (no Ably) as a placeholder:

1. After the order INSERT commits, query `device_tokens` for all aggregators in the same `city_code` where `aggregator_availability.is_online = true`.
2. Filter to those with at least one matching material in `aggregator_material_rates`.
3. Send via Expo Push API (`https://exp.host/--/api/v2/push/send`).
4. Push body must use generic copy — NO seller name, address, or PII in push payload (D2). Approved copy: `{ title: "New pickup nearby", body: "A new scrap listing is available in your area." }`.
5. This push is non-blocking — wrap in `setImmediate` or `void asyncPush(...)`. Order creation must not fail if push delivery fails.

**Important:** `EXPO_ACCESS_TOKEN` is optional for Expo Push in development but required for enhanced delivery. Add it to `.env.example` as an optional key. If absent, push still works via the public API.

### 2g. Rate limiter — `orderCreateLimiter` location

Based on `structure.md`, rate limiters likely live in `backend/src/lib/redis.ts` (alongside the Upstash Redis client). Add `orderCreateLimiter` there — do not create a separate `rateLimit.ts` file unless it already exists and is the established pattern. Check before creating.

The limiter config: 3 orders per seller per 60-minute sliding window. Use `@upstash/ratelimit` with `slidingWindow(3, '60 m')`.

```typescript
export const orderCreateLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(3, '60 m'),
  prefix: 'order_create',
});
// Usage: orderCreateLimiter.limit(req.user.id)
```

### 2h. `GET /api/orders` — cursor-based pagination shape

PLAN.md specifies cursor-based pagination for `GET /api/orders`. Use `created_at`-based cursor (ISO timestamp). Response shape:

```typescript
{
  orders: OrderDto[],
  nextCursor: string | null,  // ISO timestamp of the last item's created_at
  hasMore: boolean
}
```

Query pattern:
```sql
WHERE seller_id = $1
  AND ($cursor IS NULL OR created_at < $cursor)
ORDER BY created_at DESC
LIMIT 21  -- fetch 21, return 20, use the 21st to set hasMore
```

### 2i. `DELETE /api/orders/:id` — seller role check before RLS

Even though RLS will block a different seller at the DB level, the Express route must ALSO do an explicit check (`if (order.seller_id !== req.user.id) return res.status(403)`) BEFORE calling the DB. This provides a clear 403 response rather than relying on RLS to throw an opaque error. Both layers must be present (R2).

### 2j. `seller_note` and `pickup_address_text` sanitization

Both fields pass through `sanitize-html` before DB insert (I2). Use the existing `backend/src/middleware/sanitize.ts` pattern if it provides a utility function, or call `sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} })` directly to strip all HTML. Apply to: `seller_note`, `pickup_address_text` in `POST /api/orders`.

---

## 3. Known Gotchas

### 3a. PLAN.md path error — `backend/src/db.ts` does not exist

PLAN.md §9.1 says to create `backend/src/db.ts`. **This is wrong.** `structure.md` confirms the actual path is `backend/src/lib/db.ts`. All imports of the pool and `withUser` must use:
```typescript
import { pool, withUser } from '../lib/db';
```
Never create a new `backend/src/db.ts` — it would be a duplicate and would cause TypeScript path confusion.

### 3b. `verifyUserRole()` middleware already exists at `backend/src/middleware/verifyRole.ts`

`structure.md` shows `backend/src/middleware/verifyRole.ts` from Day 7. Use this existing middleware — do not reinvent role checking. Import and apply it in order routes to enforce `user_type === 'seller'` on `POST /api/orders` and `user_type === 'aggregator'` on transitions that only aggregators can trigger.

### 3c. Orders routes directory structure — match TRD §10.1 layout

TRD §10.1 shows:
```
backend/src/routes/
├── orders/
│   ├── accept.ts         ← Day 12 (do not create yet)
│   └── verifyPickupOtp.ts ← Day 12 (do not create yet)
```

This implies the CRUD routes belong in `backend/src/routes/orders/index.ts` — not a flat `orders.ts`. Create the directory structure now so Day 12's `accept.ts` and `verifyPickupOtp.ts` can be dropped in cleanly.

**Day 9 creates:**
```
backend/src/routes/orders/
└── index.ts    ← POST, GET, PATCH, DELETE order CRUD
```

**Day 12 will add:**
```
backend/src/routes/orders/
├── index.ts    ← (unchanged)
├── accept.ts
└── verifyPickupOtp.ts
```

Mount in `backend/src/index.ts` as: `app.use('/api/orders', ordersRouter);`

### 3d. `cities` table must be seeded with `HYD` before geocoding works

`POST /api/orders` derives `city_code` by looking up the geocoded city in the `cities` table. If `cities` is empty, every order creation will fail with a 422. The cities seed (`INSERT INTO cities (code, name, ...) VALUES ('HYD', 'Hyderabad', ...)`) should have been applied in Day 4/5. Verify this:
```sql
SELECT code FROM cities WHERE code = 'HYD';
```
If 0 rows: you must seed the table before running G9.1. This is a MANUAL task — see §5 below.

### 3e. `GOOGLE_MAPS_API_KEY` may not exist in `backend/.env`

Day 8 open questions flagged this. Before writing `backend/src/providers/maps.ts`, confirm the key exists:
```bash
grep GOOGLE_MAPS_API_KEY backend/.env
```
If absent: the geocoding provider cannot be tested. The agent must add `GOOGLE_MAPS_API_KEY=` to `backend/.env.example` and **pause gate G9.1** until the user manually injects the key. See §5 for the manual task steps.

### 3f. Google Maps Geocoding API — India address parsing quirks

For Indian addresses, the geocoding result structure often returns:
- `sublocality_level_1` or `neighborhood` for the local area name (use as `pickup_locality`)
- `administrative_area_level_2` for the district/city (use to map to `city_code`)
- `locality` for the city name (fallback for `city_code` lookup)

The Hyderabad mapping: `administrative_area_level_2 = "Hyderabad"` or `locality = "Hyderabad"` → `city_code = 'HYD'`. Build a simple lookup map in the provider:
```typescript
const CITY_CODE_MAP: Record<string, string> = {
  'hyderabad': 'HYD',
  // Add more cities as the platform scales
};
```
If the geocoded name doesn't appear in `CITY_CODE_MAP`, fall back to a DB query against `cities.name`. If still not found → 422 `unsupported_city`.

### 3g. `order_items` — many rows in one transaction

`POST /api/orders` creates one `orders` row + N `order_items` rows (one per material type submitted). Both must be in the same `withUser()` transaction:

```typescript
await withUser(req.user.id, async (client) => {
  const order = await client.query('INSERT INTO orders ...', [...]);
  const orderId = order.rows[0].id;
  for (const item of materialItems) {
    await client.query('INSERT INTO order_items (order_id, ...) VALUES ($1, ...)', [orderId, ...]);
  }
  await client.query('INSERT INTO order_status_history ...', [...]);
});
```

Do not use `Promise.all` for the inserts — they must be sequential within the transaction to avoid any partial-insert issues on B1ms (low concurrent connection limit).

### 3h. `changed_by` in `order_status_history` is always `req.user.id`

From TRD §14 R3: `changed_by` comes from the Clerk JWT (via `req.user.id` attached by `attachInternalUser` middleware), never from a trigger, and never from the client body. Every single `INSERT INTO order_status_history` in Day 9 must explicitly set `changed_by = req.user.id`. Gate G9.6 checks this is never NULL.

### 3i. `users_public` view for `GET /api/users/me`

`GET /api/users/me` should query the `users_public` view, not the raw `users` table. The `users_public` view (created in migrations) excludes `phone_hash` and `clerk_user_id`. Querying the view provides automatic protection even if the DTO layer has a bug. Belt-and-suspenders: also explicitly exclude those fields in the DTO builder for `GET /api/users/me`.

If `users_public` view doesn't exist (check with `\dv` in psql): query `users` table and strip the sensitive fields explicitly in the DTO.

### 3j. `PATCH /api/orders/:id/status` body validation — strip attacker-controlled fields

The PATCH route must strip `aggregator_id`, `seller_id`, `city_code`, `kyc_status`, `deleted_at`, and `created_at` from the request body before any processing. Only `new_status` and an optional `note` are accepted. Any other field in body → silently ignored (do not return 400 for unknown fields — that leaks field names).

### 3k. Push notification race condition on order creation

The push to nearby aggregators happens after the transaction commits. Between commit and push dispatch, an aggregator might go offline. This is acceptable for MVP — the push is best-effort. Do not retry or queue failed pushes. Log failures to console only.

### 3l. Azure B1ms connection pool — max 10

The pool is configured `max: 10`. `withUser()` uses `pool.connect()` (dedicated client). If all 10 connections are in use during a concurrent order creation spike, the 11th request will queue. This is acceptable for MVP scale. Do not increase `max` — B1ms cannot handle more. If connection timeout errors appear in testing, reduce `idleTimeoutMillis` in the pool config (e.g. `idleTimeoutMillis: 10000`).

### 3m. `orderCreateLimiter` key format

The rate limiter key must be the internal user UUID, NOT the phone number or Clerk user ID. Use `req.user.id` (the DB UUID). This ensures the 3/hour limit is per-seller-account, not per-device.

```typescript
const { success } = await orderCreateLimiter.limit(req.user.id);
if (!success) return res.status(429).json({ error: 'rate_limit_exceeded', retryAfter: 3600 });
```

### 3n. `seller_only` vs `verifyUserRole` middleware — use existing middleware

Do not write ad-hoc user type checks inline in route handlers. `backend/src/middleware/verifyRole.ts` already exists from Day 7. Use it:
```typescript
import { requireRole } from '../middleware/verifyRole';
router.post('/', clerkJwtMiddleware, attachInternalUser, requireRole('seller'), async (req, res) => { ... });
```
Consistent use of the existing middleware ensures the 60s Redis cache pattern (V-CLERK-2) is applied uniformly.

### 3o. Gate G9.7 — RLS test requires two different seller accounts

Gate G9.7 ("DELETE by a different seller → 403") requires two distinct Clerk accounts / users in the DB. In a real device test, use Account A to create an order, then use Account B (different phone number) to attempt the delete. The 403 should come from the Express route's explicit check, with RLS as a second layer. If only one account is available during testing, simulate by temporarily using a second UUID in the test.

---

## 4. Files the Agent Is Permitted to Touch Today

### New files to CREATE:
```
backend/src/routes/orders/index.ts         ← All order CRUD routes
backend/src/providers/maps.ts              ← IMapProvider local stub (Google Maps wrapper)
backend/src/utils/orderDto.ts              ← DTO builder with two-phase address reveal
backend/src/utils/orderStateMachine.ts     ← Allowed transition validator + IMMUTABLE_STATUSES
```

### Existing files to MODIFY:
```
backend/src/lib/db.ts                      ← Add withUser() if not already present
backend/src/lib/redis.ts                   ← Add orderCreateLimiter
backend/src/routes/users.ts               ← Add GET /api/users/me
backend/src/index.ts                       ← Mount orders router at /api/orders
backend/.env.example                       ← Add GOOGLE_MAPS_API_KEY (key only, no value)
```

### Files the agent must NOT touch today:
```
migrations/                                ← All migrations are complete and locked
backend/src/routes/auth.ts                 ← Day 7 — do not modify
backend/src/routes/aggregators.ts          ← Day 7 — do not modify
apps/mobile/                               ← No mobile changes today (Day 11 task)
constants/tokens.ts                        ← Design tokens locked
backend/src/routes/orders/accept.ts        ← Day 12 task — do not create yet
backend/src/routes/orders/verifyPickupOtp.ts ← Day 12 task — do not create yet
packages/maps/                             ← Day 14 task — do not modify
```

---

## 5. Manual Tasks Required Before / During Day 9

### Manual Task A: Verify `cities` table seed

**Why this cannot be automated:** Requires psql access or a DB management tool to check and potentially insert seed data.
**Platform:** Terminal (psql) or Azure Portal → Query Editor
**Estimated time:** 5 minutes

```bash
# Check if Hyderabad seed exists
psql "$DATABASE_URL" -c "SELECT code, name FROM cities WHERE code = 'HYD';"
```

If 0 rows returned, insert the seed:
```sql
INSERT INTO cities (code, name, state, country)
VALUES ('HYD', 'Hyderabad', 'Telangana', 'IN')
ON CONFLICT (code) DO NOTHING;
```

**When done, tell me:** "Cities table seeded — HYD present."

---

### Manual Task B: Inject `GOOGLE_MAPS_API_KEY` into Azure App Service

**Why this cannot be automated:** API keys must be injected through Azure Portal, not committed to Git.
**Platform:** Azure Portal → App Service → Configuration → Application Settings
**Estimated time:** 5 minutes

### Steps:
1. Go to [Azure Portal](https://portal.azure.com) → your App Service (`sortt-backend`) → **Configuration** → **Application settings** tab.
2. Click **+ New application setting**.
3. Name: `GOOGLE_MAPS_API_KEY` | Value: your Google Maps API key (from Google Cloud Console → Credentials).
4. Ensure the key has **Geocoding API** enabled in your Google Cloud project.
5. Click **OK** → **Save** → **Continue** (App Service will restart).
6. Also add to `backend/.env` locally for development testing.

**Terminal commands (copy-paste ready) — for local `.env` only:**
```bash
# Add to your local backend/.env (never commit the actual key)
echo "GOOGLE_MAPS_API_KEY=<YOUR_KEY_HERE>" >> backend/.env
```

**When done, tell me:** "GOOGLE_MAPS_API_KEY injected into Azure and local .env."

---

## 6. Env Vars Needed Today

### In `backend/.env` (new this session):
```
GOOGLE_MAPS_API_KEY=<from Google Cloud Console — Geocoding API enabled>
```

### Already expected from Days 6–7:
```
DATABASE_URL=<Azure PostgreSQL connection string>
CLERK_SECRET_KEY=<from Clerk Dashboard>
UPSTASH_REDIS_REST_URL=<from Upstash>
UPSTASH_REDIS_REST_TOKEN=<from Upstash>
OTP_HMAC_SECRET=<HMAC secret>
BACKEND_URL=<Azure App Service full default domain URL>
```

### Optional (add to `.env.example`, inject if available):
```
EXPO_ACCESS_TOKEN=<from Expo → Account → Access tokens — improves push delivery reliability>
```

> ⚠️ `EXPO_ACCESS_TOKEN` is optional — push will work without it via the public Expo Push API. Add the `.env.example` key anyway for Day 13.

---

## 7. Sub-Agent Boundary Recommendation

Split into three sub-agents with a clear dependency chain.

| Sub-Agent | Scope | Dependency |
|---|---|---|
| **Sub-Agent A: Infrastructure** | `backend/src/lib/db.ts` (add `withUser`), `backend/src/lib/redis.ts` (add `orderCreateLimiter`), `backend/src/providers/maps.ts` (IMapProvider stub), `backend/src/utils/orderDto.ts`, `backend/src/utils/orderStateMachine.ts` | None — runs first |
| **Sub-Agent B: Order Routes** | `backend/src/routes/orders/index.ts` (all CRUD), `backend/src/index.ts` (mount orders router) | Must wait for Sub-Agent A to complete all 5 utility files + confirm they type-check |
| **Sub-Agent C: Users Route Extension** | `backend/src/routes/users.ts` (add `GET /api/users/me`) | Can run in parallel with Sub-Agent A; must complete before integration testing |

**Critical:** Sub-Agent B must NOT begin until Sub-Agent A's self-verification passes. If Sub-Agent B starts before `orderDto.ts` and `orderStateMachine.ts` exist, TypeScript will fail to compile on the first import, producing cascading errors that are hard to untangle.

**Self-verification for Sub-Agent A before handoff:**
```bash
cd backend && pnpm tsc --noEmit
# Must exit 0 — no TypeScript errors in the new utility files
```

---

## 8. Security Rules In Scope Today

| Rule ID | Rule | Enforcement point in Day 9 |
|---|---|---|
| **V13** | `order.status = 'completed'` only via `verify-otp` — never via PATCH | `PATCH /api/orders/:id/status` hard-rejects `completed` in `orderStateMachine.ts` |
| **V21 equivalent** | `city_code`, `aggregator_id`, `status` never accepted from client body | Blocklist in `POST /api/orders` before any processing |
| **V24** | `phone_hash` never in any API response | `buildOrderDto()` strips it + `GET /api/users/me` DTO strips it |
| **V25** | Pre-acceptance: `pickup_address_text` is literally `null` in JSON | `buildOrderDto()` nulls it for non-parties — enforced at DTO layer, not UI |
| **V30** | `order_status_history.created_at` never supplied by client | `DEFAULT NOW()` in schema — never in INSERT statement from Express |
| **V35** | `kyc_status` never in any client request body | Blocklist in `POST /api/orders` + `PATCH /api/orders/:id/status` |
| **V-CLERK-1** | `clerk_user_id` absent from all API responses | `buildOrderDto()` + `users/me` DTO strip it explicitly |
| **R2** | Split USING / WITH CHECK on `seller_own_orders` RLS | Implemented in DB (Day 5). Express also has explicit `seller_id === req.user.id` check before DB call |
| **R3** | `order_status_history.changed_by` always `req.user.id` | Every `INSERT INTO order_status_history` must set `changed_by = $req.user.id` |
| **RA3** | `orderCreateLimiter` — 3 creations/seller/hour | Applied at top of `POST /api/orders` handler before any DB work |
| **A1** | Clerk JWT on all order routes | `clerkJwtMiddleware + attachInternalUser` on all routes in `orders/index.ts` |
| **I2** | `sanitize-html` on `seller_note` and `pickup_address_text` | Applied before INSERT in `POST /api/orders` |
| **D2** | Push notification — generic copy only, no PII | Push body: `"New pickup nearby"` + `"A new listing is available in your area."` — no seller name, address, or phone |

---

## 9. Verification Gate Quick Reference

| Gate | What to test | Needs physical device? | Test method |
|---|---|---|---|
| **G9.1** | Seller creates listing → row in `orders` table with `seller_id`, `city_code='HYD'`, `status='created'` + correct `order_items` rows | ✅ Yes (or curl with valid JWT) | `SELECT * FROM orders ORDER BY created_at DESC LIMIT 1;` |
| **G9.2** | `GET /api/orders/:id` as non-aggregator: `pickup_address_text` is literally `null` in raw JSON | No (curl test) | `curl -H "Authorization: Bearer <token>" <BACKEND_URL>/api/orders/<id> \| jq '.pickup_address_text'` — must print `null` |
| **G9.3** | `PATCH /api/orders/:id/status` with `{ status: 'completed' }` → 400 | No (curl test) | `curl -X PATCH -d '{"status":"completed"}' ...` → `HTTP 400` |
| **G9.4** | `PATCH /api/orders/:id/status` with `{ status: 'disputed' }` → 400 | No (curl test) | Same pattern as G9.3 |
| **G9.5** | `POST /api/orders` with `{ status: 'accepted' }` in body → order created with `status='created'` | ✅ Yes (or curl) | Inspect created order: `status` must be `'created'` |
| **G9.6** | Every `order_status_history` row has `changed_by` not NULL | No (psql check) | `SELECT id, changed_by FROM order_status_history WHERE changed_by IS NULL;` — must return 0 rows |
| **G9.7** | `DELETE /api/orders/:id` by a different seller → 403 | No (requires 2 JWT tokens) | Create order with Token A, attempt DELETE with Token B → `HTTP 403` |
| **G9.8** | `GET /api/users/me`: `phone_hash` and `clerk_user_id` absent | No (curl test) | `curl -H "Authorization: Bearer <token>" <BACKEND_URL>/api/users/me \| jq 'has("phone_hash"), has("clerk_user_id")'` — both must print `false` |

**Curl templates (fill in values):**
```bash
# Create an order (G9.1, G9.5)
curl -X POST \
  -H "Authorization: Bearer <CLERK_JWT>" \
  -H "Content-Type: application/json" \
  -d '{
    "material_codes": ["metal", "paper"],
    "estimated_weights": { "metal": 5.0, "paper": 2.5 },
    "pickup_address_text": "Banjara Hills, Hyderabad, Telangana 500034",
    "pickup_preference": "morning",
    "seller_note": "Near the blue gate",
    "status": "accepted"
  }' \
  <BACKEND_URL>/api/orders

# Get order as non-aggregator (G9.2)
curl -H "Authorization: Bearer <SELLER_JWT>" \
  <BACKEND_URL>/api/orders/<ORDER_ID> | jq '.pickup_address_text'

# Test state machine (G9.3)
curl -X PATCH \
  -H "Authorization: Bearer <SELLER_JWT>" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}' \
  <BACKEND_URL>/api/orders/<ORDER_ID>/status

# Get users/me (G9.8)
curl -H "Authorization: Bearer <JWT>" \
  <BACKEND_URL>/api/users/me | jq 'has("phone_hash"), has("clerk_user_id")'
```

---

## 10. TypeScript Patterns to Follow

### 10a. Request body type for `POST /api/orders`

```typescript
interface CreateOrderBody {
  material_codes: string[];
  estimated_weights: Record<string, number>;
  pickup_address_text: string;
  pickup_preference: 'morning' | 'afternoon' | 'evening' | 'anytime';
  seller_note?: string;
  // Explicitly omit: status, aggregator_id, kyc_status, city_code
}
```

### 10b. `req.user` type augmentation

From Day 7/8, `attachInternalUser` middleware attaches the DB user row to `req.user`. Ensure the Express Request type is augmented. If `backend/src/types/express.d.ts` doesn't exist, create it:

```typescript
// backend/src/types/express.d.ts
import { Request } from 'express';
declare global {
  namespace Express {
    interface Request {
      user: {
        id: string;
        user_type: 'seller' | 'aggregator' | 'admin';
        is_active: boolean;
        name: string;
        locality: string;
        city_code: string;
      };
    }
  }
}
```

If this already exists from Day 7/8, do not re-create it — just verify the shape includes `city_code`.

### 10c. `withUser` generic type usage

```typescript
const order = await withUser<DbOrder>(req.user.id, async (client) => {
  const result = await client.query<DbOrder>('SELECT ...', [...]);
  return result.rows[0];
});
```

Always pass the expected return type as a generic to `withUser<T>` to avoid `unknown` typed returns leaking into the handler.

---

## 11. Open Questions for Day 10

The following items should be pre-resolved before Day 10 begins. Add answers to `day-10.md`:

1. **`sharp` dependency for EXIF strip (Day 10 §10.1):** Is `sharp` already in `backend/package.json`? If not, installing it on Azure App Service requires a native build step that can fail. Verify `pnpm add sharp` completes without errors in the Azure environment before Day 10 starts. Sharp requires Node.js >= 16 and native binaries for the platform — Azure Linux App Service should support it, but confirm.

2. **`IStorageProvider` for `POST /api/orders/:id/media` (Day 10 §10.1):** Day 10 uses `IStorageProvider.upload()` and `IStorageProvider.getSignedUrl()`. These were stubbed locally in `backend/src/routes/aggregators.ts` on Day 7. Confirm the stub's method signatures match what Day 10 needs. If they diverge, Day 10 will need to reconcile before building the media route.

3. **`orderCreateLimiter` Redis key expiry edge case:** The 3/hour sliding window uses the order creator's user ID as the key. If a seller account is deactivated and then reactivated within the same window, the counter persists. Is this acceptable for MVP? (Suggested answer: yes — irrelevant edge case at pilot scale.)

4. **`GET /api/orders/feed` vs `GET /api/orders` routing conflict:** Day 10 §10.2 adds `GET /api/orders/feed` for aggregators. Day 9 creates `GET /api/orders` for sellers. These routes are on the same router — ensure `router.get('/feed', ...)` is registered BEFORE `router.get('/', ...)` in `orders/index.ts` to prevent Express from matching `/feed` as the `/:id` param. This is a gotcha to document for Day 10 explicitly.

5. **`POST /api/aggregators/heartbeat` (Day 10 §10.2):** Day 10 needs `aggregator_availability` upsert. Confirm the `aggregator_availability` table exists in the live DB and has the expected columns (`user_id`, `is_online`, `last_ping_at`). Check via psql before Day 10 starts.

6. **Expo Push API `to` field format:** Expo push tokens from Day 8 have the format `ExponentPushToken[...]`. When calling the Expo Push API from `POST /api/orders` push dispatch, confirm the token in `device_tokens` table uses this exact format. Tokens stored as raw FCM/APNs format won't work with the Expo Push API endpoint.
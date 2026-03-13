# Day 10 — Agent Context File
## Media + Aggregator + Supporting Routes
> Created: 2026-03-13 | Based on Day 9 execution session

---

## 1. Prior Day Gate Status

**Day 9 gate: PASSED — 2026-03-13**
All 8 gates confirmed green via PowerShell + Azure Portal Query Editor.

You may proceed to Day 10 tasks without any blockers from Day 9.

---

## 2. Resolved Ambiguities — Read Before Writing Any Code

### 2.1 Schema Drifts (TRD naming does NOT match actual DB columns)

These column names in the live DB differ from what TRD describes. Use the DB names below — not TRD names.

| Table | TRD name | Actual DB column | Note |
|---|---|---|---|
| `orders` | `pickup_address_text` | `pickup_address` | Route already uses `pickup_address` — match it |
| `orders` | `pickup_preference` | `preferred_pickup_window` | JSONB object `{type: "morning"}` — NOT a plain string |
| `aggregator_profiles` | `locality` | `operating_area` | `locality` column does not exist on this table |

**Critical JSONB rule:** whenever reading or writing `preferred_pickup_window`, treat it as a JSON object. On INSERT: `JSON.stringify({ type: value })`. On SELECT/response: return as-is (it's already an object from pg).

### 2.2 `aggregator_profiles` columns (confirmed from `information_schema`)

```
user_id
business_name
city_code
operating_area        ← use this, NOT locality
kyc_status
operating_hours
created_at
aggregator_type
```

`PATCH /api/aggregators/profile` allowlist for Day 10 is: `business_name`, `operating_hours`, `operating_area`. Blocklist: `kyc_status`, `city_code`, `user_id`.

### 2.3 `seller_profiles` columns (confirmed from `information_schema`)

```
user_id
profile_type
business_name
gstin
locality             ← sellers DO have locality
city_code
recurring_schedule
```

### 2.4 Auth Middleware — Do NOT change

Day 9 fixed auth. The current implementation in `backend/src/middleware/auth.ts` uses `createClerkClient().verifyToken()` directly from `@clerk/backend`. This is the correct, stable approach.

**Do NOT revert to `clerkMiddleware()` or `requireAuth()` from `@clerk/express`.** Both caused HTTP 302 redirect loops. The direct `verifyToken()` approach is the only one that returns clean 401 JSON.

The auth middleware inner query uses `COALESCE(s.locality, a.operating_area)` — this is correct. Do not change it.

### 2.5 `GET /api/orders/feed` — Route Registration Order is Critical

Express matches routes top-to-bottom. `GET /api/orders/feed` MUST be registered BEFORE `GET /api/orders/:id` in the router file (`backend/src/routes/orders/index.ts`).

If registered after, Express will match `feed` as the `:id` parameter and return a 404 or wrong result.

**Current router file registers:** POST `/`, GET `/`, GET `/:id`, PATCH `/:id/status`, DELETE `/:id`.

When adding `GET /feed` for Day 10, insert it BETWEEN `GET /` and `GET /:id`. Do not append it at the bottom.

### 2.6 `sharp` on Azure App Service

`sharp` is a native binary module. It may fail to install or run on Azure App Service Free tier (Linux). Verify it installs cleanly locally first:

```bash
pnpm add sharp --filter backend
pnpm type-check
```

If `sharp` causes issues on Azure App Service at deployment, the workaround is to strip EXIF using `piexifjs` (pure JS, no native binary) as a fallback. However, try `sharp` first — it is the correct choice per TRD.

**Do NOT skip EXIF stripping.** V18 requires it. If `sharp` fails, find an alternative — do not proceed without it.

### 2.7 `IStorageProvider` — Current Stub State

The `@sortt/storage` package is a stub (not fully implemented — Day 14). For Day 10, the aggregators route already uses a local Uploadthing wrapper at `backend/src/providers/storage.ts` (or similar path — check `structure.md` for exact location).

Use the same local provider pattern for `POST /api/orders/:id/media`. Do not block on `@sortt/storage` package being complete.

The method signatures expected are:
- `upload(buffer: Buffer, filename: string, contentType: string): Promise<{ key: string }>`
- `getSignedUrl(key: string, expirySeconds: number): Promise<string>`

Check `backend/src/routes/aggregators.ts` — it already imports and uses the storage provider. Copy that import pattern exactly.

### 2.8 `current_price_index` — Materialized View

`GET /api/rates` must query the `current_price_index` materialized view, not the `price_index` table directly. The view already exists from Day 5 migrations.

Query: `SELECT * FROM current_price_index WHERE city_code = 'HYD'`

Response must include `Cache-Control: public, max-age=300, stale-while-revalidate=600` and an `ETag` header (V17). ETag can be computed as `etag(JSON.stringify(rows))` — use the `etag` npm package or a simple hash.

`GET /api/rates` is a public route (no auth). It is already in the auth middleware exemption list at `path.startsWith('/api/rates')`. Confirm this before testing.

### 2.9 `messages` table — Check Schema Before Writing Route

The `POST /api/messages` route needs to INSERT to `messages`. Before writing the handler, check the actual table columns:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'messages'
ORDER BY ordinal_position;
```

Run this in Azure Portal → Query editor and confirm column names before writing the INSERT. Do not assume column names from TRD — Day 9 found multiple TRD naming drifts.

### 2.10 `ratings` and `disputes` — Check Schemas

Same applies. Before writing `POST /api/ratings` and `POST /api/disputes`, check columns via `information_schema`. The known drift pattern is: TRD may use different names than what migrations actually created.

### 2.11 Test User State

The current test user in the DB:
- Internal UUID: `ccc9d7ac-59e1-4297-a46f-8f7e854051de`
- Clerk ID: `user_3Ase8EdUd02KVYpWMvICr3Nb2o7`
- Phone: `+917893641009`
- `user_type`: `seller` (updated during Day 9)
- Has no `seller_profile` row yet (profile fields are null in `GET /api/users/me` response)

A second test user also exists from G9.7 testing:
- Phone: `+919390292745`
- `user_type`: unknown (was registered during Day 9 to test 403 on DELETE)

For G10.4 and G10.7 (feed tests), you will need an aggregator account. Either update the second user's `user_type` to `aggregator` or register a new phone number.

---

## 3. Environment Variables Needed Today

All already in `backend/.env` and Azure App Service from prior days:

| Key | Used for |
|---|---|
| `UPLOADTHING_SECRET` | Storage provider upload |
| `UPLOADTHING_APP_ID` | Storage provider |
| `GOOGLE_MAPS_API_KEY` | Geocoding (already working) |
| `META_WHATSAPP_TOKEN` | OTP + scale photo WhatsApp message |
| `META_PHONE_NUMBER_ID` | WhatsApp sender |
| `META_OTP_TEMPLATE_NAME` | OTP template |
| `OTP_HMAC_SECRET` | HMAC for OTP generation |
| `UPSTASH_REDIS_REST_URL` | Rate limiting + OTP storage |
| `UPSTASH_REDIS_REST_TOKEN` | Redis auth |

**New env var for Day 10:** None expected. If `etag` package requires config, add key to `.env.example` first.

Note: `META_WHATSAPP_TOKEN` is currently expired (error seen in Day 9 logs: `Session has expired on Friday, 13-Mar-26 07:00:00 PDT`). The scale-photo OTP WhatsApp send will fail silently (non-fatal) — this is acceptable for dev. The OTP will still print to terminal as `[OTP DEV]` output.

---

## 4. Files Expected to be Touched Today

Based on PLAN.md Day 10 tasks:

**Modified:**
- `backend/src/routes/orders/index.ts` — add `GET /feed` route (insert BEFORE `GET /:id`)
- `backend/src/routes/orders/index.ts` — add `POST /:id/media` route
- `backend/src/routes/orders/index.ts` — add `GET /:id/media/:mediaId/url` route

**New:**
- `backend/src/routes/aggregators.ts` — may already exist from Day 7/8; add `PATCH /profile`, `POST /heartbeat`, `PATCH /rates`
- `backend/src/routes/messages.ts` — new file
- `backend/src/routes/ratings.ts` — new file
- `backend/src/routes/disputes.ts` — new file
- `backend/src/routes/rates.ts` — new file (or may be inline in `index.ts`)

**Modified:**
- `backend/src/index.ts` — mount new routers
- `backend/.env.example` — any new env vars

**Check `structure.md` for exact paths before creating** — `aggregators.ts` may already exist.

---

## 5. Security Rules in Scope for Day 10

| Rule | What it requires |
|---|---|
| **V18** | EXIF strip via `sharp` BEFORE any other processing — before Uploadthing, before Gemini |
| **V21** | `GET /feed` derives all filters server-side. Never accept `city_code`, `radius`, `is_online` from client |
| **V26** | Phone regex on messages: `/(?:\+91\|0)?[6-9]\d{9}/g` → `[phone number removed]`. Applied BEFORE DB insert AND before Ably publish |
| **V35** | `PATCH /aggregators/profile`: blocklist `kyc_status`, `city_code`, `user_id`. Any of these in body → 400 |
| **D1** | Signed URLs: 5-minute expiry only (`getSignedUrl(key, 300)`). Never return permanent URLs |
| **D2** | Push notification bodies: zero PII. Generic copy only |
| **V17** | `GET /api/rates`: `Cache-Control: public, max-age=300, stale-while-revalidate=600` + ETag |
| **V13** | `orders.status='completed'` only via `verify-otp`. `POST /api/disputes` sets `status='disputed'` atomically — that is the only exception path besides `verify-otp` |
| **A1** | All new routes use `authMiddleware` (already global in `index.ts`). `/api/rates` is already exempted |

---

## 6. Known Gotchas — Do Not Repeat These

1. **`a.locality` does not exist.** Use `a.operating_area`. If any new query JOINs on `aggregator_profiles`, use `operating_area`.

2. **`preferred_pickup_window` is JSONB.** Any INSERT or UPDATE must use `JSON.stringify({ type: value })`.

3. **Route order in `orders/index.ts`.** `GET /feed` before `GET /:id`. Non-negotiable.

4. **`sharp` is a native module.** Test it compiles before building the media route logic around it. If it fails to install, escalate immediately — do not silently skip the EXIF strip.

5. **WhatsApp token is expired.** The scale-photo OTP WhatsApp send will log an error. This is non-fatal and acceptable in dev. Do not treat it as a blocker.

6. **Response shape consistency.** Day 9 routes return `{ order: {...} }` (wrapped). New routes should follow the same pattern — check `buildOrderDto` in `backend/src/utils/orderDto.ts` for the DTO wrapper pattern.

7. **`orderCreateLimiter` import.** Already in `backend/src/lib/redis.ts`. For media upload, check if a separate rate limiter is needed or if the existing one covers it.

8. **`pnpm type-check` must exit 0.** Do not declare Day 10 complete without running it from the monorepo root and seeing zero errors.

---

## 7. Gate Verification Commands (PowerShell)

Set these variables first (get fresh JWT each session):

```powershell
$body = @{ phone = "+917893641009" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/auth/request-otp" -ContentType "application/json" -Body $body
# watch terminal for OTP, then:
$body = @{ phone = "+917893641009"; otp = "XXXXXX" } | ConvertTo-Json
$response = Invoke-RestMethod -Method Post -Uri "$base/api/auth/verify-otp" -ContentType "application/json" -Body $body
$jwt = $response.token.jwt
$base = "http://192.168.1.100:8080"
```

**G10.3 — Phone filter in messages:**
```powershell
$msgBody = @{
    order_id = "<any-order-uuid>"
    content = "Call me on 9876543210 after 5pm"
} | ConvertTo-Json
$r = Invoke-RestMethod -Method Post -Uri "$base/api/messages" -ContentType "application/json" -Headers @{ Authorization = "Bearer $jwt" } -Body $msgBody
Write-Host "G10.3: $($r.content) — $(if ($r.content -like '*[phone number removed]*') {'PASS'} else {'FAIL'})"
```

**G10.4 — Feed ignores client city_code:**
```powershell
# Needs aggregator JWT — see §2.11 above
$r = Invoke-RestMethod -Method Get -Uri "$base/api/orders/feed?city_code=BLR" -Headers @{ Authorization = "Bearer $aggJwt" }
# All returned orders should have city_code = HYD (aggregator's real city), not BLR
```

**G10.5 — kyc_status blocklisted:**
```powershell
try {
    Invoke-RestMethod -Method Patch -Uri "$base/api/aggregators/profile" -ContentType "application/json" -Headers @{ Authorization = "Bearer $aggJwt" } -Body '{"kyc_status":"verified"}'
    Write-Host "G10.5: FAIL — expected 400"
} catch {
    $code = $_.Exception.Response.StatusCode.value__
    Write-Host "G10.5: HTTP $code — $(if ($code -eq 400) {'PASS'} else {'FAIL'})"
}
```

**G10.6 — Cache-Control on rates:**
```powershell
$headers = (Invoke-WebRequest -Uri "$base/api/rates").Headers
Write-Host "G10.6: Cache-Control = $($headers['Cache-Control']) — $(if ($headers['Cache-Control'] -like '*max-age=300*') {'PASS'} else {'FAIL'})"
```

**G10.8 — disputes sets status atomically:**
```powershell
$disputeBody = @{ order_id = "<order-uuid>"; reason = "Weight mismatch" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "$base/api/disputes" -ContentType "application/json" -Headers @{ Authorization = "Bearer $jwt" } -Body $disputeBody
# Then check DB:
# SELECT status FROM orders WHERE id = '<order-uuid>';
# Expected: 'disputed'
```

---

## 8. Open Questions for Day 10 Agent to Resolve Before Executing

Before writing any code, the agent must answer these by checking the live DB:

1. What are the actual columns of the `messages` table?
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'messages' ORDER BY ordinal_position;
   ```

2. What are the actual columns of the `ratings` table?
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'ratings' ORDER BY ordinal_position;
   ```

3. What are the actual columns of the `disputes` table?
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'disputes' ORDER BY ordinal_position;
   ```

4. What are the actual columns of `order_media`?
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'order_media' ORDER BY ordinal_position;
   ```

5. Does `aggregator_availability` have the expected columns `user_id`, `is_online`, `last_ping_at`?
   ```sql
   SELECT column_name FROM information_schema.columns WHERE table_name = 'aggregator_availability' ORDER BY ordinal_position;
   ```

6. Does `aggregators.ts` already exist in `backend/src/routes/`? Check `structure.md` — if it does, inspect its contents before adding routes to avoid duplication.

**Run all 6 schema checks BEFORE writing a single route.** This is mandatory — Day 9 lost significant time to schema drift discovered at runtime.

---

## 9. Sub-Agent Split Recommendation

Day 10 has three distinct domains that can be split cleanly:

| Sub-agent | Scope | Depends on |
|---|---|---|
| **Sub-agent A: Media** | `POST /api/orders/:id/media`, `GET /api/orders/:id/media/:mediaId/url`, `sharp` EXIF strip, Uploadthing upload | None |
| **Sub-agent B: Aggregator** | `GET /api/orders/feed`, `PATCH /api/aggregators/profile`, `POST /api/aggregators/heartbeat`, `PATCH /api/aggregators/rates` | Sub-agent A (for route registration order in orders/index.ts) |
| **Sub-agent C: Supporting** | `GET /api/rates`, `POST /api/messages`, `POST /api/ratings`, `POST /api/disputes` | Sub-agent A complete (for DB schema checks Sub-agent A should run first) |

Sub-agent A must confirm `GET /feed` is registered before `GET /:id` when it touches `orders/index.ts`.

Sub-agents B and C can run in parallel once A completes, as they touch different files.
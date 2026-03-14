# Day 11 — Agent Context File
## Wire Mobile Screens to Live API (Both Sides)

> Created: 2026-03-13 | Based on Day 10 execution session.
> Place this file at `/agent/day-context/day-11.md`.
> This file supplements PLAN.md §11. It does NOT override MEMORY.md or PLAN.md.

---

## 1. State of the Codebase at Day 11 Start

### What is already built and working

- **All mobile UI screens** (Days 1–3): fully built, static mock data. All screens exist and render correctly.
- **Full DB schema** (Days 4–5): Azure PostgreSQL with migrations 0001–0017 applied. RLS active. All tables live.
- **Express backend** (Days 6–10): deployed on Azure App Service. All API routes are live and gate-tested:
  - `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`
  - `GET /api/users/me`, `POST /api/users/profile`, `PATCH /api/users/profile`
  - `POST /api/orders`, `GET /api/orders`, `GET /api/orders/:id`
  - `PATCH /api/orders/:id/status`, `DELETE /api/orders/:id`
  - `GET /api/orders/feed` (aggregator, server-filtered)
  - `POST /api/orders/:id/media`, `GET /api/orders/:id/media/:mediaId/url`
  - `PATCH /api/aggregators/profile`, `POST /api/aggregators/heartbeat`, `PATCH /api/aggregators/rates`
  - `GET /api/rates` (public, cached)
  - `POST /api/messages`, `POST /api/ratings`, `POST /api/disputes`
- **Mobile auth wiring** (Day 8):
  - `apps/mobile/lib/clerk.ts` — Clerk Expo initialisation.
  - `apps/mobile/lib/api.ts` — Axios wrapper with JWT attach + 401 interceptor.
  - Auth screens wired to real backend.
  - `ClerkProvider` in root `_layout.tsx`.

### What Day 11 must do

Replace every mock data call in mobile screens with real `api.ts` calls. The store must remain as a cache layer — do not remove Zustand stores. Wire API calls INTO store actions. Add loading states (skeleton), error states (inline banner + Retry), and empty states to every screen.

### What does NOT exist yet (Day 11 must create or wire)

- Seller screens (`home.tsx`, `orders.tsx`, `listing/step4.tsx`, `profile.tsx`, `browse.tsx`) are static. No `api.ts` calls.
- Aggregator screens (`home.tsx`, `orders.tsx`, `profile.tsx`, `edit-profile.tsx`) are static. No `api.ts` calls.
- `POST /api/aggregators/heartbeat` is never called from mobile — `setInterval` logic missing.
- Online/Offline toggle is UI-only — no backend sync.
- `GET /api/orders?role=aggregator` — this query param routing does not exist on the backend. See §2.2.

---

## 2. Resolved Ambiguities — Read Before Writing Any Code

### 2.1 API response shapes (confirmed from Day 9/10 gates)

| Endpoint | Response shape |
|---|---|
| `POST /api/orders` | `{ order: { id, status, city_code, pickup_address (null for non-owner), ... } }` |
| `GET /api/orders` | `{ orders: [...], nextCursor, hasMore }` |
| `GET /api/orders/:id` | flat order object (DTO, not wrapped) |
| `GET /api/orders/feed` | `{ orders: [...], nextCursor, hasMore }` |
| `GET /api/users/me` | flat user object — no `phone_hash`, no `clerk_user_id` |
| `GET /api/rates` | `{ rates: [{ city_code, material_code, rate_per_kg, scraped_at }], cached_at }` |
| `POST /api/messages` | `{ messageId, content, createdAt }` |
| `POST /api/disputes` | `{ disputeId, createdAt }` |
| `POST /api/aggregators/heartbeat` | `{ success: true }` |
| `PATCH /api/aggregators/profile` | updated profile row |
| `PATCH /api/aggregators/rates` | updated rates array |

### 2.2 `GET /api/orders` — single endpoint, role-based filtering

The backend `GET /api/orders` currently only returns orders where `seller_id = req.user.id`. There is NO `?role=aggregator` server-side filter yet.

**For Day 11, the aggregator "My Orders" tab needs orders where `aggregator_id = req.user.id`.** Before writing mobile code for this, the agent must check if the backend already supports this via a query param. If not, a one-line backend fix is needed first:

```typescript
// backend/src/routes/orders/index.ts — GET /
// Check if role=aggregator param is present:
const role = req.query.role;
if (role === 'aggregator') {
  // Return orders where aggregator_id = req.user.id
  result = await query(`SELECT * FROM orders WHERE aggregator_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit + 1]);
} else {
  // Default: seller's own orders
  result = await query(`SELECT * FROM orders WHERE seller_id = $1 ORDER BY created_at DESC LIMIT $2`, [userId, limit + 1]);
}
```

**The agent must check the current state of `GET /api/orders` in `backend/src/routes/orders/index.ts` before writing mobile code. If the `role=aggregator` filter is absent, add it as the first action of the day.**

### 2.3 `pickup_address_text` vs `pickup_address` — use `pickup_address` everywhere

The DB column and API response field is `pickup_address` (not `pickup_address_text` as stated in TRD).
When mobile code reads the address field: `order.pickup_address` — not `order.pickup_address_text`.
The DTO nulls this for non-owners. No change needed to that logic.

### 2.4 Clerk token retrieval on mobile — do NOT cache in Zustand

From MEMORY.md §9 (2026-03-11):
> Do not cache the Clerk token persistently in `authStore.clerkToken` across app reloads.
> Always retrieve dynamically: `await clerk.session?.getToken()` on every authenticated request.

The existing `api.ts` interceptor already does this correctly from Day 8. Do not change `api.ts`. All API calls go through this interceptor — screens never call `clerk.session?.getToken()` directly.

### 2.5 Heartbeat implementation pattern

`POST /api/aggregators/heartbeat` must be called every 2 minutes when the app is in the foreground. The correct pattern:

```typescript
// In aggregator home.tsx or a shared hook
import { AppState, AppStateStatus } from 'react-native';

useEffect(() => {
  const sendHeartbeat = async () => {
    try { await api.post('/api/aggregators/heartbeat'); } catch {} // non-fatal
  };

  sendHeartbeat(); // immediate on mount
  const interval = setInterval(sendHeartbeat, 120_000); // every 2 min

  const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
    if (state === 'background' || state === 'inactive') {
      clearInterval(interval);
      // One final offline ping
      api.post('/api/aggregators/heartbeat', { is_online: false }).catch(() => {});
    }
  });

  return () => {
    clearInterval(interval);
    subscription.remove();
  };
}, []);
```

> ⚠️ Note: The backend `POST /api/aggregators/heartbeat` currently always sets `is_online = true`. The offline toggle (sending `is_online: false`) requires a backend change to accept this from the body. Check the current `heartbeat` handler before implementing the offline toggle. If `is_online` is hardcoded to `true` on the backend, add `is_online` as an optional body field.

### 2.6 Store wiring pattern — do not remove stores

PLAN.md §11 rule: "Keep store as cache layer — don't remove the store, wire the API call into the store action."

Pattern to follow:

```typescript
// In the store action (e.g. orderStore.ts)
fetchOrders: async () => {
  set({ isLoading: true, error: null });
  try {
    const res = await api.get('/api/orders');
    set({ orders: res.data.orders, isLoading: false });
  } catch (e: any) {
    set({ error: e.message || 'Failed to load orders', isLoading: false });
  }
}

// In the screen
const { orders, isLoading, error, fetchOrders } = useOrderStore();
useFocusEffect(useCallback(() => { fetchOrders(); }, []));
```

Never call `api.get()` directly inside a screen component. API calls belong in store actions.

### 2.7 Error banner pattern — inline, not crash

Every screen must show an inline error banner (not a crash, not a modal) on API failure:

```tsx
{error && (
  <View style={styles.errorBanner}>
    <Text style={styles.errorText}>{error}</Text>
    <Pressable onPress={retryFn}>
      <Text style={styles.retryText}>Retry</Text>
    </Pressable>
  </View>
)}
```

Background: `colors.red` light tint (`colorExtended.redLight`). Text: `colors.red`.
Border: `1px colors.red`. The "Retry" CTA calls the same store action again.

### 2.8 Loading skeleton pattern

Use the existing `SkeletonLoader` component from `components/ui/SkeletonLoader.tsx`.
Show skeleton while `isLoading === true` and data is empty. Once data arrives, replace with content.
Never show spinner — MEMORY.md §2 prohibits spinners. Flat grey rectangles only.

### 2.9 `GET /api/orders/feed` — aggregator feed, no `pickup_address`

The feed DTO already nulls `pickup_address` for pre-acceptance. Mobile feed cards must never display an address field. Any UI element showing address on feed cards (from the static mock) must be removed or conditionally hidden.

### 2.10 `GET /api/rates` — `scraped_at` field

The rates response includes `scraped_at` (timestamp from the materialized view).
The "Refreshed X min ago" label on the Market Rates screen must use this field:

```typescript
const minutesAgo = Math.floor((Date.now() - new Date(rate.scraped_at).getTime()) / 60_000);
label = `Refreshed ${minutesAgo} min ago`;
```

### 2.11 Geocoding failure on listing wizard

If `POST /api/orders` returns HTTP 422 with `{ error: 'geocode_failed' }` or `{ error: 'unsupported_city' }`, the listing wizard step4 must show:
`"We couldn't find that address — please check and try again."`
Do not crash. Do not navigate away. Show inline on the address field.

---

## 3. Confirmed Schema — Actual DB Column Names

These were confirmed during Day 9/10. Use these — not TRD names.

| Table | TRD name | Actual DB column |
|---|---|---|
| `orders` | `pickup_address_text` | `pickup_address` |
| `orders` | `pickup_preference` | `preferred_pickup_window` (JSONB: `{ type: "morning" }`) |
| `aggregator_profiles` | `locality` | `operating_area` |
| `messages` | — | `id, order_id, sender_id, content, read_at, created_at` |
| `ratings` | — | `id, order_id, rater_id, ratee_id, score, review, created_at` |
| `disputes` | — | `id, order_id, order_item_id, raised_by, issue_type, description, status, resolution_note, created_at, resolved_at` |
| `order_media` | — | `id, order_id, media_type, storage_path, uploaded_by, created_at` |
| `aggregator_availability` | — | `user_id, is_online, last_ping_at` (no `city_code`) |
| `aggregator_material_rates` | — | `id, aggregator_id, material_code, rate_per_kg, updated_at` |

**`disputes.issue_type` CHECK constraint** (confirmed): `wrong_weight`, `payment_not_made`, `no_show`, `abusive_behaviour`, `other`. Do NOT use `weight_mismatch`.

**`order_media.media_type` CHECK constraint** (confirmed): `scrap_photo`, `scale_photo`, `kyc_aadhaar_front`, `kyc_aadhaar_back`, `kyc_selfie`, `kyc_shop`, `kyc_vehicle`, `invoice`. Do NOT use `before_photo` or `after_photo`.

---

## 4. Environment Variables

All already in `apps/mobile/.env` from Day 8. No new variables expected today.

| Key | Used for |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base URL for `api.ts` — already wired |
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk Expo init — already wired |

> If `EXPO_PUBLIC_API_URL` points to `localhost:8080`, testing on a physical device will fail (device can't reach your laptop's localhost). Use your laptop's local network IP (e.g., `http://192.168.1.100:8080`) for device testing. This is already set from Day 8/9 testing.

---

## 5. Files Expected to be Touched Today

### Mobile screens — wiring (not redesign)

| File | What changes |
|---|---|
| `apps/mobile/app/(seller)/home.tsx` | Wire `GET /api/rates` for rate ticker. Wire `GET /api/orders` for active order count. |
| `apps/mobile/app/(seller)/orders.tsx` | Wire `GET /api/orders` (seller list). Loading + empty + error states. Cancel via `DELETE /api/orders/:id`. |
| `apps/mobile/app/(seller)/listing/step4.tsx` | Wire `POST /api/orders` on submit. Handle geocode errors. Show real order ID on success. |
| `apps/mobile/app/(seller)/browse.tsx` | Wire `GET /api/rates`. Show `scraped_at` refresh label. |
| `apps/mobile/app/(seller)/profile.tsx` | Wire `GET /api/users/me`. Show real name, locality, account type. |
| `apps/mobile/app/(aggregator)/home.tsx` | Wire `GET /api/orders/feed`. Add heartbeat `setInterval`. |
| `apps/mobile/app/(aggregator)/orders.tsx` | Wire `GET /api/orders?role=aggregator`. Filter by status tabs. |
| `apps/mobile/app/(aggregator)/edit-profile.tsx` | Wire `PATCH /api/aggregators/profile` + `PATCH /api/aggregators/rates`. |
| `apps/mobile/app/(aggregator)/profile.tsx` | Wire `GET /api/users/me`. |
| `apps/mobile/app/(shared)/order/[id].tsx` | Wire `GET /api/orders/:id`. Enforce address reveal logic on mobile side. |

### Stores — add API-wired actions

| File | What changes |
|---|---|
| `apps/mobile/store/orderStore.ts` | Add `fetchOrders()`, `fetchOrder(id)`, `cancelOrder(id)`, `createOrder(body)` actions. |
| `apps/mobile/store/aggregatorStore.ts` | Add `fetchFeed()`, `fetchAggregatorOrders()`, `updateProfile()`, `updateRates()` actions. |
| `apps/mobile/store/authStore.ts` | Add `fetchMe()` action wired to `GET /api/users/me`. |

### Backend — one potential fix

| File | What changes (conditional) |
|---|---|
| `backend/src/routes/orders/index.ts` | Add `?role=aggregator` filter to `GET /api/orders` if not already present. Check before touching. |
| `backend/src/routes/aggregators.ts` | Make `is_online` field optional in heartbeat body if not already. |

**Check `structure.md` for exact paths before creating any file.**

---

## 6. Security Rules in Scope for Day 11

| Rule | What it requires in Day 11 context |
|---|---|
| **V24** | `phone_hash` and `clerk_user_id` must never be rendered in any mobile UI. Even if the API response ever accidentally includes them, the mobile DTO layer must ignore/strip them. |
| **V25** | `pickup_address` must only be shown in UI when it is non-null in the API response. Never show a placeholder address. If null → show "Address revealed after acceptance." |
| **D2** | Any push notification tokens stored in `device_tokens` — if Day 11 adds push token registration, the token must go to `POST /api/users/device-token` (Day 8 route), not stored in client-side state. |
| **C1** | Ably subscriptions: not wired yet (Day 13). Do not add any Ably calls in Day 11. Leave `// TODO Day 13` comments where realtime updates will eventually go. |
| **A1** | All `api.ts` calls go through the Axios interceptor which attaches the Clerk JWT. Never manually attach tokens in screens. |

---

## 7. Known Gotchas — Do Not Repeat These

1. **`pickup_address_text` does not exist in API responses.** The field is `pickup_address`. Any mobile code referencing `order.pickup_address_text` will always be `undefined`.

2. **`req.user.city_code` is populated by the auth middleware** (confirmed from Day 10 plan). However on mobile, city_code is never sent by the client — it is always server-derived. Never include `city_code` in request bodies from mobile.

3. **`preferred_pickup_window` is JSONB.** If mobile needs to display pickup preference, read `order.preferred_pickup_window.type` (it's an object `{ type: "morning" }`), not a plain string.

4. **`verify-otp` response shape:** `response.token.jwt` — not `response.token`. This is already handled in `api.ts` from Day 8. Do not change it.

5. **`GET /api/orders` pagination:** The response includes `nextCursor` (a timestamp) and `hasMore`. Mobile list screens should implement basic cursor pagination if the order list is long, but for MVP a single page of 20 is acceptable.

6. **`aggregator_material_rates` uses `aggregator_id`** (not `user_id`) as the FK. When displaying rates on the aggregator profile, the mobile code does not need to know this — rates come back from `PATCH /api/aggregators/rates` as an array. No raw DB interaction from mobile.

7. **Do not use `<Modal>` from react-native.** Per MEMORY.md §9 (2026-02-28), it causes crashes on Expo SDK 54+ New Architecture. Use absolutely positioned `<View>` with `StyleSheet.absoluteFill` for any overlay/sheet.

8. **Back navigation must always use `safeBack(fallbackRoute)`** from `utils/navigation.tsx`. Never write raw `router.canGoBack()` checks.

9. **`AnimatedView` inside `Svg` is prohibited.** Do not use it anywhere. Causes Android bridge crash. (MEMORY.md §9, 2026-02-26)

10. **`pnpm type-check` must exit 0.** Run from monorepo root before declaring Day 11 complete. Mobile TypeScript errors from wiring (e.g. untyped API response fields) must be fixed before completion.

---

## 8. Screen-by-Screen Wiring Guide

### 8.1 Seller: Listing Wizard → `POST /api/orders`

**File:** `apps/mobile/app/(seller)/listing/step4.tsx`

On "Post Listing" CTA press:
1. Call `orderStore.createOrder(body)` which calls `api.post('/api/orders', { ... })`.
2. Request body:
   ```typescript
   {
     material_codes: listingStore.selectedMaterials,   // string[]
     estimated_weights: listingStore.estimatedWeights, // Record<string, number>
     pickup_address_text: listingStore.address,        // string — backend maps to pickup_address
     pickup_preference: listingStore.pickupWindow,     // 'morning' | 'afternoon' | 'evening' | 'anytime'
     seller_note: listingStore.note,                   // string | undefined
   }
   ```
3. On 201 success: show real `order.id` (DM Mono font) on confirmation screen. Clear `listingStore`.
4. On 422 `geocode_failed`: show inline error on address field — "We couldn't find that address — please check and try again." Do not navigate.
5. On 422 `unsupported_city`: show — "Pickups are currently only available in Hyderabad."
6. On 429: show — "You've posted too many listings. Please wait an hour before posting again."

### 8.2 Seller: Orders List → `GET /api/orders`

**File:** `apps/mobile/app/(seller)/orders.tsx`

- On screen focus: call `orderStore.fetchOrders()`.
- Show `SkeletonLoader` while `isLoading`.
- Show `EmptyState` (icon + "No active orders yet" + CTA to listing wizard) when `orders.length === 0` and not loading.
- Show inline error banner with Retry on error.
- Cancel button on Active order card: call `orderStore.cancelOrder(id)` → `DELETE /api/orders/:id`. On success: remove from list.

### 8.3 Seller: Order Detail → `GET /api/orders/:id`

**File:** `apps/mobile/app/(shared)/order/[id].tsx`

- On mount: call `orderStore.fetchOrder(id)`.
- Address reveal: if `order.pickup_address` is `null` → show amber lock card "Address revealed after pickup is confirmed."
- If `order.pickup_address` is populated → show full address (post-acceptance).
- Status chip uses existing `StatusChip` component — pass `order.status`.

### 8.4 Seller: Market Rates → `GET /api/rates`

**Files:** `apps/mobile/app/(seller)/home.tsx` and `apps/mobile/app/(seller)/browse.tsx`

- Call `api.get('/api/rates')` on screen focus.
- Display `rate.rate_per_kg` in `DM Mono` amber font.
- "Refreshed X min ago" label: `Math.floor((Date.now() - new Date(rates[0]?.scraped_at).getTime()) / 60_000)`.

### 8.5 Seller: Profile → `GET /api/users/me`

**File:** `apps/mobile/app/(seller)/profile.tsx`

- On mount: call `authStore.fetchMe()` → `GET /api/users/me`.
- Display real `name`, `locality`, `user_type`.
- Never display `phone_hash` or `clerk_user_id` even if present in response.

### 8.6 Aggregator: Feed → `GET /api/orders/feed`

**File:** `apps/mobile/app/(aggregator)/home.tsx`

- On screen focus: call `aggregatorStore.fetchFeed()` → `GET /api/orders/feed`.
- Feed cards must NEVER show address (it's null server-side pre-acceptance — confirm in raw response).
- Show locality only (from `order.pickup_locality` field).
- Heartbeat: start `setInterval` on mount, stop on `AppState.background`. See §2.5.
- Online/Offline toggle: when toggled offline, call `api.post('/api/aggregators/heartbeat', { is_online: false })` then clear the interval.

### 8.7 Aggregator: My Orders → `GET /api/orders?role=aggregator`

**File:** `apps/mobile/app/(aggregator)/orders.tsx`

- Call `aggregatorStore.fetchAggregatorOrders()` → `GET /api/orders?role=aggregator`.
- Filter locally by status for tabs: Active (en_route, weighing_in_progress, accepted), Completed (completed), Cancelled (cancelled).
- Empty state per tab.

### 8.8 Aggregator: Edit Profile → `PATCH /api/aggregators/profile` + `PATCH /api/aggregators/rates`

**File:** `apps/mobile/app/(aggregator)/edit-profile.tsx`

- Profile save: `api.patch('/api/aggregators/profile', { business_name, operating_area, operating_hours })`.
  - Never send `kyc_status`, `city_code`, or `user_id` — the backend will 400 on these.
- Rates save: `api.patch('/api/aggregators/rates', [{ material_code, buy_rate }])`.

---

## 9. Verification Gate Quick Reference

| Gate | What to test | Method |
|---|---|---|
| **G11.1** | Seller creates listing on Device A → appears in aggregator feed on Device B within 5s | Two devices or two simulators, manual refresh on feed |
| **G11.2** | Aggregator feed card: `pickup_address` absent from rendered UI AND raw API response | Inspect `api.ts` response log + visual check |
| **G11.3** | Market rates screen shows real data from `current_price_index` view | Visual check — rates must match DB values |
| **G11.4** | Aggregator goes offline (toggle) → `is_online=false` in DB within 10s | Toggle in app, then `SELECT is_online FROM aggregator_availability WHERE user_id = '...'` in Azure Portal |
| **G11.5** | Kill network mid-request → inline error banner appears. Restore + Retry → succeeds | Airplane mode test on device |
| **G11.6** | `pnpm type-check` exits 0 across all packages | `pnpm type-check` from monorepo root |

**G11.4 PowerShell check:**
```powershell
# After toggling offline in the app, wait 10s then:
# In Azure Portal Query Editor:
# SELECT user_id, is_online, last_ping_at FROM aggregator_availability WHERE user_id = 'a613f713-85a0-4862-b9f4-fa3809c60195';
# Expected: is_online = false
```

**G11.1 test setup:**
- Seller phone: `+917893641009` (user `ccc9d7ac-59e1-4297-a46f-8f7e854051de`, type `seller`)
- Aggregator phone: `+919390292745` (user `a613f713-85a0-4862-b9f4-fa3809c60195`, type `aggregator`, city `HYD`)
- Aggregator must have at least one rate in `aggregator_material_rates` matching the seller's material — or the order won't appear in feed (G10.7 confirmed this).
- Add a rate first: `PATCH /api/aggregators/rates` with a valid `material_code` before running G11.1.

---

## 10. Sub-Agent Split Recommendation

Day 11 splits cleanly into three domains:

| Sub-agent | Scope | Depends on |
|---|---|---|
| **Sub-agent A: Backend fix** | Check + fix `GET /api/orders?role=aggregator` filter. Check + fix heartbeat `is_online` body param. | None — runs first. |
| **Sub-agent B: Seller wiring** | `home.tsx`, `orders.tsx`, `listing/step4.tsx`, `browse.tsx`, `profile.tsx`, `orderStore.ts`, `authStore.ts` | Sub-agent A complete |
| **Sub-agent C: Aggregator wiring** | `(aggregator)/home.tsx`, `orders.tsx`, `edit-profile.tsx`, `profile.tsx`, `aggregatorStore.ts`, `(shared)/order/[id].tsx` | Sub-agent A complete |

Sub-agents B and C can run in parallel once A confirms the backend fixes are in place.

---

## 11. Open Questions for Day 12

Before Day 12 (Atomic Ops — Accept + OTP Verify) begins, resolve these:

1. **`POST /api/orders/:id/accept` does not exist yet.** Day 12 creates it. Confirm the existing `orderStateMachine.ts` `ALLOWED_TRANSITIONS` includes `'created' → 'accepted'`. If not, it must be added on Day 12 (not Day 11).

2. **`FOR UPDATE SKIP LOCKED` requires its own dedicated `pool.connect()` call** — it cannot use the `withUser()` helper because `withUser()` uses `SET LOCAL` which requires the transaction to be fully within one connection. Day 12 agent must get a raw pool connection, not use `withUser()` for the accept route.

3. **OTP for verify-otp route (Day 12):** The `POST /api/orders/:id/media` with `media_type='scale_photo'` already generates an OTP and stores its HMAC in Redis at `otp:order:{orderId}`. Day 12's `verify-otp` route reads from the same key. Confirm the Redis key naming is consistent: `otp:order:{orderId}` in both places.

4. **`old_status` column in `order_status_history`:** Day 12's accept route INSERT example in PLAN.md includes `old_status`. Confirm this column exists: `SELECT column_name FROM information_schema.columns WHERE table_name = 'order_status_history'`. Day 9/10 only inserted `new_status`, `changed_by`, `note`. Run this check before Day 12 starts.

5. **Aggregator rates for G11.1:** Before running G11.1, the test aggregator (`a613f713-85a0-4862-b9f4-fa3809c60195`) needs at least one entry in `aggregator_material_rates`. Either add via `PATCH /api/aggregators/rates` or directly in DB. Document which material code was added so Day 12 tests use the same material.

6. **`snapshotHmac` in verify-otp (PLAN.md §12.2, step 8):** This field is mentioned but not yet explained in any context file. Day 12 agent should clarify what data this HMAC binds to (weight snapshot?) before implementing. Flag for resolution at the start of Day 12.
# Day 13 — Agent Context File
## Ably Realtime + Push Notifications

> Created: 2026-03-17 | Based on Day 12 execution session.
> Place this file at `/agent/day-context/day-13.md`.
> This file supplements PLAN.md §13. It does NOT override MEMORY.md or PLAN.md.

---

## 1. State of the Codebase at Day 13 Start

### What is already built and working

- **Full atomic order lifecycle confirmed end-to-end on physical devices** (Day 12
  complete): created → accepted → en_route → arrived → weighing_in_progress →
  completed. All status transitions hit the backend and write to DB correctly.
- **`POST /api/orders/:orderId/accept`** — first-accept-wins with
  `FOR UPDATE SKIP LOCKED`. Returns full post-acceptance DTO including
  `pickup_address` (V25). Clerk phone fetch runs via `setImmediate` after COMMIT.
- **`POST /api/orders/:orderId/verify-otp`** — HMAC timing-safe compare, Redis DEL
  post-COMMIT (V-OTP-1), sets `status = 'completed'` (only path — V13).
- **`PATCH /api/orders/:id/status`** — handles `en_route`, `arrived`,
  `weighing_in_progress` transitions. `completed` is blocked with 400 (V13).
- **`orderStateMachine.ts`** — confirmed correct with `arrived` status added:
  ```
  created → accepted
  accepted → en_route, cancelled
  en_route → arrived, cancelled
  arrived → weighing_in_progress
  weighing_in_progress → completed
  ```
- **Mobile execution flow fully wired**: `navigate.tsx`, `weighing/[id].tsx` call
  real PATCH and POST routes. `aggregatorStore.ts` has `updateOrderStatus()` shared
  action.
- **`TODO Day 13` comments** are placed in the codebase at the exact lines where
  Ably publish calls belong. Find them with:
  ```bash
  grep -rn "TODO Day 13" backend/src/
  ```
  Expected hits: accept route (after COMMIT), PATCH status route (after each
  successful transition), verify-otp route (after COMMIT), messages route.

### What Day 13 must create (does NOT exist yet)

- Ably SDK installed in `apps/mobile/` and `backend/`
- `realtimeProvider.publish()` calls wired to the `// TODO Day 13` comment
  locations in `backend/src/routes/orders/index.ts` and
  `backend/src/routes/messages.ts`
- `chatChannelToken` field added to `buildOrderDto` response
- `useOrderChannel(orderId)` hook in mobile
- `useAggregatorFeedChannel()` hook in mobile
- `AppState` cleanup in `apps/mobile/app/_layout.tsx`
- `backend/src/utils/pushNotifications.ts` — new file
- Push triggers wired in order routes

### What does NOT need to be created (already exists or is out of scope)

- `PATCH /api/orders/:id/status` — do NOT refactor this route
- `POST /api/orders/:id/media` — do NOT change this route
- `POST /api/orders/:orderId/verify-otp` — do NOT change this route
- Provider abstraction packages — that is Day 14. Today use Ably SDK directly.
  **Note:** Day 14 will migrate all direct Ably calls behind `IRealtimeProvider`.
  Write today's Ably calls in a way that is easy to extract — no inline SDK
  calls scattered across business logic. All Ably calls should go through a
  thin wrapper module `backend/src/lib/realtime.ts` and
  `apps/mobile/lib/realtime.ts` so Day 14's extraction is surgical.
- `snapshotHmac` validation in verify-otp — still deferred (was Day 13 originally,
  now confirmed Day 14+). The `// TODO Day 13` comment for this is in verify-otp.
  Leave it — do not implement today.

---

## 2. Resolved Ambiguities — Read Before Writing Any Code

### 2.1 Ably channel secret — use OTP_HMAC_SECRET

From day-12.md §9.1 (open question):
> "Confirm `OTP_HMAC_SECRET` is the right secret to use for channel HMAC
> suffix, or if a dedicated `ABLY_CHANNEL_SECRET` should be added."

**Decision for Day 13:** Use `OTP_HMAC_SECRET` for channel HMAC suffix
generation. This avoids adding a new env var for the MVP. The channel suffix
is not a security primitive on its own — it is an obfuscation layer that
prevents channel name enumeration (V32). `OTP_HMAC_SECRET` is already in
`backend/.env` and is the correct shared secret to use.

Channel suffix formula (confirmed from PLAN.md §13):
```typescript
import crypto from 'crypto';
const hmacSuffix = crypto
  .createHmac('sha256', process.env.OTP_HMAC_SECRET!)
  .update(orderId + userId)
  .digest('hex')
  .slice(0, 8);
```

### 2.2 `chatChannelToken` missing from buildOrderDto — add it today

From day-12.md §9.2:
> "Day 13 requires returning `chatChannelToken` in the order detail API
> response so the mobile can subscribe to the correct private channel.
> This field is not in `buildOrderDto` yet. Day 13 agent must add it."

**What to do:** Open `backend/src/utils/orderDto.ts`. Add `chatChannelToken`
to the DTO output. The value is computed as:
```typescript
const chatChannelToken = crypto
  .createHmac('sha256', process.env.OTP_HMAC_SECRET!)
  .update(order.id + requestingUserId)
  .digest('hex')
  .slice(0, 8);
```

Return it as `chatChannelToken` in the DTO for all order detail responses
where the requesting user is a party to the order (seller or aggregator).
This field must NOT appear for admin or third-party viewers.

Also add `chatChannelToken: string | null` to the `Order` TypeScript
interface in `apps/mobile/store/orderStore.ts` (or wherever the Order type
is defined).

### 2.3 Ably key type for mobile client

From day-12.md §9.3:
> "Confirm which Ably key type is appropriate for the mobile client."

**Decision for Day 13:** Use a **subscribe-only** Ably key for the mobile
client, NOT the full API key. In the Ably dashboard, create a key with
only `subscribe` capability. The full publish key stays server-side only.

- Mobile env var: `EXPO_PUBLIC_ABLY_KEY` — subscribe-only key
- Backend env var: `ABLY_API_KEY` — full publish key

**Hard rule:** `ABLY_API_KEY` (full key) must NEVER appear in any mobile
bundle. Only `EXPO_PUBLIC_ABLY_KEY` goes to the mobile.

Both must be added to `.env.example` first before any actual values are set.

### 2.4 `expo_token` column name — confirmed

From day-12.md §9.4:
> "Confirm the route correctly uses `expo_token` column (not `device_token`)."

**Status:** Confirmed from MEMORY.md — the column is `expo_token` in the
`device_tokens` table. The `POST /api/users/device-token` route was noted as
a known bug in MEMORY.md (may still use `device_token`). The agent must grep
before writing any push notification code:

```bash
grep -n "device_token\|expo_token" backend/src/routes/users.ts
```

If `device_token` is found: fix it to `expo_token` as a pre-flight correction
before building `pushNotifications.ts`. The correct column name is `expo_token`.

### 2.5 `snapshotHmac` for verify-otp — still deferred

From day-12.md §9.5:
> "Day 13 agent should clarify what data this HMAC binds to."

**Decision:** Still deferred beyond Day 13. The `// TODO Day 13` comment in
verify-otp marks the location. Do not implement snapshotHmac validation today.
Leave the comment as `// TODO Day 14+: validate snapshotHmac binding`.

### 2.6 `removeAllChannels()` on IRealtimeProvider — must be defined today

From day-12.md §9.6:
> "Confirm that `IRealtimeProvider` interface already has `removeAllChannels()`
> defined in `packages/realtime/` — or note it needs to be added on Day 13."

**Status:** `packages/realtime/` does not yet have a formal interface (that is
Day 14). For Day 13, implement `removeAllChannels()` directly on the thin
wrapper `apps/mobile/lib/realtime.ts`. Day 14 will extract it into the
`IRealtimeProvider` interface. Today's wrapper must have this method so the
`AppState` background cleanup can call it.

### 2.7 `old_status` in order_status_history — still NULL (carry-forward fix)

From Day 12 execution: all `order_status_history` rows have `old_status = NULL`
because the INSERT statements do not populate it. This must be fixed before
Day 13 closes. It is not a Day 13 gate item but it affects admin visibility
and dispute resolution in later days.

**Pre-flight fix required:** Before any Day 13 work begins, grep all INSERTs
into `order_status_history` in `backend/src/routes/orders/index.ts` and
confirm `old_status` is passed correctly. If it is NULL in every INSERT:
update each INSERT to fetch the current status before the UPDATE and pass it
as `old_status`. This is a surgical fix to the existing route.

### 2.8 Ably thin wrapper pattern — required for Day 14 compatibility

Do not import Ably SDK directly in route handlers or React components. Instead:

**Backend:** Create `backend/src/lib/realtime.ts` with:
```typescript
import Ably from 'ably';
const client = new Ably.Rest(process.env.ABLY_API_KEY!);

export async function publishEvent(
  channel: string,
  event: string,
  payload: unknown
): Promise<void> {
  await client.channels.get(channel).publish(event, payload);
}
```
Route handlers call `publishEvent(...)` only — never `client.channels` directly.

**Mobile:** Create `apps/mobile/lib/realtime.ts` with:
```typescript
import Ably from 'ably';
let realtimeClient: Ably.Realtime | null = null;

export function getRealtimeClient(): Ably.Realtime { ... }
export function subscribe(channel, event, handler): () => void { ... }
export function removeAllChannels(): void { ... }
```

This wrapper is what Day 14 will replace with `IRealtimeProvider`. If the
agent puts Ably calls inline in route handlers, Day 14 becomes a major
refactor instead of a clean swap.

---

## 3. Known Gotchas

- **Ably free tier limit is 200 concurrent connections.** The Sentry warning
  must fire at 150 (75%), NOT 200. Add this check inside
  `backend/src/lib/realtime.ts` using the Ably connection count API if
  available, or log it as a periodic check in the scheduler.

- **Every Ably subscription on mobile MUST have a cleanup return.** The pattern
  is non-negotiable (V32). Any `useFocusEffect` or `useEffect` that subscribes
  to an Ably channel must return an unsubscribe function. Missing cleanup =
  connection leak = approaching free tier limit.

- **`useFocusEffect` + Ably cleanup:** The correct pattern:
  ```typescript
  useFocusEffect(useCallback(() => {
    const unsub = subscribe(channelName, event, handler);
    return () => unsub(); // REQUIRED
  }, [channelName]));
  ```
  Do NOT use `useEffect` for channel subscriptions — screens can lose focus
  without unmounting in Expo Router tab navigation.

- **`AppState` background cleanup:** In `apps/mobile/app/_layout.tsx`, the
  `AppState.addEventListener('change', ...)` handler must call
  `removeAllChannels()` when state transitions to `'background'` or
  `'inactive'`. This prevents iOS from holding Ably connections alive in
  the background, which counts against the 200 connection limit.

- **Push notification body — zero PII (D2).** This rule is absolute. Every
  call to `sendPush()` must be audited. Prohibited in `title` or `body`:
  address, phone number, seller/aggregator name, amount, material type, GSTIN,
  order ID visible to user. Generic copy only. The agent must run:
  ```bash
  grep -rn "sendPush" backend/src/
  ```
  and inspect every call before the day closes.

- **`expo-server-sdk` chunked dispatch.** Expo push tokens must be sent in
  batches of max 100. The `sendPush()` utility must chunk `userIds[]` if more
  than 100 are passed. For the Hyderabad MVP this is unlikely to matter, but
  the implementation must be correct from day one.

- **`device_tokens` table structure.** The push utility reads from this table.
  Verify the columns before writing the utility:
  ```sql
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_name = 'device_tokens'
  ORDER BY ordinal_position;
  ```
  Expected columns: `id`, `user_id`, `expo_token`, `raw_token`, `created_at`.
  If `device_token` (old name) still exists: the column fix from §2.4 must
  happen first.

- **Channel name for new order feed.** PLAN.md §13 specifies
  `orders:hyd:new` for the aggregator feed channel. This is a PUBLIC channel
  (no HMAC suffix) because any aggregator in HYD may subscribe to it.
  Only order-specific private channels (`order:{id}:chat:{hmac}`) require
  the HMAC suffix (V32). Do not apply HMAC to the feed channel.

- **`chatChannelToken` is user-specific.** The token is computed from
  `orderId + requestingUserId`. This means the seller and aggregator get
  DIFFERENT tokens for the same order. Both tokens are valid for subscription
  to the same channel — the channel name uses the aggregator's token. The
  seller's token is used for the seller's own channel subscription.
  Clarify: PLAN.md §13.1 says the channel is `order:{orderId}:chat:{hmacSuffix}`
  where the suffix uses `orderId + userId`. For the seller and aggregator to
  subscribe to the SAME channel, the backend must compute the suffix using
  a consistent user ID — the aggregator's ID (the one who owns the order).
  The seller receives the same `chatChannelToken` (computed with aggregator ID)
  so they can subscribe to the same channel. This means `chatChannelToken` in
  the DTO is always computed with `order.aggregator_id`, not the requesting
  user's ID.

---

## 4. Files Permitted Today

### Backend (create or modify)
- `backend/src/lib/realtime.ts` — NEW: thin Ably wrapper for publish
- `backend/src/utils/pushNotifications.ts` — NEW: sendPush utility
- `backend/src/routes/orders/index.ts` — add publishEvent calls at TODO
  comments; fix old_status in order_status_history INSERTs
- `backend/src/routes/messages.ts` — add publishEvent call for new message
- `backend/src/utils/orderDto.ts` — add chatChannelToken to DTO output
- `backend/src/routes/users.ts` — fix `device_token` → `expo_token` if needed

### Mobile (create or modify)
- `apps/mobile/lib/realtime.ts` — NEW: thin Ably wrapper for subscribe
- `apps/mobile/hooks/useOrderChannel.ts` — NEW: Ably order channel hook
- `apps/mobile/hooks/useAggregatorFeedChannel.ts` — NEW: feed channel hook
- `apps/mobile/app/_layout.tsx` — add AppState background cleanup
- `apps/mobile/app/(shared)/order/[id].tsx` — wire useOrderChannel, live
  status updates
- `apps/mobile/app/(aggregator)/chat/[id].tsx` (or equivalent chat screen) —
  wire useOrderChannel for messages
- `apps/mobile/store/orderStore.ts` — add chatChannelToken to Order type

### Must NOT touch today
- `backend/src/utils/orderStateMachine.ts`
- `backend/src/routes/orders/index.ts` accept and verify-otp route logic
- Any invoice generation code (Day 15)
- `packages/realtime/` — formal interface is Day 14
- Any seller-side listing creation screens

---

## 5. Environment Variables

New env vars required for Day 13:

| Key | Location | Used for |
|---|---|---|
| `ABLY_API_KEY` | `backend/.env` | Full publish key — backend only |
| `EXPO_PUBLIC_ABLY_KEY` | `apps/mobile/.env` | Subscribe-only key — mobile client |

Both must be added to `.env.example` first (keys only, no values committed).

Existing keys already in use today:

| Key | Location | Used for |
|---|---|---|
| `OTP_HMAC_SECRET` | `backend/.env` | Channel HMAC suffix generation |
| `DATABASE_URL` | `backend/.env` | Pool connection |
| `REDIS_URL` | `backend/.env` | Not used for Ably but may be used by push rate limiting |

### How to get Ably keys

1. Go to https://ably.com → dashboard → your app → API Keys
2. The default key has full permissions — use this for `ABLY_API_KEY`
3. Create a second key with `subscribe` capability only → use for
   `EXPO_PUBLIC_ABLY_KEY`
4. Never commit actual key values

---

## 6. API Contract Changes

### GET /api/orders/:id — updated response shape

New field added by Day 13:

```typescript
{
  // ... all existing fields ...
  chatChannelToken: string | null  // null if no aggregator assigned yet
}
```

`chatChannelToken` is `null` when `order.status = 'created'` (no aggregator).
It is populated for all post-acceptance statuses.

### No new routes today

All Day 13 work is additive to existing routes or new utility files.
No new route handlers are registered.

---

## 7. Sub-Agent Split Recommendation

| Sub-agent | Scope | Depends on |
|---|---|---|
| **Sub-agent A: Pre-flight** | Fix `old_status` NULL in INSERTs; fix `expo_token` column if needed; verify `device_tokens` schema. Output: audit report + targeted fixes. | None — runs first. |
| **Sub-agent B: Backend Ably** | `backend/src/lib/realtime.ts` wrapper; `publishEvent` calls at all TODO Day 13 locations in orders + messages routes; `chatChannelToken` in `orderDto.ts`. | Sub-agent A complete. |
| **Sub-agent C: Backend Push** | `backend/src/utils/pushNotifications.ts`; all push triggers in order routes. | Sub-agent B complete (shares routes file). |
| **Sub-agent D: Mobile Ably** | `apps/mobile/lib/realtime.ts` wrapper; `useOrderChannel` hook; `useAggregatorFeedChannel` hook; `AppState` cleanup in `_layout.tsx`; wire hooks into order detail and chat screens. | Sub-agent B complete (needs chatChannelToken in DTO first). |

Sub-agents B and C must be strictly sequential — they both touch
`backend/src/routes/orders/index.ts`.
Sub-agent D must wait for Sub-agent B because `chatChannelToken` must be
in the DTO before the mobile can subscribe to the correct channel.

---

## 8. Verification Gate Quick Reference

| Gate | What to test | Method |
|---|---|---|
| **G13.1** | Message sent Device A → Device B < 1 second | Two physical devices |
| **G13.2** | Phone number in chat → `[phone number removed]` on receiver | Device test |
| **G13.3** | Status change → order detail updates without refresh | Backend curl + device watch |
| **G13.4** | Navigate away from order detail → Ably channel drops | Ably dashboard |
| **G13.5** | App backgrounded → all channels drop | Ably dashboard |
| **G13.6** | Seller creates order → push received on aggregator device | Physical device |
| **G13.7** | Zero PII in push bodies | `grep -rn "sendPush" backend/src/` |
| **G13.8** | Private channels have 8-char HMAC suffix | Ably dashboard channel list |

**G13.4 and G13.5** require the Ably dashboard to be open during testing.
Go to https://ably.com → your app → Statistics → Channels. Watch channel count
drop when you navigate away or background the app.

**G13.8 SQL-assist** — after creating an order and accepting it, run:
```sql
SELECT id, aggregator_id FROM orders
WHERE id = '<ORDER_ID>';
```
Then manually compute the expected suffix:
```bash
node -e "
const crypto = require('crypto');
const orderId = '<ORDER_ID>';
const aggId = '<AGGREGATOR_ID>';
const secret = '<OTP_HMAC_SECRET>';
const suffix = crypto.createHmac('sha256', secret)
  .update(orderId + aggId).digest('hex').slice(0, 8);
console.log('Expected channel:', 'order:' + orderId + ':chat:' + suffix);
"
```
Verify this matches the channel name visible in the Ably dashboard.

---

## 9. Open Questions for Day 14

Before Day 14 (Provider Abstractions) begins, resolve these:

1. **Ably direct imports after Day 13:** Day 14's gate G14.4 requires
   `grep -r "from 'ably'" apps/mobile/ backend/src/` → 0 results. This means
   Day 13's direct Ably imports in `lib/realtime.ts` wrappers must be the
   ONLY place Ably is imported, and Day 14 replaces those wrapper files with
   `IRealtimeProvider` implementations. Confirm this is achievable with the
   wrapper pattern used today.

2. **`removeAllChannels()` on `IRealtimeProvider`:** Confirm the method
   signature matches what is implemented in today's `apps/mobile/lib/realtime.ts`
   so Day 14's interface extraction is a direct lift.

3. **`IRealtimeProvider.publish()` vs `REST` vs `Realtime` client:** The
   backend uses `Ably.Rest` (for publish-only). The mobile uses `Ably.Realtime`
   (for subscribe + presence). The `IRealtimeProvider` interface needs to cover
   both use cases. Day 14 should decide if this is one interface or two.

4. **`packages/realtime/` initial structure:** Day 14 creates this package.
   Confirm today's wrapper module exports match the expected interface shape
   so the migration is a rename, not a rewrite.

5. **`snapshotHmac` in verify-otp:** The `// TODO Day 14+` comment marks the
   location. Day 14 agent should decide if this is implemented as part of the
   provider abstractions day or deferred further. The weighing screen would
   need to compute and send this value before verify-otp can validate it.
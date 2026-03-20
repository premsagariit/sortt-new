# [Sortt] — Day 13: Ably Realtime + Push Notifications Implementation Plan

**Date:** 2026-03-20  
**Status:** READY FOR REVIEW  
**Gate Target:** 8/8 gates passing  
**Teams:** 5 parallel sub-agents (Backend Gap Filler, Backend Realtime Wrapper, Mobile Ably Integration, Screen Wiring, Connection Monitor)

---

## SECTION 1: VERIFICATION INVENTORY

### Items ALREADY COMPLETED (✅ From Day 12 Report)

Below are all Day 13 items marked ✅ in the Day 13 report that require verification:

1. **✅ Backend accept-order route publishes Ably event**
   - **Verification Command:**
     ```bash
     grep -n "publishEvent\|ably" backend/src/routes/orders/accept.ts | head -20
     # Expected: Contains "publishEvent" or direct Ably channel.publish call
     ```
   - **Exact Check:** File exists and has Ably publish call for status change to `accepted`.

2. **✅ Backend verify-pickup-otp route publishes Ably event**
   - **Verification Command:**
     ```bash
     grep -n "publishEvent\|ably" backend/src/routes/orders/verify-otp.ts | head -20
     ```
   - **Exact Check:** Route publishes status change to `completed`.

3. **✅ Backend message POST route publishes Ably event**
   - **Verification Command:**
     ```bash
     grep -n "publishEvent\|ably\|channels.get" backend/src/routes/messages.ts | head -20
     ```
   - **Exact Check:** Messages route publishes `message` event to order's private channel.

4. **✅ channelHelper.ts exists and constructs HMAC-suffix channel names**
   - **Verification Command:**
     ```bash
     cat apps/mobile/lib/channelHelper.ts | grep -A5 "function\|export"
     ```
   - **Exact Check:** File contains function(s) that build channel names with token suffix (V32 compliant).

5. **✅ Clerk JWT middleware exists on all protected routes**
   - **Verification Command:**
     ```bash
     grep -rn "clerkJwtMiddleware\|verifyClerkJwt" backend/src/routes/ | wc -l
     # Expected: > 0 results
     ```
   - **Exact Check:** Middleware present on order + message routes.

---

## SECTION 2: GAP INVENTORY

### Critical Gaps (⚠️ / ❌) Blocking Day 13 Completion

| Gap ID | Item | Root Cause | Files to Modify/Create | Dependency | Priority |
|---|---|---|---|---|---|
| G2.1 | **PATCH /api/orders/:id/status does NOT publish Ably event** | Route exists but missing Ably publish call | `backend/src/routes/orders/index.ts` | None (Backend Gap Filler) | **🚨 CRITICAL** |
| G2.2 | **POST /api/orders does NOT publish to orders:hyd:new feed** | No feed channel publish in order creation | `backend/src/routes/orders/index.ts` | None (Backend Gap Filler) | **🚨 CRITICAL** |
| G2.3 | **pushHelper.ts uses single-token pattern (not chunked)** | Current push implementation does not chunk with expo-server-sdk | Create `backend/src/utils/pushNotifications.ts`, replace all `pushHelper` calls | None (Backend Gap Filler) | **🚨 CRITICAL** |
| G2.4 | **No backend Ably wrapper library** | Route handlers call Ably SDK directly (tight coupling) | Create `backend/src/lib/realtime.ts` | None (Backend Realtime Wrapper) | **High** |
| G2.5 | **GET /api/realtime/token endpoint may not exist** | Mobile cannot request Clerk-authenticated token | Create or verify `backend/src/routes/realtime.ts` | Backend Realtime Wrapper (for wrapper pattern) | **🚨 CRITICAL** |
| G2.6 | **Mobile realtime.ts is noop stub** | No functional Ably client in mobile app | Rewrite `apps/mobile/lib/realtime.ts` | Backend Realtime Wrapper (for token endpoint) | **🚨 CRITICAL** |
| G2.7 | **useOrderChannel hook does not exist** | Mobile cannot subscribe to order status + chat | Create `apps/mobile/hooks/useOrderChannel.ts` | Mobile Ably Integration | **🚨 CRITICAL** |
| G2.8 | **useAggregatorFeedChannel hook does not exist** | Aggregators cannot receive live new order feed | Create `apps/mobile/hooks/useAggregatorFeedChannel.ts` | Mobile Ably Integration | **🚨 CRITICAL** |
| G2.9 | **Hook wiring missing from seller Order Detail** | Screen does not subscribe to order status updates | Wire `useOrderChannel` in `apps/mobile/app/(seller)/order/[id].tsx` | Mobile Ably Integration hooks created | **High** |
| G2.10 | **Hook wiring missing from aggregator Active Order Detail** | Aggregator cannot see live status updates | Wire `useOrderChannel` in `apps/mobile/app/(aggregator)/active-order-detail.tsx` | Mobile Ably Integration hooks created | **High** |
| G2.11 | **Hook wiring missing from aggregator Home feed** | Aggregator does not receive live new orders | Wire `useAggregatorFeedChannel` in `apps/mobile/app/(aggregator)/home.tsx` | Mobile Ably Integration hooks created | **High** |
| G2.12 | **Hook wiring missing from Chat screen** | Chat does not refresh on incoming Ably message | Wire `useOrderChannel` in `apps/mobile/app/(shared)/chat/[id].tsx` | Mobile Ably Integration hooks created | **High** |
| G2.13 | **Ably SDK not installed in mobile** | `ably` package missing from `apps/mobile/package.json` | Install via `pnpm add ably` in mobile app | Mobile Ably Integration | **🚨 CRITICAL** |
| G2.14 | **EXPO_PUBLIC_ABLY_AUTH_URL not set** | Mobile cannot know token endpoint URL | Add to `apps/mobile/.env` and `.env.example` | Mobile Ably Integration | **High** |
| G2.15 | **Ably connection count monitor not implemented** | No alerting when approaching 150 connections (75% of 200 limit) | Add cron job to `backend/src/scheduler.ts` | None (Connection Monitor) | **Medium** |
| G2.16 | **PII audit on all push call sites not complete** | Some push bodies may contain name, phone, address, etc. | Audit + refactor all `sendPush*` calls in `backend/src/routes/` | Push Notifications replacement | **High** |

---

## SECTION 3: EXECUTION SEQUENCE

**Dependency order:** Backend before mobile (token endpoint must exist before mobile can test). Hooks before screens.

### Step 0: Precondition Verification (5 min)
- [ ] Read MEMORY.md §3, §5 (realtime + push + security).
- [ ] Read TRD.md §6 (Ably), §5 (push), §14 (security V32, V37, D2, A1).
- [ ] Read PLAN.md Day 13 section.
- [ ] Read structure.md for all file paths.
- [ ] Confirm all 5 sub-agent assignments understood.
- [ ] User approval to proceed: **GO / NO-GO**

### Phase 1: Backend Gap Filling (Sub-Agent 1) — 30 min
1. [ ] Add Ably publish to PATCH /api/orders/:id/status
   - **File:** `backend/src/routes/orders/index.ts`
   - **Check:** Publishes `status_updated` event after successful status UPDATE + history INSERT.
   - **Validation:** `grep -n "publishEvent\|channels.get" backend/src/routes/orders/index.ts | grep -i "patch\|status"`

2. [ ] Add Ably publish to POST /api/orders
   - **File:** `backend/src/routes/orders/index.ts`
   - **Check:** Publishes `new_order` to `orders:hyd:new` after order INSERT + push fire.
   - **Validation:** `grep -n "orders:hyd:new\|publishEvent" backend/src/routes/orders/index.ts`

3. [ ] Create `backend/src/utils/pushNotifications.ts`
   - **Check:** Exports `sendPushToUsers()` using expo-server-sdk chunking.
   - **JSDoc:** Mentions PII restrictions (zero name, phone, address, amount, GSTIN).
   - **Validation:** `grep -n "chunkPushNotifications\|Expo" backend/src/utils/pushNotifications.ts`

4. [ ] Replace all `pushHelper` calls with `sendPushToUsers()`
   - **Files:** All in `backend/src/routes/`
   - **Validation:** `grep -rn "pushHelper" backend/src/routes/ | wc -l` → should be 0 (or only legacy)

5. [ ] Add new chat message push trigger
   - **File:** `backend/src/routes/messages.ts`
   - **Check:** After Ably publish, calls `sendPushToUsers([offlinePartyId], ...)`
   - **Validation:** `grep -n "sendPushToUsers" backend/src/routes/messages.ts`

6. [ ] Sub-Agent 1 Self-Verification
   ```bash
   grep -n "publishEvent\|ably" backend/src/routes/orders/index.ts | wc -l   # Should be ≥ 2
   grep -rn "pushHelper" backend/src/routes/ | wc -l                      # Should be 0
   pnpm type-check                                                         # Should exit 0
   ```

### Phase 2: Backend Realtime Wrapper (Sub-Agent 2) — 25 min
1. [ ] Create `backend/src/lib/realtime.ts`
   - **Exports:** `publishEvent()`, `createTokenRequest()`
   - **Validation:** `grep -n "export\|function" backend/src/lib/realtime.ts | head -10`

2. [ ] Create or verify `backend/src/routes/realtime.ts`
   - **Route:** `GET /api/realtime/token`
   - **Middleware:** `clerkJwtMiddleware` required
   - **Validation:** `grep -n "GET\|/token\|clerkJwtMiddleware" backend/src/routes/realtime.ts`

3. [ ] Verify `/api/realtime/token` mounted in Express app
   - **File:** `backend/src/index.ts`
   - **Validation:** `grep -n "realtime\|'/token" backend/src/index.ts`

4. [ ] Migrate (accept, verify-otp, messages) routes to use `publishEvent()`
   - **Files:** `backend/src/routes/orders/accept.ts`, verify-otp.ts, `backend/src/routes/messages.ts`
   - **Validation:** `grep -rn "ablyRest.channels.get" backend/src/routes/ | wc -l` → should be 0

5. [ ] Sub-Agent 2 Self-Verification
   ```bash
   grep -rn "ablyRest.channels.get" backend/src/routes/ | wc -l  # Should be 0
   curl -H "Authorization: Bearer <test_jwt>" http://localhost:3001/api/realtime/token  # Should return token JSON
   pnpm type-check                                               # Should exit 0
   ```

### Phase 3: Mobile Ably SDK + Token Auth (Sub-Agent 3) — 25 min
1. [ ] Install Ably SDK in mobile
   - **Command:** `cd apps/mobile && pnpm add ably`
   - **Validation:** `grep '"ably"' apps/mobile/package.json`

2. [ ] Rewrite `apps/mobile/lib/realtime.ts`
   - **Exports:** `getRealtimeClient()`, `disconnectRealtime()`
   - **Auth:** Token Auth via authCallback
   - **Validation:** `grep -n "Token\|authCallback\|getRealtimeClient" apps/mobile/lib/realtime.ts`

3. [ ] Create `apps/mobile/hooks/useOrderChannel.ts`
   - **Exports:** `useOrderChannel(orderId, orderChannelToken, chatChannelToken)`
   - **Subscribes to:** full backend-provided channel tokens from DTO (`orderChannelToken`, `chatChannelToken`) without client-side reconstruction
   - **Validation:** `grep -n "subscribe\|channels.get" apps/mobile/hooks/useOrderChannel.ts | wc -l` → should be ≥ 2

4. [ ] Create `apps/mobile/hooks/useAggregatorFeedChannel.ts`
   - **Exports:** `useAggregatorFeedChannel()`
   - **Subscribes to:** `orders:hyd:new`
   - **Validation:** `grep -n "subscrib" apps/mobile/hooks/useAggregatorFeedChannel.ts`

5. [ ] Add `prependFeedOrder` to `aggregatorStore.ts` (if missing)
   - **Check:** Function exists on store; deduplicates + prepends + caps at ~50
   - **Validation:** `grep -n "prependFeedOrder" apps/mobile/store/aggregatorStore.ts`

6. [ ] Wire `disconnectRealtime()` in AppState background handler
   - **File:** `apps/mobile/app/_layout.tsx`
   - **Validation:** `grep -n "disconnectRealtime\|AppState" apps/mobile/app/_layout.tsx`

7. [ ] Add env vars to mobile
   - **Vars:** `EXPO_PUBLIC_ABLY_AUTH_URL` (set to `${EXPO_PUBLIC_API_URL}/api/realtime/token`)
   - **Validation:** `grep "EXPO_PUBLIC_ABLY" apps/mobile/.env` (should have auth URL, NOT API key)

8. [ ] Sub-Agent 3 Self-Verification
   ```bash
   grep -n "noop\|stub\|TODO" apps/mobile/lib/realtime.ts | wc -l  # Should be 0
   grep '"ably"' apps/mobile/package.json                          # Should show version
   grep -n "channels.get" apps/mobile/hooks/useOrderChannel.ts     # Should show 2+ channel subscriptions
   pnpm type-check                                                 # Should exit 0
   ```

### Phase 4: Screen Hook Wiring (Sub-Agent 4) — 20 min
1. [ ] Wire `useOrderChannel` into seller Order Detail
   - **File:** `apps/mobile/app/(seller)/order/[id].tsx`
   - **Call:** `useOrderChannel(order.id, order.orderChannelToken ?? order.chatChannelToken ?? null)`
   - **Validation:** `grep -n "useOrderChannel" apps/mobile/app/(seller)/order/[id].tsx`

2. [ ] Wire `useOrderChannel` into aggregator Active Order Detail
   - **File:** `apps/mobile/app/(aggregator)/active-order-detail.tsx`
   - **Validation:** `grep -n "useOrderChannel" apps/mobile/app/(aggregator)/active-order-detail.tsx`

3. [ ] Wire `useAggregatorFeedChannel` into aggregator Home
   - **File:** `apps/mobile/app/(aggregator)/home.tsx`
   - **Validation:** `grep -n "useAggregatorFeedChannel" apps/mobile/app/(aggregator)/home.tsx`

4. [ ] Wire `useOrderChannel` into Chat screen
   - **File:** `apps/mobile/app/(shared)/chat/[id].tsx`
   - **Validation:** `grep -n "useOrderChannel" apps/mobile/app/(shared)/chat/[id].tsx`

5. [ ] Sub-Agent 4 Self-Verification
   ```bash
   grep -n "useOrderChannel" apps/mobile/app/(seller)/order/[id].tsx          # ≥1
   grep -n "useOrderChannel" apps/mobile/app/(aggregator)/active-order-detail.tsx  # ≥1
   grep -n "useAggregatorFeedChannel" apps/mobile/app/(aggregator)/home.tsx   # ≥1
   grep -n "useOrderChannel" apps/mobile/app/(shared)/chat/[id].tsx           # ≥1
   pnpm type-check                                                            # Should exit 0
   ```

### Phase 5: Backend Monitoring (Sub-Agent 5) — 5 min
1. [ ] Add Ably connection count monitor cron job
   - **File:** `backend/src/scheduler.ts` or `backend/src/index.ts`
   - **Schedule:** Every 5 minutes
   - **Alert:** Sentry warning at ≥150 connections (75% of 200 free limit)
   - **Validation:** `grep -n "Ably\|connection.*monitor" backend/src/scheduler.ts`

2. [ ] Sub-Agent 5 Self-Verification
   ```bash
   grep -n "Ably.*stats\|connection.*monitor" backend/src/scheduler.ts | wc -l  # Should be ≥1
   pnpm type-check                                                              # Should exit 0
   ```

---

## SECTION 4: SECURITY RULES IN SCOPE

### Rule V32: HMAC-Suffix Channel Names
- **Requirement:** All private channels use token-based suffix to prevent enumeration.
- **Backend:** Uses `channelHelper.ts` (already correct).
- **Mobile:** Uses `chatChannelToken` / `orderChannelToken` from API response — never bare `orderId`.
- **Verification:**
  ```bash
  grep -n "channels.get" apps/mobile/hooks/useOrderChannel.ts | grep -v "hyd:new"
  # Expected: Contains pattern like ${orderId}:${token}
  ```
- **BLOCK if:** Any client-side reconstructed private channel (e.g. bare `order:${orderId}`) is found.

### Rule V37: Terminal Status Decommission
- **Requirement:** After order reaches `completed`, `cancelled`, `disputed`, no more Ably messages.
- **Backend:**
  ```bash
  grep -n "IMMUTABLE_STATUSES\|completed\|cancelled\|disputed" backend/src/routes/orders/index.ts | head -10
  ```
  Expected: Check prevents publish if status is immutable.
- **Mobile:** `useFocusEffect` cleanup handles unsubscribe on screen unmount.
- **BLOCK if:** Terminal-status order generates Ably event.

### Rule D2: Zero PII in Push Bodies
- **Requirement:** Push titles + bodies contain ZERO: name, phone, address, rupee amount, GSTIN, material type.
- **Verification:**
  ```bash
  grep -rn "sendPushToUsers\|sendPush" backend/src/routes/ | grep -v node_modules
  # For each call: inspect title and body strings
  ```
- **Allowed:** "New message", "Your pickup has been accepted", "Order completed".
- **BLOCK if:** Any PII found.

### Rule A1: /api/realtime/token Requires Clerk JWT
- **Requirement:** Route protected by `clerkJwtMiddleware`.
- **Verification:**
  ```bash
  grep -B3 -A3 "GET.*token\|/api/realtime/token" backend/src/routes/realtime.ts | grep -i middleware
  ```
- **BLOCK if:** Route accessible without Clerk JWT.

### Rule I1: Ably Publish Never Crashes HTTP Response
- **Requirement:** All publish calls wrapped in try/catch. Error logged but not thrown.
- **Verification:**
  ```bash
  grep -B2 -A5 "publishEvent\|channels.get.*publish" backend/src/routes/orders/index.ts | grep -i "try\|catch"
  ```
- **BLOCK if:** Ably failure stops HTTP response.

---

## SECTION 5: VERIFICATION GATE CHECKLIST

All 8 gates MUST pass (show actual test output) before Day 13 is marked complete.

### Gate G13.1: Chat Message Delivery < 1 Second
**Test Steps:**
1. Start backend: `pnpm dev:backend`
2. Start mobile on two simulators/devices.
3. Log in to both devices as seller + aggregator on same order.
4. Open chat screen on both.
5. Send message from Device A.
6. Check Device B for message receipt (timestamp).

**Expected Output:**
```
Device A sends: "Hello" at 14:32:10.000
Device B receives: "Hello" at 14:32:10.800
Latency: ~0.8 seconds ✅ PASS
```

---

### Gate G13.2: Phone Number Redacted in Chat
**Test Command:**
```bash
# 1. Send message with phone via API
curl -X POST http://localhost:3001/api/messages \
  -H "Authorization: Bearer <seller_clerk_jwt>" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "<order_uuid>",
    "content": "Call me on 9876543210 or WhatsApp"
  }'

# 2. Fetch message from DB or API
curl -X GET "http://localhost:3001/api/messages?order_id=<order_uuid>" \
  -H "Authorization: Bearer <seller_clerk_jwt>"

# 3. Verify stored content
SELECT content FROM messages WHERE order_id = '<order_uuid>' ORDER BY created_at DESC LIMIT 1;
```

**Expected Output:**
```
Stored database content: "Call me on [phone number removed] or WhatsApp"
API response content: "Call me on [phone number removed] or WhatsApp"
✅ PASS
```

---

### Gate G13.3: Status Change → Live Order Detail Update (No Refresh)
**Test Steps:**
1. Seller Device A: Open Order Detail screen (order in `created` status).
2. Aggregator Device B: Open same order in Order Detail (pre-acceptance view).
3. Aggregator Device B: Tap "Accept Order".
4. Seller Device A: Confirm status changed from `created` → `accepted` WITHOUT user tapping refresh.

**Expected Output:**
```
Seller Device A status before: "Created"
[Aggregator Device B taps Accept]
Seller Device A status updated to: "Accepted" (within 2 sec, no refresh)
✅ PASS
```

---

### Gate G13.4: Navigate Away from Order Detail → Ably Connection Drops
**Test Steps:**
1. Open Ably dashboard → Statistics → Connections tab.
2. On mobile: Navigate to Order Detail screen.
3. Note connection count increases by 1.
4. Navigate back to Orders List (leave Order Detail).
5. Confirm connection count decreases by 1 within 5 seconds.

**Expected Output:**
```
Before order detail: 1 connection
After opening order detail: 2 connections
After navigating away: 1 connection (within 5 sec)
✅ PASS
```

---

### Gate G13.5: App Backgrounded → All Ably Channels Drop
**Test Steps:**
1. iOS/Android: Open Order Detail on mobile (Ably channel active).
2. Press Home button (app goes to background).
3. Watch Ably dashboard → Statistics → Connections.

**Expected Output:**
```
Before background: 2 connections
[App pressed to background]
After 5 seconds: 0 connections
✅ PASS
```

---

### Gate G13.6: New Order Push to Aggregator with Matching Materials
**Test Steps:**
1. Setup: Aggregator Device with `is_online=true` and materials set to [metal, plastic].
2. Seller Device: Create new order with material=metal.
3. Backend fires push to aggregators with matching materials.
4. Aggregator Device: Should receive push notification.

**Expected Output:**
```
[Seller creates order with material=metal]
[Backend processes order creation]
[Push sent to aggregator device]
Aggregator Device receives: "New scrap order available"
✅ PASS
```

---

### Gate G13.7: Zero PII in All Push Bodies
**Audit Command:**
```bash
grep -rn "sendPushToUsers\(\|sendPush\(" backend/src/routes/ | grep -v node_modules | cut -d: -f1 | sort | uniq
# For each file, inspect the function calls
```

**Expected Output:**
```
File: backend/src/routes/orders/index.ts
  Line 234: sendPushToUsers(aggregatorIds, 'New scrap order available', 'Tap to view details', {...})
  ✅ No name, phone, address, amount, GSTIN detected

File: backend/src/routes/messages.ts
  Line 156: sendPushToUsers([offlinePartyId], 'New message', 'You have a new message', {...})
  ✅ No PII detected

✅ PASS
```

---

### Gate G13.8: Private Channels Use HMAC-Suffix Naming
**Inspection Commands:**
```bash
# Mobile channel construction
grep -n "channels.get" apps/mobile/hooks/useOrderChannel.ts

# Backend channel construction
grep -n "channels.get\|publishEvent" backend/src/lib/realtime.ts
```

**Expected Output:**
```
apps/mobile/hooks/useOrderChannel.ts: statusChannel = ably.channels.get(orderChannelToken)
apps/mobile/hooks/useOrderChannel.ts: chatChannel = ably.channels.get(chatChannelToken)
backend/src/lib/realtime.ts:8: export async function publishEvent(channel: string, event: string, payload: object) {
backend/src/lib/realtime.ts:9:   await ablyRest.channels.get(channel).publish(event, payload);

✅ All use token suffix (${chatChannelToken}), not bare orderId
✅ PASS
```

---

## SECTION 6: COMPLETION STEPS (EXECUTE IN EXACT ORDER AFTER ALL GATES PASS)

Only after all 8 gates show PASS:

### Step 1: Update PLAN.md
```bash
# Mark all Day 13 tasks [x]
# Locate day 13 section in PLAN.md
# For each task, change [ ] to [x]
# Find gate marker and change to: [GATE PASSED — 2026-03-20T14:30:00Z]
# Update STATUS TRACKER section (if exists)
```

### Step 2: Update MEMORY.md §9
Append to MEMORY.md section 9 (Learned Lessons):

```markdown
## Learned Lessons — Day 13 (Ably Realtime + Push Notifications)

### Pattern 1: Ably Token Auth in Mobile
- **Issue:** Cannot expose `ABLY_API_KEY` to mobile — it's a backend secret.
- **Solution:** Token Auth via `GET /api/realtime/token` endpoint. Mobile calls this route (protected by Clerk JWT) to get a token, then uses that token to authenticate Ably client.
- **Implementation:** `authCallback` in `getRealtimeClient()` makes API call to get fresh token on each connection.
- **Files:** `apps/mobile/lib/realtime.ts`, `backend/src/routes/realtime.ts`
- **Date:** 2026-03-20

### Pattern 2: Why EXPO_PUBLIC_ABLY_KEY Must Never Exist (V32)
- **Issue:** Environment variables prefixed `EXPO_PUBLIC_` are bundled into the app binary. Any `EXPO_PUBLIC_*` value is visible to any user who decompiles the APK/IPA.
- **Security risk:** If `ABLY_API_KEY` were exposed as `EXPO_PUBLIC_ABLY_KEY`, aggregators could enumerate channels, intercept competitor orders, or DOS the Ably service.
- **Enforcement:** Token Auth pattern completely avoids this by routing all Ably auth through backend. Mobile never receives API key.
- **Files affected:** `apps/mobile/.env`, `.env.example`
- **Date:** 2026-03-20

### Pattern 3: Backend Ably Wrapper (`publishEvent()`)
- **Pattern:** Route handlers do NOT call Ably SDK directly. Instead, they call a thin `publishEvent(channel, event, payload)` wrapper.
- **Benefit 1:** Decouples business logic from vendor SDK — easy swap later (Day 14 abstraction).
- **Benefit 2:** Centralizes error handling — all Ably failures have one place to log + silence before HTTP response.
- **Benefit 3:** Named function communicates intent clearly: "publish this event" vs. "call ably.channels.get()".
- **Files:** `backend/src/lib/realtime.ts`, all routes using it
- **Date:** 2026-03-20

### Pattern 4: Singleton Realtime Client + Disconnect on AppState
- **Issue:** Creating new Ably clients on every hook mount exhausts connection limit.
- **Solution:** Singleton `getRealtimeClient()` — returns same instance on every call.
- **Cleanup:** `disconnectRealtime()` called from AppState background handler — closes all channels and nullifies client.
- **Reconnection:** On foreground, hooks call `getRealtimeClient()` again, which reconnects via Token Auth.
- **Files:** `apps/mobile/lib/realtime.ts`, `apps/mobile/app/_layout.tsx`
- **Date:** 2026-03-20

### Pattern 5: Feed Order Deduplication (`prependFeedOrder`)
- **Issue:** Multiple Ably events or race conditions could cause same order to appear in feed multiple times.
- **Solution:** `prependFeedOrder(order)` in aggregator store checks if order.id already exists before prepending.
- **Cap:** Feed capped at ~50 items to prevent memory bloat.
- **Files:** `apps/mobile/store/aggregatorStore.ts`
- **Date:** 2026-03-20

### Compliance Gates Passed (V32, V37, D2, A1)
- V32 (HMAC-suffix channels): All private channels use `chatChannelToken` from API.
- V37 (Terminal status decommission): `useFocusEffect` cleanup unsubscribes on screen unmount.
- D2 (Zero PII in push): Hardcoded PII audit rule in `sendPushToUsers()` JSDoc.
- A1 (Clerk JWT on token endpoint): `/api/realtime/token` protected by `clerkJwtMiddleware`.
- Date: 2026-03-20
```

### Step 3: Update structure.md
Add the following to the directory tree in structure.md:

```markdown
├── backend/
│   ├── src/
│   │   ├── lib/
│   │   │   ├── realtime.ts          ← NEW: Ably wrapper (publishEvent, createTokenRequest)
│   │   ├── utils/
│   │   │   ├── pushNotifications.ts ← NEW: Chunked expo-server-sdk pattern (replaces pushHelper)
│   │   ├── routes/
│   │   │   ├── realtime.ts          ← NEW or UPDATED: GET /api/realtime/token endpoint
│   ├── package.json                 ← UPDATED: ably + expo-server-sdk dependencies

├── apps/mobile/
│   ├── lib/
│   │   ├── realtime.ts              ← REWRITTEN: Ably Token Auth client (was noop stub)
│   ├── hooks/
│   │   ├── useOrderChannel.ts       ← NEW: Subscribe to order + chat events
│   │   ├── useAggregatorFeedChannel.ts ← NEW: Subscribe to orders:hyd:new feed
│   ├── store/
│   │   ├── aggregatorStore.ts       ← UPDATED: Added prependFeedOrder, feed deduplication
│   ├── .env                         ← UPDATED: Added EXPO_PUBLIC_ABLY_AUTH_URL
│   ├── .env.example                 ← UPDATED: Added EXPO_PUBLIC_ABLY_AUTH_URL (no key!)
│   ├── package.json                 ← UPDATED: ably dependency added
```

### Step 4: Update README.md
Add `EXPO_PUBLIC_ABLY_AUTH_URL` to the environment variables table:

```markdown
| Variable | Scope | Required | Description |
|---|---|---|---|
| EXPO_PUBLIC_ABLY_AUTH_URL | Mobile | ✅ | Token endpoint for Ably Token Auth. Value: `${EXPO_PUBLIC_API_URL}/api/realtime/token`. Mobile makes authenticated call to this endpoint to get Ably token. **NEVER set EXPO_PUBLIC_ABLY_KEY** — that would expose the API key. |
```

**Note:** Explicitly document that `EXPO_PUBLIC_ABLY_KEY` must never exist.

### Step 5: Type-Check
```bash
pnpm type-check
# Expected output: "✅ No errors"
```

If errors present, halt and fix root causes before proceeding.

### Step 6: GitHub Commit & Push
```bash
git add -A
git commit -m "feat: Day 13 complete — Ably realtime + push notifications wired end-to-end

- Backend: PATCH status + POST orders publish Ably events
- Push: Chunked expo-server-sdk, zero PII
- Mobile: Ably Token Auth + useOrderChannel + useAggregatorFeedChannel hooks
- Screens: Order detail + chat + aggregator home wired to live updates
- Security: V32 (HMAC-suffix), V37 (terminal unsubscribe), D2 (PII audit), A1 (JWT token endpoint)
- Monitoring: Ably connection count monitor added
- All 8 gates passing"

git push origin main
```

**Expected Output:**
```
[main abc1234] feat: Day 13 complete...
 X files changed, YYY insertions(+), ZZZ deletions(-)
✅ Push successful
```

---

## FINAL STATUS

| Phase | Status | Blocker? | Notes |
|---|---|---|---|
| Preconditions | ⏳ AWAITING USER APPROVAL | No | All reads done. Awaiting GO/NO-GO signal. |
| Sub-Agent 1 (Backend Gap) | ⏳ PENDING | No | Will execute after approval. |
| Sub-Agent 2 (Wrapper + Token) | ⏳ PENDING | No | Depends on deployment trigger. |
| Sub-Agent 3 (Mobile Ably) | ⏳ PENDING | No | Depends on Sub-Agent 2 token endpoint. |
| Sub-Agent 4 (Screen Wiring) | ⏳ PENDING | No | Depends on Sub-Agent 3 hooks. |
| Sub-Agent 5 (Monitor) | ⏳ PENDING | No | Independent. |
| All 8 Gates | ⏳ PENDING | No | Will execute after dev complete. |
| PLAN.md Update | ⏳ PENDING | No | After gates pass. |
| MEMORY.md Append | ⏳ PENDING | No | After gates pass. |
| GitHub Commit | ⏳ PENDING | No | Final step. |

---

## APPROVAL REQUIRED

**Before executing the implementation plan, confirm:**

1. ✅ All preconditions in Section 1 understood and verified.
2. ✅ All gaps in Section 2 understood and acceptable.
3. ✅ Execution sequence in Section 3 is clear (5 phases, parallel sub-agents).
4. ✅ Security rules in Section 4 understood (V32, V37, D2, A1, I1).
5. ✅ Verification gates in Section 5 are achievable and realistic.
6. ✅ Completion steps in Section 6 are clear and executable.

**User Action Required:** Reply with:
```
GO — Deploy all 5 sub-agents in parallel.
```

or

```
NO-GO — <reason>
```

---

**Generated:** 2026-03-20T11:45:00Z  
**Plan Version:** 1.0  
**Estimated Completion Time:** ~2.5 hours (5 phases + 8 gates + 6 completion steps)

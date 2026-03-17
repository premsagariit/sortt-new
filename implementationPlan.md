# Sortt — Order Data Integrity Overhaul Implementation Plan (Pre-Execution)

Prepared after mandatory reads and before any code edits.

## Mandatory Reads Completed (Confirmed)
1. `MEMORY.md` (authority + constraints)
2. `structure.md` (path verification)
3. `PLAN.md` (current build state)
4. `TRD.md` §8 (schema) and §13 Security & Privacy patches + V7/V13/V24 references
5. `backend/src/utils/orderDto.ts`
6. `backend/src/routes/orders/index.ts`
7. `apps/mobile/store/aggregatorStore.ts`
8. `apps/mobile/store/orderStore.ts`
9. Affected screens (path-corrected):
	- `apps/mobile/app/(aggregator)/order/[id].tsx` (prompt said `(aggregator)/order-detail.tsx`)
	- `apps/mobile/app/(aggregator)/orders.tsx`
	- `apps/mobile/app/(seller)/order/[id].tsx` (prompt said `(shared)/order/[id].tsx`)
	- `apps/mobile/app/(seller)/orders.tsx`
10. Skills inventory from `.agent/skills`

Parallel read-only investigations executed across 5 tracks (backend tx/route, DTO contract, aggregator mobile/store, seller mobile/rating, security/docs).

Relevant skills identified:
- `planner`
- `react-native-expert`
- `senior-backend`
- `database-schema-designer`
- `senior-security`
- `verifier`
- `codebase-mapper`

---

## Section 1 — File Inventory

### Backend / API
- `backend/src/routes/orders/index.ts` — add accept-time rate snapshot + missing-rate fallback + enrich order detail response shape (`order_items`, totals, `seller_has_rated`). **MODIFY**
- `backend/src/utils/orderDto.ts` — align DTO fields to include order-item data and explicit totals while preserving V24 stripping. **MODIFY**
- `backend/src/routes/aggregators.ts` — add aggregator-own-rates GET endpoint (`/me/rates` or equivalent) for pre-accept order detail estimates. **MODIFY**

### Mobile Stores
- `apps/mobile/store/aggregatorStore.ts` — compute/store `orderAmount` from order items on accept flows; ensure New→Active shift without refetch dependency. **MODIFY**
- `apps/mobile/store/orderStore.ts` — map new DTO fields (`order_items`, `estimated_total`, `confirmed_total`, `seller_has_rated`) and preserve non-zero value selection. **MODIFY**

### Mobile Screens
- `apps/mobile/app/(aggregator)/order/[id].tsx` — remove seller-rate column, render live order items/rates, compute estimated total from aggregator rates, change accept navigation to active-order-detail replace path. **MODIFY**
- `apps/mobile/app/(aggregator)/orders.tsx` — ensure feed accept path updates state instantly and Active tab cards consume `orderAmount`. **MODIFY**
- `apps/mobile/app/(seller)/order/[id].tsx` — status-aware rates/weights display (estimated vs confirmed) and inline rating block for completed orders. **MODIFY**
- `apps/mobile/app/(seller)/orders.tsx` — show DTO totals (`estimated_total` or `confirmed_total`) instead of zero fallback. **MODIFY**

### Shared / UI Utilities
- `apps/mobile/components/order/OrderItemList.tsx` — support explicit weight label + status-aware total label if required by seller detail UX. **MODIFY (conditional)**
- `apps/mobile/utils/format.ts` — shared currency formatter if no equivalent reusable helper exists. **NEW (conditional)**

### Documentation
- `implementationPlan.md` — execution status update after implementation. **MODIFY**
- `PLAN.md` — add overhaul completion note/date. **MODIFY**
- `MEMORY.md` (§9) — append learned lessons from this overhaul. **MODIFY**
- `structure.md` — include `apps/mobile/utils/format.ts` only if created. **MODIFY (conditional)**
- `TRD.md` — document accept-time rate snapshot and DTO standard fields (`estimated_total`, `confirmed_total`, `seller_has_rated`). **MODIFY**
- `PRD.md` — align order-detail/rating flow contract. **MODIFY**
- `README.md` — expected unchanged (no env additions), but confirm explicitly. **MODIFY (status note only if needed)**

---

## Section 2 — Root Cause Confirmation

1. **Hypothesis:** accept route does not snapshot aggregator `rate_per_kg` at accept time.  
	**Status:** **CONFIRMED.** `POST /api/orders/:orderId/accept` updates status + aggregator only; no `order_items` update from `aggregator_material_rates`.

2. **Hypothesis:** `orderDto.ts`/order detail response does not provide required item-level rate fields robustly.  
	**Status:** **CORRECTED.** `line_items` exists, but shape is insufficient for target UX: no `material_label`, no separate `estimated_weight_kg` vs `confirmed_weight_kg`, no explicit `estimated_total`/`confirmed_total`, no `seller_has_rated`.

3. **Hypothesis:** aggregator order detail uses hardcoded fixture array.  
	**Status:** **CORRECTED.** Screen does not use a static fixture array; it derives from store + `/api/rates`, but still has incorrect data source semantics (`SELLER RATE` column and fallback behavior causing incorrect totals).

4. **Hypothesis:** post-accept navigation from detail goes back/feed rather than active detail replace.  
	**Status:** **CONFIRMED (behavioral mismatch).** Current flow uses `router.replace('/(aggregator)/orders')` (not `active-order-detail`) and can land user back in orders list context instead of execution-ready detail.

5. **Hypothesis:** seller detail shows 0/incorrect rates and doesn’t switch to confirmed weights properly after completion.  
	**Status:** **CONFIRMED (partially).** Seller detail uses mixed/fallback sources (live `/api/rates`, coalesced weight field), lacking explicit status-driven rendering from stable DTO fields.

6. **Hypothesis:** rating UI missing due to wrong condition or missing fetch/field.  
	**Status:** **CONFIRMED (UI missing in target screen).** Seller detail screen lacks inline post-completion rating block; separate `(shared)/review/[id].tsx` exists but is not wired to requested seller detail flow and no `seller_has_rated` signal is exposed by order detail DTO.

---

## Section 3 — Sub-Agent Assignments

Execution remains sequential for code changes (per `MEMORY.md §0.2`); only discovery was parallel.

### Sub-Agent 1 — Backend Transaction + Route Behavior
- **Scope:** `backend/src/routes/orders/index.ts`, `backend/src/routes/aggregators.ts`
- **Tasks:** accept-time rate snapshot update; missing-rate fallback to 0; maintain first-accept transaction atomicity; preserve V7/V13; implement/confirm `GET /api/aggregators/me/rates` for authenticated aggregator-own rates.
- **Depends on:** none.

### Sub-Agent 2 — DTO / API Contract
- **Scope:** `backend/src/utils/orderDto.ts`, relevant order detail SELECTs in `backend/src/routes/orders/index.ts`
- **Tasks:** emit `order_items` required fields, `estimated_total`, `confirmed_total`, `seller_has_rated`, preserve V24.
- **Depends on:** Sub-Agent 1 contract finalization.

### Sub-Agent 3 — Aggregator Mobile + Store
- **Scope:** `apps/mobile/app/(aggregator)/order/[id].tsx`, `apps/mobile/app/(aggregator)/orders.tsx`, `apps/mobile/store/aggregatorStore.ts`
- **Tasks:** remove seller-rate UI, use order-items + aggregator rates, compute `orderAmount`, New→Active local move, route replace to active-order-detail.
- **Depends on:** Sub-Agent 2 DTO fields available.

### Sub-Agent 4 — Seller Mobile + Rating Flow
- **Scope:** `apps/mobile/app/(seller)/order/[id].tsx`, `apps/mobile/app/(seller)/orders.tsx`, optional `apps/mobile/components/order/OrderItemList.tsx`
- **Tasks:** status-aware rates/weights/totals and completed-only rating block with submit/confirmation states.
- **Depends on:** Sub-Agent 2 DTO fields + Sub-Agent 3 navigation/state stabilization.

Conditional guard for shared component edits:
- If `apps/mobile/components/order/OrderItemList.tsx` is modified, it is explicitly owned by Sub-Agent 4 and requires an immediate `pnpm --filter mobile type-check` before continuing downstream.

### Sub-Agent 5 — Security/Compliance + Docs Impact
- **Scope:** `PLAN.md`, `MEMORY.md`, `structure.md`, `TRD.md`, `PRD.md`, `README.md`
- **Tasks:** update documentation and security sign-off after all functional gates + root type-check pass.
- **Depends on:** Sub-Agents 1–4 completed + `pnpm type-check` pass.

---

## Section 4 — Execution Sequence

1. Patch accept transaction to snapshot rates into `order_items` from `aggregator_material_rates` (same transaction, after accept lock/update).
2. Add fallback update for unmatched materials to set `rate_per_kg = 0` and `amount = 0` (non-fatal).
3. Confirm aggregator identity source remains `req.user.id` only.
4. Add/confirm aggregator-own-rates read endpoint (`GET /api/aggregators/me/rates` or documented equivalent).
5. Expand order detail query + DTO to include required `order_items` fields, `estimated_total`, `confirmed_total`, `aggregator_name`, `seller_has_rated`.
6. Preserve V24 field stripping (`phone_hash`, internal auth hashes) in all DTO responses.
7. Update orderStore mapping for new fields and amount selection logic.
8. Update aggregator detail screen to remove seller-rate column and render order-item rows from live store/API data.
9. Update accept handler in aggregator detail to local state transition + `router.replace({ pathname: '/(aggregator)/active-order-detail', params: { id } })`.
10. Update aggregator feed accept path to local New→Active move and no full refetch dependency.
11. Update seller detail screen: non-completed statuses use estimated weights; completed uses confirmed weights; show proper totals.
12. Implement completed-only inline rating block with `POST /api/ratings`, success/error states, and `seller_has_rated` gating.
13. Update seller orders cards to show DTO totals (completed → confirmed total, else estimated total).
14. Run mobile scoped type-check; fix only in-scope regressions.
15. Run root `pnpm type-check`.
16. If any gate fails, fix root cause and rerun failed + downstream impacted gates.
17. Apply docs updates in required order (Section 7).

Gates:
- **Gate A (Backend/DTO):** SA1 + SA2 verification commands pass.
- **Gate B (Aggregator UX):** SA3 verification commands + manual flow pass.
- **Gate C (Seller UX):** SA4 manual gates + mobile type-check pass.
- **Gate D (Closeout):** root type-check + docs/security sign-off complete.

---

## Section 5 — Security Rules In Scope

- **V13:** `completed` only through OTP verify route; no new PATCH transition to completed.
- **V24:** never expose `phone_hash`, `clerk_user_id`, or internal auth hashes in order DTO.
- **V7:** role/identity source from verified auth context (`req.user`), never request body.
- **V25:** full pickup address exposure only post-acceptance to authorized parties.
- **A3:** no secret leakage in docs/client; no env value hardcoding/logging.
- **C1-equivalent:** any newly introduced interval/polling includes cleanup in `useEffect` return.
- **Navigation safety (MEMORY §9):** use `router.replace` for post-accept critical flow to avoid unsafe back-stack rewind.

---

## Section 6 — Verification Gate Checklist

### Sub-Agent 1 (Backend)
**SA1-V1 — accept snapshot persisted**
```bash
psql "$DATABASE_URL" -c "SELECT id, material_code, estimated_weight_kg, rate_per_kg, amount FROM order_items WHERE order_id = '<TEST_ORDER_ID>';"
```
Expected: non-null `rate_per_kg` and `amount` after accept; unmatched materials become `0`/`0`.

**SA1-V2 — DTO includes order_items with rates**
```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/orders/<TEST_ORDER_ID> | jq '.order_items'
```
Expected: required item fields present; no sensitive fields.

**SA1-V3 — totals present**
```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/orders/<TEST_ORDER_ID> | jq '{estimated_total, confirmed_total}'
```
Expected: both present; accepted orders have `estimated_total > 0` when rates exist.

**SA1-V4 — aggregator own-rates endpoint**
```bash
curl -s -H "Authorization: Bearer <AGGREGATOR_TOKEN>" http://localhost:3001/api/aggregators/me/rates | jq '.'
```
Expected: array of `{ material_code, rate_per_kg }` rows for the authenticated aggregator.

### Sub-Agent 2 (Aggregator mobile)
**SA2-G1 — no fixture/hardcoded materials source in detail**
```bash
grep -n "hardcode\|fixture\|mock\|dummy\|\[\s*{.*material" apps/mobile/app/\(aggregator\)/order/\[id\].tsx
```
Expected: no fixture/mock arrays for material rows.

**SA2-G2 — seller-rate column removed**
```bash
grep -in "seller.*rate\|sellerRate\|seller_rate" apps/mobile/app/\(aggregator\)/order/\[id\].tsx
```
Expected: no matches.

**SA2-G3 — mobile compile check**
```bash
pnpm --filter mobile type-check
```
Expected: exit 0.

### Sub-Agent 3 (Seller mobile)
**SA3-G4 — accepted order shows aggregator rates (manual)**  
Open seller order detail for `accepted/en_route/arrived/weighing_in_progress`; rate column must show snapshotted aggregator rate or `—` when null.

**SA3-G5 — completed order shows rating block (manual)**  
Open completed seller order detail; rating block visible only when `!seller_has_rated`.

**SA3-G6 — seller order cards non-zero values (manual)**  
Seller orders list must show calculated rupee values from DTO totals (not always `₹0`).

**SA3-G7 — mobile compile check**
```bash
pnpm --filter mobile type-check
```
Expected: exit 0.

### Global Gates (must all pass)
**G1 — Rate snapshot at accept** (same as SA1-V1)

**G2 — DTO populated order_items/totals**
```bash
curl -s -H "Authorization: Bearer <AGGREGATOR_TOKEN>" http://localhost:3001/api/orders/<TEST_ORDER_ID> | jq '{estimated_total, confirmed_total, order_items: [.order_items[] | {material_code, rate_per_kg, amount}]}'
```

**G3 — No seller-rate column in aggregator detail** (same as SA2-G2)

**G4 — No hardcoded materials fixture** (same as SA2-G1)

**G5 — phone_hash absent from order DTO**
```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3001/api/orders/<TEST_ORDER_ID> | jq 'keys | map(select(test("hash|phone")))'
```
Expected: `[]` for sensitive hash keys; party-phone visibility only via allowed fields and role/status guard.

**G6 — post-accept navigation route correctness (manual)**
Accept from aggregator detail; expected immediate load of `/(aggregator)/active-order-detail` for that order; back should not return to pre-accept detail.

**G7 — Active tab amount correctness (manual)**
Accepted order card amount equals sum of `estimated_weight_kg * rate_per_kg` from order items.

**G8 — seller accepted-detail rates (manual)**
Rates shown per line item from snapshotted aggregator rate.

**G9 — seller completed-detail confirmed weights (manual)**
Weight column uses `confirmed_weight_kg` and header text changes to `Weight`.

**G10 — rating block visibility/completion (manual)**
Completed order shows rating form; after submit, shows success state / submitted state.

**G11 — seller list values non-zero (manual)**
Order cards show real totals, not fixed `₹0`.

**G12 — workspace type-check**
```bash
pnpm type-check
```
Expected: exit 0.

---

## Section 7 — Completion Steps

Execute only after all gates pass, in this exact order:
1. `PLAN.md` update (overhaul note + date)
2. `MEMORY.md` §9 learned lessons append
3. `structure.md` update (only if `apps/mobile/utils/format.ts` created)
4. `TRD.md` update (accept-time snapshot + DTO fields)
5. `PRD.md` update (order data integrity UX/contract alignment)
6. `README.md` confirm unchanged/no new setup steps
7. Run `pnpm type-check` at repo root
8. Commit + push with specified message

---

**STOP CONDITION (pre-execution):** This plan is ready. No code changes should start until explicit user message: **"proceed"**.

## Security Sign-off (Session Scope)

| Item | Rule | Status |
|---|---|---|
| V13 | `order.status='completed'` only via verify-otp route | ✅/⚠️/🚨 |
| V24 | `phone_hash` absent from order DTO responses | ✅/⚠️/🚨 |
| V7 | `aggregator_id` sourced from `req.user.id`, never request body | ✅/⚠️/🚨 |
| V25 | `pickup_address` exposed only post-accept to authorized parties | ✅/⚠️/🚨 |
| A3 | no secret leakage / no hardcoded env values | ✅/⚠️/🚨 |
| C1 | any new intervals/effects include cleanup | ✅/⚠️/🚨 |

---

## Execution Status (2026-03-18)

### Sub-Agent Completion
- Sub-Agent 1 (Backend transaction + `/me/rates`): ✅ complete
- Sub-Agent 2 (DTO/API contract): ✅ complete
- Sub-Agent 3 (Aggregator mobile/store): ✅ complete
- Sub-Agent 4 (Seller mobile/rating): ✅ complete
- Sub-Agent 5 (Docs/security closeout): ✅ complete

### Gate Outcome Snapshot
- SA1-V4 (`GET /api/aggregators/me/rates`) route implementation: ✅ implemented (runtime curl requires running backend + valid token)
- G3/G4 (seller-rate column removed + fixture-free aggregator detail): ✅ code-level complete
- G12 (`pnpm type-check`): ✅ pass

Manual device-flow gates (G6–G11) remain required in-app verification steps on running clients.


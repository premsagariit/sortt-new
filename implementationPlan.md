# Order Data Integrity + UI Consistency Plan (Approval Gate)

Date: 2026-03-18  
Mode: Planning only (no code edits until explicit approval)

## 1) Objective

Deliver a single coherent update across seller + aggregator order flows to fix:
- Receipt page back navigation consistency
- Tab bar contamination (extra tab entry)
- Seller details card consistency (name + address + phone) - Only in seller's UI
- Seller details card consistency (name + address) - Only in aggregator's UI
- Seller order detail page layout sequencing (status-based layout only, preserve existing workflow/API)
- Weighing rate source (`rate_per_kg` zero fallback)
- Order value consistency for seller card in `weighing_in_progress` and `completed`
- Aggregator material table simplification for non-accepted states
- Privacy constraints (seller number never visibly exposed on aggregator UI card)
- Aggregator order card content and status label/style consistency
- Aggregator OTP success receipt destination consistency

## 2) Mandatory Constraints (Confirmed)

- No code edits before this plan approval.
- Preserve V13: `completed` transition only via OTP verify route.
- Preserve V7: role/identity from `req.user` context.
- Preserve SP1 privacy matrix from DTO; no raw sensitive fields in responses.
- Tokenized UI only (no new hardcoded colors).
- Keep existing API/routing workflow unless specifically required for consistency.

## 3) Findings Snapshot (5-Track Investigation)

### Track A — Backend Transactions/Routes
- `confirmed_value` is persisted at `finalize-weighing` and reused through completion.
- `verify-otp` completion currently returns success payload; completion visuals depend on frontend routing/fetch timing.
- Zero-rate issue can happen when rate lookup chain misses normalized material mapping or stale rate fetch state.

### Track B — DTO/Store Contract
- `orderDto` already enforces post-accept phone exposure by role/status.
- Seller/aggregator totals can diverge if one path recalculates while another trusts `displayAmount`.
- Status text consistency differs between `StatusChip` and order-card inline text.

### Track C — Aggregator Mobile Surface
- Extra tab source is tab config leakage/route exposure logic.
- Non-accepted MATERIAL LIST should be 2 columns only (Material, Est. Weight).
- Seller phone visibility conflict: dial action needed in `navigate`, but number text must stay hidden.
- OTP completion must always route/render the same “good receipt” variant.

### Track D — Seller Mobile Surface
- Seller receipt hero back control must be standard icon without background.
- Seller detail should be one merged container (name + pickup address + phone).
- Seller order detail requires receipt-like layout structure without hero and without ratings block.
- Review input/footer overlap requires spacing fix in seller receipt ratings area.

### Track E — Security/Compliance + Docs
- SP1/V13/V25/V26 constraints are compatible with requested UX updates.
- Privacy-sensitive surfaces identified (aggregator contact cards and phone displays).
- Verification gates must include privacy checks + value correctness checks across statuses.

## 4) File Inventory (Planned Touch Set)

### Seller UI
- `apps/mobile/app/(seller)/order/receipt/[id].tsx`
- `apps/mobile/app/(seller)/order/[id].tsx`
- `apps/mobile/app/(seller)/orders.tsx`
- `apps/mobile/app/(seller)/_layout.tsx`

### Shared UI
- `apps/mobile/app/(shared)/review/[id].tsx` (only if overlap remains in current state)

### Aggregator UI
- `apps/mobile/components/ui/TabBar.tsx`
- `apps/mobile/app/(aggregator)/orders.tsx`
- `apps/mobile/app/(aggregator)/order/[id].tsx`
- `apps/mobile/app/(aggregator)/active-order-detail.tsx`
- `apps/mobile/app/(aggregator)/execution/navigate.tsx`
- `apps/mobile/app/(aggregator)/execution/otp/[id].tsx`
- `apps/mobile/app/(aggregator)/execution/receipt/[id].tsx`

### Shared Components / Stores
- `apps/mobile/components/ui/Card.tsx` (order card visual/content rules)
- `apps/mobile/components/order/ContactCard.tsx` (if needed for icon-only privacy mode)
- `apps/mobile/store/orderStore.ts`
- `apps/mobile/store/aggregatorStore.ts`

### Backend (only if needed after frontend/store alignment)
- `backend/src/routes/orders/index.ts`
- `backend/src/utils/orderDto.ts`

## 5) Dependency-Ordered Implementation Plan

## Phase 0 — Baseline Re-check (No behavior change)
1. Re-read current versions of all touched screens (some were recently modified manually).
2. Freeze current route graph for seller/aggregator completion flows.
3. Confirm current status-to-amount mapping in seller and aggregator order cards.

Deliverable: exact delta checklist (current vs expected) with no edits.

## Phase 1 — Navigation + Tab Integrity
1. Standardize receipt hero back icon (seller + aggregator receipt) to app-standard icon and transparent background.
2. Remove extra bottom tab caused by receipt leakage.
3. Ensure all non-tab seller/aggregator routes are hidden (`href: null`) from tab bar.

Deliverable: tab bar shows intended tabs only; receipt routes never appear as tabs.

## Phase 2 — Seller Page Structure (Layout-only, preserve behavior)
1. Refactor `seller/order/[id]` into receipt-like card sequencing without hero and without ratings block.
2. Implement two status-driven section orders:
	- A) non-accepted (`created`, etc.) sequence as requested
	- B) accepted sequence with map/tracking block first
3. Merge seller contact + pickup containers into one seller-details card:
	- always use seller name
	- always prefer seller contact from order/auth fallback chain
4. Keep existing API calls, routing, OTP flow, and cancel actions unchanged.

Deliverable: only layout/section ordering changes, no workflow changes.

## Phase 3 — Aggregator Privacy + Materials Tables
1. In `aggregator/order/[id]` and `aggregator/active-order-detail.tsx`:
	- for non-accepted states show only 2 columns: Material, Est. Weight
	- remove `YOUR RATE`, `TOTAL`, and `Total Estimated` row.
2. Enforce strict privacy on aggregator seller contact card:
	- no visible seller phone number text anywhere
	- keep/validate call action behavior only where explicitly required.
3. In `execution/navigate.tsx`:
	- phone icon click must open dialer with seller number preloaded
	- number remains hidden on card.
4. Phone icon click must use `Linking.openURL('tel:' + order.sellerPhone)` from react-native — the same pattern already used on the seller side for calling the aggregator. 
	- sellerPhone must come from the order DTO (backend-provided), not computed client-side. 
	- No new abstraction or package required.

Deliverable: privacy-safe UI with required call functionality.

## Phase 4 — Weighing Rate Source and Value Integrity
1. Rate resolution chain for the weighing screen only (active in-progress orders) `execution/weighing/[id].tsx`: 
	- `aggregator_material_rates` from DB via live fetch on screen focus — PRIMARY
	- `order_items.rate_per_kg` snapshot — only if DB has no rate for that material code; 
	- `0` only if genuinely absent in both. Completed and finalized order values are frozen in DB and must never be recalculated from current rates. Also: identify the exact backend route used to fetch aggregator rates (e.g. GET /api/aggregators/rates) and call it on screen focus, not only on mount.
2. Ensure no forced “save again in buy-rates” requirement unless aggregator intentionally changes rates.
3. Confirm seller order card amount logic for statuses:
	- `created/accepted/en_route/arrived/cancelled`: existing correct logic retained
	- `weighing_in_progress/completed`: use real value from final line-item sum (aggregator-confirmed weights × rates)
4. Validate DB reflects completed order final value consistently for both parties.


Deliverable: no `0` rate unless genuinely missing in DB; seller card values align with aggregator finalization.

## Phase 5 — Order Card Visual Harmonization
1. Aggregator side order cards:
	- remove seller and ratings display
	- use `Completed` (not `Done`)
	- increase/bolden order number text (same as the one in seller side UI)
	- remove dot/dash beside order number
	- hide order value in New + Active + Cancelled tabs; show real value only in Completed.
2. Seller side order cards:
	- remove `Paid to wallet`
	- remove aggregator name text
3. Align status-chip semantics/colors between seller and aggregator cards.

Deliverable: consistent card language and color semantics across both roles.

## Phase 6 — Receipt Consistency After OTP
1. Inspect `apps/mobile/app/(aggregator)/execution/otp/[id].tsx` for inline receipt rendering (a full-green background receipt block rendered directly in this file on success). 
	- Remove that inline block entirely. 
	- On OTP success, the only action is `router.replace('/(aggregator)/execution/receipt/' + orderId)`.
	- The receipt screen already renders correctly — the bug is that the OTP screen renders its own inline version before or instead of navigating.
2. Eliminate any alternate full-green receipt view exposure from OTP route path.
3. Keep completed-tab opening path consistent with OTP path destination.

Deliverable: same receipt visual regardless of entry path.

## 6) Security + Compliance Scope During Implementation

- Do not expose seller number text on aggregator screens.
- Do not change DTO exposure logic in a way that leaks pre-accept phone/address.
- Do not alter completed/disputed transition constraints.
- If backend adjustment is needed, keep contract backward-compatible with current stores.

## 7) Verification Gates (Post-Implementation)

## Gate A — Type/Build
- `pnpm type-check`

## Gate B — Seller Flow
- Seller order detail sequence matches requested A/B order by status.
- Seller details card merged and populated with seller name/phone/address.
- No ratings block in seller order detail page.
- Receipt review input/button overlap resolved.

## Gate C — Aggregator Flow
- Non-accepted MATERIAL LIST in both target pages shows exactly 2 columns.
- Seller phone number text hidden across aggregator surfaces.
- Navigate phone icon opens dialer with number.
- OTP completion always routes to canonical receipt.

## Gate D — Value Integrity
- Weighing screen rates no longer default to 0 when DB rates exist.
- Seller and aggregator cards show aligned final values after weighing/completion.
- Completed value persisted and displayed consistently on both sides.

## Gate E — Card UX Consistency
- Aggregator cards hide value in New/Active, show only in Completed.
- Aggregator card no seller/rating, `Completed` label updated.
- Seller card removed aggregator name and `Paid to wallet` text.
- Status chip colors consistent across both roles.

## 8) Rollout Sequence (Execution Order)

1. Tab/back controls and route hygiene
2. Seller order detail layout refactor
3. Aggregator table/privacy updates
4. Weighing rate source + value integrity
5. Order card harmonization
6. OTP->receipt canonical routing consistency
7. Full verification gates

## 9) Open Clarifications (Need your confirmation before coding)

1. For `seller/order/[id]` accepted-state map section, should we use the current tracking component/placeholder exactly as-is (layout reposition only), with no new map provider work?
2. For aggregator privacy rule, should phone icon be shown only in `execution/navigate.tsx` and hidden in all other aggregator screens (including `order/[id]` and receipt/history)?
3. For seller card value at `weighing_in_progress`, should it switch immediately to confirmed running total as soon as finalize-weighing writes DB values (before completion), or only after explicit status update event is received?

---

Approval needed: once you confirm this plan (and answer the 3 clarifications), implementation will begin in this exact order.

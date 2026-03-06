# Implementation Plan: Aggregator Order Flow Behavior Fixes

This plan outlines the specific steps to resolve six behavior fixes for the Aggregator Order Flow in the Sortt mobile app.

## Batch 1: Pre-Acceptance Fixes (Fix 1, Fix 3)
Files to modify:
- `apps/mobile/store/aggregatorStore.ts`
- `apps/mobile/app/(aggregator)/home.tsx`
- `apps/mobile/app/(aggregator)/orders.tsx`
- `apps/mobile/app/(shared)/order/[id].tsx`

**Fix 1 (Chat Visibility):**
- **Action:** Ensure "Chat with Seller" is strictly hidden on pre-acceptance orders.
- **Rule:** Check uses ownership + status, not just userType.

**Fix 3 (Local Dismissal):**
- **Action:** Add `dismissedOrderIds` tracking to the global Zustand store in `aggregatorStore.ts`.
- **Logic:** When clicking "Reject" on pre-acceptance orders, append the ID to `dismissedOrderIds` and filter it out of feed displays locally without calling the API to cancel it.

## Batch 2: Reject Button UI & Cancel Modal (Fix 2, Fix 4)
Files to modify:
- `apps/mobile/app/(aggregator)/home.tsx`
- `apps/mobile/app/(shared)/order/[id].tsx`
- `apps/mobile/components/domain/CancelOrderModal.tsx` [NEW]

**Fix 2 (Reject Button UI):**
- **Action:** Replace the cross icon with a `SecondaryButton` labelled "Reject".
- **Styling:** Provide a danger styling scheme, e.g. text color `colors.red` and border `colors.red`.

**Fix 4 (Post-Acceptance Cancellation):**
- **Action:** For accepted orders, tapping "Cancel" opens the newly created `CancelOrderModal.tsx` component.
- **Logic:** Submitting this bottom sheet effectively cancels the order (moving it to the "Cancelled" tab and updating the status).

## Batch 3: Acceptance & Navigation (Fix 5)
Files to modify:
- `apps/mobile/app/(shared)/order/[id].tsx` 

**Fix 5 (Order Acceptance Flow):**
- **Action:** When "Accept Order" is clicked:
  - Add logic to transition order state to `accepted` (this should remove it from the strict "Feed").
  - Automatically route the user to the execution flow (`router.push('/(aggregator)/execution/navigate')`).

## Batch 4: Text Replacement (Fix 6)
**Fix 6 (Text Replacement):**
- **Action:** Search for "En Route" display text and replace it with "On The Way!".
- **Constraint:** Status code value must remain `en_route` in the backend payload/types.
- **Target Files:** `StatusChip.tsx`, Timeline components, etc.

## State & Data Wiring
### 1. Store Action Signatures (aggregatorStore.ts)
The following actions must be added:
- `dismissOrder(orderId: string): void`
- `acceptOrder(orderId: string): void`
- `cancelOrder(orderId: string, reason: string): void`

### 2. Mock Data Seed
Documenting specific seed entries to verify logic against:
- `order-agg-001`: status `'created'`, no `aggregatorId` — visible in the nearby feed.
- `order-agg-002`: status `'accepted'`, `aggregatorId` = `'user-agg-001'` — visible in the Active tab.

### 3. Day 7 Wiring Plan
For subsequent phases, these actions will slot into real API calls as follows:
- `dismissOrder` → `POST /api/orders/:id/dismiss` (optional analytics, local filter unchanged)
- `acceptOrder`  → `POST /api/orders/:id/accept` (replaces local status change)
- `cancelOrder`  → `PATCH /api/orders/:id/status { status: 'cancelled', reason }`

## BSE Numbered Finding List
- **BSE-1:** Chat check uses ownership + status, not userType → PASS/BLOCK
- **BSE-2:** dismissOrder is local-only, no status change → PASS/BLOCK
- **BSE-3:** cancelOrder only callable when aggregatorId === authStore.userId → PASS/BLOCK
- **BSE-4:** en_route status code unchanged → PASS/BLOCK
- **BSE-5:** No hardcoded hex in new components → PASS/WARN

# SCR Checklist
- [ ] No hardcoded hex values (use tokens file)
- [ ] UI is responsive and meets minimal 48dp touch targets
- [ ] `safeBack` utility used universally for navigation
- [ ] `pnpm type-check` passes with 0 errors

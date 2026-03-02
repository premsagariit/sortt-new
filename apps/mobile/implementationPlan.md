# Implementation Plan: Home + Listing Wizard UI Alignment (S11–S18)

## Overview
This task closes all visual gaps for the Seller Home screen (S11) and the 4-step Listing Wizard (S14–S18) according to the specifications in `sortt_seller_ui.html` and `differences.md` (§5–10). This is strictly a UI-only task; no existing logic, routes, API calls, or Zustand mappings will be altered.

## Relevant MEMORY.md Lessons & TRD Rules
- **Rule 9 (TRD §10):** AI outputs should only serve as UI hints and never directly mutate the definitive store or model without explicit user confirmation.
- **Scroll Compression Radius (MEMORY.md):** The navy greeting strip at the top of the Home screen must have a bottom border-radius of `0`.
- **DM Mono Typography (MEMORY.md):** All numeric data (prices, weights, earnings, dates, times) MUST use the `DM Mono` font family.
- **Component Mocking for Adornments (MEMORY.md):** When a global text input component does not natively support an ad-hoc icon or suffix that is only needed once, an ad-hoc wrapper around standard `Text` should be used to simulate a disabled input if the input isn't interactive.
- **Hardcoded Hex Rule (MEMORY.md):** Zero hardcoded hex colors except where overlay transparencies over absolute photos/images structurally demand an `rgba` formula (such as `rgba(0,0,0,0.6)` for badges), which will be explicitly documented with standard comments.
- **SafeAreaView Usage (MEMORY.md):** `SafeAreaView` from `react-native-safe-area-context` with `edges={['bottom']}` is universally required.

## Changed Files & Actions

### 1. `apps/mobile/app/(seller)/home.tsx` (Reference: id="s-home", id="s-home-empty", id="s-home-skeleton")
*   **Change 1 — Remove back button from NavBar:** Clean up unused `onBack` or left action hooks so that no back button appears on this root tab.
*   **Change 2 — NavBar brand content:** **CRITICAL UPDATE**: We MUST use `<NavBar />` from `components/ui/NavBar.tsx` with `variant="dark"`. Instead of "Sortt SELLER" centered, we will clear the title and pass a custom left element (or rely on absolute placement within the layout if `NavBar` lacks a left element slot, though since we remove `onBack`, we can render the brand mark where the title usually goes, or absolute position it on the left of the `NavBar` container). Actually, since `NavBar` centers the `title` and has a `rightAction`, we might need to cleverly overlay the brand text or inject it as a sibling to `<NavBar />` if no leftAction prop is available, or modify `home.tsx` layout to position it. Wait, `NavBar` is strict. I will render "♻ {APP_NAME}" (imported) absolutely on top of the NavBar's left side padding, or modify `NavBar`'s usage. The user said: "use NavBar (variant="dark") using the brand mark as a custom left element". The current `NavBar` doesn't expose a `leftAction`, only `onBack` and `rightAction`. I will have to either absolute position the brand mark over it, or we handle it gracefully. The right side will carry a stroked Bell icon and a navy circular avatar with "R".
*   **Change 3 — Stat card labels:** Adjust copy to "Total earned", "Pickups done", and "Active orders". The active label shifts formatting into `colors.teal` and `DM Mono`.
*   **Change 4 — Today's Rates Section:** Update the heading grouping to "Today's Rates" on the left and a "See all →" red routing link to `/(seller)/browse` on the right.
*   **Change 5 — Active Orders Heading:** Similarly update the order lists' heading grouping to "Active Orders" on the left and a red "View all →" to `/(seller)/orders` on the right.
*   **Change 6 — Active order card format:** Relocate aggregator data from the bottom string directly underneath the Order ID (top-left left-aligned column). Modify Order ID into `DM Mono` `11px`.
*   **Change 7 — Ad banner:** Pre-spacer full-width promotional banner block added identically matching S11's bottom specification.
*   **Change 8 — Empty state (S14):** Remove any list skeletons and plug in the custom centered graphical mock matching S14. Reset dummy values in empty state strictly to "—", "0", and "0" using `DM Mono`.
*   **Change 9 — Skeleton Loading state (S15)**: Implement the skeleton state (when `isLoading` is true) using `<SkeletonLoader />` from `components/ui/SkeletonLoader.tsx`:
    - NavBar right: skeleton circle (32×32, shape built from `<SkeletonLoader>` or regular View with skeleton color) instead of avatar.
    - Greeting strip: three skeleton rects (80×13, 150×22, 110×26 border-radius 20).
    - Stats strip: skeleton value + label blocks per card.
    - Rates section: heading skeleton + two skeleton rate card rows.
    - Orders section: heading skeleton + one full-width 100×12 border-radius block.

### 2. `apps/mobile/app/(seller)/listing/step1.tsx` (Reference: id="s-list1")
*   **Change 1 — NavBar:** Set variant to `light`, title left-aligned "List Scrap", adding "Step 1 of 4" step indicator typography in the `rightAction` prop constraint.
*   **Change 2 — Progress bar:** Generate a standard pre-scroll global strip with a backgrounded track and 25% navy-filled metric.
*   **Change 3 — Info banner:** Implement an informational block preceding primary CTAs representing selected properties ("2 materials selected. Our AI will verify from your photo...").
*   **Change 4 — Primary CTA button:** Standardize text strictly to "Next →".

### 3. `apps/mobile/app/(seller)/listing/step2.tsx` (Reference: id="s-list2" and id="s-list2-ai")
*   **Change 1 — NavBar:** Configure identically to `step1.tsx` with parameter shifts ("Step 2 of 4").
*   **Change 2 — Progress bar:** Generate identical container logic but configured mechanically for 50% navy-fill metric.
*   **Change 3 — Page heading:** Shift copy into "Add a photo & enter weights" with subtitle "Photo is required · AI will analyse your scrap pile".
*   **Change 4 — Photo upload zone (No Photo State):** Remap the upload module replacing simple buttons with the 1.5px dashed border graphical interactive placeholder.
*   **Change 5 — Weights section heading (No Photo State):** Set copy from "Estimated Weights" into "Approximate Weights".
*   **Change 6 — Warning banner (No Photo State):** Construct the AMBER context-banner specifying "Approximate weight is fine here."
*   **Change 7 — CTA button (No Photo State):** Deactivate interactions and mutate text label dynamically into "Next → (Add photo first)".
*   **Change 8 — Photo thumbnail (Photo Added State):** Enclose chosen inputs within a 150px constrained visual block matching border spec, inserting absolute badge component ("✓ Photo added" `rgba(0,0,0,0.6)` bg logic).
*   **Change 9 — AI badge (Photo Added State):** Deconstruct old typography parameters and reconstruct the full "AI ESTIMATE" complex structural card, establishing static parameters logically tied to mock references.
*   **Change 10 — Weights section heading (Photo Added State):** Set structural copy from "Estimated" to "Confirm Weights", applying graphical `teal` parameter updates to any form fields validating automated entry conditions.
*   **Change 11 — Notes textarea (Photo Added State):** Mount a multiline textual block underneath the verified weights specifically isolated to the Photo Added scenario.
*   **Change 12 — CTA button in state B:** Change to active "Next →".

### 4. `apps/mobile/app/(seller)/listing/step3.tsx` (Reference: id="s-list3")
*   **Change 1 — NavBar:** Standard update ("Step 3 of 4").
*   **Change 2 — Progress bar:** Fill parameter shifts to 75%.
*   **Change 3 — Page heading:** Shift to single block "Pickup preference".
*   **Change 4 — Pickup type option labels:** Overhaul toggle block into complex description labels linking 🏠/🏪 indicators visually with absolute checkmarks.
*   **Change 5 — Address input:** Update textual components into static text variables aligned as simulated inputs, appending Map graphical mock underneath.
*   **Change 6 — Date selection:** Delete standard pill variants. Code horizontal scroll module managing formatted numerical/chronological slots simulating dynamic constraints ("Selected", "Disabled").
*   **Change 7 — Time selection:** Formulate dual-row flex grid maintaining 6 independent 3-column slots managing similar formatting and simulated constraints.
*   **Change 8 — CTA button:** Set identically to "Next →".

### 5. `apps/mobile/app/(seller)/listing/step4.tsx` (Reference: id="s-list4")
*   **Change 1 — NavBar:** Standard update ("Review & Submit", "Step 4 of 4").
*   **Change 2 — Progress bar:** Fill parameter updates to `100%`. Color updates to `teal`.
*   **Change 3 — Earnings Calculator card:** Modify simple mock typography bounds to complex row-based calculations matching tabular parameter layout mapping "Metal" / "Paper" to dynamic output bounds.
*   **Change 4 — Earnings total block:** Inject unified graphic header logic projecting dynamic outputs above warning textual strings.
*   **Change 5 — Listing summary card:** Build secondary static informational breakdown listing inputs ("Materials", "Address", "Window") appending specific visual formatting strings linked implicitly with backwards navigation strings ("Edit").
*   **Change 6 — Info banner:** Implement bottom informational parameter text ("Your listing will be sent...").
*   **Change 7 — Remove Cancel button:** Standard bottom row isolation mechanics.
*   **Change 8 — CTA button:** Unify to "Submit Listing →".

## Risks and Clarifications
- We are maintaining mock logic throughout steps. The `AI Estimate` structural badge will only parse fixed values without altering `listingStore` or modifying state representations, adhering absolutely strictly to TRD rule 9 constraints regarding static estimates representing UI hints ONLY.

## Verification Checklist
- Once files are applied, Developer verification using `pnpm dev:mobile` and loading `Expo Go` must strictly conform to identical layout outputs parsing no native `Error` boundaries globally.
- TypeScript compiler (`npx tsc --noEmit`) verified error-free following application.

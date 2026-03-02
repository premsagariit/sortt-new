# UI_REFERENCE.md — Sortt Mobile App
> **Version:** 2.0 | **Last updated:** 2026-03-02
> **Status:** Authoritative reference for ALL screen implementations — Seller (Day 2) and Aggregator (Day 3).

---

## ⚠️ MANDATORY — HOW EVERY AGENT MUST USE THIS FILE

Before writing **a single line of code** for any screen, the implementing agent (FE, UXD, SPM) must:

1. **Open the canonical HTML reference** in a browser. Two files exist:
   - `sortt_seller_ui.html` → Seller screens
   - `sortt_aggregator_ui.html` → Aggregator screens

2. **Navigate to the exact screen ID** listed in the Screen Index tables below (§3 and §4). Use the sidebar in the HTML file to click to that screen.

3. **Read every visible element** on that screen: NavBar variant, greeting strip (if present), card structure, chip colours, button placement, typography variant (DM Sans vs DM Mono for numerics), empty/skeleton/error states visible in adjacent screens.

4. **Map each HTML CSS variable to a token** before writing styles. The mapping table is in §6.

5. **Cross-check routing** in §5 before adding any `router.push` or `router.replace` call.

The HTML reference is the **single source of truth** for visual design. If there is any conflict between this document and the HTML file, the **HTML file wins**. Raise a PRD/TRD CONFLICT flag if the HTML contradicts a security rule.

---

## 1. Canonical Reference Files

| File | Covers | Location |
|---|---|---|
| `sortt_seller_ui.html` | All seller screens (auth, onboarding, home, listing, orders, browse, profile) | Project root |
| `sortt_aggregator_ui.html` | All aggregator screens (onboarding, home, feed, orders, execution flow, route, earnings, price mgmt, profile, shared) | Project root |

Both files use the same CSS variable system. Variables map directly to `constants/tokens.ts`. See §6 for the full mapping.

---

## 2. Global Design Rules (applies to ALL screens)

These rules are non-negotiable. Any agent producing output that violates these is in breach of MEMORY.md.

| Rule | Specification |
|---|---|
| **Colour source** | Zero hardcoded hex values. All colours from `constants/tokens.ts` exclusively. |
| **Font — body/labels** | DM Sans for all UI text, labels, buttons, headings, copy. |
| **Font — numbers** | DM Mono for ALL rupee amounts (₹), weights (kg), OTP digits, order IDs, timestamps, countdown timers. |
| **Touch targets** | Minimum 48dp height AND width on every tappable element. |
| **Primary CTA** | Exactly ONE `PrimaryButton` (red) per screen. Full-width block. Never more than one. |
| **Secondary actions** | White background, `1px colors.border` border. No coloured fill except status chips and material chips. |
| **Spacing grid** | 8px base. All margins and paddings must be multiples of 8. |
| **Border radius** | Cards: `12px`. Inputs: `10px`. Chips/pills: `20px`. CTA buttons: `14px`. |
| **Shadows** | Zero shadows anywhere. Hierarchy via background contrast only. |
| **Icons** | Phosphor Icons. Use the `weight` prop API — not suffix exports. |
| **APP_NAME** | Always from `constants/app.ts`. Never the hardcoded string "Sortt". |
| **3-tap rule** | Aggregator primary actions (accept order, submit weights, confirm OTP) must be reachable in 3 taps or fewer from the home screen. This is a hard UX constraint — not a guideline. |
| **Numeric colour** | All currency and weight figures in DM Mono + `colorExtended.amber`. |
| **Hero/NavBar bg** | `colors.navy` (`#1C2E4A`). |
| **Surface bg** | `colors.surface` (white). |
| **Card border** | `1px solid colors.border`. |
| **PII pre-acceptance** | Pre-acceptance order views must show locality only — never full address. Full address appears ONLY after the aggregator accepts. This is enforced at the DTO level (V25) — the UI must also not render fields that are not in the response. |

---

## 3. Seller Screen Index

> Seller screens are complete (Day 2). This index is provided for reference and for shared screens that aggregator views also use.

| Screen Name | HTML ID (in `sortt_seller_ui.html`) | File Path |
|---|---|---|
| Splash Screen | `s-splash` | `apps/mobile/app/index.tsx` |
| Onboarding Slide 1 | `s-onboard1` | `apps/mobile/app/(auth)/onboarding.tsx` |
| Onboarding Slide 2 | `s-onboard2` | `apps/mobile/app/(auth)/onboarding.tsx` |
| Onboarding Slide 3 | `s-onboard3` | `apps/mobile/app/(auth)/onboarding.tsx` |
| User/Account Type | `s-user-type`, `s-account-type` | `apps/mobile/app/(auth)/account-type.tsx` |
| Phone Entry | `s-phone` | `apps/mobile/app/(auth)/phone.tsx` |
| OTP Verify | `s-otp` | `apps/mobile/app/(auth)/otp.tsx` |
| Seller Profile (Individual) | `s-profile-ind` | `apps/mobile/app/(auth)/profile.tsx` |
| Seller Profile (Business) | `s-profile-biz` | `apps/mobile/app/(auth)/profile.tsx` |
| Seller Home | `s-home`, `s-home-empty` | `apps/mobile/app/(seller)/home.tsx` |
| Listing Step 1 — Materials | `s-list1` | `apps/mobile/app/(seller)/listing/step1.tsx` |
| Listing Step 2 — Weights/Photo | `s-list2`, `s-list2-ai` | `apps/mobile/app/(seller)/listing/step2.tsx` |
| Listing Step 3 — Pickup Prefs | `s-list3` | `apps/mobile/app/(seller)/listing/step3.tsx` |
| Listing Step 4 — Review | `s-list4` | `apps/mobile/app/(seller)/listing/step4.tsx` |
| Orders List | `s-orders-active`, `s-orders-completed`, `s-orders-empty` | `apps/mobile/app/(seller)/orders.tsx` |
| Order Detail (pre-accept) | `s-order-pre` | `apps/mobile/app/(shared)/order/[id].tsx` |
| Order Detail (post-accept) | `s-order-post` | `apps/mobile/app/(shared)/order/[id].tsx` |
| Order Detail (en route) | `s-order-enroute` | `apps/mobile/app/(shared)/order/[id].tsx` |
| OTP Confirmation | `s-otp-confirm` | `apps/mobile/app/(shared)/otp-confirm.tsx` |
| Transaction Receipt | `s-receipt` | `apps/mobile/app/(shared)/receipt/[id].tsx` |
| Rate & Review | `s-review` | `apps/mobile/app/(shared)/review.tsx` |
| Prices/Browse | `s-prices`, `s-browse` | `apps/mobile/app/(seller)/browse.tsx` |
| Aggregator Public Profile | `s-agg-profile` | `apps/mobile/app/(shared)/aggregator/[id].tsx` |
| Seller Profile & Settings | `s-profile-seller`, `s-settings` | `apps/mobile/app/(seller)/profile.tsx` |
| Help | `s-help` | `apps/mobile/app/(seller)/help.tsx` |
| Notifications | `s-notifications` | `apps/mobile/app/(shared)/notifications.tsx` |
| In-App Chat | `s-chat` | `apps/mobile/app/(shared)/chat/[id].tsx` |
| Dispute | `s-dispute` | `apps/mobile/app/(shared)/dispute.tsx` |
| Business Dashboard | `s-biz-dash` | `apps/mobile/app/(seller)/business/dashboard.tsx` |
| Business Invoices | `s-biz-invoices` | `apps/mobile/app/(seller)/business/invoices.tsx` |
| Business Team | `s-biz-team` | `apps/mobile/app/(seller)/business/team.tsx` |

---

## 4. Aggregator Screen Index

> **Day 3 build target.** Open `sortt_aggregator_ui.html` and use the left sidebar to navigate to each screen before building it.

### 4.1 Auth / Shared (reused from Seller)

The aggregator reuses the existing auth screens. No new files required for these:

| Screen | HTML ID (in `sortt_aggregator_ui.html`) | File Path (reused) |
|---|---|---|
| Splash | `s-splash` | `apps/mobile/app/index.tsx` (existing) |
| Onboarding 1–3 | `s-onboard1`, `s-onboard2`, `s-onboard3` | `apps/mobile/app/(auth)/onboarding.tsx` (existing) |
| User Type Selection | `s-user-type` | `apps/mobile/app/(auth)/account-type.tsx` (existing) |
| Phone Entry | `s-phone` | `apps/mobile/app/(auth)/phone.tsx` (existing) |
| OTP Verify | `s-otp` | `apps/mobile/app/(auth)/otp.tsx` (existing) |

### 4.2 Aggregator Onboarding (NEW — Day 3)

These are NEW screens. Each must be created from scratch, referencing the HTML.

| Screen | HTML ID | File Path | Step # |
|---|---|---|---|
| Profile Setup | `s-agg-profile-setup` | `apps/mobile/app/(auth)/aggregator/profile-setup.tsx` | Step 1/4 |
| Operating Area | `s-agg-area-setup` | `apps/mobile/app/(auth)/aggregator/area-setup.tsx` | Step 2/4 |
| Materials & Rates | `s-agg-materials-setup` | `apps/mobile/app/(auth)/aggregator/materials-setup.tsx` | Step 3/4 |
| KYC Document Upload | `s-agg-kyc` | `apps/mobile/app/(auth)/aggregator/kyc.tsx` | Step 4/4 |
| KYC Pending Approval | `s-agg-kyc-pending` | `apps/mobile/app/(auth)/aggregator/kyc-pending.tsx` | Post-submit |

**Onboarding layout pattern (from HTML):**
- NavBar: `light` variant. Left: back chevron. Centre: step title ("Set Up Profile"). Right: "Step N of 4" in `colors.muted`.
- Progress bar: thin strip below NavBar (inside a `colors.surface` container with `colors.border` bottom border). Fill width = step/4 as percentage.
- Form fields use `input-group` → `input-label` → `input-field` pattern. All styled with `colors.border` border and `colors.surface` background.
- Business type picker: two side-by-side `type-card` components (Shop-Based / Mobile Aggregator). Selected card gets `colors.navy` border and `colors.navy` text.
- Material chips: `MaterialChip` multi-select grid. Selected chips show their material colour. Unselected: `colors.surface` bg + `colors.border` border.
- Rate entry: per-material, DM Mono input. Market reference hint in `colors.muted` below each input.
- Operating hours: day-of-week toggle row + time range. Day pills: active = `colors.navy` bg + white text; inactive = `colors.surface` bg + `colors.muted` text.
- KYC screen: two upload cards (Aadhaar front, shop/vehicle photo). Each shows a camera icon placeholder + "Tap to upload" copy before upload; thumbnail after upload.
- KYC Pending: full-screen centred layout. Teal circle check icon. Headline: "Profile Under Review". Sub: "We'll notify you on WhatsApp once approved." NO primary CTA (user must wait).

### 4.3 Aggregator Home (NEW — Day 3)

| Screen | HTML ID | File Path |
|---|---|---|
| Home — with orders | `s-home` | `apps/mobile/app/(aggregator)/home.tsx` |
| Home — empty | `s-home-empty` | `apps/mobile/app/(aggregator)/home.tsx` |
| Home — skeleton | `s-home-skeleton` | `apps/mobile/app/(aggregator)/home.tsx` |

**Home layout pattern (from HTML):**
- The home screen has a collapsing header (`agg-home-header`) that compresses on scroll. Threshold is 80px scroll depth (`wireHomeScroll()` function in the HTML).
- Header contains: online/offline toggle pill + greeting ("Good morning, Vijay") + today's stats strip (orders completed, earnings today in DM Mono).
- Stats strip: two metric chips — "X orders" and "₹X,XXX today". Amber colour for ₹ value.
- Below header (in scroll area): price index strip → nearby orders list.
- Price index strip: "LIVE" label in `colors.muted` uppercase + material rate chips in DM Mono amber.
- Order cards in the feed: `OrderCard` showing material chip(s), locality pill (NOT full address — V25), estimated weight (DM Mono), estimated ₹ value (DM Mono amber), time-since-posted label.
- Empty state: centred illustration + "No orders nearby right now" + "We'll notify you when a new order matches your area."
- Skeleton state: 3 skeleton `OrderCard` placeholders.

### 4.4 Aggregator Order Feed (NEW — Day 3)

| Screen | HTML ID | File Path |
|---|---|---|
| Order Feed | `s-feed` | `apps/mobile/app/(aggregator)/orders.tsx` |
| Feed — Empty | `s-feed-empty` | `apps/mobile/app/(aggregator)/orders.tsx` |
| Order Detail — Pre-Acceptance | `s-feed-detail` | `apps/mobile/app/(aggregator)/orders.tsx` or `(shared)/order/[id].tsx` (aggregator view) |

**Feed layout pattern (from HTML):**
- NavBar: `dark` variant. Title: "Order Feed". Right side: filter icon.
- Filter bar below NavBar: horizontal scroll row of filter chips (All, Metal, Plastic, Paper, etc.). Active chip: filled with material colour.
- Order cards: same `OrderCard` used on home, but with explicit "Accept" button visible directly on the card.
- Pre-acceptance order detail: locality only, quantised map pin placeholder, material breakdown list, estimated weight + estimated ₹ in DM Mono. `PrimaryButton` "Accept Order" at bottom. 409 conflict state: overlay card "Order just taken" + back button.

### 4.5 Aggregator My Orders (NEW — Day 3)

| Screen | HTML ID | File Path |
|---|---|---|
| My Orders — Active | `s-my-orders-active` | `apps/mobile/app/(aggregator)/my-orders.tsx` |
| My Orders — Completed | `s-my-orders-completed` | `apps/mobile/app/(aggregator)/my-orders.tsx` |
| My Orders — Cancelled | `s-my-orders-cancelled` | `apps/mobile/app/(aggregator)/my-orders.tsx` |
| My Orders — Empty | `s-my-orders-empty` | `apps/mobile/app/(aggregator)/my-orders.tsx` |

**My Orders layout pattern:**
- Tab row at the top: Active · Completed · Cancelled. Underline-style tab indicator in `colors.red`.
- Active order card: status chip + material chips + seller locality + status action button ("Mark En Route" / "Mark Arrived" / "Start Weighing"). The action button is a `SecondaryButton` (not primary — primary is reserved for the bottom CTA of the active flow screen).
- Completed order card: final amount in DM Mono amber + "View Receipt" link.

### 4.6 Aggregator Order Execution Flow (NEW — Day 3)

This is the most critical aggregator flow. Each screen must be pixel-perfect and follow the security rules strictly.

| Screen | HTML ID | File Path | Security Rule |
|---|---|---|---|
| Order Accepted — Navigate to Seller | `s-order-accepted` | `apps/mobile/app/(aggregator)/execution/navigate.tsx` | V25: Full address now revealed |
| Order En Route | `s-order-enroute` | `apps/mobile/app/(aggregator)/execution/navigate.tsx` | — |
| Order Arrived | `s-order-arrived` | `apps/mobile/app/(aggregator)/execution/arrived.tsx` | — |
| Weighing Screen | `s-order-weighing` | `apps/mobile/app/(aggregator)/execution/weighing.tsx` | AI output = hint only (Rule 9) |
| Pickup Confirmation (OTP Verified) | `s-pickup-confirm` | `apps/mobile/app/(aggregator)/execution/confirm.tsx` | OTP entry; immutable after |
| Pickup Receipt | `s-pickup-receipt` | `apps/mobile/app/(aggregator)/execution/receipt.tsx` | — |

**Execution flow layout patterns (from HTML):**

*Navigate to Seller (post-acceptance):*
- Full address now visible (V25 — address revealed only post-accept).
- Seller name + last 4 digits of phone (e.g. "Priya ••••6721").
- `PrimaryButton` "Get Directions" (launches maps via `IMapProvider`).
- Secondary: "Chat with Seller" → routes to `(shared)/chat/[id].tsx`.
- Status progression row: Mark En Route → Mark Arrived → Start Weighing.

*Weighing Screen:*
- Scale photo capture card: camera icon placeholder + "Take scale photo" label. Mandatory — "Send for Confirmation" button disabled until photo captured.
- Per-material weight entry: one DM Mono input per material. Keyboard type: `numeric`.
- Running total: DM Mono, `colorExtended.amber`, large font. Updates live as weights entered.
- `PrimaryButton` "Send for Seller Confirmation" — disabled until ALL weights > 0 AND scale photo captured.
- AI-suggested weights: shown as `colors.muted` hint text below each input if Gemini returns a suggestion. Label: "AI estimate: ~X kg". These are read-only hints — the aggregator always manually enters the confirmed value.

*Waiting for OTP:*
- Full-screen "Waiting for seller..." state with animated pulse (use `Animated.loop`).
- Read-only transaction summary above the pulse animation (materials, weights, total ₹ in DM Mono).
- Timeout state: after 3 minutes, show "Resend confirmation to seller" secondary button.

*Pickup Confirmation (OTP verified):*
- Transaction summary (final confirmed weights + amounts in DM Mono).
- "Pickup Complete" success state. Teal checkmark icon.
- `PrimaryButton` "View Receipt".

*Pickup Receipt:*
- Full receipt: order ID (DM Mono), date, materials table (weight + ₹ per material), total (DM Mono amber, large).
- Share / download buttons as secondary actions.

### 4.7 Aggregator Route Screen (NEW — Day 3)

| Screen | HTML ID | File Path |
|---|---|---|
| Route Planner | `s-route` | `apps/mobile/app/(aggregator)/route.tsx` |

**Route layout pattern (from HTML):**
- NavBar: `dark` variant. Title: "Route Planner".
- Map placeholder: full-width rectangular container with `colors.border` border and a subtle map-grid SVG background. Label: "Map coming soon" in `colors.muted`. Use `IMapProvider` stub — do NOT import Google Maps SDK directly.
- Below map: list of pending order pins with address locality and material chips.
- `PrimaryButton` "Plan Route" — disabled in static (Day 3). Add `disabled` prop + tooltip "Available after accepting orders".

### 4.8 Aggregator Earnings Screen (NEW — Day 3)

| Screen | HTML ID | File Path |
|---|---|---|
| Earnings Dashboard | `s-earnings` | `apps/mobile/app/(aggregator)/earnings.tsx` |

**Earnings layout pattern (from HTML):**
- NavBar: `dark` variant. Right side: two tab chips "This Week" / "This Month". Active chip: `colors.red` background.
- Hero metric card: month label in `colors.muted` + total earnings in DM Mono (36px, amber) + "Total earnings" label + trend indicator (▲/▼ % vs previous period).
- Bar chart: use `recharts` BarChart component (or a custom SVG bar chart for React Native). Bars: past days in `colors.muted`, today in `colors.red`.
- Material breakdown section: list of materials with ₹ earned per material (DM Mono) + weight collected (DM Mono).
- Completed orders list below: compact order cards showing order ID (DM Mono), date, total ₹ (DM Mono amber).
- Average rating: star display + numeric rating (DM Mono) + review count.

### 4.9 Aggregator Price Management (NEW — Day 3)

| Screen | HTML ID | File Path |
|---|---|---|
| Price Management | `s-price-mgmt` | `apps/mobile/app/(aggregator)/price-mgmt.tsx` |

**Price management layout pattern (from HTML):**
- NavBar: `light` variant. Title: "My Buy Rates".
- Per-material card: `MaterialChip` label + DM Mono input for ₹/kg + "Market today: ₹XX/kg" hint in `colors.muted`.
- Last updated timestamp in `colors.muted` at the top of the list.
- `PrimaryButton` "Save Rates" at the bottom.
- Note copy below button: "These are the rates you offer sellers. They're shown on your public profile." — `colors.muted`, small text.

### 4.10 Aggregator Profile (NEW — Day 3)

| Screen | HTML ID | File Path |
|---|---|---|
| Aggregator Profile | `s-profile` | `apps/mobile/app/(aggregator)/profile.tsx` |
| Settings | `s-settings` | `apps/mobile/app/(aggregator)/settings.tsx` |
| Notifications | `s-notifications` | `apps/mobile/app/(shared)/notifications.tsx` (shared) |

**Profile layout pattern (from HTML):**
- Dark NavBar hero with avatar, name, KYC status chip, star rating (DM Mono) + review count.
- Sections: operating area, materials handled (MaterialChip row), buy rates table, operating hours, reviews list.
- Settings section links at the bottom: Notifications, Help, Log Out.

### 4.11 Shared Screens (Aggregator Side)

| Screen | HTML ID | File Path |
|---|---|---|
| In-App Chat (aggregator view) | `s-chat` | `apps/mobile/app/(shared)/chat/[id].tsx` (existing — reuse) |
| Rate & Review (aggregator rates seller) | `s-review` | `apps/mobile/app/(shared)/review.tsx` (existing or create) |
| File a Dispute | `s-dispute` | `apps/mobile/app/(shared)/dispute.tsx` (existing — reuse) |
| Daily Price Index | `s-price-index` | `apps/mobile/app/(shared)/price-index.tsx` |

---

## 5. Aggregator Routing Map

### 5.1 Tab Structure

The aggregator has **5 tabs** (not 4). This is a hard rule from MEMORY.md.

```
(aggregator)/
├── _layout.tsx          ← 5-tab layout: Home · Orders · Route · Earnings · Profile
├── home.tsx             ← Tab 1: Home feed + stats
├── orders.tsx           ← Tab 2: My Orders (active/completed/cancelled)
├── route.tsx            ← Tab 3: Route Planner (map)
├── earnings.tsx         ← Tab 4: Earnings Dashboard
└── profile.tsx          ← Tab 5: Profile + Settings
```

**Tab bar config in `_layout.tsx`:**
- Use the existing `TabBar` component from `components/ui/TabBar.tsx`.
- Pass `userType="aggregator"` prop to render the 5-tab aggregator config.
- Tab icons (Phosphor): House → Feed → MapTrifold → ChartBar → UserCircle.
- Active tab indicator: `colors.red` underline or filled icon.

### 5.2 Onboarding Routing

The aggregator onboarding is a **4-step wizard** inside `(auth)/aggregator/`. Use Zustand (`aggregatorStore.ts`) to hold wizard state. Do NOT pass wizard data via URL params.

```
Entry → (auth)/phone.tsx (existing, shared)
      → (auth)/otp.tsx (existing, shared)
      → (auth)/account-type.tsx (existing, shared — aggregator selects "Kabadiwalla/Aggregator")
      → (auth)/aggregator/profile-setup.tsx   [Step 1]
      → (auth)/aggregator/area-setup.tsx       [Step 2]
      → (auth)/aggregator/materials-setup.tsx  [Step 3]
      → (auth)/aggregator/kyc.tsx              [Step 4]
      → (auth)/aggregator/kyc-pending.tsx      [Post-submit — awaiting review]
```

After KYC approval (future — backend Day 5), the app routes to `(aggregator)/home`.

### 5.3 Order Execution Routing

The execution flow lives in `(aggregator)/execution/` and is NOT a tab. It's a stack pushed on top of the Orders tab.

```
(aggregator)/orders.tsx
  → router.push('/(aggregator)/execution/navigate')   [on order accept]
    → router.push('/(aggregator)/execution/arrived')  [on "Mark Arrived"]
      → router.push('/(aggregator)/execution/weighing') [on "Start Weighing"]
        → router.push('/(aggregator)/execution/confirm') [on OTP verify]
          → router.push('/(aggregator)/execution/receipt') [on confirm]
            → router.replace('/(aggregator)/orders')   [on "Done"]
```

Every `router.push` in this flow must have a corresponding back-navigation guard. An aggregator should not be able to accidentally go back to a previous execution step and re-submit.

### 5.4 Shared Screen Navigation

| Destination | From | How |
|---|---|---|
| `(shared)/chat/[id]` | Any post-accepted order screen | `router.push` with `id` param |
| `(shared)/order/[id]` | Aggregator home order card tap | `router.push` with `id` param |
| `(shared)/notifications` | NavBar bell icon | `router.push` |
| `(shared)/dispute` | Receipt screen | `router.push` |
| `(shared)/price-index` | Home screen "Daily Price Index" card | `router.push` |

---

## 6. CSS Variable → Token Mapping

The HTML reference files use CSS variables. When implementing, translate them using this table:

| HTML CSS Variable | `constants/tokens.ts` Token | Notes |
|---|---|---|
| `var(--navy)` | `colors.navy` | `#1C2E4A` — hero bars, dark NavBar bg, headers |
| `var(--red)` | `colors.red` | `#C0392B` — primary CTA button, active tab |
| `var(--bg)` | `colors.background` | Page background |
| `var(--surface)` | `colors.surface` | Card background, input background |
| `var(--border)` | `colors.border` | `#DDE3EA` — card borders, input borders |
| `var(--muted)` | `colors.muted` | Secondary text, hints, subtitles |
| `var(--amber)` | `colorExtended.amber` | All ₹ amounts, weight values, earnings totals |
| `var(--teal)` | `colorExtended.teal` | Success states, KYC approved chip, online indicator |
| `var(--green)` | `colorExtended.green` | Online dot, "active" status |
| `var(--text-primary)` | `colors.text` | Primary body text |
| `var(--text-secondary)` | `colors.muted` | Secondary/supporting text |
| Material chip colours | `colorExtended.metalBg`, `.plasticBg`, `.paperBg`, `.ewasteBg`, `.fabricBg`, `.glassBg` | Each material has its own bg + fg pair |

If a token you need does not exist in `constants/tokens.ts`, **add it to `tokens.ts` first** before using it. Never hardcode a value inline.

---

## 7. Component Reuse Rules

Before creating any new component, check if an existing one covers the need:

| Need | Use This Component | Notes |
|---|---|---|
| Order card in a list | `OrderCard` (from `components/ui/Card.tsx`) | Accepts `viewerType: 'seller' | 'aggregator'` to show correct fields |
| Material tag/chip | `MaterialChip` (from `components/ui/`) | Always use — never a plain View with bg colour |
| Status badge | `StatusChip` (from `components/ui/`) | All 8 statuses defined |
| Top navigation bar | `NavBar` (from `components/ui/NavBar.tsx`) | Pass `variant="dark"` or `variant="light"` |
| Bottom tabs | `TabBar` (from `components/ui/TabBar.tsx`) | Pass `userType` prop |
| Empty state | `EmptyState` (from `components/ui/`) | Always use — never a plain centered Text |
| Skeleton loading | `SkeletonLoader` (from `components/ui/`) | One per list item during loading |
| Primary action | `PrimaryButton` | Full width, red bg. Max 1 per screen |
| Secondary action | `SecondaryButton` | White bg, border. Multiple allowed |
| Avatar | `Avatar` (from `components/ui/`) | — |

**New components needed for Day 3 (Aggregator only):**
- `OnlineToggle` — pill-shaped toggle for aggregator online/offline status. States: online (teal bg) / offline (`colors.muted` bg). Placed in NavBar right slot on aggregator home.
- `MetricCard` — hero stat card for earnings screen (large DM Mono number + label + trend indicator).
- `BarChart` — simple vertical bar chart for earnings screen (can be a lightweight custom SVG component or use `victory-native` if already a dependency).
- `ProgressBar` — thin linear progress bar for onboarding wizard steps.
- `DayToggle` — row of 7 day pills (Mon–Sun) with active/inactive states. For operating hours in onboarding.

---

## 8. Security Constraints Affecting UI

These are not optional. Violating these rules is a SECURITY BLOCK.

| Rule | UI Impact | Source |
|---|---|---|
| **V25 — Two-phase address reveal** | Pre-acceptance order screens must show `pickup_locality` only. Full address (`pickup_address_text`) must render as `null` / hidden until `status === 'accepted'`. Do not merely hide it in CSS — the field must not be in the rendered output if the data is null. | TRD V25 |
| **D2 — Push notification body** | Do not render push body text anywhere in the UI if it could leak PII. Notification preview screens must use generic copy. | TRD D2 |
| **Rule 9 — AI output is hint only** | Gemini weight suggestions must be labelled "AI estimate" and rendered as read-only hint text. The aggregator's manually entered value is always the confirmed value. Never pre-fill an input with an AI value. | MEMORY.md Rule 9 |
| **V26 — Phone number filter in chat** | The chat UI must not reveal phone numbers typed into the message input. This is enforced at the backend broadcast level, but the UI should also not display raw phone numbers in message bubbles. | TRD V26 |
| **No service key in client** | No `SUPABASE_SERVICE_KEY` or equivalent in any `.env` file referenced by the mobile app. | MEMORY.md Hard Rule 3 |

---

## 9. NavBar Variant Decision Guide

| Screen Type | NavBar Variant | Reason |
|---|---|---|
| Home tabs (aggregator home, seller home) | `dark` | Full navy hero treatment |
| Order Feed, My Orders tabs | `dark` | Tab-level screens |
| All inner/detail/stack screens | `light` | Navigated-to screens use white bar + navy text |
| Onboarding wizard steps | `light` | Stack screens pushed from auth |
| Execution flow screens | `light` | Stack screens pushed from orders |
| Earnings, Route tabs | `dark` | Tab-level screens |
| Profile tab | `dark` | Tab-level screen with hero |

---

## 10. Day 3 Build Order (Recommended — per Sprint Rules)

Build and test in Expo Go in this order. Each batch must run without crash before moving to the next.

| Batch | Screens | Why this order |
|---|---|---|
| **Batch 1** | `(aggregator)/_layout.tsx` (5-tab shell) + all 5 tab placeholder screens | Establishes navigation shell. Must pass crash-free before any content is added. |
| **Batch 2** | Aggregator Home (`home.tsx`) — all 3 states (with orders, empty, skeleton) | Core entry point. Validates greeting strip + online toggle + order card patterns. |
| **Batch 3** | Order Feed (`orders.tsx` — feed tab) + Order Detail pre-acceptance | Validates V25 address-hide, MaterialChip filter bar. |
| **Batch 4** | My Orders (`orders.tsx` — my orders tab) + all 4 tab states | Validates tab-within-tab pattern if used, or sub-tab filter approach. |
| **Batch 5** | Execution flow: navigate → arrived → weighing → confirm → receipt | Most complex flow. Build sequentially — each screen routes into the next. |
| **Batch 6** | Route screen + Earnings screen | Independent tab screens. Less complex. |
| **Batch 7** | Price Management + Profile + Settings | Profile and settings pattern matches seller — reuse patterns. |
| **Batch 8** | Aggregator Onboarding (5 screens) | Last because it reuses auth shell already tested. |

---

## 11. implementationPlan.md Requirement

Before writing any code for a Day 3 task, the agent **must** produce an `implementationPlan.md` file at `apps/mobile/` containing:

1. Every file to be created or modified — exact path.
2. What each file does in 1–2 sentences.
3. Which HTML screen ID(s) it implements.
4. Which MEMORY.md / TRD rules apply to that file.
5. Any routing decision or component creation decision that needs flagging.
6. Which batch this belongs to (from §10 above).

Only after `implementationPlan.md` is written and correct does implementation begin.

---

## 12. Post-Screen Checklist (Run After Every Batch)

Before declaring a batch complete and moving to the next:

- [ ] Screen renders without crash on Expo Go (iOS and/or Android).
- [ ] Zero hardcoded hex values — confirm with `grep -r "#[0-9A-Fa-f]\{6\}" apps/mobile/app/(aggregator)/`.
- [ ] All numeric values render in DM Mono.
- [ ] Exactly one `PrimaryButton` per screen (or zero if the screen is informational).
- [ ] All touch targets visually appear ≥ 48dp in height.
- [ ] Pre-acceptance order screens show locality only — no full address rendered.
- [ ] All AI-suggested values labelled as hints — no auto-fill.
- [ ] No direct vendor SDK imports — all through provider abstractions.
- [ ] `pnpm type-check` exits 0.
- [ ] PLAN.md updated to mark completed tasks `[x]`.
- [ ] MEMORY.md §9 updated with any new lessons learned.
- [ ] BSE numbered findings list produced (even if all PASS).
- [ ] SCR LGTM issued.

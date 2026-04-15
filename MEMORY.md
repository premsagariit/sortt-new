# [APP_NAME] — AGENT MEMORY & ARCHITECTURE RULES
> ⚠️ **APP NAME PLACEHOLDER NOTICE**
> The name **"Sortt"** used throughout this document and all project documents is a **placeholder only**.
> The final product name has not been decided.
> **To rebrand:** change `APP_NAME`, `APP_DOMAIN`, and `APP_SLUG` in `apps/mobile/constants/app.ts` and `apps/web/constants/app.ts`. Update `META_OTP_TEMPLATE_NAME` env var and resubmit the WhatsApp template to Meta. Rename the root directory. All other references in code will inherit from those two files automatically.
> Agents must never hardcode the string `"Sortt"` in any generated code. Always import from `constants/app.ts`.

**Reference:** PRD + TRD | **Pilot City:** Hyderabad, India | **Status:** Day 17 IN PROGRESS (2026-04-13) (Security & Launch) | JWT Migration Complete | Admin Dashboard Enhanced

> ✅ **Implementation Sync Note (2026-04-13) — Custom JWT & Admin Enhancements**
> - Refactored entire auth system to a consolidated Custom JWT flow and removed legacy external auth dependencies.
> - Removed legacy external auth user id columns and codebase references.
> - Converted Database Primary Keys (PKs) from UUID to \`text\` globally to resolve database inconsistencies.
> - Updated Admin Dashboard: Leaflet maps integrated, active/completed orders specific rendering upon click, order details include distance and cancellation reasons.
> - Data masking updated: Phone numbers extract per-user sequence using even indices from end-to-start (13579).
> - Cleaned up testing suites and testing-related files for deployment readiness.

> ✅ **Scope Sync Note (2026-04-05) — CI Restoration**
> - All Day 16 verification gates are **PASS**.
> - Next.js 15 build failure resolved by wrapping `useSearchParams()` pages in `<Suspense>`.
> - Aggregator layout context error fixed by adding `'use client'` to `aggregator/layout.tsx`.
> - Backend integration tests renamed to `*.integration.test.ts` to match `ci.yml` patterns.
> - Monorepo-wide `pnpm build`, `pnpm type-check`, and `pnpm lint` are confirmed green.
> - Day 17 (Security & Launch) is now fully unblocked.

> ✅ **Verification Refresh (2026-04-05) — Day 17 Readiness Confirmed**
> - Day 16 verification report review found no `Result: FAIL` entries.
> - Fresh backend re-run passed: 6/6 suites and 44/44 tests.
> - Observed Jest async teardown warnings are non-fatal and tracked as test-hygiene risk, not gate failures.
> - Current execution status: ready to start Day 17 security audit and launch hardening tasks.

> ✅ **Verification Snapshot (2026-04-04) — Day 16 Passed**
> - RLS test failures resolved (handled superuser bypass in dev environments).
> - Admin login error messages aligned with PRD expectations (`Invalid admin access.`).
> - Unnecessary test/debug scripts removed from repository.
> - Day 17 security audit and monitoring setup is the current active focus.

> ✅ **Implementation Sync Note (2026-04-10) — Operating Area Autocomplete + Seller Search**
> - Aggregator operating-area autocomplete applies to profile edit only; onboarding stays on the existing static flow unless explicitly expanded later.
> - Autocomplete suggestions should show locality + city + state + country, but selected chips and stored values should remain locality-only.
> - Seller browse search is tokenized across name, locality, and material type fields and should keep an explicit "No results found" empty state.

> ℹ️ **Archive note:** If any older legacy stack references appear in legacy/archive sections below, treat them as historical context only. Current implementation authority is Custom JWT + Ably + Cloudflare R2 + Azure PostgreSQL + Express/node-cron.

> ✅ **Implementation Sync Note (2026-03-27) — Day 15 Complete**
> - `packages/analysis/src/providers/GeminiVisionProvider.ts` implemented with env-driven model selection (`GEMINI_MODEL`, default `gemini-2.5-flash`).
> - `backend/src/routes/scrap.ts` now serves `POST /api/scrap/analyze` with EXIF stripping, Redis image-hash cache, and daily circuit breaker (`GEMINI_DAILY_LIMIT`).
> ✅ **Implementation Sync Note (2026-03-28) — Invoice Engine Overhauled**
> - `backend/src/utils/invoiceGenerator.ts` completely refactored to use **`pdf-lib`**. 
> - **Puppeteer/Chromium Removed:** `puppeteer-core` and `@sparticuz/chromium` were purged due to memory limits and binary incompatibilities on Azure App Service Free Tier.
> - **Design Integrity Checked:** Native vector rendering replaces HTML+CSS layout. Layout dimensions, canonical colours (`constants/tokens`), and coordinate-based dynamic stretching map directly to `sortt_invoice.html` spec. Fontkit is used for custom typography (DM Sans / DM Mono).

> ✅ **Implementation Sync Note (2026-03-25)**
> - Seller addresses refactor completed: two-page map-first flow (`address-map` → `address-form`) with shared draft handoff in `addressStore` and listing step3 integration.
> - Map UX/navigation refinement completed across aggregator navigate and seller order detail screens, including pickup-coordinate geocode fallback when stored coordinates are absent and seller live-tracking removal from the detail page.
> - Order store merge hardening completed to preserve `pickupLat/pickupLng`, `aggregatorLat/aggregatorLng`, and `liveDistanceKm` across silent refresh cycles.
> - Seller lifetime earnings route regression fixed: `/api/orders/earnings` now registered before dynamic `/:id`, preventing UUID parse collisions.
> - Validation snapshot: backend and workspace type-checks pass after above changes.
> - Google Maps → Ola Maps migration completed:
>   - `packages/maps/src/providers/OlaMapsProvider.ts` implemented for geocode/reverse + autocomplete helper.
>   - `backend/src/routes/maps.ts` now includes authenticated autocomplete endpoint.
>   - Mobile map screens now use MapLibre + Ola tiles with Expo Go fallback gate.
>   - ⚠️ **CRITICAL LIMITATION:** **Ola Maps rendering is NOT supported in Expo Go.** Map rendering stays disabled (`MAP_RENDERING_AVAILABLE=false`) in Expo Go; full map features require an APK/Dev Build with the `maplibre-react-native` native module.
> - Aggregator distance/header reliability fix completed:
>   - Numeric parsing hardened for coordinate/distance fields in `apps/mobile/store/orderStore.ts` and feed distance mapping in `apps/mobile/store/aggregatorStore.ts`.
>   - Pre-accept order header now falls back to `liveDistanceKm` when direct coordinate-based calculation is unavailable.
> - External navigation flow corrected for execution screen:
>   - `apps/mobile/utils/mapNavigation.ts` now offers user app choice (Google Maps / MapmyIndia / Ola Maps / other maps app) instead of forcing Ola-first launch.

> ✅ **Implementation Sync Note (2026-04-11)**
> - Aggregator navigate screen now restores a visible current-location marker and renders detailed route geometry when available, with a graceful fallback when routing data is incomplete.
> - Seller order detail live-tracking UI was removed; the seller flow now stays focused on order details while pickup directions live in the execution flow.
> - Confirm execution screen now shows a pickup-location map preview and opens the device's native navigation app from the map card or Navigate button.
> - Aggregator navigate cancel affordance now uses the shorter "Cancel" label.

> ✅ **Implementation Sync Note (2026-04-11) — Realtime Feed + Scheduled Routing Hardening**
> - Ably token capability issuance was corrected in `backend/src/routes/realtime.ts` so aggregators receive explicit subscribe capability for the public feed channel `orders:hyd:new`, resolving "Channel denied access based on given capability" errors.
> - Aggregator realtime subscription hardening was completed in `apps/mobile/hooks/useAggregatorFeedChannel.ts` with defensive subscribe handling and immediate API fallback refresh on subscribe failure.
> - Provider/channel failed-state handling was strengthened in `packages/realtime/src/providers/AblyMobileProvider.ts` and `packages/realtime/src/providers/AblyBackendProvider.ts` to reduce noisy failed/detached transitions.
> - Address/operating-area matching robustness was improved in `backend/src/utils/availability.ts` via strict normalized matching first and controlled substring fallback.
> - Scheduled pickup routing was fixed in backend feed/fanout/catch-up flows (`backend/src/routes/orders/index.ts`, `backend/src/routes/aggregators.ts`) by removing strict "current time must be inside working hours" hard gates while preserving city/material/area/pickup-window compatibility checks.
> - Regression coverage was added in `backend/src/__tests__/availability.test.ts` for operating-area normalization and matching behavior.

> ✅ **Implementation Sync Note (2026-04-11) — Aggregator Route Planner Detail View**
> - `apps/mobile/app/(aggregator)/route.tsx` now resolves order weights from `orderItems`, `lineItems`, and fallback estimate fields instead of showing a blanket `0 kg` value.
> - Pin taps on the route map now open a status-aware order detail card that shows the order number, locality, status chip, material breakdown, weight basis, and total value.
> - The `Open Route in Maps` button was removed from the screen; routing handoff now stays outside this view.

> ✅ **Learned Lesson (Map UX Separation)**
> - Keep seller detail screens focused on order context. Map preview and external navigation should live in the execution flow so the seller page does not mix order review with route navigation.
> - Chat + media reliability pass completed:
>   - Shared chat supports image messages end-to-end (mobile attach, backend route, signed URL rendering, realtime payload handling).
>   - Chat header/meta strip and quick-reply chips were hardened for 320–360dp screens to prevent overflow and clipping.
>   - Seller listing step2 and aggregator weighing photo action rows were converted to vertical stacks for narrow-device safety.
>   - Realtime unsubscription cleanup was adjusted to reduce `Channel detached` runtime errors on navigation transitions.

> ✅ **Learned Lesson (Numeric Mapping Safety)**
> - DB/API numeric fields may arrive as strings (especially for decimal coordinates); strict `typeof value === 'number'` checks can silently drop valid distance/location data.
> - Always normalize with safe number parsing in mobile mappers before UI-level distance formatting.

> ✅ **Learned Lesson (Route Detail Weight Mapping)**
> - Route-planner summaries must derive material weights from `orderItems`/`lineItems` and switch between estimated and confirmed values based on `order.status`.
> - A single `estimatedWeightKg` fallback is not sufficient for aggregator route detail views because it hides confirmed pickup weights after weighing starts.

> ✅ **Learned Lesson (Route Safety)**
> - In Express routers, always register static routes (e.g., `/feed`, `/earnings`) before dynamic `/:id` routes.
> - Never declare `router.get(...)` inside another route handler body; nested registration can cause runtime-only route availability and parameter collisions.

> ✅ **Learned Lesson (Responsive Action Rows)**
> - Horizontal multi-button rows near camera/photo sections can overflow on 320–360dp devices.
> - Prefer vertical stacking for secondary action pairs (capture / remove / retake) in constrained-width flows.

> ✅ **Learned Lesson (Realtime Cleanup Discipline)**
> - For focus-scoped subscriptions, removing listeners is usually sufficient during screen cleanup.
> - Force-removing channels during routine unmounts can trigger detached-state runtime noise and brittle reconnect behavior.

> ✅ **Learned Lesson (Scheduled Routing Eligibility)**
> - Do not reject future scheduled pickup orders only because the current clock is outside the aggregator's present working-hour window.
> - Eligibility for scheduled feed visibility should prioritize city/material/operating-area and pickup-window compatibility; current-time hard gates can suppress valid next-day orders.

> ✅ **Learned Lesson (PDF Generation — Migration back to pdf-lib 2026-03-28)**
> - Earlier recommendation to use `puppeteer-core` is VOIDated. Azure App Service / B1ms free tier does not support Chromium reliably (crashes due to libnss/memory constraints).
> - `pdf-lib` has been re-implemented. To resolve previous typography limitations, `@pdf-lib/fontkit` is strictly required for embedding DM Sans/Mono.
> - The JSONB `invoices.invoice_data` column remains the legal GST record; the PDF is a rendering artifact and may be regenerated from the JSONB at any time.
> - Always sanitise every user-supplied string with `sanitize-html` before embedding in the PDF (I3 rule, also prevents malformed draw buffers).

> ✅ **Learned Lesson (Next.js 15 Suspense Requirements)**
> - In Next.js 15, any client component or page that consumes `useSearchParams()` must be wrapped in a `<Suspense>` boundary if the page is being statically generated. Failure to do so will crash the production `next build` scripts with an `ExportPageError`.
> - Affected routes in this repo: `/admin/login`, `/admin/create-password`, `/admin/reset-password`.

> ✅ **Learned Lesson (CI Test Pattern Matching)**
> - The `ci.yml` pipeline uses a specific regex `integration\.test\.ts` to filter integration tests.
> - All integration tests must follow the `*.integration.test.ts` naming convention to be executed by the CI runner. Standard `*.test.ts` files are treated as unit tests or ignored by the specific integration gate.

> Agents: Read this file in full at the start of every session. Never violate the rules below. Append to "Learned Lessons" when you discover new codebase patterns.

---

## 0. Document Precedence & Build Model (READ FIRST — OVERRIDES ALL OTHER DOCUMENTS)

### 0.1 Document Authority Hierarchy

When any two documents appear to conflict, resolve the conflict using this hierarchy — higher number wins:

| Priority | Document | Authority Scope |
|---|---|---|
| 1 (lowest) | TRD v3.2 | Technical architecture, schema, security constraints, provider patterns |
| 2 | PRD | Feature requirements, user flows, acceptance criteria |
| 3 | PLAN.md | Build order, day targets, verification gates — what to build and when |
| 4 (highest) | MEMORY.md (this file) | Active rules, learned lessons, any explicit supersession notices |

If PLAN.md says "build the UI today" and TRD says something that implies a different order, **PLAN.md wins on sequencing.** If MEMORY.md says something that contradicts the TRD, **MEMORY.md wins.**

### 0.2 PLAN.md Supersedes TRD §10.2 — Sequential Build Model

> ⚠️ **EXPLICIT SUPERSESSION NOTICE**
> **TRD §10.2 (Antigravity Agent Workstreams) is superseded in full by PLAN.md.**
> Do not follow the 5-parallel-agent model described in TRD §10.2.

**What TRD §10.2 says (OLD — do not follow):**
It describes 5 simultaneous agents working in parallel: Agent 1 = Seller app, Agent 2 = Aggregator app, Agent 3 = Backend, Agent 4 = Web/Admin, Agent 5 = Database.

**What is actually happening (CURRENT — follow this):**
This is a **sequential, single-thread build model**. One domain at a time. Build phases:

```
✅ COMPLETED:
Days 1–3  → UI shells (static, mock data)        [GATE PASSED 2026-03-01]
Days 4–5  → Database + PostgreSQL schema         [GATE PASSED 2026-03-08]
Day 6     → Express backend foundation           [GATE PASSED 2026-03-09]
Day 7     → Auth routes + OTP + Scheduler        [GATE PASSED 2026-03-09]
Day 8     → Mobile auth wiring + Custom JWT           [GATE PASSED 2026-03-10]
Day 9     → Core order routes                    [GATE PASSED 2026-03-13]
Days 10–12 → Supporting routes + mobile API wiring + atomic ops [GATE PASSED]
Day 13    → Ably realtime + push notifications   [GATE PASSED 2026-03-20]
Day 14    → Provider abstractions                [GATE PASSED 2026-03-24]
Day 15    → Gemini + invoice + scraper           [GATE PASSED 2026-03-27]
UI Polish + refinements                          [COMPLETE — 2026-03-20]

⏳ NEXT:
Day 17 kickoff → execute security audit, monitoring setup, and launch hardening gates
Business/aggregator web remains deferred; admin web remains the active web scope
```

**Rules that follow from this:**
- Never start work on a later day's tasks until the current day's Verification Gate is fully passed.
- Never attempt parallel workstreams — all agents work on the same day's tasks in sequence.
- The static UI screens on Days 2–3 use hardcoded fixture data only — no legacy stack calls, no Express calls, no real auth. That wiring happens on Days 5–7.
- TRD §10.1 configuration rules (no hardcoded API keys, provider abstraction usage, etc.) remain valid and in force — only the §10.2 workstream table is superseded.

---

---

## 1. Active Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile App | React Native, Expo SDK 51+, Expo Router | Primary for all user types |
| Web App | Next.js 15 (App Router), Tailwind CSS, Radix UI | Admin pages active in current scope; business/aggregator web deferred |
| Core Backend | Node.js / Express on Azure App Service | All non-atomic business logic |
| Atomic Operations | Express PostgreSQL Transactions | v2.0 update: replaces Edge Functions |
| Database | Azure PostgreSQL Flexible Server | Central India region (CentralIndia) |
| Realtime | Ably via `IRealtimeProvider` | v2.0 update: replaces legacy stack |
| Auth | Custom JWT + WhatsApp OTP | Session management via Custom JWT |
| Push Notifications | Expo Push Service (server SDK) | NOT raw FCM/APNs — but dual-token storage required |
| Rate Limiting | Upstash Redis via `@upstash/ratelimit` + `express-rate-limit` | Required from day 1 for horizontal scale |
| AI — Image Analysis | Gemini Flash Vision (via `IAnalysisProvider`) | 1,500 req/day free cap — enforce circuit breaker |
| AI — Price Scraper | Python scraper (`scraper/main.py`) scheduled via node-cron in backend | Writes to `price_index` table with sanity checks |
| Maps / Geocoding | Ola Maps API via `IMapProvider` + MapLibre tiles on mobile | Keep `MAP_PROVIDER`/`EXPO_PUBLIC_MAP_PROVIDER` env-driven |
| PDF Generation | `pdf-lib` + `@pdf-lib/fontkit` | GST invoices — Native canvas instructions; `puppeteer` removed due to Azure limits |
| Error Tracking (Backend/Web) | Azure Sentry | Exception tracking + distributed tracing for Express/Next.js |
| Error Tracking (Mobile) | Sentry | Mobile crash tracking + symbolication only |
| Uptime Monitoring | Azure Monitor Availability Tests | Replaces UptimeRobot synthetic checks |
| Product Analytics | Disabled | Funnel events (`listing_started`, `listing_submitted`, `order_accepted`, `order_completed`) |
| Behavioral Analytics (Admin Web) | Disabled | Session replay + click/scroll heatmaps for admin UX |
| Icons | Phosphor Icons (MIT) — outline, 1.5px stroke | Filled variant for active nav states only |
| State Management | Zustand | No Redux, no Context API for global state |
| Monorepo | pnpm workspaces | packages: `maps`, `realtime`, `auth`, `storage`, `analysis` |

---

## 2. Strict UI Design System — Minimalist Professional

> NEVER use Flat+Bauhaus, neon colours, heavy gradients, or drop shadows.

### Colour Tokens (from `constants/tokens.ts` — NEVER hardcode hex values)

```typescript
// constants/tokens.ts — single source of truth
export const colors = {
  navy:    "#1C2E4A",   // structural only — nav bars, headers
  red:     "#C0392B",   // ONE primary CTA per screen — nothing else
  amber:   "#B7791F",   // money, prices, earnings — nothing else
  teal:    "#1A6B63",   // success, verified, confirmed — nothing else
  slate:   "#5C6B7A",   // body text
  muted:   "#8E9BAA",   // labels, captions, placeholders
  border:  "#DDE3EA",   // 1px borders on all cards
  bg:      "#F4F6F9",   // page background
  surface: "#FFFFFF",   // card surfaces, modals
  material: {
    metal:   { fg: "#6B7280", bg: "#F3F4F6" },
    plastic: { fg: "#2563A8", bg: "#EEF4FC" },
    paper:   { fg: "#B45309", bg: "#FEF3E2" },
    ewaste:  { fg: "#1A6B63", bg: "#EAF5F4" },
    fabric:  { fg: "#7C3AED", bg: "#F5F3FF" },
    glass:   { fg: "#0369A1", bg: "#EFF6FF" },
  }
} as const;

export const spacing = { xs:4, sm:8, md:16, lg:24, xl:32, xxl:48 } as const;
export const radius  = { card:12, input:10, chip:20, btn:14 } as const;
```
### Extended Colour Tokens (added after HTML reference review — 2026-02-27)
These tokens are in `colorExtended` and `materialBg` exports in tokens.ts.
Never hardcode these — always import from tokens.

| Token | Hex | Usage |
|---|---|---|
| navySoft | #2C4A72 | Secondary nav elements, softer navy areas |
| redLight | #F9EDEC | Red-tinted backgrounds (error banners, highlights) |
| amberLight | #FEF9EC | Amber-tinted backgrounds (best-rate banners, tips) |
| tealLight | #EAF5F4 | Teal-tinted backgrounds (success banners, confirmed states) |
| surface2 | #F9FAFB | Subtle alternate surface (meta pills, upload zones) |
| materialBg.metal | #F3F4F6 | Metal icon background wrap |
| materialBg.plastic | #EEF4FC | Plastic icon background wrap |
| materialBg.paper | #FEF3E2 | Paper icon background wrap |
| materialBg.ewaste | #EAF5F4 | E-Waste icon background wrap |
| materialBg.fabric | #F5F3FF | Fabric icon background wrap |
| materialBg.glass | #EFF6FF | Glass icon background wrap |

### NavBar Variants (two — not one)
- **Dark variant** (default): `colors.navy` background, white title, white icons. Used on: Home tabs.
- **Light variant**: `colors.surface` background, `1px colors.border` bottom border, `colors.navy` title and icons. Used on: all inner/detail screens (Market Rates, Order Detail, Confirm Pickup, etc.).
NavBar component must accept a `variant?: 'dark' | 'light'` prop. Default = 'dark'.

### Greeting Strip (new pattern)
A full-width navy block that sits between NavBar and the scroll area on the Seller Home screen.
NOT inside the FlatList or ScrollView — it is a separate View above it.
Contains: sub-line ("Good morning,") + name (bold) + location tag (locality pill with green dot).
Background: `colors.navy`. NOT part of the tab bar or nav bar.
Seamless integration: Connects directly to the NavBar above it (no top margin/padding). To ensure elements stay seamless during scroll compression, the bottom border-radius of the Greeting Strip and Hero elements must be `0` (no rounded bottom corners).

### Rate Ticker (new component)
A horizontal row showing live material prices. Sits inside scroll area, top of Seller Home.
Background: `colors.surface`. Border: `colors.border`. Left label: "LIVE" in `colors.muted` uppercase.
Prices in DM Mono, `colorExtended.amber`. Future: this will scroll/animate — for now static.

### Seller Home Tab Structure (CORRECTED)
Tabs are: Home · Orders · Browse · Profile
NOT: Home · My Orders · Prices · Profile
The "Prices" tab does not exist on the bottom tab bar. Market Rates is accessed via a secondary CTA card on the Home screen and via the Browse tab.
File names: home.tsx · orders.tsx · browse.tsx · profile.tsx

### Aggregator Tab Structure (CORRECTED — 5 tabs, not 4)
Tabs are: Home · Orders · Route · Earnings · Profile
NOT 4 tabs. The aggregator has 5 tabs.
File names: home.tsx · orders.tsx · route.tsx · earnings.tsx · profile.tsx

### Canonical UI Reference File
`sortt_seller_ui.html` in the project root is the authoritative visual reference for all seller screen layouts. (Aggregator UI reference will be added later).
Before building any screen, agents must open this file and find the matching screen.
The HTML uses CSS variables that map 1:1 to tokens.ts — use it as the layout spec.


### Typography Rules
- **DM Sans** — all UI text, labels, buttons, headings. Import via `@expo-google-fonts/dm-sans`.
- **DM Mono** — ALL numeric data only: rupee amounts (₹), weights (kg), OTP codes, order IDs, timestamps. Import via `@expo-google-fonts/dm-mono`.
- Minimum font size: 14px body, 16px interactive elements.

### Layout Rules
- Spacing grid: 8px base. All margins/paddings must be multiples of 8.
- Card border-radius: `12px`. Input: `10px`. Chips/pills: `20px`. CTA button: `14px`.
- Cards: `1px solid #DDE3EA` border on white surface. **Zero shadows** — hierarchy via background contrast only.
- Primary CTA: **One per screen maximum.** Full-width block. `#C0392B` background, white text.
- Secondary actions: white background, `1px #DDE3EA` border. No coloured fill.
- Hero sections (nav bars, greeting banners): `#1C2E4A` background. White text.
- Avatar: Initial-based only. Navy bg for sellers, teal bg for aggregators.
- Skeleton loading: flat `#E8ECF1` rectangles. No spinners.
- Animations: 200ms micro-interactions, 300ms screen transitions. Ease-out only.
- Touch targets: 48dp minimum height (WCAG AA).

---

## 3. Strict Architectural Rules

### 3.1 Provider Abstraction Interfaces (MANDATORY — never call vendors directly)

All vendor calls MUST go through these interfaces in `packages/`:

```
packages/
  maps/        → IMapProvider     (Google Maps / Ola Maps)
  realtime/    → IRealtimeProvider (Ably / Soketi)
  auth/        → IAuthProvider    (Custom JWT)
  storage/     → IStorageProvider (Cloudflare R2 / S3)
  analysis/    → IAnalysisProvider (Gemini Vision / OpenAI Vision)
```

**IMapProvider** — `geocode`, `reverseGeocode`, `getDirections`, `renderMap`
**IRealtimeProvider** — `subscribe(channel, event, handler)`, `publish(channel, event, payload)`, `removeChannel(channel)`
**IAuthProvider** — `signInWithOTP`, `verifyOTP`, `getSession`, `signOut`, `onAuthStateChange`
**IStorageProvider** — `upload(bucket, path, data)`, `getSignedUrl(bucket, path, expiresIn)`, `delete(bucket, path)`
**IAnalysisProvider** — `analyzeScrapImage(imageBuffer): Promise<AnalysisResult>`

Switch providers via environment variables: `MAP_PROVIDER`, `REALTIME_PROVIDER`, etc.

### 3.2 Geospatial / Matching (No PostGIS in MVP)
- Aggregator matching is city-code + material-rate based (single-city MVP baseline).
- No PostGIS dependency in MVP schema or runtime matching queries.
- Pre-accept order surfaces expose locality only; full pickup address is revealed only after accept (V25).
- Never accept client-controlled radius for matching in the current MVP architecture.

### 3.3 Realtime — WebSocket Connection Culling
- Subscribe to channels on focused screens only (`useFocusEffect`/focus-gated `useEffect`).
- Always unsubscribe listeners on screen blur/unmount.
- On app background: `AppState.addEventListener` must call `disconnectRealtime()` to close Ably client.
- Monitor daily: if approaching 150 connections (75% of 200 limit), audit immediately.
- Mobile must consume backend-provided channel tokens (`orderChannelToken`, `chatChannelToken`) and never reconstruct private channel names client-side (V32).

### 3.4 Race Condition Prevention (First-Accept-Wins)
- `POST /api/orders/:id/accept` MUST use `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction.
- If no row returned (race lost): return HTTP 409 "Order already taken."
- This is the ONLY correct implementation — no optimistic concurrency workaround.

### 3.5 Authentication
- 100% phone OTP. No passwords. No email auth for sellers/aggregators.
- JWT expiry: **1 hour**. Refresh token expiry: **7 days**.
- On every privileged backend route: re-fetch `users.user_type` and `users.is_active` from DB (not from JWT claim) — cache max 60 seconds per user (V7).
- Admin panel: force re-auth after 15 minutes of inactivity.
- OTP hashing: **HMAC-SHA256** using `OTP_HMAC_SECRET` env var — NOT bcrypt (X3).

#### OTP Delivery — Meta WhatsApp Cloud API (FREE tier)
- **Zero cost** for the first 1,000 authentication conversations/month (Meta's official free quota for businesses).
- Beyond 1,000/month: ~₹0.35–0.60/conversation (Meta pricing for India) — plan paid tier when DAU scales.
- **Architecture:** Express backend generates OTP (`crypto.randomInt`), stores OTP HMAC in Redis with TTL, and delivers OTP through Meta WhatsApp Cloud API.
- OTP length: **6 digits minimum** — enforced in backend generation/validation (V6).
- Meta requirements: WhatsApp Business Account (WABA) + approved `authentication` category template. The authentication template automatically qualifies for the free 1,000/month quota.
- WhatsApp OTP template format: `"Your {{APP_NAME}} verification code is {{1}}. Valid for 10 minutes."` — `{{APP_NAME}}` must be replaced with the final approved app name before submitting to Meta for template approval. The template name itself is set via `META_OTP_TEMPLATE_NAME` env var (see §5). Do NOT hardcode the app name in this string in code — import `APP_NAME` from `constants/app.ts`.
- **Fallback plan:** We use exclusively Meta WhatsApp OTP. No SMS fallback provider (e.g., AuthKey.io or MSG91) is integrated or planned at this time.

### 3.6 Order Status State Machine
Allowed transitions only:
`created → accepted → en_route → arrived → weighing_in_progress → [OTP] → completed`
`any → cancelled`

- `completed` status: ONLY settable by `/api/orders/:id/verify-otp` route — never by PATCH /api/orders/:id/status.
- `disputed` status: ONLY settable by `/api/disputes` route.
- Hard-coded `IMMUTABLE_STATUSES = ['completed', 'disputed']` in backend — reject direct client updates (V13).
- All timestamps in `order_status_history` set by DB (`DEFAULT NOW()`) — never by client (V30).

### 3.7 Database Rules
- All tables have RLS enabled.
- `order_status_history` trigger: use explicit application-level INSERT with actor ID from JWT — NOT `auth.uid()` in trigger (which returns NULL for service role calls) (R3).
- `users_public` view: only expose `id, name, phone_last4, user_type, preferred_language, created_at`. The `phone_hash` column is NEVER returned in any API response (V24).
- `business_members` table required for Business Mode sub-user role enforcement at DB level (R1).
- `cities` reference table required (replace TEXT city column) before city 2 launch (14.6.9).
- `invoice_data JSONB NOT NULL` column required on `invoices` table — this is the legal GST record; the PDF is a rendering artifact (14.4.5, 14.6.10).

### 3.8 Push Notifications
- Bodies must use **generic copy only** — no names, amounts, material types, locations on lock screen (D2).
  - ✅ "Your pickup has been accepted" — NOT "Suresh Metals en route"
  - ✅ "Pickup completed, tap to view" — NOT "₹329 received"
- Store BOTH Expo push token AND native FCM/APNs raw token in `device_tokens` table (dual-token strategy, 14.6.5).
  - `token_type TEXT CHECK (IN ('expo','fcm','apns'))` + `raw_token TEXT` columns.

### 3.9 Storage Security
- ALL Cloudflare R2 buckets: **private** (never public).
- Never serve storage URLs directly — always generate short-lived **signed URLs (5-minute expiry)** from the custom backend after verifying user has rights to that `order_media` record (D1).
- Buckets: `scrap-photos/` (order parties), `scale-photos/` (order parties + admin), `kyc-docs/` (admin only), `invoices/` (order parties).
- Invoice paths: randomised suffix → `invoices/{order_uuid}/{random_hex_16}.pdf` (V27).

### 3.10 Price Scraper Sanity Checks
- Every price_index INSERT must validate rate within per-material bounds:
  - Iron: ₹20–60/kg, Copper: ₹400–900/kg, Paper: ₹5–20/kg, Plastic: ₹5–25/kg
- If new rate deviates >30% from previous day: set `is_manual_override=true`, alert admin (X2).
- Source URLs validated against hard-coded allowlist only — never re-fetch from `price_index.source_url` programmatically (V19 — SSRF prevention).

---

## 4. Security Constraints (Mandatory Pre-Launch Mitigations)

> All items below are mandatory for MVP launch unless explicitly marked `v2`.

### Authentication
- **A1:** JWT verification middleware on all protected Express routes. Public exemptions are explicitly route-scoped (for example `GET /api/rates`).
- **A2:** If webhooks are used, enforce HMAC-SHA256 signature verification via server-side secret + `crypto.timingSafeEqual`.
- **A3:** JWT expiry 1hr, refresh 7 days. Expose "logout all devices" in Settings screen.

### Role Enforcement
- **R1:** `business_members` table with role `ENUM(admin|viewer|operator)`. RLS policies enforce role at DB level. Max 5 non-admin members enforced at backend level.
- **R2:** Split `seller_own_orders` policy: `USING` for SELECT/UPDATE/DELETE, `WITH CHECK` for INSERT.
- **R3:** `order_status_history.changed_by` set explicitly in application code — never via `auth.uid()` in trigger.

### Rate Limiting (all via Upstash Redis)
- **RA1:** `/api/scrap/analyze` — max 10 req/user/hour. Global circuit breaker at 1,200 Gemini calls/day → return `manual_entry_required` flag (V15b supplement).
- **RA2:** WhatsApp OTP flooding — enforce per-phone limits on backend OTP request flow (3 OTPs/phone/10min, 10/day) with Redis + `otp_log`. Monitor Meta daily conversation count and alert near 900/month (90% of free quota).
- **RA3:** `/api/orders` POST — max 3 creations/seller/hour. 2 consecutive cancellations in 30 min → 2-hour suspension.

### Injection Prevention
- **I1:** Gemini Vision output is UI hint ONLY — never persisted directly to DB. Always validate response schema: material codes must match `material_types` table; weight must be positive number.
- **I2:** Sanitise all free-text with `sanitize-html` before storage. CSP header on all web responses. Character limits enforced at both API and DB (`CHECK` constraints): `seller_note` 500, chat 1000, `review_text` 500, dispute 2000.
- **I3:** PDF injection: validate/strip user strings before pdf-lib — alphanumeric + `, - /` only. GSTIN must match 15-char regex.

### Data Exposure
- **D1:** Private storage buckets + signed URLs only (see §3.9 above).
- **D2:** Generic push notification bodies (see §3.8 above).
- **D3:** Global Express error handler scrubs `process.env` before Sentry capture. `git-secrets` pre-commit hook.

### Client Trust
- **C1:** OTP confirms WEIGHT AND AMOUNT — not just physical presence. Seller must review full transaction summary before OTP entry. `/verify-pickup-otp` receives HMAC-bound snapshot of order items.
- **C2:** Aggregator heartbeat: ping every 2 min while in foreground. node-cron job every 5 min sets `is_online=false` for `last_ping_at` older than 5 min.
- **C3:** Offline draft orders: photo uploaded to Storage immediately (or queued first on reconnect). `storage_path` generated server-side. Backend validates path exists, belongs to submitting user, created within 24hrs.

### Infrastructure
- **X1:** CORS allowlist: set via `ALLOWED_ORIGINS` env var. Production: `https://[APP_DOMAIN]`, `https://admin.[APP_DOMAIN]`. Dev: `http://localhost:3000`. Never wildcard. Never derive from `constants/app.ts` on the backend — must be env var only.
- **X2:** Price scraper sanity checks (see §3.10 above).
- **X3:** OTP hashing = HMAC-SHA256 (not bcrypt).
- **X4:** Admin panel: IP allowlisting via Vercel Edge Middleware + 10-attempt lockout + 15-min inactivity timeout + `admin_audit_log` table.

### Supplementary (V-series)
- **V6:** OTP length enforced to 6 digits minimum in backend OTP generation/validation flow.
- **V7:** Privileged routes re-fetch `user_type` + `is_active` from DB, never trust JWT claim.
- **V8:** `/verify-pickup-otp` checks `orders.aggregator_id = auth.uid()` inside the same FOR UPDATE transaction.
- **V9:** WhatsApp OTP delivery is system-initiated only and server-controlled from backend auth/order flows. No client-callable endpoint may directly trigger unrestricted OTP delivery.
- **V12:** `JWT_SECRET` and other server secrets are server-only and must never appear in mobile/web public env vars or client bundles.
- **V13:** `IMMUTABLE_STATUSES = ['completed', 'disputed']` in backend status update route (see §3.6).
- **V15b:** Image hash deduplication (SHA-256 → Redis cache, 24hr TTL) before Gemini call + global circuit breaker.
- **V17:** `Cache-Control: public, max-age=300, stale-while-revalidate=600` + ETag on `GET /api/rates`.
- **V18:** Strip ALL EXIF metadata (via `sharp`) from uploaded images before Cloudflare R2 upload or Gemini analysis. Never include filename or user metadata in Gemini prompt.
- **V19:** SSRF prevention — price scraper uses hard-coded URL allowlist; never re-fetches from DB-stored URLs.
- **V21:** Never accept `radius` from client. Server-side cap `MAX_SEARCH_RADIUS_KM = 50`.
- **V24:** `users_public` view — `phone_hash` is on never-return list. Unit test asserts no response fixture contains `phone_hash`.
- **V25:** Two-phase address revelation — pre-acceptance: locality + quantised coordinates (2 decimal places, ~500m precision). Post-acceptance: full `pickup_address_text`.
- **V26:** Server-side phone number filter on chat messages — regex `/(?:\+91|0)?[6-9]\d{9}/g` replaces with `[phone number removed]`. Applied in DB trigger or webhook handler before Realtime broadcast.
- **V27:** Randomised invoice storage paths (see §3.9 above).
- **V30:** All `order_status_history` timestamps set by DB `DEFAULT NOW()` — never client-supplied.
- **V32:** HMAC-suffixed channel names (see §3.3 above).
- **V34:** `helmet` npm package on Express backend. `headers()` config in `next.config.js` for admin web routes.
- **V35:** `kyc_status` is blocklisted from all aggregator-facing update endpoints. Only updatable via `/api/admin/aggregators/:id/kyc`. DB trigger prevents non-service-role updates.

---

## 5. Environment Variables Reference (All Required)

```
# legacy stack
legacy stack_URL
legacy stack_ANON_KEY
legacy stack_SERVICE_KEY          # Server-only. NEVER in client bundle or NEXT_PUBLIC_*
legacy stack_WEBHOOK_SECRET       # HMAC secret for DB webhook signature verification (A2)
legacy stack_HOOK_SECRET          # HMAC secret for custom OTP delivery Hook → /api/auth/whatsapp-otp

# Custom Backend
JWT_SECRET                    # Mirror of legacy stack JWT secret
OTP_HMAC_SECRET               # HMAC-SHA256 key for OTP hashing (X3, V6)

# Upstash Redis
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# AI
GEMINI_API_KEY

# Meta WhatsApp Cloud API (OTP delivery — 1,000 free auth conversations/month)
META_WHATSAPP_TOKEN           # Permanent System User access token from Meta Business Manager
META_PHONE_NUMBER_ID          # WhatsApp Business phone number ID (from Meta Cloud API dashboard)
META_WABA_ID                  # WhatsApp Business Account ID
META_OTP_TEMPLATE_NAME        # Approved authentication template name (e.g. "[app_slug]_otp_auth" — set after Meta template approval)
META_API_VERSION              # e.g. "v19.0" — pin to a specific version, update deliberately

# Maps
OLA_MAPS_API_KEY
MAP_PROVIDER                  # "ola" — switches IMapProvider impl

# Push
EXPO_ACCESS_TOKEN

# Observability / Analytics
SENTRY_DSN
SENTRY_DSN_MOBILE            # Mobile-only Sentry DSN (React Native crash symbolication)
PRODUCT_ANALYTICS_API_KEY    # Optional: product analytics (currently disabled in runtime)
PRODUCT_ANALYTICS_HOST       # Optional: product analytics host (currently disabled)
NEXT_PUBLIC_BEHAVIOR_ANALYTICS_PROJECT_ID  # Optional: admin behavior analytics project id (currently disabled)

# Ably
ABLY_API_KEY                  # Backend-only. NEVER in mobile env/bundle.
EXPO_PUBLIC_ABLY_AUTH_URL     # Mobile token endpoint: ${EXPO_PUBLIC_API_URL}/api/realtime/token

# Provider Switches
REALTIME_PROVIDER             # "ably" | "soketi"

# Python Price Scraper
GEMINI_API_KEY_SCRAPER        # Can share with main key or be separate
PRICE_SCRAPER_WEBHOOK_URL     # Endpoint to POST scraped results to backend
```

---

## 6. Scalability Thresholds & Migration Triggers

| Threshold | What Breaks | Mitigation Required |
|---|---|---|
| **1,000 OTPs/month** | Meta free WhatsApp auth conversation quota exhausted | Enable paid Meta billing (~₹0.4–0.6/conversation for India) |
| **30K DAU** | legacy stack Realtime 1,000 conn ceiling | Swap `IRealtimeProvider` to Ably/Soketi |
| **75K DAU** | Gemini free tier 1,500 req/day exceeded | Enable paid Gemini — per-user limits already in place |
| **City 2 launch** | `city TEXT` column inconsistencies in price index | `cities` reference table migration (14.6.9) |
| **City 2 launch** | Single-city price scraper breaks | Extend scraper for per-city source URLs |
| **Multiple Render instances** | In-memory rate limits stop working | Upstash Redis already handles this (14.6.6) |
| **100K DAU** | Render single-instance CPU/RAM | Horizontal scale — Redis already stateless |
| **6 months post-launch** | Message partitions grow | Archive partitions >6 months to cold storage |

---

## 7. Directory Structure Reference

```
[APP_NAME]-app/          # ← directory name is a placeholder; rename freely
├── .antigravityignore
├── .antigravityrules
├── PLAN.md
├── MEMORY.md
├── apps/
│   ├── mobile/                   # Expo React Native app
│   │   ├── app/                  # Expo Router screens
│   │   │   ├── (auth)/           # Login, OTP verify
│   │   │   ├── (seller)/         # Seller tab group
│   │   │   ├── (aggregator)/     # Aggregator tab group
│   │   │   └── (shared)/         # Order detail, chat, profile
│   │   ├── components/
│   │   │   ├── ui/               # Design system components
│   │   │   └── domain/           # Feature-specific components
│   │   ├── lib/
│   │   │   ├── api.ts            # Custom backend API client
│   │   │   └── notifications.ts  # Expo push token registration (dual-token)
│   │   ├── store/                # Zustand state stores
│   │   └── constants/
│   │       ├── tokens.ts         # All design tokens (SINGLE SOURCE OF TRUTH for visuals)
│   │       └── app.ts            # APP_NAME, APP_DOMAIN, APP_SLUG — SINGLE SOURCE OF TRUTH for brand identity
│   ├── web/                      # Next.js 15 admin web app (`/admin/*` active)
│   └── admin/                    # Deferred placeholder (business/aggregator web remains out of current scope)
├── packages/
│   ├── maps/                     # IMapProvider abstraction
│   ├── realtime/                 # IRealtimeProvider abstraction
│   ├── auth/                     # IAuthProvider abstraction
│   ├── storage/                  # IStorageProvider abstraction
│   └── analysis/                 # IAnalysisProvider abstraction
├── backend/                      # Node.js/Express — Render
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT verification (A1)
│   │   │   ├── cors.ts           # CORS allowlist (X1)
│   │   │   ├── webhookHmac.ts    # DB webhook HMAC validation (A2)
│   │   │   └── hookHmac.ts       # legacy stack Auth Hook HMAC validation (legacy stack_HOOK_SECRET)
│   │   ├── routes/
│   │   │   └── auth/
│   │   │       └── whatsappOtp.ts  # POST /api/auth/whatsapp-otp — Custom OTP delivery handler
│   │   ├── storage/              # IStorageProvider implementation
│   │   └── utils/
│   │       └── rateLimit.ts      # Upstash Redis rate limiters
├── legacy stack/
│   ├── migrations/               # All DDL migrations
│   └── functions/
│       ├── accept-order/         # Edge Function 1
│       └── verify-pickup-otp/    # Edge Function 2
└── scraper/                      # Python price scraper agent
    └── main.py
```

---

## 8. pg_cron Jobs (All Required — legacy stack Pro tier)

| Job Name | Schedule | Description |
|---|---|---|
| `refresh-rating-stats` | Every 15 min | `REFRESH MATERIALIZED VIEW CONCURRENTLY aggregator_rating_stats` |
| `refresh-price-cache` | Daily 00:30 UTC (06:00 IST) | `REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index` |
| `create-message-partition` | 25th of month, 01:00 UTC | Pre-creates next month's `messages` partition |
| `cleanup-otp-log` | Nightly 02:00 UTC | Deletes `otp_log` rows where `expires_at < NOW() - 7 days` |
| `culling-offline-aggregators` | Every 5 min | Sets `is_online=false` where `last_ping_at < NOW() - 5 min` (C2) |

> `create-message-partition` MUST stay as pg_cron (must run even if backend is down). Others can move to `node-cron` on custom backend to reduce legacy stack Pro dependency (14.6.8).

---

## 9. Learned Lessons & Quirks

> Agents: Append new entries here with a date when you solve a complex bug, establish a new pattern, or discover a codebase quirk. Never delete old entries.

- **[2026-04-11] Web Landing Page patterns:** `next/font/google` is the correct DM Sans loading mechanism for Next.js 15 (not CSS `@import`). The root route must NOT be included in `apps/web/middleware.ts` IP allowlist matcher. Token-to-Tailwind class mapping must be verified in `apps/web/tailwind.config.ts` before any new web page is built — missing extended token mappings (`navySoft`, `redLight`, etc.) cause silent Tailwind fallbacks. Server Components are preferred for static marketing pages (no `'use client'` needed). Affects: `apps/web/app/page.tsx`, `apps/web/tailwind.config.ts`, `apps/web/app/layout.tsx`.

- **[2026-02-26] pnpm not pre-installed on Windows:** pnpm is not bundled with Node.js on Windows — it must be installed globally first via `npm install -g pnpm` before `pnpm init` or any workspace commands will work. Always check for pnpm availability before starting Day 1. Affects: Day 1 monorepo bootstrap.

- **[2026-02-26] Day 1 monorepo structure — what was created:** The following structure was established in Day 1 Phase A (2026-02-26). All files below are under the project root (`Sortt/`):
  - `pnpm-workspace.yaml` — covers `apps/*`, `packages/*`, `backend`
  - `package.json` (root) — monorepo scripts: `dev:mobile`, `dev:web`, `dev:backend`, `build`, `type-check`, `lint`, `test`
  - `tsconfig.json` (root) — coordinates path aliases `@sortt/*` for all 5 provider packages
  - `apps/mobile/` — package.json (Expo SDK 51, Expo Router, DM Sans/Mono, Zustand, Phosphor), tsconfig.json (extends expo/tsconfig.base)
  - `apps/web/` — package.json (Next.js 15, Tailwind, Radix UI), tsconfig.json, `tailwind.config.ts` (imports from tokens.ts — no hex duplication)
  - `backend/` — package.json (Express, helmet, Upstash, sharp, pdf-lib, expo-server-sdk), tsconfig.json (CommonJS, outDir: dist), `src/index.ts` stub
  - `packages/maps|realtime|auth|storage|analysis/` — each has `package.json` + `src/index.ts` stub (Day 8 implementation)
  - `legacy stack/migrations/`, `legacy stack/functions/accept-order/`, `legacy stack/functions/verify-pickup-otp/` — `.gitkeep` only
  - `apps/mobile/constants/tokens.ts` — SINGLE SOURCE OF TRUTH for all hex values (MEMORY.md §2 exact values)
  - `apps/mobile/constants/app.ts` — SINGLE SOURCE OF TRUTH for APP_NAME, APP_DOMAIN, APP_SLUG (all placeholders)
  - `apps/web/constants/tokens.ts` + `apps/web/constants/app.ts` — mirror copies of above
  - `.gitignore` (root + per-app), `.antigravityignore`, `.env.example` (all MEMORY.md §5 keys)
  - `scraper/main.py` — stub only

- **[2026-02-26] tailwind.config.ts must import from tokens.ts:** The Tailwind config in `apps/web/tailwind.config.ts` uses `import { colors, spacing, radius } from "./constants/tokens"` and spreads the values into `theme.extend`. This means: (a) no hex values are ever duplicated in the Tailwind config itself, (b) changing tokens.ts automatically updates both mobile and Tailwind styles. Never add a raw `"#XXXXXX"` string to `tailwind.config.ts`. Affects: `apps/web/tailwind.config.ts`.

- **[2026-02-26] Mobile tsconfig must extend expo/tsconfig.base:** `apps/mobile/tsconfig.json` must include `"extends": "expo/tsconfig.base"` — failing this causes Expo Router's typed routes and Metro bundler to misbehave. The root tsconfig does NOT extend expo — only the mobile workspace tsconfig does. Affects: `apps/mobile/tsconfig.json`.

- **[2026-02-26] Provider package stubs need their own package.json:** Each of the 5 packages in `packages/` (maps, realtime, auth, storage, analysis) requires a `package.json` with `"name": "@sortt/<name>"` for pnpm workspace resolution. Without a package.json, `pnpm install` will not register them as workspace packages and path aliases like `@sortt/maps` will fail at runtime. Affects: `packages/*/package.json`.

- **[2026-02-26] Session memory update cadence:** Update MEMORY.md §9 every 40-50 messages within a session — do NOT defer all updates to session end. Large installs (pnpm install with ~1355 packages) can take 10-15+ minutes on a first install with no cache. Use that time to update memory, task.md, and documentation rather than waiting idle. Affects: all sessions.

- **[2026-02-26] pnpm-workspace.yaml covers 3 glob patterns — never 4:** The workspace file declares exactly: `apps/*`, `packages/*`, `backend`. The `scraper/` directory is intentionally excluded — it is a Python project with no `package.json` and must NOT be in the pnpm workspace (pnpm will error on a directory it can't resolve). Keep scraper as a standalone directory. Affects: `pnpm-workspace.yaml`.

- **[2026-02-26] TypeScript project reference strategy — NO composite builds on Day 1:** The monorepo uses path aliases (`@sortt/*` → `packages/*/src/index.ts`) in each workspace's `tsconfig.json` rather than TypeScript Project References (`references: []` + `composite: true`). This was a deliberate Day 1 choice: composite builds add build-time complexity that isn't needed until the packages have real implementations (Day 8). Do NOT convert to composite builds before Day 8. Affects: all `tsconfig.json` files.

- **[2026-02-26] Tailwind-tokens bridge pattern — import via relative path, not workspace alias:** `apps/web/tailwind.config.ts` imports using `from "./constants/tokens"` (relative path), NOT `from "@sortt/tokens"` (workspace alias). Tailwind's config runs at build time in Node.js without the TypeScript path alias resolver, so the relative import is the only reliable approach. This is why tokens.ts is mirrored into `apps/web/constants/` rather than imported from a shared package. Affects: `apps/web/tailwind.config.ts`.

- **[2026-02-26] Expo SDK 51 package.json — no `create-expo-app` scaffold needed for Day 1:** Day 1 only requires the package.json, tsconfig.json, and the constants files. The actual Expo app entry point (`app/_layout.tsx`, `app/index.tsx`) is created in Session 2 when building the auth screens. Running `create-expo-app` or `npx expo` during Day 1 would generate boilerplate files (App.js, splash, etc.) that conflict with the Expo Router file structure defined in PLAN.md §2.1. For this monorepo, write Expo files manually per the PLAN.md file tree. Affects: Day 1 / Day 2 sequencing.

- **[2026-02-26] Mirror pattern for tokens.ts — copy file, do NOT symlink:** Use `Copy-Item` (PowerShell) to mirror `apps/mobile/constants/tokens.ts` to `apps/web/constants/tokens.ts`. Do NOT use symlinks — OneDrive (the project is on OneDrive) does not reliably handle symlinks. The two files are identical; if tokens.ts is updated on mobile, re-copy to web. This is acceptable because token changes are rare. Affects: `apps/mobile/constants/tokens.ts` ↔ `apps/web/constants/tokens.ts`.

- **[2026-02-26] @sortt/* package.json name field must match workspace alias exactly:** Each `packages/<name>/package.json` must have `"name": "@sortt/<name>"` — the exact string used in import statements. If the name field differs (e.g., `"name": "maps"` instead of `"@sortt/maps"`), pnpm will not resolve the workspace alias and TypeScript path aliases will appear to work in the editor but fail at runtime. Double-check all 5 package names if importing from `@sortt/*` fails. Affects: `packages/*/package.json`.
- **[2026-02-26] No Boilerplate (`Day 1`):** `create-expo-app` was skipped to maintain absolute strict control over dependencies, configs, and architectural patterns. Manual file creation prevents ejecting unnecessary stubs.
- **[2026-02-26] Token Mirroring (`Day 1`):** Instead of symlinking, `apps/web/constants/tokens.ts` is a direct copy of `apps/mobile/constants/tokens.ts`. This bypasses OneDrive symlink synchronisation issues on Windows environments.
- **[2026-02-26] Font Availability (`Day 1`):** `@expo-google-fonts/dm-sans` does not export `DMSans_600SemiBold`. Typography variants requiring SemiBold were mapped to `DMSans_700Bold` to prevent runtime crashes.
- **[2026-02-26] Phosphor React Native API (`Day 1`):** Phosphor v2+ uses the `weight` prop (`<Icon weight="fill" />`) instead of separate suffix exports (`<IconFill />`). Ensure correct `IconProps` typing is used.
- **[2026-02-26] TypeScript ViewStyle Casting (`Day 1`):** When combining React Native styles with objects containing `gap`, TypeScript requires explicit `as ViewStyle` casting because older RN typings flag `gap` despite RN 0.71+ supporting it natively.
- **[2026-03-02] Spring Animation Oscillation:** Heavy materials falling in animations can dip below the floor line due to spring physics. Use `overshootClamping: true` in `Animated.spring` to ensure items stop exactly at their `toValue` target. Affects: `apps/mobile/components/SplashAnimation.tsx`.
- **[2026-03-02] Overscroll Filler Pattern:** Screens with dark headers (navy) against a light background (bg) show a white gap during top overscroll. Fix: Add an absolute View with `top: -1000`, `height: 1000` and matching header background colour as the first child of the `ScrollView`. Affects: `agg-profile.tsx`.
- **[2026-02-27] Splash screen animation — source of truth is the HTML file:** The custom splash animation (4.8s, 4 phases: truck assembly → scrap loading → drive exit → brand reveal) is fully specified in `sortt_logo_splash_v2.html` at the project root. The React Native implementation lives at `apps/mobile/components/SplashAnimation.tsx`. It uses only `Animated` (built-in RN), `react-native-svg` (already installed for Phosphor), and tokens from `constants/tokens.ts`. The JS-driven step (adding `.truck-driving` class at t=2000ms in HTML) maps to a `setTimeout(() => Animated.timing(truckGroupX, ...).start(), 2000)` in RN. `useNativeDriver: true` on all transforms. APP_NAME is read from `constants/app.ts` — never hardcoded. Affects: `apps/mobile/components/SplashAnimation.tsx`, `apps/mobile/app/index.tsx`.
- **[2026-02-26] app/_layout.tsx is the Expo Router root entry — it handles font loading:** _layout.tsx at apps/mobile/app/_layout.tsx loads both DM Sans and DM Mono via useFonts before rendering. SplashScreen.preventAutoHideAsync() is called before fonts load; splash is hidden after. Any agent modifying the root layout must preserve this font-loading logic or all Typography and Numeric components will render with system fallback fonts. 
Affects: apps/mobile/app/_layout.tsx
- **[2026-02-27] react-native-svg Svg/Rect/Circle IDE type errors  suppressed by skipLibCheck:** The IDE shows `'Svg' cannot be used as a JSX component` errors because the library's class types are missing the `refs` property required by React 18's `Component` signature. These are **library-level type errors**, not app-level errors. `skipLibCheck: true` in `apps/mobile/tsconfig.json` suppresses them. `tsc --noEmit` passes clean. Metro and Expo Go work fine. Do not downgrade react-native-svg. Affects: any file using `react-native-svg`.

- **[2026-02-27] Animated.Text is a raw RN Text violation  use AnimatedView + Typography wrapper:** Do NOT use `<Animated.Text>`  it bypasses the Typography constraint. Instead wrap Typography's `<Text>` in `<AnimatedView style={{ opacity: animValue }}><Text variant="caption">{str}</Text></AnimatedView>`. NativeDriver handles View opacity equally well. Affects: `components/SplashAnimation.tsx`, any animated text.

- **[2026-02-27] tsconfig.json include list must cover types/ directory:** `apps/mobile/types/index.ts` is NOT automatically included by the default Expo tsconfig pattern. Add `"types/**/*.ts"` to the include array in `apps/mobile/tsconfig.json`. Without it, TypeScript may not pick up type changes in watch mode. Affects: `apps/mobile/tsconfig.json`.

- **[2026-02-27] AnimatedView inside Svg = Android bridge crash:**
  Placing an AnimatedView (or any React Native View) as a direct 
  child of a react-native-svg Svg component causes 
  "java.lang.String cannot be cast to java.lang.Boolean" on Android. 
  Svg children must be SVG primitives only (Rect, Circle, Path, G). 
  Fix: each animated truck part must be its own AnimatedView → Svg 
  pair. Never nest AnimatedView inside Svg. 
  Affects: any component using react-native-svg with animations.

- **[2026-02-27] Expo Router Tabs — iterate tab config array rather than hardcoding Tabs.Screen:** In `(seller)/_layout.tsx` and `(aggregator)/_layout.tsx`, render `<Tabs.Screen>` by mapping over `SELLER_TABS` / `AGGREGATOR_TABS` from `TabBar.tsx` rather than copy-pasting each tab. Pattern: `{TABS.map((tab) => (<Tabs.Screen key={tab.name} name={tab.name} options={{ tabBarIcon: ({ color, focused }) => <tab.Icon size={24} color={color} weight={focused ? 'fill' : 'regular'} /> }} />))}`. Keeps TabBar.tsx as single source of truth. Affects: `app/(seller)/_layout.tsx`, `app/(aggregator)/_layout.tsx`.

- **[2026-02-27] Splash → auth navigation: router.replace not router.push:** `app/index.tsx` calls `router.replace('/(auth)/phone')` inside `SplashAnimation`'s `onComplete`. Using `replace` removes splash from the back-stack — hardware back on the phone screen exits the app. Using `push` would return to the splash. Wrap the handler in `useCallback` so SplashAnimation always gets a stable function reference. Affects: `app/index.tsx`.
- **[2026-02-27] ListHeaderComponent for Static Layouts in FlatList:** To avoid the "VirtualizedLists should never be nested inside plain ScrollViews" warning and underlying performance issues, always use `ListHeaderComponent` and `ListFooterComponent` on a single `FlatList` to render complex static UI elements above and below list items. This enables the entire page to scroll as one reliable view without NestedScrollView nesting warnings. Affects: `apps/mobile/app/(seller)/home.tsx`.

- **[2026-03-17] Auth Overhaul — Mode Separation at HTTP Layer:** The unified auth flow enforces `mode: 'login' | 'signup'` as a **required parameter at request time** (not at verify time). This prevents ambiguous OTP interpretation. Pre-request existence check enforces correct mode: `login` unknown phone → 404; `signup` existing phone → 409. The mode is stored in Redis (`otp:mode:{phoneHmac}`) and read at verify time to determine user creation vs update. Mode key is deleted immediately after read (one-time use). Affects: `backend/src/routes/auth.ts`, mobile phone screen layout (tabs for mode selection).

- **[2026-03-17] Zustand Interface Export for Type Safety:** The `AuthState` interface in `authStore.ts` must be exported (`export interface AuthState`) to allow other files to import it for type-safe Zustand selector callbacks. Without export, editors show autocomplete but TypeScript compilation fails (TS2459). Pattern: `import { useAuthStore, type AuthState } from '../store/authStore'` then use as `useAuthStore((s: AuthState) => s.field)`. This enables hop-free IDE guidance and stricter error checking. Affects: `apps/mobile/store/authStore.ts`, `apps/mobile/app/_layout.tsx`.

- **[2026-03-17] Import Consolidation for Type + Runtime:** When importing both a Zustand hook and its state interface from the same module, consolidate into a single import line: `import { useAuthStore, type AuthState }` (not two separate imports). This improves readability and reduces line count. TypeScript's `type` keyword ensures the interface is pruned from compiled JS code. Affects: any file using Zustand stores with typed callbacks.

- **[2026-03-17] Countdown Timer Effect Cleanup Pattern:** The OTP countdown timer uses `setInterval(...)` inside a `useEffect`. The cleanup function must call `clearInterval()` to prevent memory leaks. Pattern: `useEffect(() => { const id = setInterval(() => setRemaining(r => r - 1), 1000); return () => clearInterval(id); }, [])` — the dependency array must be empty to ensure effect runs once on mount. Always verify Android lifecycle — timers must stop on screen blur (handled by React Native's `AppState` listener if needed, but `clearInterval` in return handles unmount cases). Affects: `apps/mobile/app/(auth)/phone.tsx`.

- **[2026-03-17] PostgreSQL UNIQUE Constraint + Application-Level Mode Validation = Defense in Depth:** The DB constraint (`UNIQUE(phone_hash)`) and application-level mode existence checks both prevent double-signup race conditions. Do NOT omit one for the sake of simplicity. The DB constraint catches concurrent HTTP requests that both pass the app-level check; the app-level check ensures fail-fast 404/409 responses. Query: `SELECT rowCount ?? 0 > 0` (null-safety fix for pg library) to determine existence. Affects: `backend/src/routes/auth.ts`, migration `0022_unique_phone_hash.sql`.

- **[2026-03-17] Response DTO — Explicit Field Exclusion (Security V24):** The OTP verify response **must not** include `phone`, `phone_hash`, `legacy external auth user id`, or any sensitive identifiers. Response contract: `{ token: { jwt }, user: { id, user_type }, is_new_user }` (4 fields only). This forces all routing logic to depend on the `is_new_user` flag (not on checking if user_type exists) and prevents leaking auth metadata. Build the DTO by explicitly selecting fields, not by spreading and deleting. Affects: `backend/src/routes/auth.ts` line ~120.

- **[2026-03-17] Post-Verify Routing — Three Branches via is_new_user + user_type:** After OTP verify, route based on two pieces of state: (1) `is_new_user` from the response, (2) `user_type` from the response. Three branches: new user → role selection screen; returning seller → seller home (skip onboarding); returning aggregator → aggregator home (skip onboarding). This pattern requires the mobile app to store both flags in auth state and read them immediately after `setSession()`. Affects: `apps/mobile/app/(auth)/phone.tsx` lines ~180–210, the post-verify callback.

- **[2026-03-17] Returning User Guard — isNewUser Redirect Pattern:** The `/(auth)/user-type` screen must redirect users with `isNewUser: false` directly to their role-specific home. This prevents UI reach (user sees a role selection screen but already has a role). Pattern in `user-type.tsx`: `useEffect(() => { if (!isNewUser) router.replace(userType === 'aggregator' ? '/(aggregator)/home' : '/(seller)/home'); }, [isNewUser])`. Guard must run on every render, not just mount, to catch updates to isNewUser. Affects: `apps/mobile/app/(auth)/user-type.tsx`.

- **[2026-03-17] Logout Handler Standardization:** Both Seller and Aggregator home screens must call the same logout sequence: `Custom JWTSignOut()` → `clearSession()` → `router.replace('/(auth)/phone')`. The order is critical: Custom JWT signs out first (invalidates JWT), then app state is cleared, then router navigates off the screen. Use `router.replace` not `push` to prevent going back. Consolidate logout logic into a helper function in authStore (e.g., `performLogout()`) to avoid duplication across two home screens. Affects: `apps/mobile/app/(seller)/home.tsx`, `apps/mobile/app/(aggregator)/home.tsx`, `apps/mobile/store/authStore.ts`.

- **[2026-02-27] UI reference HTML overrides in-progress screen designs:** `sortt_seller_ui.html` was introduced as the canonical visual spec. It reveals: (1) Seller tab bar is Home/Orders/Browse/Profile — not Home/My Orders/Prices/Profile; (2) Aggregator has 5 tabs not 4; (3) Greeting strip is a separate navy View above the scroll container; (4) NavBar needs a light variant; (5) 6 new colour tokens and 6 material-bg tokens are required. All screens currently in progress (home.tsx, prices.tsx) must be rebuilt to match the HTML reference before proceeding. tokens.ts must be updated first.Affects: tokens.ts, TabBar.tsx, NavBar.tsx, all seller and aggregator screens.

- **[2026-02-27] Greeting strip sits OUTSIDE FlatList — fixed navy View:** The seller home and aggregator home both have a full-width navy hero/greeting block that sits between the NavBar and the scrollable FlatList as a plain `<View>`. It does NOT scroll. Do NOT put it inside `ListHeaderComponent` — ListHeaderComponent is for elements that should scroll with list items. The non-scrolling pattern is: `<SafeAreaView> → <NavBar> → <View style={greetingStrip}> → <FlatList>`. Affects: `app/(seller)/home.tsx`, `app/(aggregator)/home.tsx`.

- **[2026-02-27] NavBar variant prop — avoid breaking existing callers:** NavBar now accepts `variant?: 'dark' | 'light'`. Default is `'dark'`. All existing call sites with no variant prop continue to use the navy background. Light variant has white background + `colors.border` bottom border + navy text. The back button in light variant needs its own style: `colorExtended.surface2` background + `colors.border` border. Affects: `components/ui/NavBar.tsx`.

- **[2026-02-27] MarketRateCard rateDisplay override for range strings:** `MarketRateCard` now accepts optional `rateDisplay?: string`. When provided, it renders instead of the computed `₹{ratePerKg.toFixed(0)}` and the `/kg` suffix is also hidden. Use `rateDisplay` for browse.tsx range strings like `"₹28–650"`. Keep `ratePerKg` for any future sorting/logic. Affects: `components/ui/Card.tsx`.

- **[2026-02-27] Corrected aggregator tab lesson from previous entry:** Previous entry said `AGGREGATOR_TABS[0].name = 'feed'` and warned against renaming. This is now superseded. The `sortt_seller_ui.html` alignment task renamed feed→home, map→route and added a new 5th `orders` tab. `AGGREGATOR_TABS` now = Home/Orders/Route/Earnings/Profile. The old lesson no longer applies. Affects: `components/ui/TabBar.tsx`, all aggregator screen files.

- **[2026-02-27] `as any` cast required for mixed style arrays passed to Typography components:** When combining a named `StyleSheet` style with an inline `{ color: ... }` override and passing to `Text` or `Numeric`, TypeScript infers a union type that is incompatible with `TextStyle`. Add `as any` cast: `style={[styles.foo, { color: dynamicColor }] as any}`. This is a well-known React Native + TypeScript limitation. Document every usage with a comment. Affects: `browse.tsx`, `home.tsx`, `(aggregator)/home.tsx`.
- **[2026-02-27] `as any` cast required for conditional custom component styles:** Similar to Typography styles, when passing a conditionally selected named style (e.g. `isActive ? styles.active : styles.inactive`) inside an array to a custom component wrapping a `Pressable` or `View`, TS often complains about union incompatibility against `ViewStyle`. Fix by applying `as any` at the end of the style array. Affects: `orders.tsx`, `Button.tsx`.

- **[2026-02-27] NavBar rightSide overflow: wide rightAction props clip the title off-centre.** When a NavBar `rightAction` is a wide node (e.g. "Updated 6:00 AM"), the `rightSide` container expands and pushes the centred title left. Fix: add `flexShrink:1, maxWidth:120` to `rightSide` style in `NavBar.tsx`. The title's `flex:1` ensures it always gets remaining space. Affects: `NavBar.tsx`.

- **[2026-02-27] `userTypeBadge` NavBar pill — TextStyle array lint.** The `Text` component's `style` prop is typed as `TextStyle` (not `StyleProp<TextStyle>`), so passing a style array `[styles.foo, { color: ... }]` causes a TS error. Fix: cast with `as any`. This is the same pattern as other ad-hoc style overrides; apply consistently. Affects: `NavBar.tsx`.

- **[2026-02-27] Ambiguous chip height: never combine `height:N` and `minHeight:M` where M > N.** On React Native, `minHeight` overrides `height` at runtime — but the intent is opaque. Always set `height` to the intended final value explicitly. Remove the smaller value. Affects: `(seller)/orders.tsx`.

- **[2026-02-27] Auth screen route mismatch: PLAN.md said `(auth)/index.tsx` but the actual file is `phone.tsx`.** Always verify filename by directory listing before hardcoding routes. `router.replace('/(auth)/phone')` is correct. Affects: `profile.tsx`, `PLAN.md §2.2`.

- **[2026-02-28] Global NavBar Layout Rule:** Per updated UI specs, all `NavBar` titles must be left-aligned (no centering). The white background (`variant="light"`) must be used for all non-Home and non-Profile screens (e.g. Orders, Browse). The NavBar handles its own `SafeAreaView` padding internally. Affects: `NavBar.tsx`, `orders.tsx`, `browse.tsx`.

- **[2026-02-28] Wizard State Management Pattern:** Multi-step wizard flows (like the Scrap Listing Wizard) must use a local-only Zustand store (e.g., `listingStore.ts`) rather than passing data via Expo Router local search params. This ensures `router.back()` calls preserve all complex selections seamlessly, and `router.replace` combined with an explicit `store.resetListing()` securely purges memory afterwards to prevent data leakage on the next launch. Affects: `listingStore.ts`, `app/(seller)/listing/step[1-4].tsx`.

- **[2026-02-28] Expo SDK 54+ `newArchEnabled` removal:** The `newArchEnabled` property is no longer allowed in `app.json` for SDK 54+ as the New Architecture is now enabled by default and the configuration property has been removed. Inclusion of this property causes linting and validation errors. Affects: `apps/mobile/app.json`.

- **[2026-02-28] SafeAreaView must come from react-native-safe-area-context, not react-native:** React Native's built-in `SafeAreaView` does not accept the `edges` prop — it causes a TS2769 "no overload matches" error. Always import `SafeAreaView` from `react-native-safe-area-context`. Using the wrong import silently works at runtime on iOS (they behave the same) but fails TypeScript compilation. Affects: all screen files.

- **[2026-02-28] Typography Text component does not accept accessible/accessibilityRole props:** The project's `<Text>` wrapper from `Typography.tsx` extends `TextProps` only — it does not pass through `accessible`, `accessibilityRole`, or `accessibilityLabel`. Wrapping in a `<Pressable>` or using a built-in `<Text onPress>` is fine, but adding those accessibility props directly to the Typography wrapper causes TS2322. Remove them from Typography Text. Affects: `(shared)/order/[id].tsx`.

- **[2026-02-28] MATERIAL_COLORS map must use colors.material.X.fg token paths:** Both `otp-confirm/[id].tsx` and `receipt/[id].tsx` had hardcoded MATERIAL_COLORS maps with raw hex strings. These must always reference `colors.material.paper.fg`, `colors.material.metal.fg`, etc. from `constants/tokens.ts`. The canonical map shape is: `{ paper: colors.material.paper.fg, metal: ..., plastic: ..., ewaste: ..., fabric: ..., glass: ... }`. Copy this pattern to any future screen that needs per-material colours. Affects: `otp-confirm/[id].tsx`, `receipt/[id].tsx`.

- **[2026-02-28] Modal opacity overlay — never use rgba, always opacity on a black View:** The two-tap cancel bottom sheet uses a `Pressable` overlay with a nested black View (`backgroundColor: '#000000'`) and `style={{ opacity: 0.5 }}`. This pattern avoids hardcoded rgba strings (which G2.8 grep would flag). The `#000000` exception is permissible because it is a pure-black constant with no colour information — document with a comment. Affects: `(shared)/order/[id].tsx`.

- **[2026-02-28] DO NOT use native `<Modal>` in Expo Router screens:** In Expo SDK 54+ (React Native 0.77+ New Architecture / Fabric), the native `Modal` component from `react-native` frequently causes a `flushSyncWorkAcrossRoots_impl` crash when navigating back from a stack screen while the modal is present in the tree. Instead of using `<Modal>`, use an absolutely positioned `<View>` with `StyleSheet.absoluteFill` and a high zIndex. Affects: all screens.

- **[2026-02-28] SafeAreaView edges:** `NavBar` must be strictly responsible for top system safe area inset. All screens must pass `edges={['bottom']}` (or `[]` if no bottom offset needed) to `SafeAreaView` to prevent double padding and allow `expo-status-bar` to seamlessly integrate with the header area. Affects: all screens.

- **[2026-02-28] Scroll Compression Radius:** Navy hero sections that touch the `NavBar`, such as the `Greeting Strip` on home pages, must have a bottom border-radius of `0`. This allows them to seamlessly compress and hide beneath the NavBar on scroll without breaking the unified visual block. Affects: `home.tsx` (seller and aggregator).

- **[2026-03-01] Navigation Registration:** Tabs.Screen href:null entries must live inside the Tabs navigator (seller/_layout.tsx), never in the root Stack (_layout.tsx). Placing them in the wrong layout silently fails — Expo does not throw an error. Affects: `(seller)/_layout.tsx`, `_layout.tsx`.

- **[2026-03-01] Standard Start Commands (3-Command Rule):** To prevent Metro server crashes, port conflicts, and caching discrepancies, all development servers MUST be started from the monorepo root directory using the filtering scripts in `package.json`:
  1. `pnpm dev:mobile`
  2. `pnpm dev:web`
  3. `pnpm dev:backend`
  Never `cd` into an app's directory to start its server manually. Affects: all sessions and local dev workflows.

- **[2026-03-01] Exceptions for Raw Hex UI Colors:** If a specific screen UI uses a raw hex color strictly because it uniquely isolates an icon background specifically dictated by the canonical HTML reference (e.g., `#F0FDF4` and `#EFF6FF` for specific account type card icons), it is an acceptable exception to the "zero raw hex values" rule ONLY if explicitly commented with `/* Hex allowed per MEMORY.md exception rule for specific card icons */`. Keep to absolute necessity minimum. Affects: `account-type.tsx`.

- **[2026-03-01] Mocking Input Containers for Adornments:** Rather than modifying the generic `Input.tsx` component to support arbitrary right-side elements (which risks breaking unrelated screens), use a custom view styled to visually replicate the Input's borders and sizing (e.g., `disabledInputRow`) when you need to embed custom interior elements like the "Pilot 🔒" pill on disabled display fields. Affects: `seller-setup.tsx`.

- **[2026-03-01] Order Detail mandatory audit findings:** A mandatory UI audit of the Order Detail screen (`order/[id].tsx`) flagged three pre-existing functional gaps: (1) Missing V25 coordinator coordinate/locality reveal logic, (2) Missing cancel bottom sheet interaction state, and (3) Missing pre-acceptance amber lock text. These are logged as pre-existing bugs to be resolved during backend integration. Affects: `(shared)/order/[id].tsx`.

- **[2026-03-01] TSConfig Best Practice**: In Expo projects, always place `"extends": "expo/tsconfig.base"` at the very top of `tsconfig.json`. Overriding `moduleResolution` to `"bundler"` is required if the base config uses `customConditions`. Affects: `tsconfig.json`.

- **[2026-03-01] JSX Chunk Safety**: When using `multi_replace_file_content` on deeply nested TSX, double-check tag balance. Automated `tsc` runs are mandatory after such edits. Affects: `(shared)/order/[id].tsx`.

- **[2026-03-01] Dependency Conflicts**: If `pnpm install` fails with file system locks, ensure `pnpm dev:mobile` is stopped before retrying. Affects: local dev workflow.

- **[2026-03-01] Profile Tab 'Floating' Stats Pattern:** The Seller Profile tab implements a 'floating' stats layout where the stats boxes overlap the navy header and slate background. To achieve this visually while maintaining layout integrity, use an absolutely positioned container for stats with a top offset and zIndex, ensuring enough padding on the following container to prevent overlap with menu items. Affects: `(seller)/profile.tsx`.

- **[2026-03-01] Prices Screen Ad Banner Constraints:** The Market Rates screen includes a sponsored ad banner (S29). This is a mocked UI element using a `BaseCard` with standard spacing tokens and `colorExtended.amberLight` background to distinguish it from operational rate cards. Affects: `(seller)/prices.tsx`.

- **[2026-03-01] Link Navigation vs router.push:** Primary navigation inside the tab bar is handled by `expo-router` Tabs. Internal screen navigation (e.g. Home secondary actions to Prices) should use `router.push()` from `expo-router` for cleaner logic rather than wrapping large items in `<Link asChild>`. Affects: `(seller)/home.tsx`.

---

## 10. Agent Memory Protocol (How Agents Must Use This File)

> This section is authoritative. Any agent operating on this project must follow it.

### 10.1 Session Start — Mandatory Memory Load

Every agent session on this project begins with exactly one action before any other:

```
Read MEMORY.md in full.
```

Do not scan the codebase. Do not read TRD/PRD first. Do not start generating code. Read MEMORY.md. It documents everything that would otherwise require scanning hundreds of files.

The `sortt-project` skill (SKILL.md in the project root skill directory) enforces this. If the skill is loaded, it handles the reminder automatically. If working without the skill, follow this protocol manually.

### 10.2 During the Session — Memory-First Lookups

When you need to know something about this project, check in this order:

1. **MEMORY.md first** — if it's documented here, use it. Do not scan code to confirm.
2. **PLAN.md second** — for build sequencing and day targets.
3. **TRD / PRD third** — only for details not captured in MEMORY.md.
4. **Codebase scan last** — only for things genuinely not in any of the above.

This order exists because MEMORY.md is maintained to be accurate. Scanning the codebase to re-discover documented patterns wastes tokens and risks finding stale or inconsistent code.

### 10.3 Session End — Mandatory Memory Update

Before ending any session in which you:
- Fixed a non-obvious bug
- Made an architectural decision not already in §3
- Discovered a library quirk or unexpected behaviour
- Established a new pattern or convention
- Added an environment variable (update §5)
- Added a pg_cron job (update §8)

**You must update MEMORY.md §9 (Learned Lessons)** with a dated entry. Format:

```
- **[YYYY-MM-DD] [title]:** [problem], [solution], [why the alternative fails]. Affects: [file/system].
```

Do not delete old entries. Append only.

### 10.4 What This System Prevents

| Without memory discipline | With memory discipline |
|---|---|
| Agent scans all 50+ files to find the colour tokens | Agent reads §2 — done in 10 seconds |
| Agent calls `legacy stack.storage` directly | Agent reads §3.1 — uses IStorageProvider |
| Agent uses Twilio for OTP | Agent reads §3.5 — uses WhatsApp hook |
| Agent trusts JWT `user_type` claim | Agent reads §3.5 — re-fetches from DB |
| Agent ships `phone_hash` in API response | Agent reads §3.7 / §4 D2 — blocked |
| Agent uses wrong OTP delivery provider | Agent reads §3.5 — Meta WhatsApp only |
| Agent repeats a solved bug | Agent reads §9 — already documented |
| Agent builds parallel workstreams | Agent reads §0.2 — sequential only |
| Two agents make conflicting decisions | Both read §0.1 — same authority hierarchy |

---

## 9. Learned Lessons

- **[2026-03-01] Tab Route Isolation:** To keep a route functional (e.g., for programmatic navigation) but hidden from the bottom tab bar, register it in `_layout.tsx` using `Tabs.Screen` with `options={{ href: null }}`. This avoids rendering an empty space or redundant icon in the UI. Affects: `apps/mobile/app/(seller)/_layout.tsx`.

- **[2026-03-02] BackHandler Block on Onboarding:** To prevent accidental app exit during onboarding, use `BackHandler.addEventListener('hardwareBackPress', () => true)`. Returning `true` consumes the event and blocks the back action without closing the app. Always remove the listener on cleanup. Affects: `apps/mobile/app/(auth)/onboarding.tsx`.

- **[2026-03-02] Onboarding Dot Styling:** The universal onboarding carousel uses three dot states: active (red pill, width 24), done (teal circle, width 8), and inactive (border-colored circle, width 8). Animations must use `useNativeDriver: false` when interpolating width as it is a non-transform property. Affects: `apps/mobile/app/(auth)/onboarding.tsx`.

- **[2026-03-02] Multi-Path Auth Redirection:** In `otp.tsx`, redirection must be server-informed (mocked via `authStore.userType`). Sellers route to `/(auth)/seller-setup` and Aggregators route to `/(auth)/aggregator/profile-setup`. All back navigation in the auth stack must use `router.replace` to prevent navigation loops. Affects: `apps/mobile/app/(auth)/otp.tsx`.

- **[2026-03-02] Navigation Stack Management:** When transitioning from onboarding/auth flows to main home screens, always use `router.replace()`. This clears the navigation stack, preventing the user from returning to sensitive setup screens via the system back button. Pattern: `router.replace('/(aggregator)/home')` for aggregator flow.

- **[2026-03-02] SafeAreaView Layout Reconciliation:** To prevent duplicate top padding when using `NavBar`, always pass `edges={['bottom']}` to the `SafeAreaView` wrapping the screen. The `NavBar` is responsible for top safe area handling. Affects: all onboarding and setup screens.

- **[2026-03-04] Aggregator UI Gapping:** Redundant `borderBottom` and `paddingBottom` on `progressContainer` in wizard flows cause overlapping lines and visual gaps when scrolling. All wizard layouts must use `backgroundColor: colors.bg` for the screen and `colors.surface` only for the header/progress section to maintain Sortt's professional aesthetic.

- **[2026-03-04] Aggregator Execution Stack Isolation:** Order execution screens (Navigation, Weighing, OTP) that should hide the bottom tab bar are placed inside a nested stack `(aggregator)/execution/` rather than shared folders. The `_layout.tsx` in `execution` uses a standard Headerless Stack, ensuring the bottom tab bar provided by `(aggregator)/_layout.tsx` is completely hidden when inside the execution flow. Affects: `apps/mobile/app/(aggregator)/execution/`.

- **[2026-03-04] Global Order Management State:** When implementing actions like rejecting/cancelling orders that must reflect consistently across multiple tabs (e.g., Home feed vs Orders feed), always lift the tracking state (like `rejectedOrderIds`) into the global Zustand store (`useOrderStore`) rather than relying on local React state. Affects: `apps/mobile/app/(aggregator)/home.tsx` and `orders.tsx`.

- **[2026-03-05] Camera Hook Architecture:** `expo-image-picker` must NEVER be imported directly in screen files. All camera calls go through `hooks/usePhotoCapture.ts`. The hook owns permission requests, launch, and local URI state. Screens only call `pickPhoto()` and read `photoUri`. Day 8 uploads are wired inside the hook only — screen interface is stable. Affects: `step2.tsx`, `weighing/[id].tsx`, `kyc.tsx`.

- **[2026-03-05] Store-Driven Disabled States:** The CTA `disabled` prop must always read from the Zustand store (e.g., `scalePhotoUri`, `kycAadhaarUri`) NOT from the hook's local `photoUri` state. This ensures the disabled guard survives screen re-mounts and reflects truth that persists in the store. Pattern: `const canSubmit = aggregatorStore.scalePhotoUri !== null && ...`.

- **[2026-03-05] app.json vs app.config.ts for Permissions:** iOS `infoPlist.NSCameraUsageDescription` and Android `permissions` must be literal strings in `app.json` — `${APP_NAME}` template variables are NOT interpolated in static JSON. Do not use placeholders in native permission strings. Only `app.config.ts` (dynamic) resolves imports. For this project, `app.json` is used and literals are acceptable. Affects: `apps/mobile/app.json`.

- **[2026-03-05, updated 2026-03-10] Four-Instance Hook Pattern for KYC:** The KYC screen requires four independent camera sessions — one per document slot. Call `usePhotoCapture()` four times: `const aadhaarFront = usePhotoCapture(); const aadhaarBack = usePhotoCapture(); const selfie = usePhotoCapture(); const conditional = usePhotoCapture();`. The fourth instance serves either the shop photo or vehicle photo depending on `aggregatorStore.aggregatorType`. Each instance maintains its own `permissionDenied`, `isLoading`, and `photoUri` state independently. The `disabled` guard on the Submit CTA reads from Zustand store fields, not from hook-local state. Affects: `apps/mobile/app/(auth)/aggregator/kyc.tsx`.

- **[2026-03-06] navigation/safeBack Pattern C:** All back navigation must use the `safeBack(fallbackRoute)` utility from `utils/navigation` instead of inline `router.canGoBack() ? router.back() : router.replace(...)`. This ensures a single implementation of Pattern C across the codebase. Never write raw `router.canGoBack()` checks in components. Affects: all screens with back navigation.

- **[2026-03-06] Order Detail Routing Architecture (Aggregator):** Aggregators now use three distinct detail views based on order state: (1) `order-detail.tsx` for New orders (Accept/Reject), (2) `active-order-detail.tsx` for Active orders (Navigate/Cancel + Full Address), and (3) `order-history-detail.tsx` for Completed/Cancelled orders (Read-only + Ratings). Routing is handled in `orders.tsx` by checking order status. Affects: `apps/mobile/app/(aggregator)/`.

- **[2026-03-06] "On the Way" Naming Convention:** The status `'en_route'` display label must always be "On the Way" (Sentence Case) across the entire application UI to ensure user-centric consistency. The internal status code remains `'en_route'` for backend compatibility. Affects: `StatusChip.tsx`, `orders.tsx`, `active-order-detail.tsx`.

- **[2026-03-06] Android Package Consolidation for EAS:** Duplicate `android.package` entries in `app.json` (one inside `expo` and one outside) cause build-time contradictions. Always consolidate inside `expo.android.package`. Added explicit foreground image and background color for adaptive icons to satisfy EAS validation. Affects: `apps/mobile/app.json`.

- **[2026-03-08] Migration Execution Environment:** When raw `psql` is unavailable in the execution environment (e.g., Windows without PostgreSQL tools installed), executing `.sql` migration files via a Node.js script using the `pg` package is the preferred fallback. Ensure connection strings enforce SSL (`sslmode=require`) to match Azure Flexible Server constraints. Always ensure `client.end()` is called to prevent hanging scripts. Affects: Day 4 database setup.

- **[2026-03-09] Multi-Action RLS Syntax Limitations:** Combining `FOR SELECT, UPDATE, DELETE` into a single `CREATE POLICY` can fail with syntax errors in PostgreSQL depending on the clauses provided (e.g., providing `USING` but omitting `WITH CHECK` for `UPDATE`). To ensure robustness, split multi-action policies into atomic `CREATE POLICY ... FOR SELECT`, `FOR UPDATE`, and `FOR DELETE` statements. Affects: `migrations/0009_rls.sql`.

- **[2026-03-09] Partition RLS Inheritance:** Enabling Row Level Security (`ALTER TABLE parent ENABLE ROW LEVEL SECURITY`) on a partitioned parent table does NOT automatically enable it on existing child partition tables. `rowsecurity=false` will remain on the partitions. You must explicitly run `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` on every individual partition table. Affects: `migrations/0009_rls.sql`.

- **[2026-03-09] Custom JWT Middleware Secret Requirement:** `Custom JWTExpressRequireAuth()` throws a fatal error if `JWT_SECRET` is missing from the environment, crashing the server. In phased deployments where secrets are not yet injected, explicitly check for `process.env.JWT_SECRET` and gracefully return a 401 to prevent the app from failing to boot. Affects: `backend/src/middleware/auth.ts`.

- **[2026-03-09] Azure App Service Node.js Version Match:** The GitHub Actions workflow `setup-node` version must exactly match the Node LTS version provisioned on the Azure App Service (e.g., `24.x`). Mismatches cause silent deployment or startup failures in Kudu. Affects: `.github/workflows/main_sortt-backend.yml`.

- **[2026-03-09] Azure App Service Real URL:** The Azure App Service real URL is the long internal domain, not the short custom one. Always use the full URL from Azure Portal → Overview → Default domain. The short URL (sortt-backend.azurewebsites.net) does not resolve. Affects: all Day 7+ API calls and ALLOWED_ORIGINS env var.

- **[2026-03-09, updated 2026-03-10] HMAC-SHA256 for OTP Hashing:** Raw OTPs must never be persisted. Only the HMAC-SHA256 hash (using `OTP_HMAC_SECRET`) should be stored in Redis for verification. The `otp_log` table should store only the `phone_hash` and `expires_at`, with `otp_hmac` made nullable and kept empty to prevent any leakage of verification material in the audit log. Verification is purely Redis-driven via TTL. Affects: `backend/src/routes/auth.ts`.

- **[2026-03-10] Auth Router Mounting Order:** The `authRouter` (containing `/request-otp` and `/verify-otp`) must be mounted in `index.ts` BEFORE the global Custom JWT `authMiddleware`. This ensures that public OTP routes are accessible without a JWT. Additionally, these routes should be explicitly listed in the middleware exemption list in `middleware/auth.ts` as a secondary guard. Affects: `backend/src/index.ts`, `backend/src/middleware/auth.ts`.

- **[2026-03-20] Day 13 channel contract fix (V32):** Mobile must subscribe using backend-provided full channel tokens (`orderChannelToken`, `chatChannelToken`) and must never build private channel names from raw `orderId`. This eliminates channel-pattern drift and keeps backend `channelHelper.ts` as source of truth. Affects: `apps/mobile/hooks/useOrderChannel.ts`, `backend/src/utils/channelHelper.ts`, `backend/src/utils/orderDto.ts`.

- **[2026-03-20] Ably Token Auth hard rule:** `ABLY_API_KEY` remains backend-only; mobile authenticates only via `GET /api/realtime/token` using Custom JWT. `EXPO_PUBLIC_ABLY_AUTH_URL` is allowed in mobile env; `EXPO_PUBLIC_ABLY_KEY` must not be used. Affects: `backend/src/routes/realtime.ts`, `backend/src/lib/realtime.ts`, `apps/mobile/lib/realtime.ts`, `apps/mobile/.env.example`.

- **[2026-03-20] Realtime cleanup pattern on app background:** Closing the singleton Ably client via `disconnectRealtime()` in root AppState handler is the stable cleanup pattern; listener-only cleanup on individual screens is not sufficient for background lifecycle culling. Affects: `apps/mobile/app/_layout.tsx`, `apps/mobile/lib/realtime.ts`.

- **[2026-03-20] Forward-only execution workflow refinement:** Aggregator execution screens must redirect stale stages to orders (or current expected stage) and use `router.replace` for back actions to prevent reopening old stage pages after status progression. Affects: `apps/mobile/app/(aggregator)/execution/navigate.tsx`, `apps/mobile/app/(aggregator)/execution/weighing/[id].tsx`, `apps/mobile/app/(aggregator)/execution/otp/[id].tsx`.

- **[2026-03-20] Chat unread/read-state UX refinement:** Unread badge counts should be derived from `chatStore.messages[orderId]`, and read acknowledgements should sync via `PATCH /api/messages/read` + `messages_read` realtime event so delivery ticks update without manual refresh. Affects: `apps/mobile/store/chatStore.ts`, `backend/src/routes/messages.ts`, `apps/mobile/components/ui/MessageBubble.tsx`, `apps/mobile/components/order/ContactCard.tsx`.

- **[2026-03-24] Storage provider standard:** Cloudflare R2 is the canonical storage service for MVP. All storage operations must flow through `@sortt/storage` (`R2StorageProvider` default), files remain private, and access is only via short-lived signed URLs (no public URL paths). Affects: storage provider docs, backend storage adapters, legal/privacy copy.

- **[2026-03-10] @sortt/storage Stub for Day 7:** While the project architecture requires `@sortt/storage` for file operations, Day 7 uses a local `IStorageProvider` implementation (legacy storage wrapper) directly to unblock KYC testing. The shared package `@sortt/storage` remains a stub and will be fully implemented in Day 14. Affects: `backend/src/routes/aggregators.ts`.

- **[2026-03-10] Zustand kycScreen Field Consistency:** The store field for aggregator business type is `aggregatorType` (mapping to `aggregator_type` in DB), not `businessType`. All conditional UI cards in the KYC screen must bind to `aggregatorType`. Affects: `apps/mobile/store/aggregatorStore.ts`, `apps/mobile/app/(auth)/aggregator/kyc.tsx`.

- **[2026-03-10] Selfie Card Labeling:** To reduce user friction, the selfie upload card must be labeled "Your Photo" with the instructional subtext "Clear selfie facing the camera". This is more intuitive for non-technical users than "Selfie". Affects: `apps/mobile/app/(auth)/aggregator/kyc.tsx`.

- **[2026-03-11] Custom JWT Token Lifecycle Constraints:** Do not cache the Custom JWT token persistently in Zustand's `authStore.Custom JWTToken` across app reloads, as the token is short-lived. Instead, retrieve the session token dynamically using `await Custom JWT.session?.getToken()` on every authenticated API request via a functional getter in the API interceptor, or maintain it synchronously via Custom JWT's active session state. Only store non-expired data into the `authStore`. Affects: `apps/mobile/lib/api.ts`, `apps/mobile/store/authStore.ts`.

- **[2026-03-13] aggregator_profiles has no locality column:** Use `operating_area` instead for aggregator profiles. Affects: `aggregator_profiles` schema and queries.
- **[2026-03-13] preferred_pickup_window is JSONB:** Always wrap `pickup_preference` as `JSON.stringify({ type: value })` before INSERT into `preferred_pickup_window`. Affects: `orders` INSERT logic.
- **[2026-03-13] Custom JWT Middleware redirection:** `Custom JWTMiddleware()` and `requireAuth()` from `@Custom JWT/express` can redirect on invalid tokens. Use `createCustom JWTClient().verifyToken()` directly for API backends to ensure 401 responses. Affects: `backend/src/middleware/auth.ts`.
- **[2026-03-13] verify-otp response shape:** The `verify-otp` endpoint returns `{ token: { jwt: "..." } }` not `{ token: "..." }`. Access the JWT as `response.token.jwt`. Affects: Mobile auth flow.
- **[2026-03-13] otp_log.otp_hmac contents:** The `otp_log.otp_hmac` column stores status strings like `otp_sent`, `otp_verified`, `otp_failed` rather than the actual HMAC hash. Affects: `otp_log` auditing.
- **[2026-03-13] POST /api/orders response shape:** The response for order creation is wrapped as `{ order: {...} }` rather than a flat object. Affects: Order creation DTO mapping.
- **[2026-03-13] order_media_media_type_check constraint:** Allows: scrap_photo, scale_photo, kyc_aadhaar_front, kyc_aadhaar_back, kyc_selfie, kyc_shop, kyc_vehicle, invoice. before_photo and after_photo do not exist in the DB. Route validation must match exactly. Affects: POST /api/orders/:id/media.
- **[2026-03-13] disputes_issue_type_check constraint:** Allows: wrong_weight, payment_not_made, no_show, abusive_behaviour, other. weight_mismatch is not valid. Affects: POST /api/disputes.
- **[2026-03-13] Route mounting order:** GET /api/orders/feed must be registered before GET /api/orders/:id to prevent parameter collisions. Affects: backend/src/routes/orders/index.ts.
- **[2026-03-13] order_status_history schema drift:** The status column is new_status (not status). Affects: POST /api/disputes.
- **[2026-03-13] Legacy storage dev fallback:** Legacy signed URL flow could fail locally when storage credentials were invalid and previously fell back to a non-expiring local relative path. Enforce strict signed URL expiry behavior in production and local parity checks. Affects: GET /api/orders/:id/media/:mediaId/url.
- **[2026-03-16] Order detail scrap photo diagnostics:** Added `console.log('[OrderDetail] scrap mediaUrls', ...)` in `apps/mobile/app/(shared)/order/[id].tsx` to confirm media fetch execution. If this logs `[]` for real orders, first verify `order_media` has `scrap_photo` rows for the order; then inspect `/api/orders/:id/media/:mediaId/url` responses (storage signing fallback behavior may affect signed URL behavior in dev). Affects: mobile order detail scrap photo rendering/debugging.
- **[2026-03-13] aggregator_availability schema drift:** Has no city_code column. Always join via aggregator_profiles to filter by city. Affects: GET /api/orders/feed.
- **[2026-03-13] aggregator_material_rates schema drift:** Uses aggregator_id (not user_id) as the FK column. Affects: DB queries.
- **[2026-03-14] Zustand `api` import:** Ensure `import { api } from '../lib/api'` is a named import in stores like `orderStore.ts`, avoid using default import unless `api` is exported as default. Affects: API integration in Zustand stores.
- **[2026-03-14] TypeScript Function Signatures:** Always ensure function calls match their defined signatures (e.g. removing unused `cancelReason` argument from `cancelOrder` call in `CancelOrderModal.tsx`).
- **[2026-03-16] Order display identity standard:** UI must consume backend `order_display_id` (example: `#000042`) as the primary human-readable order identifier. `orders.order_number` is DB-internal and should not be exposed directly in API payloads. Keep temporary UUID-truncation fallback only as compatibility guard. Affects: `migrations/0018_order_number_per_seller.sql`, `backend/src/utils/orderDto.ts`, `apps/mobile/store/orderStore.ts`, `apps/mobile/store/aggregatorStore.ts`.

- **[2026-03-16] OfflineAwareNavigator Pattern:** Network-offline handling is implemented by replacing the entire `<Stack>` navigator in `app/_layout.tsx` with an `OfflineAwareNavigator` component that gates on `isOnline`. When offline, no Expo Router stack is rendered — the appropriate offline screen replaces the entire view. This automatically suppresses the TabBar and all NavBar icons because those live inside route children that are never rendered. Do NOT attempt to conditionally render a TabBar on top of an offline screen. Affects: `apps/mobile/app/_layout.tsx`, `apps/mobile/components/ui/NetworkErrorScreen.tsx`, `apps/mobile/components/ui/AuthNetworkErrorScreen.tsx`.
- **[2026-03-16] Status History Transition Integrity:** Every non-initial status transition write must include both `old_status` and `new_status` in `order_status_history`; omitting `old_status` causes NULL transition history and weak audit trails. Keep `old_status = NULL` only for initial order creation (`created`). Affects: `backend/src/routes/orders/index.ts`, `backend/src/routes/disputes.ts`.
- **[2026-03-16] Aggregator OTP Completion Sync:** On successful OTP verification, update `aggregatorStore.aggOrders` for the matching order to `status='completed'` immediately (and remove it from `activeOrders`) before background re-fetch. This prevents stale "Continue OTP" state in active tab after completion. Affects: `apps/mobile/store/aggregatorStore.ts`.

- **[2026-03-16] Auth vs In-App Offline Screen Split:** Two distinct offline screens exist. `AuthNetworkErrorScreen` is minimal (logo-only red header, no user persona, no scroll) and is shown when `segments[0] === '(auth)'` or the user is not signed in. `NetworkErrorScreen` is rich (red header mirrors the live NavBar with persona name, avatar, location pill, scroll-driven compression animation, aggregator "Offline" pill) and is shown for all other routes (seller, aggregator, shared). Never render `NetworkErrorScreen` before user identity is loaded. Affects: `apps/mobile/components/ui/AuthNetworkErrorScreen.tsx`, `apps/mobile/components/ui/NetworkErrorScreen.tsx`, `apps/mobile/app/_layout.tsx`.

- **[2026-03-16] Network Auto-Retry and Manual Retry Design:** Both offline screens expose an `onRetry: () => void` callback and an `isRetrying: boolean` prop. The retry initiator (`retryConnectivity` in `_layout.tsx`) calls `api.get('/api/rates')` to probe real connectivity — it does NOT reload the navigation tree. Network restoration is detected by `useNetworkStatus` (which wraps `@react-native-community/netinfo`) independently of the retry probe. Both retry mechanisms coexist: auto-retry fires at `t=10s` countdown, manual retry fires immediately. When `isRetrying` is `true`, the countdown timer pauses and the `ActivityIndicator` shows "Retrying now…". On restore, `OfflineAwareNavigator` switches back to `<Stack>` automatically — no explicit state clear needed. Affects: `apps/mobile/app/_layout.tsx`, `apps/mobile/hooks/useNetworkStatus.ts`.

- **[2026-03-16] Auth Path Restore on Reconnect:** When a user loses connectivity while on an `/(auth)` screen, `offlineAuthPathRef` stores the current pathname. On reconnect, the layout redirects to `/(auth)/phone` if the stored path was `/(auth)/phone` or `/(auth)/otp` (OTP is time-bounded and should not be replayed), or to the exact stored path otherwise. Always clear `offlineAuthPathRef.current = null` before calling `router.replace` to prevent looping. Only redirect if the current path differs from the target. Affects: `apps/mobile/app/_layout.tsx`.

- **[2026-03-18] Aggregator rate snapshot at accept-time:** The accept route must update `order_items.rate_per_kg` and `order_items.amount` inside the same `FOR UPDATE SKIP LOCKED` acceptance transaction by joining `aggregator_material_rates` on `(aggregator_id, material_code)`. If no matching rate exists, set `rate_per_kg=0` and `amount=0` (non-fatal) to keep downstream UI deterministic. Affects: `backend/src/routes/orders/index.ts`.
- **[2026-03-18] Canonical order DTO totals and items:** Seller/aggregator detail screens should consume backend-computed `estimated_total`/`confirmed_total` and canonical `order_items` payload, while preserving legacy `line_items` only for compatibility. This prevents client-side drift in value calculations. Affects: `backend/src/utils/orderDto.ts`, `backend/src/routes/orders/index.ts`, `apps/mobile/store/orderStore.ts`.
- **[2026-03-18] Post-accept navigation safety:** From aggregator pre-accept detail, successful accept should `router.replace` directly to active-order-detail context, not back to feed/list, to avoid invalid back-stack return to a stale pre-accept screen. Affects: `apps/mobile/app/(aggregator)/order/[id].tsx`.
- **[2026-03-18] Seller detail status-aware weights:** Seller detail must render `estimated_weight_kg` before completion and `confirmed_weight_kg` after completion, with totals switched accordingly. Do not reuse a single coalesced weight field for both UX states. Affects: `apps/mobile/app/(seller)/order/[id].tsx`.
- **[2026-03-18] Completed-only seller rating gate:** Rating UI is rendered in seller order detail only when `order.status==='completed' && !seller_has_rated`; on successful submit, replace form with submitted confirmation state and immediately refresh the order from API so `seller_has_rated` stays server-authoritative. Affects: `apps/mobile/app/(seller)/order/[id].tsx`, `backend/src/utils/orderDto.ts`.
- **[2026-03-24] Day 14 provider package packaging:** Workspace provider packages must emit built artifacts (`dist/index.js` + `dist/index.d.ts`) and publish `main/types` to `dist`, otherwise backend TS compilers pull `src` via path aliases and fail `rootDir` checks. Keep package `tsconfig.json` standalone (Node/CommonJS) and do not inherit Expo root `tsconfig` for package builds. Affects: `packages/*/tsconfig.json`, `packages/*/package.json`, `backend/tsconfig.json`.
- **[2026-03-18] Notifications require structured metadata for deterministic deep-linking:** `notifications.data` must carry `order_id` (+ optional `order_display_id`, `kind`) when type=`order`; UI tap handlers should route by current role to seller/aggregator detail paths and fall back to mark-read-only when metadata is missing. Affects: `backend/src/lib/notifications.ts`, `backend/src/routes/notifications.ts`, `apps/mobile/app/(shared)/notifications.tsx`.
- **[2026-03-18] Locality alias compatibility:** `pickup_locality` is the canonical DB field; DTOs should also expose compatibility aliases (`pickupLocality`, `locality`) during migration windows to prevent list/detail display drift across older client mapping code. Affects: `backend/src/utils/orderDto.ts`, `apps/mobile/store/orderStore.ts`.
- **[2026-03-18] Accept-flow state synchronization:** After aggregator accepts an order, refresh canonical order state before transitioning to active detail to avoid stale intermediate values from mixed store sources. Affects: `apps/mobile/app/(aggregator)/order/[id].tsx`, `apps/mobile/store/orderStore.ts`, `apps/mobile/store/aggregatorStore.ts`.

- **[2026-03-31] Dispute status guard inversion:** `POST /api/disputes` incorrectly blocked `completed` orders and allowed non-completed statuses. Fixed by enforcing `order.status === 'completed'`, returning 400 for non-completed and 409 for already-disputed/open-dispute cases. Root cause: guard logic drift from PRD/TRD state-machine requirement. Affects: `backend/src/routes/disputes.ts`.
- **[2026-03-31] Dispute input contract enforcement gaps:** Server accepted arbitrary `issue_type` and lacked API-level description max-length checks. Fixed with strict enum validation (`wrong_weight|payment_not_made|no_show|abusive_behaviour|other`) and explicit `description <= 2000` validation before insert. Root cause: over-reliance on DB CHECK constraints without app-level validation. Affects: `backend/src/routes/disputes.ts`.
- **[2026-03-31] Missing dispute detail/evidence APIs:** `GET /api/disputes/:id` and `POST /api/disputes/:id/evidence` were absent. Implemented both with party/admin access checks, EXIF stripping via `sharp`, storage through provider adapter only, persisted private `storage_path` key, and signed URL retrieval on read. Root cause: partial Day 10 implementation not carried to full TRD route table scope. Affects: `backend/src/routes/disputes.ts`.
- **[2026-03-31] Dispute evidence RLS asymmetry + status history nullability:** `dispute_evidence` SELECT policy only allowed raiser; `order_status_history.changed_by` remained nullable in schema. Fixed with migration `0032_dispute_rls_and_status_history_integrity.sql` to allow both order parties to read evidence and enforce `changed_by NOT NULL` after backfill. Root cause: schema hardening left incomplete after initial rollout. Affects: `migrations/0032_dispute_rls_and_status_history_integrity.sql`.
- **[2026-03-31] Dispute mobile screen shipped as mock:** Shared dispute UI used `setTimeout` mock submit, wrong issue enums, missing maxLength, no inline error, and raw back navigation. Fixed to call `/api/disputes` through shared API client, use exact issue enums, enforce 2000-char input cap, render inline errors, and use `safeBack(fallbackRoute)`. Root cause: UI scaffold not converted to production API integration. Affects: `apps/mobile/app/(shared)/dispute.tsx`.
- **[2026-03-31] Dispute entry-point gaps in order detail screens:** Required raise-dispute entry points were missing in scoped seller/aggregator detail files. Added completed-status-gated dispute actions with explicit route params and fallback navigation. Root cause: dispute CTA placement focused on alternate receipt flows, leaving scoped detail surfaces incomplete. Affects: `apps/mobile/app/(seller)/order/[id].tsx`, `apps/mobile/app/(aggregator)/active-order-detail.tsx`.
- **[2026-03-31] Error response stack leakage in dev paths:** API could return stack traces for malformed requests in non-production environments. Fixed global error handler to return sanitized error bodies without stack in all environments, preserving 4xx vs 5xx semantics. Root cause: debug-oriented non-prod branch leaked internals. Affects: `backend/src/middleware/errorHandler.ts`.
- **[2026-03-31] Startup diagnostics secret-prefix exposure:** Boot logs printed partial secret prefixes for Custom JWT keys. Replaced with boolean configured/missing diagnostics only. Root cause: convenience debugging log was not security-hardened. Affects: `backend/src/index.ts`.

- **[2026-04-04] Admin UI Design System Alignment:** Migrated all admin modules (`login`, `layout`, `kyc`, `disputes`) to use semantic Tailwind tokens from `apps/web/constants/tokens.ts`. Removed all hardcoded hex values to ensure design system consistency. Affects: `apps/web/app/admin/*`.
- **[2026-04-04] Image Optimization & Next.js Compliance:** Replaced all legacy `<img>` tags with Next.js `<Image />` component across the admin dashboard. Configured `remotePatterns` in `next.config.ts` to allow optimized image fetching from Cloudflare R2 and Custom JWT. Affects: `apps/web/app/admin/*`, `apps/web/next.config.ts`.
- **[2026-04-04] Admin Icon Type Safety:** Resolved strict TypeScript linting errors in admin navigation and components by explicitly importing and applying `IconWeight` types from `phosphor-react`. Affects: `apps/web/app/admin/layout.tsx`, `apps/web/app/admin/kyc/page.tsx`.
- **[2026-04-04] Repository Cleanup (Ready for Launch):** Executed a full cleanup of temporary `.tmp` JWTs, standalone test scripts, and integration logs from both root and backend directories to finalize the project state for Day 17 Security Audit.

---

## 11. Pricing Architecture — 3-Tier Model

Sortt uses three distinct levels of pricing to manage marketplace expectations and aggregator profit margins.

| Level | Audience | Access Route | Purpose | Data Source |
|---|---|---|---|---|
| **National Market Index** | Aggregators | Home → Ticker → "See all" | Macro trends for reference | AI Scraper / Admin |
| **Custom Buy Rates** | Aggregators | Profile → "My Buying Rates" | Actual price paid to sellers | Individual Aggregator |
| **Local Average Rates** | Sellers | Home → Hero Card → "Browse" | Expected value in their area | Aggregator Averages |

### 11.1 Display Logic
- **National Market Index**: Read-only for all users. Updated daily at 06:00 IST.
- **Custom Buy Rates**: Editable by aggregators. If not set, defaults to National Index - 5%.
- **Local Average Rates**: Calculated dynamic average of all *online* aggregators within the seller's city/locality.

### 11.2 UI Consistency
- All prices use `DM Mono` font.
- Trends (up/down) color-coded: `colors.teal` (up) / `colors.red` (down).
- All screens must include the locality tag: `[locality] · [city]`.



## Recent Updates (Auth Identity Migration & System Reset)
- Resolved critical user ID misformation during user registrations.
- Refactored profile setup (both sellers and aggregators) to securely transition provisional 	mp_ IDs to structured deterministic IDs.
- Admin functionality cleaned: Super Admin script successfully truncates legacy inconsistencies and reliably sets up fresh deterministic accounts.
- Admin metrics accurately track deterministic IDs correctly without constraint errors.
- UI elements stripped of unwanted scrollbars and mapped to correct tiles sets natively.





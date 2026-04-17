# [APP_NAME] — India's Scrap Marketplace

> **Status:** Day 17 IN PROGRESS: Security Audit, MVP Launch & Admin enhancements (2026-04-13)  
> **Architecture:** pnpm Monorepo  
> **Tech Stack:** Expo SDK 54+, Next.js 15 (admin web), Node.js (Express), Azure PostgreSQL, Gemini AI, Azure Sentry, Azure Monitor Availability Tests, Product analytics (disabled), Behavior analytics (disabled), Sentry (mobile only).

---

## 🏗 Project Structure

```text
[APP_NAME]/
├── apps/
│   ├── mobile/       # React Native (Expo SDK 54) — User/Aggregator App
│   └── web/          # Next.js 15 — Admin web pages (`/admin/*`)
├── backend/          # Node.js/Express — Central API & Webhooks
├── packages/         # Shared Provider Abstractions (@sortt/*)
│   ├── auth/         # IAuthProvider (JWT)
│   ├── maps/         # IMapProvider (Ola Maps)
│   ├── realtime/     # IRealtimeProvider (Ably Realtime)
│   ├── storage/      # IStorageProvider (Cloudflare R2 Storage)
│   └── analysis/     # IAnalysisProvider (Gemini Vision)
├── scraper/          # Python Price Scraper Agent
└── migrations/       # PostgreSQL Migration Scripts
```

---

## 🚀 Setup & Installation

### 1. Prerequisites
- **Node.js:** v20+ (LTS recommended)
- **pnpm:** v10+ (`npm install -g pnpm`)
- **Python:** v3.12+ (for scraper)
- **Expo Go:** Installed on your physical device for mobile testing.

### 2. Dependencies
Install all workspace dependencies from the root directory:
```bash
npm install -g pnpm (If not installed in the system)
pnpm install
```

### 3. Environment Variables
Copy `.env.example` to `.env` in the root and in relevant app directories:
- `apps/mobile/.env`
- `apps/web/.env`
- `backend/.env`
- `scraper/.env`

- `JWT_SECRET`: Backend auth verification.
- `OLA_MAPS_API_KEY`: Backend geocoding/routing key (Ola Maps).
- `EXPO_PUBLIC_OLA_MAPS_API_KEY`: Mobile tile-rendering key for Ola vector style.
- `EXPO_ACCESS_TOKEN`: EAS deployments and updates.
- `DATABASE_URL`: Azure PostgreSQL connection string.
- `REDIS_URL`: Upstash Redis for rate limiting.
- `MAP_PROVIDER`: Backend map provider switch (`ola`).
- `EXPO_PUBLIC_MAP_PROVIDER`: Mobile provider switch (`ola` default).
- `EXPO_PUBLIC_MAP_RENDERING_AVAILABLE`: `false` by default for Expo Go fallback; enable `true` in dev build with native MapLibre module.
- `REALTIME_PROVIDER`: Realtime provider switch (`ably` | `soketi`).
- `SOKETI_URL`: Soketi websocket URL (required when `REALTIME_PROVIDER=soketi`).

### 4. Running Locally

**Start Mobile App (Expo):**
```bash
pnpm dev:mobile
```

**Start Admin Web (Next.js):**
```bash
pnpm dev:web
```

**Start Backend API (Express):**
```bash
pnpm dev:backend
```

---

## 🛠 Tech Stack Details

| Layer | Technology |
|---|---|
| **Mobile** | React Native, Expo Router, DM Sans/Mono, Zustand, Phosphor Icons |
| **Web (Admin Only)** | Next.js 15, Tailwind CSS, Radix UI |
| **Backend** | Node.js, Express, Upstash (Redis), Sharp, Etag |
| **Database** | Azure PostgreSQL, RLS, migration-driven schema |
| **Auth** | Custom JWT (Phone OTP via WhatsApp Cloud API) |
| **Observability** | Azure Sentry (Express + Next.js), Azure Monitor Availability Tests |
| **Analytics** | Product analytics disabled, admin behavior analytics disabled, Sentry (mobile crash symbolication only) |
| **Offline Handling** | `useNetworkStatus` (NetInfo), `OfflineAwareNavigator`, `AuthNetworkErrorScreen`, `NetworkErrorScreen` |
| **AI** | Gemini Flash Vision (Photo Analysis), Gemini Pro (Price Scraping) |

---

### 🗓 Current Status (2026-04-11)
✅ Day 16 Admin Web Dashboard & Tests completed with 100% pass rate.
✅ Landing page implemented at root route (`/`). Admin portal remains accessible at `/admin/login`.
✅ README setup steps unchanged — no new services or env vars introduced.

🚀 Day 17 Security Audit & Infrastructure Hardening: **READY TO START** (Option B telemetry architecture documented).

### 🗓 Status Update (2026-04-17)
✅ Backend order execution stabilization completed:
- Fixed undefined localized material label SQL reference in order accept/finalize response paths.
- Fixed finalize-weighing PostgreSQL bind mismatch (`supplies 1 parameters, requires 2`).

✅ Mobile runtime crash fixes completed:
- Fixed missing i18n `t` binding in seller profile and aggregator profile screens.

✅ Mobile type-safety pass completed:
- Resolved TypeScript issues in profile image upload FS compatibility, notification handler typings, notification route pushes, address geocode field access, and missing material type import.

✅ Verification snapshot:
- `pnpm type-check` passes monorepo-wide (apps/mobile + backend + packages + apps/web).

✅ Day 14 provider abstraction layer completed (2026-03-24):
- All 5 provider packages are implemented and build cleanly: `@sortt/maps`, `@sortt/realtime`, `@sortt/auth`, `@sortt/storage`, `@sortt/analysis`.
- Backend and mobile consume provider abstractions; application code avoids direct vendor SDK imports.

✅ Day 15 feature set completed (2026-03-27):
- Gemini Vision integration is live via `POST /api/scrap/analyze` with EXIF stripping, Redis daily circuit breaker, and image-hash cache.
- `packages/analysis/src/providers/GeminiVisionProvider.ts` implemented with `GEMINI_MODEL` support (`gemini-2.5-flash` default).
- GST invoice generation is live via `backend/src/utils/invoiceGenerator.ts` and `GET /api/orders/:id/invoice` signed download route.
- Invoice generation is non-blocking from order completion path and persists legal `invoice_data` JSONB.
- Daily Python price scraper is wired through `backend/src/scheduler.ts` (node-cron spawn of `scraper/main.py`) and feeds `price_index`.
- Mobile listing step 2 uses AI estimate hints, and receipt flows support invoice download.

✅ Aggregator operating-area discovery now uses maps autocomplete in profile edit.
- Suggestions show locality + city + state + country for discovery, while selected chips persist locality-only values.

✅ Seller browse search now tokenizes name, locality, and material type terms.
- Empty matches now show an explicit "No results found" state.

✅ Execution status: Days 1–16 are complete.

🚀 Day 17 Security Audit + Monitoring + Launch is now **READY TO START**.


✅ Scope clarification (2026-03-30):
- Business seller web UI and aggregator web UI are deferred to a later phase.
- Current web scope is admin pages only, built from `sortt_admin_ui.html` and wired to live backend data.

✅ Seller address management and listing wizard integration updates applied:
- Two-step seller address flow split into map-first + details form (`address-map` → `address-form`).
- Shared draft persistence added via `addressStore` to preserve data while moving between map/details screens.
- Seller listing step3 and addresses list entry points now route through map-first flow.
- Post-save address routing returns to seller addresses list.

✅ Map UX and route-navigation updates applied:
- Aggregator navigate screen now restores a visible current-location marker and renders detailed route geometry when available.
- Seller order detail live-tracking controls were removed so the seller page stays focused on order details and receipt flow.
- Confirm execution screen now shows a pickup-location map preview and hands off to native navigation from the map card or Navigate button.
- Route handoff keeps using the provider-aware external navigation helper in `apps/mobile/utils/mapNavigation.ts`.
- Aggregator route planner now supports tap-to-preview order details on map pins, including status-aware weights/totals, and no longer shows an external "Open Route in Maps" button.

✅ Realtime feed + scheduled routing hardening updates applied (2026-04-11):
- Ably token capability issuance now includes aggregator subscribe access to `orders:hyd:new` in `backend/src/routes/realtime.ts`, resolving capability-denied feed subscription failures.
- Aggregator feed subscription path now has defensive subscribe + immediate API fallback refresh behavior in `apps/mobile/hooks/useAggregatorFeedChannel.ts`.
- Ably provider failed-state handling was hardened in both mobile and backend realtime providers (`packages/realtime/src/providers/AblyMobileProvider.ts`, `packages/realtime/src/providers/AblyBackendProvider.ts`).
- Backend order routing for scheduled pickups no longer hard-blocks by "current time in working hours" during fanout/feed/heartbeat catch-up; matching continues to enforce city/material/operating-area/pickup-window compatibility.
- Availability matching robustness and regression tests were added via `backend/src/utils/availability.ts` and `backend/src/__tests__/availability.test.ts`.

✅ Seller lifetime earnings endpoint issue fixed:
- `/api/orders/earnings` route registration corrected to avoid collision with dynamic `/:id` route.
- Seller Home/Profile now reliably consume lifetime earnings from completed orders endpoint.

✅ Human-readable order number rollout completed:
- `migrations/0018_order_number_per_seller.sql` applied.
- Backend DTO now emits `order_display_id` (formatted `#000001`) for UI.
- Mobile stores and screens consume `order_display_id`/`orderNumber` consistently.
- Execution flow now threads internal route `id` across navigate → weighing → OTP → confirm → receipt.

✅ Network error handling fully wired:
- `hooks/useNetworkStatus.ts` — `@react-native-community/netinfo` listener emits `isOnline`.
- `utils/error.ts` — `isNetworkError(e)` classifier for Axios/native errors.
- `OfflineAwareNavigator` in `app/_layout.tsx` — replaces `<Stack>` with the appropriate offline screen when `isOnline === false`.
- `AuthNetworkErrorScreen` shown for `(auth)` routes; `NetworkErrorScreen` (with red navbar, persona header) shown for all other in-app routes.
- TabBar and NavBar are suppressed while offline (offline screens render their own simulated red header).
- 10-second auto-retry countdown with manual "Retry now" button; background network polling via `api.get('/api/rates')`.
- On reconnect from an auth path the user is redirected to `/(auth)/phone` (safe reset) rather than replaying a stale OTP screen.

✅ Day 12 stabilization fixes applied:
- `order_status_history` transition writes now persist explicit `old_status` values across order/dispute transition routes.
- Temporary PATCH status debug logging removed from production flow.
- Aggregator OTP success now updates local order state to `completed` immediately and refreshes aggregator orders silently, keeping Active/Completed tabs in sync.

✅ Order data integrity overhaul applied (2026-03-18):
- Accept route now snapshots aggregator material rates into `order_items.rate_per_kg` and `order_items.amount` atomically.
- Order DTO now includes canonical `order_items`, `estimated_total`, `confirmed_total`, `seller_has_rated`, and locality compatibility aliases.
- Aggregator accept flow now routes directly to active-order-detail with replace semantics and refreshes canonical order state before transition.
- Notifications now persist structured metadata (`order_id`, `order_display_id`, `kind`) and mobile notifications route users directly to role-specific order detail screens.
- Seller detail now uses status-aware weights, completed-only rating UI with post-submit refresh, and seller-only own-contact card sourced from auth state.
- Aggregator order-history no longer subtracts legacy service fee; receipt and seller detail spacing polish completed.

✅ README setup updated:
- Provider env switches documented (`MAP_PROVIDER`, `REALTIME_PROVIDER`, `SOKETI_URL`).
- No additional installation or startup commands are required.

✅ Day 16 Admin Dashboard UI fully aligned with semantic design system and Next.js image optimization.
✅ Monorepo-wide `pnpm type-check`, `pnpm lint`, and `pnpm test` all passing.

✅ Google → Ola maps migration completed (2026-03-25):
- `packages/maps/src/providers/OlaMapsProvider.ts` now implements geocode + reverse geocode + autocomplete.
- `backend/src/routes/maps.ts` now exposes authenticated `GET /api/maps/geocode`, `GET /api/maps/reverse`, and `GET /api/maps/autocomplete`.
- Mobile map rendering now uses MapLibre + Ola style URL with safe gate fallback (`apps/mobile/utils/mapAvailable.ts`).
- Updated map screens: `address-map`, `address-form`, aggregator execution navigate, aggregator execution confirm, seller order detail cleanup, and aggregator route planner.
- External route launch is provider-aware via `apps/mobile/utils/mapNavigation.ts` (no hardcoded Google URLs in screens).

---

## 📜 Documentation Reference
- `PLAN.md`: 10-day build schedule and verification gates.
- `MEMORY.md`: Core architectural rules, security constraints, and learned lessons.
- `TRD.md`: Full technical requirements and schema definitions.
- `PRD.md`: Product requirements and user stories.

---

*Note: The product name is still a placeholder. See `MEMORY.md` for rebranding instructions and use `constants/app.ts` as the source of truth.*


## Recent Updates (Auth Identity Migration & System Reset)
- Resolved critical user ID misformation during user registrations.
- Refactored profile setup (both sellers and aggregators) to securely transition provisional 	mp_ IDs to structured deterministic IDs.
- Admin functionality cleaned: Super Admin script successfully truncates legacy inconsistencies and reliably sets up fresh deterministic accounts.
- Admin metrics accurately track deterministic IDs correctly without constraint errors.
- UI elements stripped of unwanted scrollbars and mapped to correct tiles sets natively.





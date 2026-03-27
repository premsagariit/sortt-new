# [APP_NAME] — India's Scrap Marketplace

> **Status:** MVP Build (In Progress — Day 15 complete, ready to begin Day 16)  
> **Architecture:** pnpm Monorepo  
> **Tech Stack:** Expo SDK 54+, Next.js 15, Node.js (Express), Azure PostgreSQL, Gemini AI.

---

## 🏗 Project Structure

```text
[APP_NAME]/
├── apps/
│   ├── mobile/       # React Native (Expo SDK 54) — User/Aggregator App
│   ├── web/          # Next.js 15 — Business & Admin Portals
│   └── admin/        # Admin Dashboard (integrated into web as role-gated routes)
├── backend/          # Node.js/Express — Central API & Webhooks
├── packages/         # Shared Provider Abstractions (@sortt/*)
│   ├── auth/         # IAuthProvider (Clerk Auth)
│   ├── maps/         # IMapProvider (Google/Ola Maps)
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

- `CLERK_SECRET_KEY`: Backend auth verification.
- `OLA_MAPS_API_KEY`: Backend geocoding/routing key (Ola Maps).
- `EXPO_PUBLIC_OLA_MAPS_API_KEY`: Mobile tile-rendering key for Ola vector style.
- `EXPO_ACCESS_TOKEN`: EAS deployments and updates.
- `DATABASE_URL`: Azure PostgreSQL connection string.
- `REDIS_URL`: Upstash Redis for rate limiting.
- `MAP_PROVIDER`: Backend map provider switch (`google` | `ola`).
- `EXPO_PUBLIC_MAP_PROVIDER`: Mobile provider switch (`ola` default).
- `EXPO_PUBLIC_MAP_RENDERING_AVAILABLE`: `false` by default for Expo Go fallback; enable `true` in dev build with native MapLibre module.
- `REALTIME_PROVIDER`: Realtime provider switch (`ably` | `soketi`).
- `SOKETI_URL`: Soketi websocket URL (required when `REALTIME_PROVIDER=soketi`).

### 4. Running Locally

**Start Mobile App (Expo):**
```bash
pnpm dev:mobile
```

**Start Web Portal (Next.js):**
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
| **Web** | Next.js 15, Tailwind CSS, Radix UI |
| **Backend** | Node.js, Express, Upstash (Redis), Sharp, Etag |
| **Database** | Azure PostgreSQL, RLS, migration-driven schema |
| **Auth** | Clerk (Phone OTP via WhatsApp Cloud API) |
| **Offline Handling** | `useNetworkStatus` (NetInfo), `OfflineAwareNavigator`, `AuthNetworkErrorScreen`, `NetworkErrorScreen` |
| **AI** | Gemini Flash Vision (Photo Analysis), Gemini Pro (Price Scraping) |

---

### 🗓 Current Status (2026-03-27)
✅ Core API and mobile wiring completed through Day 11 gates.

✅ Day 13 realtime + push baseline remains complete (2026-03-20) and validated.

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

✅ Execution status: Days 1–15 are complete. Day 16 (Web portal + Admin dashboard + tests) is the active next phase.

✅ Seller address management and listing wizard integration updates applied:
- Two-step seller address flow split into map-first + details form (`address-map` → `address-form`).
- Shared draft persistence added via `addressStore` to preserve data while moving between map/details screens.
- Seller listing step3 and addresses list entry points now route through map-first flow.
- Post-save address routing returns to seller addresses list.

✅ Live tracking and route-navigation stabilization updates applied:
- Aggregator navigate screen now supports pickup-coordinate fallback via geocoding from pickup address.
- Seller order detail live tracking map now supports pickup geocode fallback and resilient map-gating behavior.
- Order store merge logic preserves live location fields (`aggregatorLat`, `aggregatorLng`, `liveDistanceKm`) across refresh polling.
- Confirm execution screen stabilized for consistent back-blocking and animation state.

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

✅ Validation: `pnpm type-check` exits 0 at workspace root.

✅ Google → Ola maps migration completed (2026-03-25):
- `packages/maps/src/providers/OlaMapsProvider.ts` now implements geocode + reverse geocode + autocomplete.
- `backend/src/routes/maps.ts` now exposes authenticated `GET /api/maps/geocode`, `GET /api/maps/reverse`, and `GET /api/maps/autocomplete`.
- Mobile map rendering now uses MapLibre + Ola style URL with safe gate fallback (`apps/mobile/utils/mapAvailable.ts`).
- Updated map screens: `address-map`, `address-form`, seller order live tracking, aggregator execution navigate, and aggregator route planner.
- External route launch is provider-aware via `apps/mobile/utils/mapNavigation.ts` (no hardcoded Google URLs in screens).

---

## 📜 Documentation Reference
- `PLAN.md`: 10-day build schedule and verification gates.
- `MEMORY.md`: Core architectural rules, security constraints, and learned lessons.
- `TRD.md`: Full technical requirements and schema definitions.
- `PRD.md`: Product requirements and user stories.

---

*Note: The product name is still a placeholder. See `MEMORY.md` for rebranding instructions and use `constants/app.ts` as the source of truth.*

# [APP_NAME] — India's Scrap Marketplace

> **Status:** MVP Build (In Progress — Day 11 wiring complete, order display-id rollout complete)  
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
- `GOOGLE_MAPS_API_KEY`: Geocoding and map services.
- `EXPO_ACCESS_TOKEN`: EAS deployments and updates.
- `DATABASE_URL`: Azure PostgreSQL connection string.
- `REDIS_URL`: Upstash Redis for rate limiting.
- `MAP_PROVIDER`: Backend map provider switch (`google` | `ola`).
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

### 🗓 Current Status (2026-03-16)
✅ Core API and mobile wiring completed through Day 11 gates.

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

---

## 📜 Documentation Reference
- `PLAN.md`: 10-day build schedule and verification gates.
- `MEMORY.md`: Core architectural rules, security constraints, and learned lessons.
- `TRD.md`: Full technical requirements and schema definitions.
- `PRD.md`: Product requirements and user stories.

---

*Note: The product name is still a placeholder. See `MEMORY.md` for rebranding instructions and use `constants/app.ts` as the source of truth.*

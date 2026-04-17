# [APP_NAME]
## Technical Requirements Document
**v4.1 · Minimalist Professional UI · Azure PostgreSQL · Custom JWT · Ably Realtime · Cloudflare R2 Storage · WhatsApp OTP**

> ⚠️ **APP NAME PLACEHOLDER NOTICE**
> The name **"Sortt"** used throughout this document is a **placeholder only**. The final product name has not been decided. All references to "Sortt" should be read as `[APP_NAME]`. In code, always import from `constants/app.ts` — never hardcode the string. See MEMORY.md for full rebrand instructions.

> 📋 **v4.1 CHANGE SUMMARY (from v4.0)**
> - Auth stack standardized on Custom JWT (backend-issued JWT + `jose` verification).
> - Removed legacy external auth user id columns/references from active implementation paths.
> - Database Primary Keys updated from UUID to TEXT columns. All relationships verified.
> - Added Leaflet dependency for Admin Map tracking.
> - Testing suites removed prior to MVP push.

> 📋 **v4.0 CHANGE SUMMARY (from v3.2)**
> The legacy stack was removed from this architecture. Current production stack uses Azure PostgreSQL, Express, Ably, Cloudflare R2, and Custom JWT with city/locality matching for Hyderabad MVP operations.

> ✅ **Implementation Sync Note (2026-03-16)**
> - `migrations/0018_order_number_per_seller.sql` implemented and applied.
> - Orders now expose backend-formatted `order_display_id` (e.g. `#000042`) as the UI-facing identifier.
> - `order_number` is persistence-only and not intended as a direct client field.
> - Mobile order execution routes now carry internal order `id` end-to-end to keep display identity consistent across all steps.
> - Full offline/network-error handling layer implemented in mobile app:
>   - `hooks/useNetworkStatus.ts` — thin `@react-native-community/netinfo` wrapper exposing `{ isOnline: boolean }`.
>   - `utils/error.ts` — `isNetworkError(e)` helper classifying Axios/network errors.
>   - `OfflineAwareNavigator` in `app/_layout.tsx` — gates the router: when `isOnline === false`, the entire `<Stack>` is replaced with the appropriate offline screen; TabBar and nav icons are automatically suppressed.
>   - `AuthNetworkErrorScreen` — minimal offline screen (red header with centered logo) used when the user is on an `/(auth)` route or is not signed in.
>   - `NetworkErrorScreen` — rich offline screen (red header mirroring the live NavBar with persona name, avatar, location pill, scroll-driven compression animation, aggregator "Offline" pill) used for all in-app routes.
>   - Both screens show a 10-second auto-retry countdown and a manual "Retry now" button. Retry probes `GET /api/rates`; network restoration is detected independently by `useNetworkStatus`.
>   - On reconnect from an `/(auth)` path, the layout restores `/(auth)/phone` if the user was on `phone` or `otp` (OTP is time-limited and cannot be replayed), or restores the exact stored path for other auth screens.
> - ✅ **Order data integrity overhaul (2026-03-18):**
>   - At `accepted` transition, `order_items.rate_per_kg` and `order_items.amount` are snapshotted atomically in the accept transaction from the accepting aggregator’s `aggregator_material_rates`.
>   - Missing aggregator material-rate rows are treated as data gaps (`rate_per_kg=0`, `amount=0`) rather than accept failure.
>   - Order responses now include canonical `order_items` entries (`material_label`, estimated/confirmed weights, `rate_per_kg`, `amount`) plus order-level `estimated_total`, `confirmed_total`, and `seller_has_rated`.
>   - Notification rows now persist structured metadata in `notifications.data` (`order_id`, `order_display_id`, `kind`) and mobile notification taps route to role-specific order detail paths.
>   - DTO phone exposure uses explicit viewer-type + status gating and aggregator surfaces keep icon-only dialer behavior without rendering phone number text.

> ✅ **Implementation Sync Note (2026-03-25)**
> - Seller address management refactor completed with two-step map-first flow:
>   - `apps/mobile/app/(seller)/address-map.tsx` for pin + reverse geocode.
>   - `apps/mobile/app/(seller)/address-form.tsx` for address details and persistence.
>   - `apps/mobile/store/addressStore.ts` draft handoff state (`setDraft`/`clearDraft`) to avoid data loss while navigating map/details.
> - Listing wizard integration completed:
>   - Seller listing step3 and seller addresses list now route through map-first address creation/edit flow.
> - Live tracking stabilization completed:
>   - Aggregator navigate screen and seller order detail now use pickup-coordinate fallback geocoding from pickup address when coordinates are unavailable.
>   - `apps/mobile/store/orderStore.ts` merge logic preserves live-location fields (`aggregatorLat`, `aggregatorLng`, `liveDistanceKm`) across silent polling refresh.
> - Seller earnings API regression fixed:
>   - `/api/orders/earnings` route now registers before dynamic `/:id`, preventing UUID parse collisions when requesting earnings.
>   - Seller home/profile lifetime earnings now resolve from completed orders endpoint without route collision failures.
> - ✅ **Maps provider migration completed (Google → Ola):**
>   - `packages/maps/src/providers/OlaMapsProvider.ts` now implements geocode/reverse + autocomplete helper.
>   - `backend/src/routes/maps.ts` now exposes authenticated `GET /api/maps/geocode`, `GET /api/maps/reverse`, and `GET /api/maps/autocomplete`.
>   - Mobile map rendering migrated from `react-native-maps` to MapLibre + Ola vector tiles with `apps/mobile/utils/mapAvailable.ts` gate (`MAP_RENDERING_AVAILABLE=false` default for Expo Go).
>   - Aggregator route planner now supports store-backed order pins on MapLibre when rendering is enabled.
>   - The current route planner screen now opens a status-aware detail card on pin tap and no longer shows the removed external maps CTA.
> - Aggregator operating-area discovery now uses maps autocomplete in profile edit; suggestions show locality + city + state + country, while selected chips persist locality-only values.
> - Seller browse search now tokenizes name, locality, and material type fields and shows an explicit empty state when no matches remain.

> ✅ **Implementation Sync Note (2026-04-05) — Day 16 Finalized & CI Restored**
> - Resolved critical Next.js 15 build failures:
>   - Wrapped `useSearchParams()` in `<Suspense>` boundaries for `admin/login`, `admin/create-password`, and `admin/reset-password` pages to ensure static generation compatibility.
>   - Added `'use client'` directive to `apps/web/app/aggregator/layout.tsx` to fix icon context errors.
> - Restored CI Pipeline stability:
>   - Renamed backend integration tests to `*.integration.test.ts` to match the `ci.yml` detection pattern.
>   - Verified all 4 core integration suites (Auth, Orders, Profiles, RLS) pass in the CI environment.
> - Repository Cleanup:
>   - Removed redundant log files (`build.log`, `lint.log`, etc.) and legacy testing documentation.
>   - Updated `structure.md` and `README.md` to reflect the current state.
> - All workspace gates (**type-check**, **lint**, **test**) are now fully passing monorepo-wide.
> - 🚀 **Day 17 status:** Active; Security Audit + Monitoring + Launch phase underway.

> ✅ **Implementation Sync Note (2026-04-11)**
> - Aggregator navigate screen now renders a visible current-location marker and attempts detailed route geometry before falling back to a simpler path.
> - Confirm screen now includes a pickup-location map preview and routes the user into the native navigation app chooser/default map app from the map card or Navigate button.
> - Seller order detail live-tracking UI was removed from the mobile implementation, leaving order detail and receipt as the seller-facing responsibility of that page.
> - Aggregator cancel text was simplified to "Cancel".

> ✅ **Implementation Sync Note (2026-04-11) — Realtime Capability + Scheduled Routing Eligibility**
> - Realtime token capability issuance now explicitly grants aggregators subscribe access for `orders:hyd:new`, eliminating Ably capability-denied feed subscription errors.
> - Aggregator feed subscription paths were hardened with defensive failed-state handling and API refresh fallback to preserve feed continuity during channel-state instability.
> - Routing eligibility for scheduled pickups was corrected to avoid strict current-time working-hours hard gates in feed creation fanout and heartbeat catch-up. Compatibility checks continue to enforce city/material/operating-area and pickup-window overlap.
> - Operating-area matching normalization and tests were strengthened to reduce locality/address string mismatch regressions.

> ✅ **Implementation Sync Note (2026-04-17) — Orders Route + Mobile TS Hardening**
> - `backend/src/routes/orders/index.ts` was hardened for execution flows:
>   - Added missing localized label SQL context where response queries interpolate `material_label`.
>   - Corrected finalize-weighing query bind arrays to match placeholder count (`$1/$2`) and prevent PostgreSQL bind protocol errors.
> - Mobile runtime i18n regressions fixed by restoring `t` extraction in both seller and aggregator profile screens.
> - Mobile TypeScript strictness fixes applied for Expo filesystem compatibility typing, route typing in notification navigation, geocode field safety, and missing material type imports.
> - Verification: monorepo `pnpm type-check` green on 2026-04-17.


---

## 0. Local Development (3-Command Rule)

To prevent Metro server crashes, port contention, and path resolution discrepancies inherent to the React Native + Next.js + Express monorepo setup: all development servers MUST be run from the repository root using `pnpm` workspace filters.

Never `cd` into application child directories to launch local servers. Use only:
1. **Mobile:** `pnpm dev:mobile`
2. **Admin Web:** `pnpm dev:web`
3. **Backend API:** `pnpm dev:backend`

---

## 1. UI Design System

[APP_NAME]'s interface follows a Minimalist Professional aesthetic — refined, uncluttered, and optimised for a wide user demographic including low-tech-comfort kabadiwallas and urban sellers. The palette is deliberately restrained: no bright or saturated colours, no heavy gradients, no excessive visual decoration. Every colour token carries a single semantic role and is never repurposed across the application.

### 1.1 Design Philosophy

- **Restraint over vibrancy.** The palette uses muted, professional tones rather than strong primaries. Navy `#1C2E4A` anchors structure. Muted red `#C0392B` marks exactly one primary action per screen. Amber `#B7791F` signals money. Deep teal `#1A6B63` confirms success. Everything else lives on white (`#FFFFFF`) and barely-grey (`#F4F6F9`) surfaces.
- **Light surfaces.** Cards, sheets, and modals use white or `#F4F6F9` backgrounds. Hero strips (nav bars, greeting sections) use navy. The contrast between the navy header and white content area creates clear hierarchy without competing colours.
- **Semantic colour, not decorative.** Colours are never used for visual interest alone. The red CTA is red because it is the action. Amber prices are amber because they represent value. Teal confirmations are teal because they signal completion. This consistency builds subconscious trust with first-time users.

### 1.2 Colour Token System

All colours are defined as design tokens and referenced exclusively through these tokens in code. No hardcoded hex values anywhere in the component library.

*(See `constants/tokens.ts` — §9.2 for full token definitions)*

### 1.3 Material Category Colour Coding

Each scrap material type has a dedicated muted foreground colour and a light tint background. These are used on card left-borders, category chips, weight tables, and market rate list items. They encode material type visually without relying on text labels alone — critical for low-literacy users.

| Material | Foreground | Background |
|---|---|---|
| Metal | `#6B7280` | `#F3F4F6` |
| Plastic | `#2563A8` | `#EEF4FC` |
| Paper | `#B45309` | `#FEF3E2` |
| E-Waste | `#1A6B63` | `#EAF5F4` |
| Fabric | `#7C3AED` | `#F5F3FF` |
| Glass | `#0369A1` | `#EFF6FF` |

### 1.4 Typography

- **Primary typeface: DM Sans.** A humanist geometric sans-serif with excellent legibility at small sizes on mobile screens. Available free via Google Fonts. Weight range: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold). All UI text, labels, buttons, and headings use DM Sans.
- **Numeric typeface: DM Mono.** Monospaced companion to DM Sans. Used exclusively for all numeric data: rupee amounts, weights in kg, OTP codes, order IDs, timestamps. The monospace rendering makes numbers scan faster and feel more precise and trustworthy — appropriate for a financial transaction context.

### 1.5 Layout & Component Rules

- Spacing grid: 8px base. All margins, paddings, gaps must be multiples of 8 (8, 16, 24, 32, 48, 64px).
- Card border radius: `12px`. Input field radius: `10px`. Chip / pill radius: `20px` (full pill). Primary CTA button: `14px`.
- Cards: `1px solid #DDE3EA` border on white surface. Zero shadow on all cards — hierarchy through background contrast (white on `#F4F6F9`), not depth effects.
- Safe Area Handling: `NavBar` is strictly responsible for rendering the top system safe area inset. To prevent double-padding issues, screens should pass `edges={['bottom']}` to their root `SafeAreaView`. If a page does not have a bottom inset need, it must pass `edges={[]}`.
- Status Bar: The `NavBar` uses `expo-status-bar` to dynamically adjust the style (`light` for dark variants, `dark` for light variants) and matching background color to seamlessly blend with the header area.
- Scroll Compression: Navy banner hero sections (e.g. Greeting Strip) must have a bottom border-radius of `0` to allow seamless transitions when compressing underneath the NavBar area.
- Material category left-border: `3px solid` category colour on left edge of list items. This is the only use of decorative border colouring.
- Primary CTA: One per screen maximum. Background: `#C0392B`. Text: white. Width: full-width block. The single red element per screen draws the eye immediately.
- Secondary actions: White background, `1px #DDE3EA` border. No coloured fill. They recede behind the primary CTA intentionally.
- Icons: Phosphor Icons (MIT licence). 1.5px stroke weight on all outline icons. Filled variant only for active navigation states.
- Status chips: Small pill badges with light tint background + foreground colour. States: Created (light blue/indigo), En Route (amber tint), Completed (teal tint), Disputed (red tint).
- Hero sections (nav bars, greeting banners): `#1C2E4A` background. White text at full and reduced opacity for hierarchy. Subtle large circle graphic in corner for depth at 4% opacity — never a gradient.
- Avatar: Initial-based. Navy background, white letter. Seller profile: navy circle. Aggregator profile: teal circle. No placeholder image — initials are always shown.
- Skeleton screens: Flat grey rectangles (`#E8ECF1`) for loading states. No spinners. Fade in actual content when data arrives.
- Animation: 200ms micro-interactions (button press, chip select). 300ms screen transitions. Ease-out curves only. No spring physics, no bounce.
- Touch targets: 48dp minimum height on all interactive elements (WCAG AA compliance).

### 1.6 Colour Usage Rules (Enforcement)

- `navy` — structural use only: nav bars, headers, hero sections, avatars.
- `red` — exactly one primary CTA per screen. Nowhere else.
- `amber` — money, prices, earnings displays. Nowhere else.
- `teal` — success states, verified badges, confirmed status. Nowhere else.
- All other UI elements use `slate`, `muted`, `border`, `bg`, `surface` tokens.

---

## 2. Technology Stack

Every tool listed below is either free, open-source, or covered by student credit programmes. The stack is aggressively lean for MVP — no paid services until student credits are exhausted.

| Layer | Technology | Free Tier / Credit |
|---|---|---|
| Mobile App | React Native, Expo SDK 51+, Expo Router | — |
| Web (Admin Pages) | Next.js 15 (App Router), Tailwind CSS, Radix UI | Vercel hobby |
| Core Backend | Node.js / Express on **Azure App Service** (Central India — Pune) | Azure for Students free tier hours |
| Database | **Azure PostgreSQL Flexible Server B1ms** (Central India — Pune) + pgcrypto + uuid-ossp | Azure for Students — 750 hrs/month B1ms free for 12 months |
| Auth | **Custom JWT** — Phone OTP (enable India in Custom JWT Dashboard → SMS Settings) | Free up to 10,000 MAU |
| OTP Delivery | **Meta WhatsApp Cloud API** — called directly from Express backend | 1,000 free auth conversations/month |
| Realtime | **Ably** via `IRealtimeProvider` — India edge nodes | 6M messages/month, 200 concurrent connections free |
| Storage | **Cloudflare R2** via `IStorageProvider` — S3-compatible private object storage, India PoPs | Free tier — 10GB storage, 1M ops/month, zero egress fees |
| Push Notifications | Expo Push Service (server SDK) | Unlimited |
| Rate Limiting + OTP Store | Upstash Redis via `@upstash/ratelimit` | 10,000 req/day free |
| AI — Image Analysis | Gemini Flash Vision via `IAnalysisProvider` | 1,500 req/day free |
| AI — Price Scraper | Gemini Pro (Python agent, node-cron scheduled) | 50 req/day free |
| Maps / Geocoding | Ola Maps via `IMapProvider` + MapLibre tile rendering on mobile | Ola API key + mobile public tile key |
| PDF Generation | pdf-lib (Node.js) | Free / open-source |
| Icons | Phosphor Icons (MIT) | Free |
| State Management | Zustand | Free |
| Monorepo | pnpm workspaces | Free |
| CI/CD | GitHub Actions | Free — GitHub Student Pack Pro |

> ⚠️ **INDIA ACCESSIBILITY NOTE:** Legacy external services used in older prototypes are not part of the current architecture. The services listed above are selected for India-accessible operation.

---

## 3. System Architecture

### 3.1 High-Level Architecture

The architecture places a Custom Backend (Node.js/Express on Azure App Service, Central India) as the intermediary between all client apps and the database. No client app talks directly to the database or any third-party service. All vendor calls go through provider abstraction packages.

```
Client Apps (Mobile / Web)
         │
         ▼
  Custom Backend (Express / Azure App Service — Central India, Pune)
    ├── Custom JWT Middleware (A1)
    ├── CORS Allowlist (X1)
    ├── Helmet Security Headers (V34)
    ├── Upstash Redis Rate Limiting
    ├── node-cron Scheduler (replaces pg_cron)
    └── Business Logic Routes
         │
         ├──▶ Azure PostgreSQL Flexible Server (Central India — Pune)
         │       PostgreSQL 16 + pgcrypto + uuid-ossp
         │       Row Level Security enabled on all tables
         │       Connection via SSL (trusted sources firewall)
         │
         ├──▶ Ably (Realtime — via IRealtimeProvider)
         │       India edge nodes
         │       HMAC-suffixed channel names (V32)
         │
         ├──▶ Cloudflare R2 (Storage — via IStorageProvider)
         │       S3-compatible, India PoPs, private files, zero egress
         │       Expiring presigned URLs (300s default — D1)
         │       EXIF stripped by Express before upload (V18)
         │
         ├──▶ Custom JWT (Auth session validation)
         │       JWT verification on every protected route
         │       User metadata sync to users table
         │
         └──▶ Meta WhatsApp Cloud API (OTP delivery)
                 Called directly from Express — no BaaS hook layer
                 Free: 1,000 auth conversations/month
```

### 3.2 Order Lifecycle Data Flow

1. Seller submits listing → Custom backend validates input, geocodes address via `IMapProvider`, resolves `city_code` + `pickup_locality`, creates order row in PostgreSQL (`status='created'`).
2. Custom backend queries PostgreSQL for online aggregators in the same `city_code` who handle the listed materials → dispatches push via Expo Push Service to all matching aggregators.
  - For scheduled orders, eligibility must not be rejected solely because current server time is outside the aggregator's present working-hour slot; matching is based on area + pickup-window compatibility.
3. Aggregator accepts → Express route runs `BEGIN; SELECT ... FOR UPDATE SKIP LOCKED WHERE id=$order_id AND status='created'; UPDATE ...; COMMIT;` (first-accept-wins). `Status→'accepted'`. Backend dispatches push to seller.
4. Aggregator updates En Route → Custom backend updates `status→'en_route'` → publishes event to Ably channel → seller's app receives real-time update.
5. Aggregator uploads scale photo → EXIF stripped by Express via `sharp` → uploaded to Cloudflare R2 via `IStorageProvider.upload()` → Custom backend generates OTP, stores HMAC in Upstash Redis (TTL 10 min) → calls Meta WhatsApp Cloud API directly → OTP delivered to seller as WhatsApp authentication template message (free up to 1,000 conversations/month).
6. Seller reviews full transaction summary (material breakdown, confirmed weight, total amount) → Seller shares OTP with aggregator → Aggregator submits OTP → Express route validates: checks `aggregator_id = req.user.id`, validates OTP HMAC from Redis, updates `status='completed'` in a single transaction. `Status→'completed'` — the ONLY path to this status.
7. Custom backend on completion: calls `pdf-lib` to generate GST receipt → writes `invoice_data JSONB` to `invoices` table → uploads PDF to Cloudflare R2 at randomised path via `IStorageProvider.upload()` → stores file key in `invoices.storage_path`.
8. Custom backend schedules Expo push to both parties for rating prompt after 2-hour delay.

### 3.3 Real-time Chat Architecture

- Each order has a dedicated **Ably** channel scoped by `order_id`. Channel name includes an HMAC suffix to prevent channel existence metadata leakage: `order:{order_id}:chat:{hmac_sha256(order_id+user_id+OTP_HMAC_SECRET)[:8]}` (V32).
- Messages stored in `messages` table (`order_id`, `sender_id`, `content`, `read_at`, `created_at`).
- Both parties subscribe on Order Detail screen open via `IRealtimeProvider.subscribe()`. Unsubscribe enforced on screen close.
- Delivery receipt: `read_at` timestamp updated when recipient client receives message.
- Offline fallback: Expo Push notification sent when recipient is not subscribed (app backgrounded). Express backend publishes to Ably and also dispatches push in the same message-insert handler.
- Chat history permanently retained per order. Accessible only to the two parties and admin.
- **Phone number filter:** All messages pass through server-side regex `/(?:\+91|0)?[6-9]\d{9}/g` before Ably broadcast, replacing detected numbers with `[phone number removed]` (V26).
- **Filter storage rule (V26-DB):** The phone number regex filter is applied BEFORE both DB insert AND Ably broadcast. The value stored in `messages.content` is the already-filtered version. The raw original is never persisted. This ensures admin dispute review reads the same filtered content as users.

### 3.4 Authentication Flow (Custom JWT + WhatsApp OTP)

```
1. User enters phone number in app
         │
         ▼
2. Express POST /api/auth/request-otp
   ├── Rate limit check: Upstash Redis (max 3/phone/10min, max 10/phone/day)
   ├── Generate 6-digit OTP via crypto.randomInt(100000, 999999)
   ├── Store HMAC-SHA256(OTP, OTP_HMAC_SECRET) in Upstash Redis
   │     Key: otp:{hmac(phone)} — TTL: 10 minutes
   └── Call Meta WhatsApp Cloud API → send OTP as authentication template message
         │
         ▼
3. User receives OTP on WhatsApp → enters in app
         │
         ▼
4. Express POST /api/auth/verify-otp
   ├── Rate limit check (max 3 attempts per OTP)
   ├── Look up stored HMAC from Redis
   ├── Verify: HMAC-SHA256(submitted_otp, OTP_HMAC_SECRET) === stored_hmac
   ├── On success: create/update user in users table
   ├── Create Custom JWT session via Custom JWT Backend API
   └── Return Custom JWT to client
         │
         ▼
5. Client stores JWT — sends as Authorization: Bearer on all subsequent requests
   Express middleware calls Custom JWT SDK to verify JWT on every protected route
```

> ⚠️ **MOBILE AUTH SCREEN NOTE (Fix 9 — Day 8 landmine):** The `(auth)/otp.tsx` screen in the mobile app was scaffolded with Custom JWT's native OTP flow (`useSignIn()` from `@Custom JWT/Custom JWT-expo`). This is **incorrect** for the WhatsApp OTP architecture. The screen must be **rewritten in Day 8** to:
> 1. Submit the OTP to `POST /api/auth/verify-otp` (not Custom JWT's native SDK)
> 2. Receive the Custom JWT from the Express response
> 3. Use Custom JWT's Expo SDK to set the session token programmatically (not via Custom JWT's own OTP flow)
>
> The Custom JWT Expo SDK stores the JWT in secure storage — **not** AsyncStorage directly.

---

## 3A. Authentication Flow — WhatsApp OTP + Mode-Aware Branching

> **Status:** COMPLETE (Gates G1–G8 PASS) | **Date Implemented:** 2026-03-17

### 3A.1 High-Level Flow

1. **Phone Entry Screen** → User enters phone + selects mode (Login or Sign Up)
2. **OTP Request** → App calls `POST /api/auth/request-otp` with `{ phone, mode }`
3. **Backend Validation** → Mode-aware existence check (login: ensure phone exists; signup: ensure phone doesn't exist)
4. **OTP Generation & Storage** → Backend generates OTP, stores in Redis with HMAC-SHA256, and stores mode key
5. **OTP Entry Screen** → User enters 6-digit code + countdown timer (600s)
6. **OTP Verify** → App calls `POST /api/auth/verify-otp` with `{ phone, otp }`
7. **Backend Verify & Response** → Mode read from Redis, user created / updated based on mode, mode key deleted (one-time use)
8. **Post-Verify Routing** → Three-branch navigation based on `is_new_user` + `user_type`:
   - New user → Role selection screen (user-type)
   - Returning seller → Seller home (/(seller)/home)
   - Returning aggregator → Aggregator home (/(aggregator)/home)

### 3A.2 Backend Routes — Mode-Aware OTP

#### `POST /api/auth/request-otp`
**Request:**
```json
{
  "phone": "+919876543210",
  "mode": "login" | "signup"
}
```

**Response:**
```json
{
  "otp_length": 6,
  "expires_in_seconds": 600
}
```

**Validation:**
- `mode` is required and must be `'login'` or `'signup'`
- Phone is normalized and HMAC'd to `phone_hash`
- **If mode = `login`:** Check if phone exists in DB. If NOT found → HTTP 404 `{ "error": "no_account", "message": "Phone not registered. Set to Sign Up to create an account." }`
- **If mode = `signup`:** Check if phone exists in DB. If found → HTTP 409 `{ "error": "account_exists", "message": "Account already exists with this phone. Use Log In instead." }`
- On success: Generate 6-digit OTP, store in Redis with HMAC-SHA256. Store mode key `otp:mode:{phoneHmac}` with 600s TTL. Return `otp_length` and `expires_in_seconds`.

#### `POST /api/auth/verify-otp`
**Request:**
```json
{
  "phone": "+919876543210",
  "otp": "123456"
}
```

**Response:**
```json
{
  "token": {
    "jwt": "eyJhbGc..."
  },
  "user": {
    "id": "user_uuid",
    "user_type": "seller" | "aggregator" | null
  },
  "is_new_user": true | false
}
```

**Logic:**
1. Normalize phone, compute `phone_hash`
2. Look up OTP in Redis. If not found or expired → HTTP 400 `{ "error": "invalid_otp", "message": "..." }`
3. Read `otp:mode:{phoneHmac}` from Redis and delete immediately (one-time use enforcement)
4. If mode = `'signup'`:
   - Create new user in DB with `phone_hash`, `user_type = 'seller'` (default), `last_seen = NOW()`
   - Delete OTP from Redis
   - Create Custom JWT user account via Custom JWT SDK (if needed for session)
   - Return `{ token: { jwt }, user: { id, user_type: 'seller' }, is_new_user: true }`
5. If mode = `'login'`:
   - Update existing user: set `last_seen = NOW()`
   - Delete OTP from Redis
   - Retrieve user's `user_type` from DB
   - Return `{ token: { jwt }, user: { id, user_type }, is_new_user: false }`
6. **Never** include `phone`, `phone_hash`, or `legacy external auth user id` in response (Security V24 — safe DTO)

### 3A.3 Database Constraints & Lifecycle

- **Migration 0022:** `UNIQUE(phone_hash)` on users table — prevents concurrent signup races
- **Migration 0023:** Add `last_seen TIMESTAMPTZ DEFAULT NOW()` column to users table for activity tracking
- **OTP Storage Key Lifecycle:**
  - Creation: `redis.set('otp:HMAC-SHA256(phone)', otp_code, 'EX', 600)`
  - Storage of mode: `redis.set('otp:mode:HMAC-SHA256(phone)', mode, 'EX', 600)`
  - Deletion on success: Both keys deleted after verify
  - Deletion on failure: Keys expire naturally after 600s

### 3A.4 Mobile Auth Store — Zustand Contract

```typescript
export interface AuthState {
  // New contract (as of Day 7/8)
  token: string | null;                    // Custom JWT
  user: SessionUser | null;                // { id, user_type }
  isNewUser: boolean;                      // Determines post-verify routing
  
  // Methods
  setSession(payload: { token: string; user: SessionUser; isNewUser: boolean }): void;
  clearSession(): void;
  requestOtp(phone: string, mode: 'login' | 'signup'): Promise<{ otp_length: 6; expires_in_seconds: 600 }>;
  verifyOtp(phone: string, otp: string): Promise<{ token: { jwt }; user: { id; user_type }; is_new_user }>;
}
```

**Key Points:**
- `setSession()` updates both new contract fields and legacy compatibility fields atomically
- `clearSession()` resets all state to null/false for logout
- Methods handle API calls to `/api/auth/request-otp` and `/api/auth/verify-otp`

### 3A.5 Mobile UI — Unified Phone + OTP Screen

**Route:** `/(auth)/phone.tsx`

**Flow:**
1. **Step 1: Phone Entry** (mode selection via tabs)
   - Two-tab layout: "Log In" tab | "Sign Up" tab
   - Single phone input field below tabs
   - "Send OTP" button (enabled only when phone length = 10 and all numeric)
   - On button press: Call `requestOtp(phone, mode)`. Show error if HTTP 404 or 409 (mode-specific error messages).

2. **Step 2: OTP Entry**
   - 6-digit code input (numeric only, masked)
   - Countdown timer displaying remaining time (600s → 0), e.g., "Expires in MM:SS"
   - "Verify" button (enabled only when OTP length = 6)
   - "Resend OTP" button (available only after 30s since last send)
   - Error message if HTTP 400 (invalid OTP)

3. **Post-Verify Routing** (on `verifyOtp` success):
   ```typescript
   if (isNewUser) {
     router.replace('/(auth)/user-type');  // Role selection
   } else if (userType === 'aggregator') {
     router.replace('/(aggregator)/home'); // Skip onboarding
   } else {
     router.replace('/(seller)/home');     // Skip onboarding
   }
   ```

**Error Handling:**
- **HTTP 404 on request:** Show inline error "Switch to Sign Up to create an account"
- **HTTP 409 on request:** Show inline error "Switch to Log In to continue"
- **HTTP 400 on verify:** Show inline error "Invalid or expired OTP. Try again."

**Effect Cleanup:**
- Countdown timer must use `useEffect` with `setInterval` and proper `clearInterval` in return (prevent memory leaks)
- Dependencies: `[]` (run once on mount)

### 3A.6 Routing Guards & Session Management

**Root AsyncStorage Onboarding Gate** (`app/index.tsx`):
- Check `AsyncStorage.getItem('onboarding_complete')`
- If null/false: Route to `/(auth)/onboarding`
- If true: Route to signed-in home (or `/(auth)/phone` if not authenticated)

**Returning User Redirect Guard** (`app/(auth)/user-type.tsx`):
- If `isNewUser === false`: Immediately redirect to role-specific home via `router.replace`
- Pattern: `useEffect(() => { if (!isNewUser) { router.replace(...); } }, [isNewUser])`
- Prevents UI reach to role selection for returning users

**Logout Standardization:**
- Both Seller and Aggregator home screens call: `Custom JWTSignOut()` → `clearSession()` → `router.replace('/(auth)/phone')`
- Use `router.replace` (not `push`) to prevent back navigation to signed-in screens
- Consolidate logic in a helper function (e.g., `performLogout()` in authStore)

### 3A.7 Security & Compliance

| Requirement | Implementation | Status |
|---|---|---|
| **V7** — User role from DB only | query `SELECT user_type FROM users WHERE id = ?` at verify time; never use JWT claims | ✅ PASS |
| **V24** — Safe DTO | Response excludes phone, phone_hash, legacy external auth user id | ✅ PASS |
| **X3** — HMAC-SHA256 OTP storage | `redis.set('otp:HMAC-SHA256(phone)', code)` | ✅ PASS |
| **V-OTP-1** — One-time use enforcement | Mode key deleted immediately after read; OTP key deleted after first successful verify | ✅ PASS |
| **A3** — Mode-aware pre-request check | Existence check enforced before OTP generation (no late mode detection) | ✅ PASS |
| **R2** — Unique phone enforcement | DB UNIQUE constraint + application-level mode validation | ✅ PASS |
| **I2** — Explicit field selection in DTO | Response DTO hardcodes fields (token.jwt, user.id, user.user_type, is_new_user) | ✅ PASS |
| **C1** — OTP screen context | Screen shows mode selection (logged-in users cannot see `/(auth)/phone`) | ✅ PASS |

---

## 4. Custom Backend — Node.js / Express on Azure App Service

### 4.1 Routes Handled by Custom Backend

| Route | Auth | Description |
|---|---|---|
| `POST /api/auth/request-otp` | Rate limit only | Generate OTP → store in Redis → call Meta WhatsApp API |
| `POST /api/auth/verify-otp` | Rate limit only | Verify OTP HMAC from Redis → create Custom JWT session → return JWT |
| `POST /api/orders` | Custom JWT | Create order, geocode, city_code lookup, broadcast push |
| `GET /api/orders` | Custom JWT | List orders. Query param: `?role=seller` or `?role=aggregator`. Paginated. |
| `GET /api/orders/:id` | Custom JWT | Order detail with two-phase address reveal (V25) |
| `PATCH /api/orders/:id/status` | Custom JWT | Status transitions — `completed`/`disputed` blocklisted (V13) |
| `DELETE /api/orders/:id` | Custom JWT (seller only) | Soft delete: sets `deleted_at=NOW()`, `status='cancelled'`. Blocked if `status` is `completed` or `disputed` → 400. |
| `POST /api/orders/:id/accept` | Custom JWT | First-accept-wins PostgreSQL transaction (replaces Edge Function) |
| `POST /api/orders/:id/verify-otp` | Custom JWT | OTP validation + order completion in single transaction (replaces Edge Function) |
| `POST /api/orders/:id/media` | Custom JWT | Upload photo, strip EXIF via sharp (V18), trigger OTP on scale photo |
| `GET /api/orders/:id/media/:mediaId/url` | Custom JWT | Generate expiring signed URL after ownership check (D1) |
| `GET /api/orders/:id/invoice` | Custom JWT (seller only) | Returns signed URL for invoice PDF. Validates `order.seller_id = req.user.id`. |
| `POST /api/scrap/analyze` | Custom JWT | Image hash dedup → Gemini Vision → schema-validate → UI hint only (I1) |
| `GET /api/aggregators/nearby` | Custom JWT | city_code + material filter query, server-derived (V21 equivalent) |
| `GET /api/aggregators/me` | Custom JWT (aggregator only) | Returns the authenticated aggregator's own profile. |
| `PATCH /api/aggregators/profile` | Custom JWT (aggregator only) | Allowlist: `business_name`, `operating_hours JSONB`, `operating_area`. Blocklist: `kyc_status`, `city_code`, `user_id`, `legacy external auth user id`. Returns 400 if blocked fields present. |
| `GET /api/aggregators/:id` | Custom JWT | **Public fields only.** Returns: `business_name`, `avg_rating`, `total_orders`, `materials` handled, `operating_area`, `member_since`. Excludes: `phone_hash`, `legacy external auth user id`, KYC documents, exact address. |
| `GET /api/aggregators/earnings` | Custom JWT (aggregator only) | Query param: `period=today\|week\|month`. Returns: `total_earned NUMERIC`, `orders_completed INT`, `avg_rating NUMERIC`. Computed server-side from completed orders — never client-computed. |
| `POST /api/aggregators/heartbeat` | Custom JWT | Update `last_ping_at` (C2) |
| `GET /api/realtime/token` | Custom JWT | Issues a short-lived Ably Token Auth token scoped to the authenticated user's permitted channels. `ABLY_API_KEY` is backend-only — mobile never receives the raw key. |
| `GET /api/notifications` | Custom JWT | Returns paginated notification rows for the authenticated user, ordered by `created_at DESC`. Query param: `?unread_only=true`. |
| `PATCH /api/notifications/:id/read` | Custom JWT (self only) | Sets `read_at = NOW()` on a notification owned by the authenticated user. |
| `POST /api/messages` | Custom JWT | Phone number regex filter applied BEFORE DB insert and Ably publish (V26, V26-DB) |
| `GET /api/messages/:orderId` | Custom JWT (order party only) | Returns paginated chat history for an order. |
| `POST /api/ratings` | Custom JWT | Only callable within 24hrs of completion |
| `POST /api/disputes` | Custom JWT (order party only) | Body: `{ order_id, issue_type, description, order_item_id? }`. Atomically sets `order.status = 'disputed'`. Returns 409 if order already has an open dispute. |
| `GET /api/disputes/:id` | Custom JWT (order party or admin) | Returns dispute detail including evidence list. |
| `POST /api/disputes/:id/evidence` | Custom JWT (order party only) | Multipart file upload. EXIF stripped via `sharp` before storage. Stored via `IStorageProvider`. |
| `PATCH /api/sellers/profile` | Custom JWT (seller only) | Allowlist: `name`, `locality`, `gstin`, `business_name`, `recurring_schedule`. Blocklist: `user_type`, `city_code`, `legacy external auth user id`. |
| `GET /api/sellers/earnings` | Custom JWT (seller only) | Returns seller transaction history. Query params: `period=today\|week\|month`, `page`, `limit`. Returns paginated list of completed orders with `total_amount`, `material_breakdown`, `completed_at`. |
| `GET /api/rates` | Public | `current_price_index` view with Cache-Control + ETag (V17) |
| `GET /api/admin/*` | Custom JWT + DB role check | Admin operations only — DB-verified `user_type=admin` (V12) |

### 4.2 First-Accept-Wins Lock (Express Route — Replaces Edge Function)

```typescript
// POST /api/orders/:id/accept
// Custom JWT middleware runs first — req.user.id is verified aggregator ID

app.post('/api/orders/:orderId/accept', Custom JWTJwtMiddleware, async (req, res) => {
  const { orderId } = req.params;
  const aggregatorId = req.user.id; // From verified Custom JWT

  const client = await pool.connect(); // Get dedicated connection for transaction
  try {
    await client.query('BEGIN');

    // SET LOCAL scopes to this transaction only — safe with connection pooling
    await client.query('SET LOCAL app.current_user_id = $1', [aggregatorId]);

    // FOR UPDATE SKIP LOCKED: if another transaction already locked this row,
    // this query returns 0 rows — this aggregator loses the race
    const { rows } = await client.query(
      `SELECT id FROM orders
       WHERE id = $1 AND status = 'created'
       FOR UPDATE SKIP LOCKED`,
      [orderId]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Order already taken' }); // V13 race handled
    }

    await client.query(
      `UPDATE orders SET status = 'accepted', aggregator_id = $1, updated_at = NOW()
       WHERE id = $2`,
      [aggregatorId, orderId]
    );

    // Explicit audit INSERT — never rely on trigger for changed_by (R3)
    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
       VALUES ($1, 'created', 'accepted', $2)`,
      [orderId, aggregatorId]
    );

    await client.query('COMMIT');

    // Publish real-time event to seller via Ably
    await realtimeProvider.publish(`order:${orderId}`, 'status_updated', {
      status: 'accepted', aggregatorId
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
```

### 4.3 OTP Verification + Order Completion (Express Route — Replaces Edge Function)

```typescript
// POST /api/orders/:id/verify-otp
// Custom JWT middleware runs first

app.post('/api/orders/:orderId/verify-otp', Custom JWTJwtMiddleware, async (req, res) => {
  const { orderId } = req.params;
  const { otp, snapshotHmac } = req.body;
  const aggregatorId = req.user.id;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET LOCAL app.current_user_id = $1', [aggregatorId]);

    // V8: Verify this aggregator is assigned to this order — inside transaction
    const { rows: orderRows } = await client.query(
      `SELECT aggregator_id, status FROM orders WHERE id = $1 FOR UPDATE`,
      [orderId]
    );

    if (!orderRows.length || orderRows[0].aggregator_id !== aggregatorId) {
      await client.query('ROLLBACK');
      return res.status(403).json({ error: 'Not authorised for this order' });
    }

    // Retrieve OTP HMAC from Upstash Redis
    const storedHmac = await redis.get(`otp:${orderId}`);
    const submittedHmac = hmacSha256(otp, process.env.OTP_HMAC_SECRET);

    if (!storedHmac || !timingSafeEqual(storedHmac, submittedHmac)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    // C1: Validate snapshot HMAC binds OTP to confirmed weight/amount values
    if (!validateSnapshotHmac(snapshotHmac, orderId)) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Snapshot mismatch — weights may have changed' });
    }

    // V13: ONLY path to status='completed'
    await client.query(
      `UPDATE orders SET status = 'completed', updated_at = NOW() WHERE id = $1`,
      [orderId]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by)
       VALUES ($1, 'weighing_in_progress', 'completed', $2)`,
      [orderId, aggregatorId]
    );

    await client.query('COMMIT');

    // Delete OTP from Redis — one-time use
    await redis.del(`otp:${orderId}`);

    // Trigger invoice generation (async — non-blocking)
    generateAndStoreInvoice(orderId).catch(err => appInsights.defaultClient.trackException({ exception: err as Error }));

    return res.status(200).json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
```

### 4.4 Direct WhatsApp OTP Dispatch (Replaces legacy stack Auth Send SMS Hook)

```typescript
// POST /api/auth/request-otp
// No JWT required — rate limited by Upstash Redis

app.post('/api/auth/request-otp',
  otpRequestRateLimiter,  // Upstash: max 3/phone/10min, max 10/phone/day
  async (req, res) => {
    const { phone } = req.body; // E.164 format: +919876543210

    // Generate cryptographically secure 6-digit OTP
    const otp = String(crypto.randomInt(100000, 999999));
    const phoneHmac = hmacSha256(phone, process.env.OTP_HMAC_SECRET);
    const otpHmac = hmacSha256(otp, process.env.OTP_HMAC_SECRET);

    // Store HMAC in Upstash Redis — TTL 10 minutes (X3: never store raw OTP)
    await redis.set(`otp:phone:${phoneHmac}`, otpHmac, { ex: 600 });

    // Call Meta WhatsApp Cloud API directly
    await fetch(
      `https://graph.facebook.com/${process.env.META_API_VERSION}/${process.env.META_PHONE_NUMBER_ID}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.META_WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: phone,
          type: 'template',
          template: {
            name: process.env.META_OTP_TEMPLATE_NAME,
            language: { code: 'en' },
            components: [{ type: 'body', parameters: [{ type: 'text', text: otp }] }]
          }
        })
      }
    );

    res.status(200).json({ success: true });
  }
);
```

---

## 5. Push Notifications — Expo Push Service

### 5.1 Implementation

```typescript
// Custom backend: push dispatch helper
import Expo from "expo-server-sdk";
const expo = new Expo();

async function sendPush(expoPushTokens: string[], message: object) {
  const messages = expoPushTokens
    .filter(token => Expo.isExpoPushToken(token))
    .map(to => ({ to, sound: "default", ...message }));

  const chunks = expo.chunkPushNotifications(messages);
  for (const chunk of chunks) {
    await expo.sendPushNotificationsAsync(chunk);
  }
}
```

### 5.2 Push Notification Body Rules (D2 — No PII on Lock Screen)

All push notification bodies must use generic, non-identifying copy. PII is revealed only after the user unlocks and opens the app.

| Event | ✅ Correct Body | ❌ Forbidden Body |
|---|---|---|
| Order accepted | "Your pickup has been accepted" | "Suresh Metals has accepted your order" |
| En route | "Your aggregator is on the way" | "Suresh Metals is en route to your location" |
| OTP ready | "Tap to confirm your pickup" | "Enter OTP for ₹329 transaction" |
| Completed | "Pickup completed, tap to view" | "₹329 received from Suresh Metals" |
| New order | "A new order is available nearby" | "2kg paper order in Madhapur" |

### 5.3 Push Event Triggers

| Trigger | Recipients | Dispatch |
|---|---|---|
| Order created | All online aggregators in same city_code with matching materials | Express, PostgreSQL filter query |
| Order accepted | Seller | Express after successful accept transaction |
| Aggregator en route | Seller | Express on status update |
| Scale photo uploaded / OTP ready | Seller | Express (also triggers WhatsApp OTP directly) |
| Order completed | Both parties | Express after verify-otp transaction |
| Rating prompt | Both parties | Express, 2-hour delay via node-cron |
| New chat message (offline) | Offline party | Express on message insert |

---

## 6. Realtime — Ably via IRealtimeProvider

### 6.1 Connection Culling Policy

```typescript
// hooks/useOrderChannel.ts
export function useOrderChannel(orderId: string) {
  useFocusEffect(
    useCallback(() => {
      // Channel token (HMAC suffix) fetched from order detail API response (V32)
      const channelToken = order.chatChannelToken; // server-generated
      const channel = realtimeProvider.subscribe(
        `order:${orderId}:chat:${channelToken}`,
        'message',
        (msg) => chatStore.addMessage(msg)
      );

      // Cleanup on screen unmount / blur
      return () => realtimeProvider.removeChannel(`order:${orderId}:chat:${channelToken}`);
    }, [orderId])
  );
}

// Register once at app root (_layout.tsx)
AppState.addEventListener("change", (state) => {
  if (state === "background") realtimeProvider.removeAllChannels();
  // Channels re-established on foreground by screen useFocusEffect
});
```

### 6.2 Ably Provider Implementation

```typescript
// packages/realtime/src/AblyRealtimeProvider.ts
import Ably from 'ably';

export class AblyRealtimeProvider implements IRealtimeProvider {
  private client: Ably.Realtime;

  constructor() {
    this.client = new Ably.Realtime({ key: process.env.ABLY_API_KEY });
  }

  subscribe(channelName: string, event: string, handler: Function) {
    const channel = this.client.channels.get(channelName);
    channel.subscribe(event, handler);
    return () => channel.unsubscribe(event, handler as any);
  }

  publish(channelName: string, event: string, payload: object) {
    const channel = this.client.channels.get(channelName);
    return channel.publish(event, payload);
  }

  removeChannel(channelName: string) {
    this.client.channels.get(channelName).detach();
  }

  removeAllChannels() {
    this.client.channels.release('*');
  }
}
```

### 6.3 Realtime Monitor Alert

Monitor Ably connection count in the Ably Dashboard. Free tier provides 200 concurrent connections. If approaching 150 connections (75% of limit), audit connection culling implementation immediately.

### 6.4 Mobile Performance Targets

| Metric | Target |
|---|---|
| Order status broadcast latency | < 1 second |
| Chat message delivery | < 500ms (online) |
| App background → foreground channel re-establishment | < 2 seconds |
| WebSocket connection budget per active screen | Max 1 channel |

### 6.5 Ably Mobile Key Strategy — Token Auth (Fix 11)

> **Security rule:** `ABLY_API_KEY` is backend-only — it must NEVER appear in the mobile bundle or in any client-side environment variable.

Mobile clients use **Ably Token Auth** exclusively:

1. Mobile calls `GET /api/realtime/token` with a valid Custom JWT
2. Express backend generates a short-lived Ably token using `ABLY_API_KEY` (backend-only)
3. The token is scoped to only the channels the authenticated user is permitted to access
4. Mobile initialises `Ably.Realtime({ authUrl: '/api/realtime/token', authHeaders: { Authorization: bearerToken } })`
5. Ably SDK auto-refreshes the token before expiry via the `authUrl`

```typescript
// GET /api/realtime/token — backend implementation
import Ably from 'ably/promises';

app.get('/api/realtime/token', Custom JWTJwtMiddleware, async (req, res) => {
  const rest = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  const userId = req.user.id;

  const tokenRequest = await rest.auth.createTokenRequest({
    clientId: userId,
    capability: {
      [`order:*:${userId}`]: ['subscribe'],      // Only channels for this user
      [`order:*:chat:*`]:   ['subscribe', 'publish'],
    },
    ttl: 3600 * 1000,  // 1-hour TTL
  });

  return res.json(tokenRequest);
});
```

> ⚠️ **`NEXT_PUBLIC_ABLY_KEY` is DEPRECATED for mobile and not required for current admin web scope.** If it appears in any `.env` file for the mobile app, remove it. Revisit only when business/aggregator web realtime features are resumed.

---

## 7. Location Services — Simplified City/Locality Matching

> ⚠️ **v4.0 CHANGE:** PostGIS and `ST_DWithin` geospatial queries have been removed. Aggregator matching now uses `city_code` equality + `pickup_locality` text matching. This is appropriate for the single-city Hyderabad MVP pilot. PostGIS can be re-introduced when multi-city expansion requires zone-level precision matching.

### 7.1 Aggregator Matching Logic

```typescript
// GET /api/aggregators/nearby (now: /api/orders/feed for aggregator)
// Returns orders in the aggregator's city that match their material rates

const { rows } = await db.query(
  `SELECT o.*, 
     CASE WHEN o.aggregator_id IS NOT NULL THEN null ELSE o.pickup_address END as full_address
   FROM orders o
   JOIN order_items oi ON oi.order_id = o.id
   JOIN aggregator_material_rates amr 
     ON amr.material_code = oi.material_code 
     AND amr.aggregator_id = $1
   JOIN aggregator_availability aa ON aa.user_id = $1
   WHERE o.status = 'created'
     AND o.deleted_at IS NULL
     AND o.city_code = (SELECT city_code FROM aggregator_profiles WHERE user_id = $1)
     AND aa.is_online = true
   GROUP BY o.id
   ORDER BY o.created_at DESC
   LIMIT 50`,
  [aggregatorId]
);
```

### 7.2 Maps Abstraction Layer (Geocoding Only)

All geocoding calls (address → city_code + locality) go through the `IMapProvider` interface. No component may import Google Maps directly. Autocomplete suggestions may display locality + city + state + country for discovery, but consumers should persist locality-only selections when storing operating areas.

```typescript
// packages/maps/src/IMapProvider.ts
// IMPORTANT (Fix 12): IMapProvider is a DATA/GEOCODING abstraction only.
// It is NOT a React component factory. The map component in the mobile app
// renders maps independently and consumes geocoding DATA from this interface.
// Backend packages may safely depend on this interface without importing React.
export interface IMapProvider {
  geocode(address: string): Promise<{ city_code: string; locality: string; display_address: string }>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  // NOTE: renderMap() has been REMOVED from this interface.
  // Map rendering is handled by the mobile app's MapView component, which uses
  // geocoded coordinates returned by this interface — not React elements.
}
```

### 7.3 Cost Reference

| Provider | Free Tier | Swap Trigger |
|---|---|---|
| Ola Maps | TBD startup pricing | Available via `MAP_PROVIDER=ola` env var swap |

---

## 8. Database Schema — Azure PostgreSQL Flexible Server

All tables in Azure PostgreSQL Flexible Server B1ms (Central India — Pune). `uuid-ossp` for UUID primary keys. `pgcrypto` for phone number encryption. All tables have Row Level Security enabled.

> **RLS + Custom JWT Pattern:** Since this architecture does not use legacy stack Auth, `auth.uid()` is not available. Instead, the Express backend sets `SET LOCAL app.current_user_id = $userId` on each connection before executing queries. RLS policies use `current_app_user_id()` — a custom helper function — to enforce row-level ownership.

### 8.0 Helper Functions (migration 0002 — must be first object created)

> **MIGRATION ORDER CONSTRAINT:** `current_app_user_id()` MUST be created at the very top of `0002_rls_policies.sql` before any `CREATE POLICY` statement. Every single RLS policy depends on this function.

```sql
-- Helper function: reads user ID set by Express backend per request
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 8.1 Core Tables

```sql
-- Users (auth session managed by Custom JWT — user record synced here on first login)
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  legacy external auth user id   TEXT NOT NULL UNIQUE, -- Custom JWT's user ID for JWT cross-reference
  phone_hash      TEXT NOT NULL,        -- HMAC-SHA256 of phone number
  phone_last4     TEXT NOT NULL,        -- Display-only
  name            TEXT NOT NULL,
  user_type       TEXT NOT NULL CHECK (user_type IN ('seller','aggregator','admin')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  preferred_language TEXT DEFAULT 'en',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Safe view — phone_hash and legacy external auth user id are NEVER returned via this view (V24)
-- Included columns: id, name, phone_last4, user_type, is_active, preferred_language, created_at
-- Explicitly EXCLUDED: phone_hash, legacy external auth user id (PII/auth identifiers)
-- Target migration: 0002_rls_policies.sql (after users table exists)
CREATE VIEW users_public AS
  SELECT id, name, phone_last4, user_type, is_active, preferred_language, created_at
  FROM users;

-- Cities reference table (required before city 2 launch)
CREATE TABLE cities (
  code             TEXT PRIMARY KEY,
  name     TEXT NOT NULL,
  state            TEXT,
  timezone         TEXT DEFAULT 'Asia/Kolkata',
  default_language TEXT DEFAULT 'en',
  is_active        BOOLEAN DEFAULT false,
  launched_at      TIMESTAMPTZ
);
INSERT INTO cities VALUES ('HYD','Hyderabad','Telangana',DEFAULT,DEFAULT,true,NOW());

-- Seller profiles
-- recurring_schedule Canonical JSON Shape:
-- {
--   "frequency": "weekly" | "biweekly" | "monthly",
--   "days": ["Mon", "Wed", "Fri"],           -- 3-letter abbreviated days
--   "preferred_time_start": "09:00",          -- ISO 8601 24h local time
--   "preferred_time_end": "12:00",
--   "active": true                             -- false = paused without deletion
-- }
CREATE TABLE seller_profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id),
  profile_type         TEXT NOT NULL CHECK (profile_type IN ('individual','business')),
  business_name        TEXT,                              -- Business Mode only (R1)
  gstin                TEXT CHECK (char_length(gstin) = 15 OR gstin IS NULL),  -- GST number — optional
  locality             TEXT,
  city_code            TEXT REFERENCES cities(code),
  recurring_schedule   JSONB                             -- Canonical shape defined above
);
-- NOTE: preferred_language is on users table. referral_code is POST-MVP — do not add to schema during Days 4-17.

-- Aggregator profiles (no GEOGRAPHY column — city_code used for matching)
CREATE TABLE aggregator_profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id),
  business_name        TEXT,
  aggregator_type      TEXT NOT NULL DEFAULT 'mobile'
                         CHECK (aggregator_type IN ('shop','mobile')),  -- Determines conditional KYC photo slot
  city_code            TEXT REFERENCES cities(code),
  operating_area       TEXT,
  kyc_status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (kyc_status IN ('pending','verified','rejected')),
  operating_hours      JSONB,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);
-- Business Mode sub-users (R1)
CREATE TABLE business_members (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_seller_id UUID NOT NULL REFERENCES users(id),
  member_user_id    UUID NOT NULL REFERENCES users(id),
  role              TEXT NOT NULL CHECK (role IN ('admin','viewer','operator')),
  invited_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Material types reference
CREATE TABLE material_types (
  code            TEXT PRIMARY KEY,
  label_en        TEXT NOT NULL,
  label_te        TEXT,
  color_token     TEXT,
  min_weight_kg   NUMERIC NOT NULL DEFAULT 1
);

-- Aggregator material rates
-- DEPENDENCY: must exist BEFORE migration 0002_rls_policies.sql (referenced by aggregator_city_orders RLS policy)
CREATE TABLE aggregator_material_rates (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  aggregator_id   UUID NOT NULL REFERENCES users(id),
  material_code   TEXT NOT NULL REFERENCES material_types(code),
  rate_per_kg     NUMERIC NOT NULL CHECK (rate_per_kg > 0),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aggregator_id, material_code)
);
ALTER TABLE aggregator_material_rates ENABLE ROW LEVEL SECURITY;

-- Orders (no GEOGRAPHY column — city_code + locality used for matching)
CREATE TABLE orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id               UUID NOT NULL REFERENCES users(id),
  aggregator_id           UUID REFERENCES users(id),
  city_code               TEXT NOT NULL REFERENCES cities(code),
  status                  TEXT NOT NULL DEFAULT 'created'
                            CHECK (status IN ('created','accepted','en_route','arrived',
                                              'weighing_in_progress','completed','cancelled','disputed')),
  pickup_address          TEXT,           -- Full address — revealed post-acceptance only (V25)
  pickup_locality         TEXT NOT NULL,  -- Neighbourhood name — always visible
  preferred_pickup_window JSONB,
  seller_note             TEXT CHECK (char_length(seller_note) <= 500),
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  deleted_at              TIMESTAMPTZ
);

-- Order items
CREATE TABLE order_items (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id                UUID NOT NULL REFERENCES orders(id),
  material_code           TEXT NOT NULL REFERENCES material_types(code),
  estimated_weight_kg     NUMERIC,
  confirmed_weight_kg     NUMERIC,
  rate_per_kg             NUMERIC,
  amount                  NUMERIC,
  confirmed_snapshot_hmac TEXT   -- HMAC binding OTP to confirmed values (C1)
);

-- Order status history (R3: changed_by set by Express, never by DB trigger)
CREATE TABLE order_status_history (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id    UUID NOT NULL REFERENCES orders(id),
  old_status  TEXT,
  new_status  TEXT NOT NULL,
  changed_by  UUID,           -- Actor user ID from Custom JWT — never auto-populated
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()  -- Always DB-set, never client-supplied (V30)
);

-- Order media (storage_path is Cloudflare R2 object key)
-- order_id is NULL for KYC document rows — KYC is not linked to any order
CREATE TABLE order_media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID REFERENCES orders(id),              -- Nullable: NULL for KYC media types
  media_type   TEXT NOT NULL CHECK (media_type IN
                 ('scrap_photo','scale_photo',
                  'kyc_aadhaar_front',                  -- Aadhaar card front — all aggregators
                  'kyc_aadhaar_back',                   -- Aadhaar card back — all aggregators
                  'kyc_selfie',                         -- Face photo — all aggregators
                  'kyc_shop',                           -- Shop exterior — aggregator_type='shop' only
                  'kyc_vehicle',                        -- Vehicle photo — aggregator_type='mobile' only
                  'invoice')),
  storage_path TEXT NOT NULL,   -- R2 object key — used to generate presigned URLs via IStorageProvider
  uploaded_by  UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
)

-- Device tokens (dual-token strategy)
CREATE TABLE device_tokens (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES users(id),
  token_type   TEXT NOT NULL DEFAULT 'expo'
                 CHECK (token_type IN ('expo','fcm','apns')),
  expo_token   TEXT,
  raw_token    TEXT,   -- Native FCM/APNs token for future migration
  is_active    BOOLEAN DEFAULT true,
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Aggregator availability + heartbeat (C2)
CREATE TABLE aggregator_availability (
  user_id      UUID PRIMARY KEY REFERENCES users(id),
  is_online    BOOLEAN DEFAULT false,
  last_ping_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (monthly range-partitioned)
CREATE TABLE messages (
  id        UUID NOT NULL DEFAULT uuid_generate_v4(),
  order_id  UUID NOT NULL REFERENCES orders(id),
  sender_id UUID NOT NULL REFERENCES users(id),
  content   TEXT NOT NULL CHECK (char_length(content) <= 1000),
  read_at   TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
) PARTITION BY RANGE (created_at);

-- OTP log (for audit — actual OTP state lives in Upstash Redis)
CREATE TABLE otp_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID REFERENCES orders(id),
  phone_hash    TEXT NOT NULL,
  otp_hmac      TEXT NOT NULL,     -- HMAC-SHA256 of OTP — never raw OTP (X3)
  attempt_count INT DEFAULT 0,
  expires_at    TIMESTAMPTZ NOT NULL,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Ratings
CREATE TABLE ratings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES orders(id),
  rater_id   UUID NOT NULL REFERENCES users(id),
  ratee_id   UUID NOT NULL REFERENCES users(id),
  score      INT NOT NULL CHECK (score BETWEEN 1 AND 5),
  review     TEXT CHECK (char_length(review) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  order_item_id   UUID REFERENCES order_items(id),   -- Optional: links dispute to specific line item (Fix 5)
  raised_by       UUID NOT NULL REFERENCES users(id),
  issue_type      TEXT NOT NULL CHECK (issue_type IN
                    ('wrong_weight','payment_not_made','no_show','abusive_behaviour','other')),
  description     TEXT NOT NULL CHECK (char_length(description) <= 2000),
  status          TEXT NOT NULL DEFAULT 'open'
                    CHECK (status IN ('open','resolved','dismissed')),
  resolution_note TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  resolved_at     TIMESTAMPTZ
);

-- Dispute evidence
CREATE TABLE dispute_evidence (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id   UUID NOT NULL REFERENCES disputes(id),
  submitted_by UUID NOT NULL REFERENCES users(id),
  storage_path TEXT NOT NULL,   -- R2 object key
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Price index
CREATE TABLE price_index (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city_code           TEXT NOT NULL REFERENCES cities(code),
  material_code       TEXT NOT NULL REFERENCES material_types(code),
  rate_per_kg         NUMERIC NOT NULL,
  source_url          TEXT,       -- Display-only metadata — NEVER re-fetched (V19)
  is_manual_override  BOOLEAN DEFAULT false,
  scraped_at          TIMESTAMPTZ DEFAULT NOW(),
  active_from         TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices (invoice_data JSONB is the legal GST record)
CREATE TABLE invoices (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id          UUID NOT NULL REFERENCES orders(id),
  seller_gstin      TEXT,
  aggregator_details JSONB,
  total_amount      NUMERIC NOT NULL,
  storage_path      TEXT,     -- R2 object key for PDF (V27: randomised path suffix)
  invoice_data      JSONB NOT NULL DEFAULT '{}',  -- Legal record — PDF is rendering artifact
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Seller flags (order spam tracking — RA3)
CREATE TABLE seller_flags (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id        UUID NOT NULL REFERENCES users(id),
  reason           TEXT,
  flagged_at       TIMESTAMPTZ DEFAULT NOW(),
  suspension_until TIMESTAMPTZ,
  resolved_at      TIMESTAMPTZ
);

-- Admin audit log (X4)
CREATE TABLE admin_audit_log (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      UUID NOT NULL REFERENCES users(id),
  action        TEXT NOT NULL,
  target_entity TEXT,
  target_id     UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (persistent notification history for notification screen)
-- Target migration: 0001_initial_schema.sql
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id),
  title      TEXT NOT NULL,
  body       TEXT NOT NULL,
  data       JSONB DEFAULT '{}',   -- non-PII payload: { order_id, event_type }
  read_at    TIMESTAMPTZ,          -- NULL = unread
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
-- RLS: users can only read/update their own notifications
CREATE POLICY notifications_self_read ON notifications
  FOR SELECT USING (current_app_user_id() = user_id);
CREATE POLICY notifications_self_update ON notifications
  FOR UPDATE USING (current_app_user_id() = user_id);
-- Backend inserts notifications as a privileged operation (using SECURITY DEFINER or bypassing RLS via SET LOCAL)
```

### 8.2 Row Level Security Policies

```sql
-- Enable RLS on ALL tables — no exceptions
ALTER TABLE users                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_members        ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items             ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_status_history    ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_media             ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_tokens           ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregator_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages                ENABLE ROW LEVEL SECURITY;
ALTER TABLE otp_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispute_evidence        ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices                ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_flags            ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_log         ENABLE ROW LEVEL SECURITY;

-- NOTE: Express backend always calls:
--   SET LOCAL app.current_user_id = $userId
-- before any query. current_app_user_id() reads this value for RLS.

-- Sellers: own orders only (R2: split USING / WITH CHECK)
CREATE POLICY seller_own_orders_read ON orders
  FOR SELECT USING (current_app_user_id() = seller_id);

CREATE POLICY seller_own_orders_write ON orders
  FOR INSERT WITH CHECK (current_app_user_id() = seller_id);

CREATE POLICY seller_own_orders_modify ON orders
  FOR UPDATE USING (current_app_user_id() = seller_id);

-- Aggregators: see only 'created' orders in their city with matching materials
CREATE POLICY aggregator_city_orders ON orders
  FOR SELECT
  USING (
    status = 'created'
    AND deleted_at IS NULL
    AND city_code = (
      SELECT ap.city_code FROM aggregator_profiles ap
      WHERE ap.user_id = current_app_user_id()
    )
    AND EXISTS (
      SELECT 1 FROM aggregator_availability aa
      WHERE aa.user_id = current_app_user_id() AND aa.is_online = true
    )
    AND EXISTS (
      SELECT 1 FROM order_items oi
      JOIN aggregator_material_rates amr
        ON amr.material_code = oi.material_code
       AND amr.aggregator_id = current_app_user_id()
      WHERE oi.order_id = orders.id
    )
  );

-- Accepted orders: the assigned aggregator can see full order details
CREATE POLICY aggregator_accepted_order ON orders
  FOR SELECT
  USING (aggregator_id = current_app_user_id());

-- Chat: only the two order parties can read/write
CREATE POLICY message_parties ON messages
  FOR ALL USING (
    current_app_user_id() IN (
      SELECT seller_id FROM orders WHERE id = order_id
      UNION
      SELECT aggregator_id FROM orders WHERE id = order_id
    )
  );

-- Business members role enforcement (R1)
CREATE POLICY business_admin_orders ON orders
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.business_seller_id = seller_id
        AND bm.member_user_id = current_app_user_id()
        AND bm.role = 'admin'
    )
  );

CREATE POLICY business_operator_insert ON orders
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM business_members bm
      WHERE bm.business_seller_id = seller_id
        AND bm.member_user_id = current_app_user_id()
        AND bm.role IN ('admin','operator')
    )
  );

-- Device tokens: self-only
CREATE POLICY device_tokens_self ON device_tokens
  FOR ALL USING (current_app_user_id() = user_id);

-- kyc_status: Express admin routes use app_user role with SECURITY DEFINER function
-- DB trigger prevents direct UPDATE from non-admin connections (V35)
CREATE OR REPLACE FUNCTION block_kyc_status_client_update()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.kyc_status IS DISTINCT FROM NEW.kyc_status
     AND current_setting('app.is_admin_context', true) != 'true' THEN
    RAISE EXCEPTION 'kyc_status may only be updated by admin backend routes';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_block_kyc_update
  BEFORE UPDATE OF kyc_status ON aggregator_profiles
  FOR EACH ROW EXECUTE FUNCTION block_kyc_status_client_update();
```

### 8.3 Key Indexes

```sql
-- orders: fast lookup by city + status (replaces PostGIS GIST index)
CREATE INDEX idx_orders_city_status ON orders (city_code, status)
  WHERE status = 'created' AND deleted_at IS NULL;

-- orders: seller's own orders
CREATE INDEX idx_orders_seller_id ON orders (seller_id, created_at DESC);

-- orders: aggregator's accepted orders
CREATE INDEX idx_orders_aggregator_id ON orders (aggregator_id) WHERE aggregator_id IS NOT NULL;

-- device_tokens: fast lookup of active tokens per user
CREATE INDEX idx_device_tokens_user_id ON device_tokens (user_id) WHERE is_active = true;

-- aggregator_availability: partial index on online aggregators only
CREATE INDEX idx_agg_availability_online ON aggregator_availability (user_id)
  WHERE is_online = true;

-- aggregator_material_rates
CREATE INDEX idx_agg_rates_aggregator ON aggregator_material_rates (aggregator_id);
CREATE INDEX idx_agg_rates_material   ON aggregator_material_rates (material_code);

-- order_status_history: ordered by time ascending for timeline display
CREATE INDEX idx_status_history_order_id ON order_status_history (order_id, created_at ASC);
```

---

## 9. Scheduled Jobs — node-cron on Express Backend

> ⚠️ **v4.0 CHANGE:** pg_cron has been removed (pg_cron requires legacy stack Pro or a manually-managed PostgreSQL extension). All cron jobs now run via `node-cron` on the Express backend. The message partition job is the only exception — it runs as a startup check on each Express deploy.

```typescript
// backend/src/scheduler.ts
import cron from 'node-cron';
import appInsights from 'sentry';

// RULE (Fix 14): ALL cron callbacks must be wrapped in try/catch.
// On failure: capture exception to Sentry with job name + timestamp.
// Never let a cron failure propagate to the Express process (no unhandled rejections).

// Aggregator online culling — every 5 minutes (C2)
cron.schedule('*/5 * * * *', async () => {
  try {
    await db.query(
      `UPDATE aggregator_availability SET is_online = false
       WHERE last_ping_at < NOW() - INTERVAL '5 minutes' AND is_online = true`
    );
  } catch (err) {
    appInsights.defaultClient.trackException({
      exception: err as Error,
      properties: { cron_job: 'aggregator_online_culling', ran_at: new Date().toISOString() }
    });
  }
});

// Aggregator rating stats refresh — every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  try {
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY aggregator_rating_stats');
  } catch (err) {
    appInsights.defaultClient.trackException({
      exception: err as Error,
      properties: { cron_job: 'rating_stats_refresh', ran_at: new Date().toISOString() }
    });
  }
});

// Price index cache refresh — daily at 06:00 IST (00:30 UTC)
cron.schedule('30 0 * * *', async () => {
  try {
    await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index');
  } catch (err) {
    appInsights.defaultClient.trackException({
      exception: err as Error,
      properties: { cron_job: 'price_index_refresh', ran_at: new Date().toISOString() }
    });
  }
});

// OTP log cleanup — nightly at 02:00 UTC (retains 7 days for dispute evidence)
cron.schedule('0 2 * * *', async () => {
  try {
    await db.query(
      `DELETE FROM otp_log WHERE expires_at < NOW() - INTERVAL '7 days'`
    );
  } catch (err) {
    appInsights.defaultClient.trackException({
      exception: err as Error,
      properties: { cron_job: 'otp_log_cleanup', ran_at: new Date().toISOString() }
    });
  }
});

// Message partition pre-creation — 25th of each month at 01:00 UTC
cron.schedule('0 1 25 * *', async () => {
  try {
    await createNextMonthMessagePartition();
  } catch (err) {
    appInsights.defaultClient.trackException({
      exception: err as Error,
      properties: { cron_job: 'message_partition_creation', ran_at: new Date().toISOString() }
    });
  }
});
```

---

## 10. Mobile App Structure

### 10.1 Directory Structure

```
sortt-app/
├── apps/
│   ├── mobile/                       # Expo React Native app
│   │   ├── app/                      # Expo Router screens
│   │   │   ├── _layout.tsx           # Root layout — font loading, SplashScreen gate, Custom JWT provider
│   │   │   ├── index.tsx             # Root route — renders SplashAnimation, routes to auth or home
│   │   │   ├── (auth)/               # Login, OTP entry
│   │   │   ├── (seller)/             # Seller tab group
│   │   │   ├── (aggregator)/         # Aggregator tab group
│   │   │   └── (shared)/             # Order detail, chat, receipt, OTP confirm
│   │   ├── components/
│   │   │   ├── ui/                   # Design system components (unchanged)
│   │   │   └── domain/               # Feature-specific components
│   │   ├── lib/
│   │   │   ├── Custom JWT.ts              # Custom JWT client (replaces legacy auth client)
│   │   │   ├── api.ts                # Custom backend API client
│   │   │   └── notifications.ts      # Expo push token registration (dual-token)
│   │   ├── store/                    # Zustand state stores
│   │   └── constants/
│   │       └── tokens.ts             # Design tokens (SINGLE SOURCE OF TRUTH — unchanged)
│   ├── web/                          # Next.js 15 admin web app (`/admin/*` active)
│   └── admin/                        # Deferred placeholder for future dedicated web surfaces
├── packages/
│   ├── maps/                         # IMapProvider abstraction
│   ├── realtime/                     # IRealtimeProvider → AblyRealtimeProvider
│   ├── auth/                         # IAuthProvider → Custom JWTAuthProvider
│   ├── storage/                      # IStorageProvider → R2StorageProvider
│   └── analysis/                     # IAnalysisProvider abstraction
├── backend/                          # Node.js/Express — Azure App Service (Central India)
│   └── src/
│       ├── middleware/
│       │   ├── auth.ts               # Custom JWT verification middleware (A1)
│       │   ├── cors.ts               # CORS allowlist (X1)
│       │   └── security.ts           # Helmet + scrub env from errors (V34, D3)
│       ├── routes/
│       │   ├── auth/
│       │   │   ├── requestOtp.ts     # POST /api/auth/request-otp
│       │   │   └── verifyOtp.ts      # POST /api/auth/verify-otp
│       │   ├── orders/
│       │   │   ├── accept.ts         # POST /api/orders/:id/accept (first-accept-wins)
│       │   │   └── verifyPickupOtp.ts # POST /api/orders/:id/verify-otp
│       │   └── admin/
│       ├── scheduler.ts              # node-cron jobs (replaces pg_cron)
│       ├── storage/                  # IStorageProvider → Cloudflare R2 implementation
│       └── utils/
│           └── rateLimit.ts          # Upstash Redis rate limiters
├── migrations/                       # Plain SQL migration files (historically replaced legacy migrations)
│   ├── 0001_initial_schema.sql
│   ├── 0002_rls_policies.sql
│   └── 0003_indexes_and_triggers.sql
└── scraper/                          # Python price scraper agent
    └── main.py
```

### 10.2 Design Token Constants (Unchanged)

```typescript
// constants/tokens.ts — single source of truth for all colour/spacing
export const colors = {
  navy:    "#1C2E4A",
  red:     "#C0392B",
  amber:   "#B7791F",
  teal:    "#1A6B63",
  slate:   "#5C6B7A",
  muted:   "#8E9BAA",
  border:  "#DDE3EA",
  bg:      "#F4F6F9",
  surface: "#FFFFFF",
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

---

## 11. Build Configuration Rules

### 11.1 Agent Configuration Rules

These rules apply to every agent in every session:

- Never hardcode API keys in any agent session. Reference environment variables only.
- All agents must import colours and spacing exclusively from `constants/tokens.ts` — never hardcode hex values.
- All agents must use DM Sans and DM Mono. No other typefaces.
- No agent may call Meta WhatsApp API, Ably, Cloudflare R2 SDK, Custom JWT, or direct map SDKs directly — only through the provider abstraction packages in `packages/`.
- No agent may import or reference `legacy stack SDK` or any legacy stack package anywhere in the codebase.
- On Days 1–3 (UI-only phase): no agent makes any backend or third-party API calls from the mobile app. All screen data is hardcoded fixture data. Real wiring begins Day 5.
- Backend agents (Days 5–8): always call `SET LOCAL app.current_user_id = $userId` before DB queries in protected routes.

### 11.2 Build Sequence & Day Ownership

> ⚠️ **PLAN.md is authoritative on sequencing** (per MEMORY.md document hierarchy). This table is a summary only. Use PLAN.md for the exact task list, verification gates, and estimated times for each day.

| Day | Domain | Primary Technologies |
|---|---|---|
| 1–3 | UI Foundation (all screens, static data) | React Native, Expo Router, Zustand, Design System |
| 4 | Database schema (PostgreSQL) — initial tables + extensions | `uuid-ossp`, `pgcrypto`, migrations 0001–0003 |
| 5 | RLS policies + triggers + indexes + materialized views | PostgreSQL RLS, functions, 0002–0006 migrations |
| 6 | Express backend foundation + auth wiring (WhatsApp OTP) | Express, Custom JWT, Upstash Redis, Meta WhatsApp API |
| 7 | Core API routes — orders, profiles, rates, push dispatch | pg pool, Expo push, auth middleware, node-cron setup |
| 8 | Atomic operations — first-accept-wins, OTP verify, media | `FOR UPDATE SKIP LOCKED`, Cloudflare R2, sharp EXIF strip |
| 9 | Realtime (Ably token auth), chat, notifications | IRealtimeProvider, token auth endpoint, notifications API |
| 10 | Disputes system, ratings, order lifecycle completion | disputes/evidence routes, 24hr rating window, status machine |
| 11 | AI scrap analysis (Gemini Vision), invoice PDF generation | `IAnalysisProvider`, Gemini Flash, pdf-lib, GST format |
| 12 | Mobile auth wiring — `otp.tsx` rewrite (WhatsApp flow) | Custom JWT Expo SDK, `POST /api/auth/*` integration |
| 13 | Provider abstraction swap tests (Ola Maps, Soketi) | `IMapProvider`, `IRealtimeProvider`, env-var-driven swaps |
| 14 | Admin web panel + IP security | Next.js 15, Vercel Edge Middleware, IP allowlist |
| 15 | Business Mode APIs + GST invoices (mobile surfaces active; web deferred) | `business_members`, role RLS, `PATCH /api/sellers/profile` |
| 16 | EAS build, E2E testing, telemetry stack, performance audit | Detox/Playwright, Jest coverage, Azure Monitor + Sentry review |
| 17 | Security audit, penetration testing, launch readiness | All V-series + X-series checks, admin audit log review |

---

## 12. Testing & Deployment

### 12.1 Test Strategy

| Test Type | Scope | Tool |
|---|---|---|
| Unit | Route handlers, RLS policies, status machine, no `phone_hash` in responses (V24) | Jest |
| Integration | Order lifecycle, first-accept-wins race, OTP binding (C1), Custom JWT validation | Jest + Supertest |
| E2E | Seller listing → aggregator accepts → WhatsApp OTP → receipt generated | Detox / Playwright |
| Security | IMMUTABLE_STATUSES enforcement (V13), `kyc_status` block (V35), CORS allowlist (X1) | Jest |

### 12.2 CI/CD Pipeline

- **On PR open:** ESLint + TypeScript type check + Jest unit tests (GitHub Actions — free via GitHub Student Pack Pro).
- **On merge to main:** Auto-deploy web to Vercel preview, deploy custom backend to Azure App Service staging, run E2E smoke tests.
- **On release tag:** Expo EAS Build (15 free builds/month) for Android APK + iOS IPA. Vercel promotes staging to production. Azure auto-deploy on release branch.
- **Secrets:** GitHub Secrets stores all API keys. Never in codebase.

### 12.3 Monitoring

| Tool | Purpose | Free Tier |
|---|---|---|
| Azure Sentry | Error tracking + distributed tracing for Express + Next.js | Included with Azure ingestion quotas |
| Sentry (Mobile only) | Crash reporting + symbolication for React Native | 5K errors/month |
| Disabled | User funnel analytics (`listing_started`, `listing_submitted`, `order_accepted`, `order_completed`) | 1M events/month |
| Disabled | Admin web behavioural analytics (session replay + heatmaps) | Included (project-level quotas apply) |
| Azure Monitor Availability Tests | Synthetic uptime checks for backend `/health` + admin web URL | Included with Azure Monitor |
| Azure Monitor | Backend memory/CPU, DB connections, query performance | Included with Azure for Students |
| Ably Dashboard | Realtime connection count — alert at 150 (75% of 200 free) | Included |
| Redis Monitor | Meta WhatsApp daily OTP counter — alert at 900/month | Included in Upstash |

### 12.4 Free Tier Limits at MVP Scale (10K DAU)

| Service | Free Limit | Estimated Usage at 10K DAU | Buffer |
|---|---|---|---|
| Azure PostgreSQL B1ms | 750 hrs/month (12 months) | 744 hrs | ~1% |
| Ably Realtime | 200 conns, 6M msgs/month | ~100 peak conns | 50% |
| Custom JWT | 10,000 MAU | ~2,000 active users | 80% |
| Cloudflare R2 | 10GB storage, 1M operations/month | ~200 uploads | ample |
| Gemini Flash Vision | 1,500 req/day | ~200/day | 87% |
| Upstash Redis | 10,000 req/day | ~3,000/day | 70% |
| Meta WhatsApp | 1,000 conversations/month | ~300/month | 70% |
| Expo EAS Build | 15 builds/month | ~8/month | 47% |

---

## 13. Database Scale & Resilience

### 13.1 Order Status Audit Trigger

```sql
-- Application-level INSERT (Express backend on every status update):
-- INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, note)
-- VALUES ($order_id, $old_status, $new_status, $req.user.id, $note);
-- created_at is DEFAULT NOW() — never supplied by client (V30)
-- changed_by comes from Custom JWT, never from DB trigger (R3)
```

### 13.2 Materialized Views

```sql
CREATE MATERIALIZED VIEW aggregator_rating_stats AS
  SELECT ratee_id AS aggregator_id,
         AVG(score) AS avg_rating,
         COUNT(*) AS total_orders,
         NOW() AS last_updated
  FROM ratings
  GROUP BY ratee_id;

CREATE MATERIALIZED VIEW current_price_index AS
  SELECT DISTINCT ON (city_code, material_code)
    city_code, material_code, rate_per_kg, scraped_at
  FROM price_index
  ORDER BY city_code, material_code, active_from DESC;
```

### 13.3 Message Table Partition Maintenance

```typescript
// backend/src/db/partitions.ts
async function createNextMonthMessagePartition() {
  const nextMonth = new Date();
  nextMonth.setMonth(nextMonth.getMonth() + 1);
  const tblName = `messages_${nextMonth.getFullYear()}_${String(nextMonth.getMonth() + 1).padStart(2,'0')}`;

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${tblName} PARTITION OF messages
    FOR VALUES FROM ('${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2,'0')}-01')
    TO ('${new Date(nextMonth.getFullYear(), nextMonth.getMonth() + 1, 1).toISOString().split('T')[0]}')
  `);
}

// Called at Express startup to ensure current + next partition exist
await createNextMonthMessagePartition();
```

### 13.4 10K DAU Traffic Model

| Metric | Daily | Peak (2hr window) | Per Second (peak) |
|---|---|---|---|
| Order creations | ~900 | ~630 | ~0.09 |
| Aggregator push broadcasts | ~27,000 | ~18,900 | ~2.6 |
| Gemini Vision calls | ~180 | ~126 | ~0.02 |
| WhatsApp OTP deliveries | ~900 | ~630 | ~0.09 |
| Chat messages | ~4,500 | ~3,150 | ~0.44 |
| Ably WebSocket connections (peak) | — | ~100 | — |

---

## 14. Security Architecture & Vulnerability Mitigations

### 14.1 Authentication Bypass Risks

#### A1 — Custom JWT Verification Middleware

**Requirement:** All protected routes must validate the Custom JWT before any business logic executes.

**Implementation:**
```typescript
// middleware/auth.ts
import { Custom JWTExpressRequireAuth } from '@Custom JWT/Custom JWT-sdk-node';

export const Custom JWTJwtMiddleware = Custom JWTExpressRequireAuth({
  onError: (err, req, res) => res.status(401).json({ error: 'Unauthorised' })
});

// Attach internal user record to req.user after Custom JWT validation
export const attachInternalUser = async (req, res, next) => {
  const { userId: Custom JWTUserId } = req.auth;
  const { rows } = await db.query(
    'SELECT * FROM users WHERE legacy external auth user id = $1 AND is_active = true',
    [Custom JWTUserId]
  );
  if (!rows.length) return res.status(401).json({ error: 'User not found' });
  req.user = rows[0]; // Internal users row — includes user_type, is_active
  next();
};
```

**Exemptions from JWT middleware:**
- `POST /api/auth/request-otp` — rate limited only
- `POST /api/auth/verify-otp` — rate limited only
- `GET /api/rates` — public, cached

#### A2 — Webhook Signature Validation

Any future webhook integrations (payment gateway, Meta webhook events) must validate HMAC-SHA256 signatures using `crypto.timingSafeEqual` before processing.

#### A3 — Session Policy

Custom JWT access tokens expire in 1 hour. Refresh tokens expire in 7 days. Admin panel enforces 15-minute inactivity re-auth. "Sign out all devices" clears all Custom JWT sessions for the user.

---

### 14.2 Improper Role Enforcement

#### R1 — Business Sub-User Roles

`business_members` table enforces roles at the database level via RLS policies. Express backend validates max 5 non-admin members at route level. All Business Mode routes call `checkBusinessRole(orderId, userId, requiredRole)` before executing.

#### R2 — seller_own_orders RLS: Split USING / WITH CHECK

```sql
-- SELECT/UPDATE/DELETE: USING
CREATE POLICY seller_own_orders_read ON orders
  FOR SELECT USING (current_app_user_id() = seller_id);

-- INSERT: WITH CHECK
CREATE POLICY seller_own_orders_write ON orders
  FOR INSERT WITH CHECK (current_app_user_id() = seller_id);
```

Also add backend assertion: `if (req.user.id !== order.seller_id) return res.status(403)`.

#### R3 — Order Status History Actor Tracking

The Express backend explicitly INSERTs `changed_by = req.user.id` from the Custom JWT into `order_status_history`. No trigger or `current_app_user_id()` is used for this field — it is always application-provided.

---

### 14.3 Rate Abuse

#### RA1 — Gemini API Quota Exhaustion

Per-user rate limiting: max 10 Gemini requests per user per hour (Upstash Redis). Global circuit breaker: if daily Gemini calls exceed 1,200 (80% of 1,500 free limit), return `manual_entry_required: true` (graceful degradation). SHA-256 image deduplication cache (TTL 24h) prevents identical image re-analysis.

#### RA2 — WhatsApp OTP Flooding

Rate limiting on `POST /api/auth/request-otp`: max 3 OTP requests per phone per 10-minute window, max 10 per day. Running daily conversation counter in Upstash Redis — alert via Azure Monitor/Sentry when counter reaches 900 (90% of 1,000 free monthly quota).

#### RA3 — Order Spam

Rate-limit `POST /api/orders` to 3 creations per seller per hour. Two consecutive cancellations within 30 minutes → auto-flag + 2-hour suspension. Tracked in `seller_flags` table.

---

### 14.4 Injection Attacks

#### I1 — AI Prompt Injection via Scrap Photo (unchanged)

Gemini response is NEVER persisted directly to DB. Treat as UI hint only. Validate response schema: material codes must match `material_types` table, weight must be positive number.

#### I2 — XSS via Free-Text Fields (unchanged)

Sanitise all free-text input server-side using `sanitize-html` before storage. Never use `dangerouslySetInnerHTML` for user content in Next.js. Add `Content-Security-Policy` header.

#### I3 — PDF Injection (unchanged)

Validate and strip all user-supplied strings before pdf-lib insertion. GSTIN must match 15-character regex. Use `pdf-lib drawText` API only.

---

### 14.5 Data Exposure & Privacy

#### D1 — Storage Access Control

All Cloudflare R2 files are stored in a **private bucket** (no public access). Express backend generates S3 presigned URLs (via `@aws-sdk/s3-request-presigner`) after verifying ownership of the `order_media` record. No file URL is ever returned directly to clients. Expiry: 5 minutes (300 seconds).

#### D2 — Push Notification PII (unchanged)

All push notification bodies use generic copy. See §5.2 for approved/forbidden body table.

#### D3 — Environment Variable Leak in Error Logs

Global Express error handler scrubs `process.env` before Sentry capture. Git pre-commit hook (`git-secrets`) fails if any secret pattern is found in source code.

---

### 14.6 Client-Side Trust

#### C1 — OTP Must Bind to Confirmed Weight/Amount Values (unchanged)

Seller reviews full transaction summary before entering OTP. Aggregator submits weights → Express generates OTP → stores HMAC in Redis keyed by `order_id`. `/api/orders/:id/verify-otp` receives OTP + `snapshotHmac`. Both validated in single transaction.

#### C2 — Aggregator Heartbeat TTL (unchanged)

Aggregator pings `POST /api/aggregators/heartbeat` every 2 minutes. node-cron job every 5 minutes sets `is_online=false` for rows where `last_ping_at` is older than 5 minutes.

#### C3 — Offline Draft Tampering

When seller captures scrap photo (online or offline), app queues image for upload as first operation on reconnect. Order submission must reference a `storage_path` (Cloudflare R2 object key) validated by the backend: file must exist, uploaded by this user, created within last 24 hours.

---

### 14.7 Additional Security Controls

#### X1 — CORS Allowlist

```typescript
app.use(cors({
  origin: [
    'https://sortt.in',
    'https://admin.sortt.in',
    'http://localhost:3000',  // dev only
  ],
  credentials: true,
}));
```

#### X2 — Price Scraper Output Validation (unchanged)

Sanity bounds per material before `price_index` INSERT. > 30% deviation → `is_manual_override=true` + admin alert.

#### X3 — OTP Hashing Algorithm

HMAC-SHA256 via Node built-in `crypto` module with `OTP_HMAC_SECRET`. Never bcrypt for OTPs. Redis TTL (10 min) + 3-attempt lockout are primary security controls.

#### X4 — Admin Panel Access Control

Vercel Edge Middleware IP allowlist on all `/admin/*` routes. 15-minute inactivity timeout. All admin actions logged to `admin_audit_log`.

---

### 14.8 Security Controls Specific to v4.0 Stack

#### V-Custom JWT-1 — legacy external auth user id Must Never Appear in API Responses

The `legacy external auth user id` field on the `users` table must never appear in any API response DTO. It is an internal cross-reference only. The `users_public` view excludes it. Add a unit test asserting no response fixture contains `legacy external auth user id`.

#### V-Custom JWT-2 — user_type Must Always Be Re-Fetched from DB

On every privileged route, `req.user.user_type` and `req.user.is_active` come from the `attachInternalUser` middleware which queries the DB — not from the Custom JWT claims. Cache DB result in Upstash Redis for max 60 seconds per user. This prevents a banned aggregator from using their old JWT.

#### V-OTP-1 — OTP State Lives in Redis, Not Only in DB

The `otp_log` table is an audit trail. The authoritative OTP state (for validation) lives in Upstash Redis keyed by `otp:order:{orderId}`. Redis TTL (10 min) is the expiry mechanism. On successful verification, immediately `DEL` the Redis key to prevent replay attacks.

#### V32 — Ably Channel Names Must Include HMAC Suffix (unchanged)

Channel naming: `order:{order_id}:chat:{hmac_sha256(order_id+user_id+OTP_HMAC_SECRET)[:8]}`. Express returns `chatChannelToken` in the order detail API response. Only parties who have received this token can construct the correct channel name.

#### V34 — HTTP Security Headers

```typescript
import helmet from 'helmet';
app.use(helmet()); // Sets HSTS, X-Content-Type-Options, X-Frame-Options, etc.
```

#### V35 — kyc_status Blocklist

`kyc_status` is never accepted in any client request body. Express middleware explicitly strips it from all profile update payloads. DB trigger `block_kyc_status_client_update` provides database-layer defence. Only `PATCH /api/admin/aggregators/:id/kyc` can update it, after `user_type=admin` DB verification.

#### V36 — Pre-Acceptance Order Dismiss is Client-Only (Day 3 UI, Fix 15)

The aggregator's feed supports a local "dismiss" gesture to hide an order card from their view. This is a **client-side only action** — no server-side dismiss state is stored in the MVP database. The dismissed order remains accessible to the aggregator via direct `GET /api/orders/:id` if they have the order ID. This is intentional and acceptable: the aggregator has no privileged relationship with the order at this stage. No `dismissed_by` table, column, or endpoint exists or should be added during Days 4–17.

#### V37 — Ably Channel Lifecycle on Terminal Order Status (Fix 16)

When an order reaches a terminal state (`completed` or `cancelled`), the backend must stop publishing to that order's Ably channels after the terminal state is written to the database. Mobile clients must unsubscribe via their screen unmount cleanup path (`useFocusEffect` return). No active channel invalidation is required — Ably's channel inactivity TTL handles cleanup automatically on the server side.

#### V38 — Price Scraper SSRF Hardening (Fix 17)

> **SSRF rule (V19 extension):** The price scraper fetches from a hard-coded URL allowlist defined in source code. It must never fetch from a URL read from the database. `price_index.source_url` is display-only metadata — it must **never** be fetched programmatically by any code path.

Additional requirements:
- All scraper outbound HTTP requests must pass through an IP validation step before the request is made
- Block RFC 1918 private IP ranges: `10.x.x.x`, `172.16.x.x–172.31.x.x`, `192.168.x.x`
- Block loopback: `127.x.x.x` and `::1`
- If the target URL resolves to a private IP, abort the request and log to Sentry before sending
- The allowlist is a compile-time constant — not a database table, not an env var

---

## 15. Scalability & Vendor Lock-In Analysis

### 15.1 100K DAU Traffic Projections

| Metric | At 10K DAU | At 100K DAU | Ceiling Hit |
|---|---|---|---|
| Ably WebSocket connections | ~100 peak | ~1,000 peak | Ably paid tier ($29/month) |
| Gemini Vision calls | ~180/day | ~1,800/day | Free tier (1,500/day) exceeded at ~75K DAU |
| WhatsApp OTP conversations | ~300/month | ~3,000/month | Free tier (1,000/month) exceeded at ~1K DAU |
| Azure PostgreSQL B1ms | Adequate | Upgrade to B2ms | ~₹9,030/month — migrate to DO at that point |
| Custom JWT MAU | ~2,000 | ~20,000 | Pro plan needed above 10K MAU |

### 15.2 Lock-In Risk Register

| Component | Lock-In Type | Trigger | Mitigation | Status |
|---|---|---|---|---|
| Ably Realtime | Cost ceiling | 30K DAU | `IRealtimeProvider` — swap to Soketi or Pusher | Interface built |
| Custom JWT | Phone hash coupling | Auth migration | `IAuthProvider` — re-enrollment required on swap | Interface built |
| Cloudflare R2 | S3 key format (standard) | Storage migration | `IStorageProvider` — S3-compatible, trivial to migrate to AWS S3 Mumbai if India jurisdiction lock required | Interface built |
| Gemini Vision | Cost ceiling | 75K DAU | `IAnalysisProvider` — swap to OpenAI Vision | Interface built |
| Expo Push Tokens | Token format | Native push migration | Dual-token storage (Expo + FCM/APNs raw tokens) | Build from Day 1 |
| Meta WhatsApp | Cost ceiling | 1,000 OTPs/month | Enable paid Meta billing | Monitor from Day 1 |
| Azure PostgreSQL | Instance cost | 12 months (student credit expires) | Migrate to DigitalOcean ($200 credit reserve) | Reserve DO credit |
| `city TEXT` matching | Expansion precision | City 2 launch | Add zone/ward reference table before city 2 | Before city 2 |
| In-memory state | Horizontal scale | Multiple Azure instances | Upstash Redis from Day 1 | Done |
| Message partitions | Query degradation | 6 months post-launch | Cold storage archival policy | Define at launch |

### 15.3 Provider Abstraction Interfaces (All Implemented)

```typescript
// packages/realtime/src/IRealtimeProvider.ts
export interface IRealtimeProvider {
  subscribe(channel: string, event: string, handler: Function): Unsubscribe;
  publish(channel: string, event: string, payload: object): Promise<void>;
  removeChannel(channel: string): void;
  removeAllChannels(): void;
}

// packages/auth/src/IAuthProvider.ts
export interface IAuthProvider {
  signInWithOTP(phone: string): Promise<void>;
  verifyOTP(phone: string, token: string): Promise<Session>;
  getSession(): Promise<Session | null>;
  signOut(): Promise<void>;
  onAuthStateChange(cb: (session: Session | null) => void): Unsubscribe;
}

// packages/storage/src/IStorageProvider.ts
// Default implementation: R2StorageProvider (Cloudflare R2, S3-compatible)
// Swap: set STORAGE_PROVIDER=s3 to switch to AWS S3 Mumbai (ap-south-1) for hard India jurisdiction
export interface IStorageProvider {
  upload(bucket: string, path: string, data: Buffer, opts?: object): Promise<{ fileKey: string }>;
  getSignedUrl(fileKey: string, expiresIn?: number): Promise<string>;  // default: 300s (D1)
  delete(fileKey: string): Promise<void>;
}

// packages/analysis/src/IAnalysisProvider.ts
export interface IAnalysisProvider {
  analyzeScrapImage(imageBuffer: Buffer): Promise<AnalysisResult>;
}

// packages/maps/src/IMapProvider.ts
export interface IMapProvider {
  geocode(address: string): Promise<{ city_code: string; locality: string; display_address: string }>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  renderMap(props: MapRenderProps): React.ReactElement;
}
```

---

## Appendix — Reference

### A. Key Dependencies

| Package | Purpose | Notes |
|---|---|---|
| `@Custom JWT/Custom JWT-sdk-node` | Custom JWT verification on backend | Replaces legacy stack Auth |
| `@Custom JWT/Custom JWT-expo` | Custom JWT session management on mobile | Replaces legacy stack JS client auth |
| `ably` | Realtime WebSockets via IRealtimeProvider | Replaces legacy stack Realtime |
| `@aws-sdk/client-s3` | Cloudflare R2 / S3-compatible storage via `IStorageProvider` | S3 SDK used for R2 (same SDK works for AWS S3 Mumbai swap) |
| `@aws-sdk/s3-request-presigner` | Presigned URL generation (D1 — 300s default expiry) | — |
| `expo` SDK 51+ | React Native framework | — |
| `expo-notifications` | Push token registration (dual-token: Expo + native) | — |
| `expo-server-sdk` | Server-side Expo push dispatch | Backend only |
| `@expo-google-fonts/dm-sans` | Typography — all UI text | — |
| `@expo-google-fonts/dm-mono` | Typography — all numeric data | — |
| `express` | Node.js HTTP framework | — |
| `helmet` | HTTP security headers | V34 |
| `cors` | CORS allowlist | X1 |
| `node-cron` | Scheduled jobs | Replaces pg_cron |
| `pdf-lib` | PDF generation | GST invoices only |
| `sharp` | Image re-encoding + EXIF stripping | V18 — before Gemini or Cloudflare R2 upload |
| `sanitize-html` | Free-text sanitisation | I2 |
| `@upstash/ratelimit` | Redis-backed rate limiting | All rate limiters + OTP store |
| `phosphor-react-native` | Icon library | Outline, 1.5px stroke |
| `zustand` | Lightweight state management | No Redux |
| `next@15` | Web app framework | — |
| `@google/generative-ai` | Gemini API client | Via `IAnalysisProvider` |
| `pg` | PostgreSQL client | Azure PostgreSQL connection |
| `jose` | JWT utilities if needed beyond Custom JWT | — |

**Removed from v3.2:**
- `legacy stack SDK` — removed entirely. No legacy stack dependency anywhere.
- `bcryptjs` — replaced by `crypto` built-in HMAC-SHA256 (X3)

### B. Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `JWT_SECRET` | **Backend only** | Custom JWT backend API key — NEVER in client bundle |
| `NEXT_PUBLIC_Custom JWT_PUBLISHABLE_KEY` | Client apps | Custom JWT publishable key — safe for client use |
| `DATABASE_URL` | Backend only | Azure PostgreSQL connection string (SSL required) |
| `ABLY_API_KEY` | **Backend only** | Ably server API key — NEVER in client bundle |
| ~~`NEXT_PUBLIC_ABLY_KEY`~~ | ~~Client apps~~ | **DEPRECATED for mobile** — mobile uses Ably Token Auth via `GET /api/realtime/token`. Removed from mobile `.env`. Not needed for current admin web scope. |
| `R2_ACCOUNT_ID` | Backend only | Cloudflare account ID (used in endpoint URL) |
| `R2_ACCESS_KEY_ID` | Backend only | R2 API token access key |
| `R2_SECRET_ACCESS_KEY` | Backend only | R2 API token secret key |
| `R2_BUCKET_NAME` | Backend only | R2 bucket name (e.g. `sortt-storage`) |
| `STORAGE_PROVIDER` | Backend only | `"r2"` (default) — set to `"s3"` to swap to AWS S3 Mumbai |
| `OTP_HMAC_SECRET` | Backend only | HMAC-SHA256 key for OTP hashing (X3) |
| `CHANNEL_HMAC_SECRET` | Backend only | HMAC key for Ably channel name suffix (V32) |
| `META_WHATSAPP_TOKEN` | Backend only | Permanent System User access token from Meta Business Manager |
| `META_PHONE_NUMBER_ID` | Backend only | WhatsApp Business phone number ID |
| `META_WABA_ID` | Backend only | WhatsApp Business Account ID |
| `META_OTP_TEMPLATE_NAME` | Backend only | Approved authentication template name |
| `META_API_VERSION` | Backend only | Pinned Meta Graph API version (e.g. `v19.0`) |
| `UPSTASH_REDIS_REST_URL` | Backend only | Upstash Redis REST URL |
| `UPSTASH_REDIS_REST_TOKEN` | Backend only | Upstash Redis REST token |
| `GEMINI_API_KEY` | Backend only | Google Gemini API key |
| `OLA_MAPS_API_KEY` | Backend + Mobile | Via `IMapProvider` |
| `MAP_PROVIDER` | Backend + Mobile | `"ola"` |
| `EXPO_ACCESS_TOKEN` | Backend only | Expo server SDK token for push dispatch |
| `REALTIME_PROVIDER` | All | `"ably"` (default) — switches `IRealtimeProvider` |
| `SENTRY_DSN` | Backend + Web | Azure Sentry connection string for Express + Next.js telemetry |
| `SENTRY_DSN` | Mobile only | Sentry DSN for React Native crash tracking and symbolication |
| `PRODUCT_ANALYTICS_API_KEY` | Mobile + Web | product analytics API key |
| `PRODUCT_ANALYTICS_HOST` | Mobile + Web | product analytics API host. Default: `(disabled)` |
| `NEXT_PUBLIC_BEHAVIOR_ANALYTICS_PROJECT_ID` | Web only | Disabled project ID for admin behavioural analytics |
| `ADMIN_IP_ALLOWLIST` | Vercel (web) only | Comma-separated IP allowlist for `/admin/*` routes. Read by Vercel Edge Middleware. |
| `PHONE_HASH_SECRET` | Backend only | HMAC secret used to hash phone numbers before storing as `phone_hash`. Distinct from `OTP_HMAC_SECRET`. |

**Removed from v3.2:**
- `legacy stack_URL` — removed
- `legacy stack_ANON_KEY` — removed
- `legacy stack_SERVICE_KEY` — removed (this key must never reappear anywhere)
- `legacy stack_WEBHOOK_SECRET` — removed
- `legacy stack_HOOK_SECRET` — removed

---

## 13. Security & Privacy Patches

### SP1 — Bidirectional Seller & Aggregator Phone Exposure (2026-03-17, BLOCK Revision)

**Summary:** Expose both seller and aggregator phone numbers to order parties only after the order reaches `accepted` status or beyond. Fetch from Custom JWT at acceptance time, cache in `users.display_phone`, and expose bidirectionally via DTO.

**Decisions implemented:**

| Rule | Detail |
|---|---|
| SP1-1 | Raw phone numbers **never** stored on `orders`. One copy per user: `users.display_phone` (VARCHAR 20, nullable). Both seller and aggregator have their own row. |
| SP1-2 | **WARN 1 (synchronous):** Both `display_phone` values are populated **at acceptance time BEFORE COMMIT** via synchronous Custom JWT API calls in the accept route transaction. Non-fatal — if Custom JWT returns no phone for either party, that party's `display_phone` remains NULL. |
| SP1-3 | **canSeePhone guard:** `buildOrderDto` exposes both `seller_phone` and `aggregator_phone` only when `status ∉ {created, cancelled}` AND `requestingUserId ∈ {seller_id, aggregator_id}`. All other requests receive both fields as `null`. |
| SP1-4 | **Asymmetric visibility:** Aggregator sees `seller_phone` (their counterparty's phone). Seller sees `aggregator_phone` (their counterparty's phone). Neither sees their own phone exposed in the DTO. |
| SP1-5 | Database fields `seller_display_phone` and `aggregator_display_phone` are always stripped from the DTO `return` object — clients never receive raw column names. |
| SP1-6 | `phone_hash` and `legacy external auth user id` continue to be stripped (V24 unchanged). |
| SP1-7 | **BLOCK revision - UI bidirectional:** `PhoneCall` icon + `Linking.openURL('tel:...')` rendered in both order detail screens post-acceptance: aggregator's seller card shows `seller_phone`, seller's aggregator card shows `aggregator_phone`. Icon completely absent (not disabled) if phone is `null`. |
| SP1-8 | DPDP compliance: two phone copies in `users.display_phone` (one per user) — erasure request requires two UPDATEs: `UPDATE users SET display_phone = NULL WHERE id = seller_id; UPDATE users SET display_phone = NULL WHERE id = aggregator_id`. |

**Files changed:** `migrations/0019_users_display_phone.sql` · `backend/src/routes/orders/index.ts` · `backend/src/utils/orderDto.ts` · `apps/mobile/store/orderStore.ts` · `apps/mobile/components/order/ContactCard.tsx` · `apps/mobile/app/(seller)/order/[id].tsx` · `apps/mobile/app/(aggregator)/order/[id].tsx`

---

*— End of [APP_NAME] TRD v4.0 —*
*Supersedes TRD v3.2. Reason for major version bump: complete removal of legacy stack dependency due to India ISP block (Feb 2026). Stack: Azure PostgreSQL + Custom JWT + Ably + Cloudflare R2 + Express on Azure App Service.*


## Recent Updates (Auth Identity Migration & System Reset)
- Resolved critical user ID misformation during user registrations.
- Refactored profile setup (both sellers and aggregators) to securely transition provisional 	mp_ IDs to structured deterministic IDs.
- Admin functionality cleaned: Super Admin script successfully truncates legacy inconsistencies and reliably sets up fresh deterministic accounts.
- Admin metrics accurately track deterministic IDs correctly without constraint errors.
- UI elements stripped of unwanted scrollbars and mapped to correct tiles sets natively.





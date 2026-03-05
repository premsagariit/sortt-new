# [APP_NAME] — 10-DAY MVP BUILD PLAN
> ⚠️ **APP NAME PLACEHOLDER NOTICE:** "Sortt" is a placeholder. See MEMORY.md §1 for rebrand instructions.

**Reference:** PRD + TRD v4.0 | **Pilot City:** Hyderabad, India
**Build order:** UI shells first → Backend wiring → Database integration → Testing & launch

> **v2.0 CHANGE NOTICE (from v1.0)**
> Stack has changed. Supabase removed entirely (ISP block, Feb 2026). New stack:
> - **Database:** Azure PostgreSQL Flexible Server B1ms (Central India — free on Azure for Students)
> - **Auth:** Clerk (session management) + Meta WhatsApp OTP (delivery, called directly from Express)
> - **Realtime:** Ably (via `IRealtimeProvider` — India edge nodes)
> - **Storage:** Uploadthing (via `IStorageProvider`)
> - **Backend:** Express on Azure App Service (Central India — free tier)
> - **Scheduler:** node-cron on Express (replaces pg_cron)
> - **Atomic ops:** Express PostgreSQL transactions (replaces Supabase Edge Functions)
> All UI work (Days 1–3) is UNCHANGED — screens are stack-agnostic. Backend, DB, and integration days (4–10) are updated throughout.

> **How to use this plan:**
> - Work through tasks in strict top-to-bottom order. Do not jump ahead.
> - Every day ends with a **Verification Gate** — a numbered checklist. Every item must be ✅ before Day N+1 begins.
> - Mark tasks `[x]` as you complete them. Mark the gate `[GATE PASSED]` before proceeding.
> - Agents: after completing any task, state what the next task is before starting it.
> - If a gate item fails, fix it before moving forward — no accumulating tech debt.
> - **Standard Start Commands:** ALWAYS use `pnpm dev:mobile`, `pnpm dev:web`, and `pnpm dev:backend` from the root directory to start servers. Do not `cd` into subdirectories.

---

## 🗓 BUILD SEQUENCE OVERVIEW

| Day | Focus | Deliverable |
|---|---|---|
| **1** | Foundation + Design System | Monorepo, tokens, fonts, UI component library |
| **2** | Auth UI + Seller UI (static) | All seller screens with mock data |
| **3** | Aggregator UI (static) + Web Portal Shell | All aggregator screens + Next.js scaffold |
| **4** | Database Schema + RLS | All tables, indexes, RLS policies, triggers on Azure PostgreSQL |
| **5** | Backend Foundation + Auth Integration | Express on Azure, Clerk JWT, WhatsApp OTP direct |
| **6** | Core API Routes + DB Integration | Orders, profiles, status machine wired up |
| **7** | Atomic Ops + Realtime + Push | accept-order Express route, verify-OTP route, Ably live chat, push |
| **8** | AI + Invoice + Provider Abstractions | Gemini, PDF, all provider packages |
| **9** | Web Portal + Admin Dashboard | Business Mode, Admin KYC/disputes |
| **10** | Testing + Security Audit + CI/CD | All checklists green, EAS build ready |

---

## ✅ DAY 1 — Foundation & Design System
### [GATE PASSED — 2026-02-26]

> **Goal:** Every future screen can import from these files. Nothing is built on hardcoded values.
> **Rule:** No screen or component is started until tokens.ts and app.ts exist and are verified.

### 1.1 Monorepo Initialisation
- [x] Initialise pnpm monorepo at root with `pnpm init` + `pnpm-workspace.yaml`.
- [x] Create directory structure:
  ```
  [app-slug]-app/
  ├── apps/mobile/       ← Expo React Native
  ├── apps/web/          ← Next.js 15
  ├── backend/           ← Express on Azure App Service
  ├── packages/          ← Provider abstractions (maps, realtime, auth, storage, analysis)
  ├── migrations/        ← Plain SQL migration files (replaces supabase/migrations/)
  └── scraper/           ← Python price scraper
  ```
  > ⚠️ Note: No `supabase/` directory. Edge Functions removed. Atomic ops live in `backend/src/routes/orders/`.
- [x] Initialise Expo project inside `apps/mobile/` with Expo SDK 54+, Expo Router.
- [x] Initialise Next.js 15 (App Router) project inside `apps/web/`.
- [x] Initialise Express project inside `backend/` with TypeScript.
- [x] Configure `pnpm-workspace.yaml` to include all `apps/*`, `packages/*`, `backend`.
- [x] Set up `.gitignore`, `.env.example` files at root and in each app.
- [x] Add all environment variables from TRD v4.0 Appendix B to `.env.example` — no values, just keys.

### 1.2 Design Tokens (FIRST FILE — nothing else before this)
- [x] Create `apps/mobile/constants/tokens.ts` with ALL tokens from MEMORY.md §2.
- [x] Create `apps/mobile/constants/app.ts` with `APP_NAME`, `APP_DOMAIN`, `APP_SLUG`.
- [x] Mirror both files to `apps/web/constants/`.
- [x] Configure Tailwind in `apps/web/tailwind.config.ts` to use the same colour values from tokens.

### 1.3 Typography Setup
- [x] Install `@expo-google-fonts/dm-sans` and `@expo-google-fonts/dm-mono` in `apps/mobile`.
- [x] Create `apps/mobile/components/ui/Typography.tsx`.

### 1.4 UI Component Library (all static, no logic)
- [x] `components/ui/Button.tsx` — PrimaryButton, SecondaryButton, IconButton.
- [x] `components/ui/Card.tsx` — BaseCard, OrderCard, MarketRateCard.
- [x] `components/ui/StatusChip.tsx` — all 8 order statuses.
- [x] `components/ui/MaterialChip.tsx` — all 6 materials.
- [x] `components/ui/Avatar.tsx` — initial-based, navy/teal variants.
- [x] `components/ui/SkeletonLoader.tsx` — flat grey rectangles.
- [x] `components/ui/EmptyState.tsx` — icon + heading + CTA.
- [x] `components/ui/NavBar.tsx` — navy header.
- [x] `components/ui/TabBar.tsx` — seller (4 tabs) + aggregator (5 tabs).

### 🚦 DAY 1 VERIFICATION GATE — [GATE PASSED 2026-02-26]
- [x] **G1.1** — `tokens.ts` has zero raw hex values in any other file.
- [x] **G1.2** — `app.ts` exports `APP_NAME`, `APP_DOMAIN`, `APP_SLUG`, `APP_CONFIG`.
- [x] **G1.3** — All 8 UI components render without errors.
- [x] **G1.4** — `PrimaryButton` is `colors.red`. `SecondaryButton` is white + border.
- [x] **G1.5** — DM Sans and DM Mono fonts load and render correctly.
- [x] **G1.6** — `StatusChip` renders correctly for all 8 order statuses.
- [x] **G1.7** — No TypeScript errors (`pnpm type-check`).
- [x] **G1.8** — pnpm monorepo installs cleanly.

---

## ✅ DAY 2 — Auth UI + All Seller Screens (Static / Mock Data)
### [GATE PASSED — 2026-02-28] [ALL SELLER SCREENS COMPLETE — 2026-03-01]

> **Goal:** Every seller screen is pixel-complete with mock data. No backend calls yet — use hardcoded fixtures.
> **Rule:** UXD design rules enforced on every screen. 3-tap rule, 48dp targets, all states present.

> ⚠️ **UI REFERENCE — 2026-02-27**
> `sortt_seller_ui.html` in project root is the canonical screen design reference for Sellers.
> Seller tabs: Home · Orders · Browse · Profile (4 tabs).
> Aggregator tabs: Home · Orders · Route · Earnings · Profile (5 tabs).

### 2.1 Navigation Shell
- [x] [2026-03-01] Navigation registration verified — `_layout.tsx` setup correct.
- [x] Expo Router file structure (seller side complete):
  ```
  app/
  ├── (auth)/
  │   ├── onboarding.tsx     ← Intro carousel
  │   ├── phone.tsx          ← Phone entry
  │   ├── otp.tsx            ← OTP verify (Branches based on userType)
  │   ├── user-type.tsx      ← Role selection
  │   ├── aggregator/
  │   │   ├── _layout.tsx    ← Stack
  │   │   ├── profile-setup.tsx
  │   │   ├── area-setup.tsx
  │   │   └── material-setup.tsx
  │   └── seller/
  │       ├── _layout.tsx    ← Stack
  │       ├── account-type.tsx
  │       ├── business-setup.tsx
  │       └── seller-setup.tsx
  ├── (seller)/
  │   ├── _layout.tsx        ← Tab layout
  │   ├── home.tsx
  │   ├── orders.tsx
  │   ├── browse.tsx
  │   └── profile.tsx
  ├── (aggregator)/
  │   ├── _layout.tsx        ← Tab layout
  │   └── ...
  └── (shared)/
      ├── order/[id].tsx     ← [built]
      ├── chat/[id].tsx      ← [built]
      └── receipt/[id].tsx   ← [built]
  ```
- [x] Zustand store scaffolds (empty, typed): `authStore.ts`, `orderStore.ts`, `aggregatorStore.ts`, `chatStore.ts`, `uiStore.ts`.
- [x] Splash screen animation `SplashAnimation.tsx` — 4-phase animated sequence. Source: `sortt_logo_splash_v2.html`. APP_NAME from `constants/app.ts`, colours from `constants/tokens.ts`, `react-native-svg` + `Animated` API, `useNativeDriver: true`. 4.8s total.
- [x] `apps/mobile/app/index.tsx` — shows SplashAnimation, then routes to auth or home after 4.8s. (Updated to universal onboarding flow).
- [x] **Universal Onboarding** (`(auth)/onboarding.tsx`) — 4-slide carousel, Phosphor icons, dot animations, BackHandler block (return true).

### 2.2 Auth Screens — [COMPLETE]
- [x] **Phone Entry Screen** (`(auth)/phone.tsx`) — Indian phone input, WhatsApp OTP CTA, error/loading states.
- [x] **OTP Verify Screen** (`(auth)/otp.tsx`) — 6-box OTP input, countdown, resend, error/success states.

### 2.3 Seller Onboarding Screens — [COMPLETE]
- [x] **Account Type Selection** — Individual / Business cards.
- [x] **Seller Profile Setup (Individual)** — Name, locality, city.
- [x] **Business Mode Setup** — Business name, GSTIN, sub-user invite, recurring schedule.

### 2.4 Seller Home Screen — [COMPLETE]
- [x] **Home screen** — market rates, active orders, listing CTA, empty state, skeleton.

### 2.5 Scrap Listing Wizard (Seller) — [COMPLETE]
- [x] **Step 1 — Materials** — MaterialChip grid, multi-select.
- [x] **Step 2 — Weights & Photo** — weight entry, camera, AI hint, manual fallback.
- [x] **Step 3 — Pickup Preference** — schedule vs drop-off, address, notes.
- [x] **Step 4 — Review & Submit** — Earnings Calculator (DM Mono), submit CTA.

### 2.6 Seller Order Management Screens — [COMPLETE]
- [x] **Orders List Screen** — Active/Completed/Cancelled tabs, skeleton, empty states.
- [x] **Order Detail Screen** — status timeline, aggregator card, address reveal, cancel flow.
- [x] **OTP Confirmation Screen** — full transaction summary BEFORE OTP input, 6-box OTP, error states.
- [x] **Transaction Receipt Screen** — completion confirmation, invoice download (Business only), rating prompt.

### 2.7 Seller Price & Profile Screens — [COMPLETE]
- [x] **Prices/Browse Screen** — market rates list, DM Mono values, disclaimer.
- [x] **Profile Screen** — avatar, name, sections, Business Mode extras.

### 🚦 DAY 2 VERIFICATION GATE — [GATE PASSED 2026-02-28]
- [x] **G2.1** — Every seller screen renders without crash on iOS simulator AND Android emulator.
- [x] **G2.2** — Navigation flows work: Auth → Onboarding → Home → Listing Wizard (4 steps) → Order Detail → Receipt.
- [x] **G2.3** — Listing wizard "Next" disabled until required fields filled.
- [x] **G2.4** — OTP screen shows full transaction summary BEFORE the OTP input box.
- [x] **G2.5** — Pre-acceptance order detail shows locality only — full address NOT in rendered output.
- [x] **G2.6** — All amounts and numeric values render in DM Mono.
- [x] **G2.7** — Exactly ONE `PrimaryButton` (red) per screen.
- [x] **G2.8** — No hardcoded hex colours (documented exceptions noted).
- [x] **G2.9** — All touch targets meet 48dp minimum.
- [x] **G2.10** — TypeScript: zero `any` types, zero errors. `pnpm type-check` exits 0.

---

## ✅ DAY 3 — Aggregator UI + Web Portal Shell (Static)

> **Goal:** All aggregator screens complete. Next.js web portal scaffolded with all pages static.

### 3.1 Aggregator Onboarding — [COMPLETE]
- [x] Aggregator Registration Screens (3-Screen Wizard: Profile, Area, Materials)

### 3.2 Aggregator Order Feed
- [x] **Nearby Orders Feed** (`(aggregator)/home.tsx`):
  - NavBar: "Nearby Orders" + online/offline toggle pill.
  - Order list: `OrderCard` showing material chip, locality (NOT full address — V25), estimated weight, estimated ₹, time posted.
  - Empty state, skeleton loader.
- [x] **Order Detail — Pre-Acceptance** (aggregator view of `(shared)/order/[id].tsx`):
  - Material breakdown, locality only (NOT full address — V25), quantised map pin.
  - `PrimaryButton` "Accept Order".
  - 409 state: "Order already taken — accepted moments ago." + "Back to Feed".
- [x] **Order Detail — Post-Acceptance**:
  - Full address revealed. Seller name + phone last 4.
  - "Get Directions", "Chat with Seller" actions.
  - Status update buttons: "Mark En Route" → "Mark Arrived" → "Start Weighing".

### 3.3 Aggregator Order Execution Flow
- [x] **Weighing Screen**:
  - Scale photo capture (mandatory). Per-material confirmed weight entry (DM Mono). Running total (DM Mono, `colors.amber`).
  - `PrimaryButton` "Send for Seller Confirmation". Disabled until all weights > 0 AND scale photo captured.
- [x] **Waiting for OTP Screen**:
  - "Waiting for seller to confirm..." animated pulse. Transaction summary (read-only). Timeout/resend state.

### 3.4 Aggregator Map & Earnings
- [x] **Route Screen** (`(aggregator)/route.tsx`):
  - Static map placeholder. Order pins list. `PrimaryButton` "Plan Route" (disabled in static).
- [x] **Earnings Screen** (`(aggregator)/earnings.tsx`):
  - Today / This Week / This Month tabs. Total earnings (DM Mono, `colors.amber`). Completed orders list. Avg rating.
- [x] **Price Setting Dashboard**:
  - Per-material rate editor. Market reference hint. `PrimaryButton` "Save Rates".

### 3.5 Aggregator Profile
- [x] **Aggregator Profile Screen** (`(aggregator)/profile.tsx`):
  - Avatar (teal), business name, rating stars. KYC status chip. Operating Hours, Materials, Area, Log Out.

### 3.6 In-App Chat Screen (Shared)
- [x] **Chat Screen** (`(shared)/chat/[id].tsx`):
  - Message bubbles (navy right, surface left). Timestamps DM Mono.
  - `[phone number removed]` renders as greyed italic (V26 server-filtered display).
  - Text input + send button. Empty state, skeleton.

### 3.6.1 Functional Photo Capture (Camera — Local State Only) — [COMPLETE]
- [x] `expo-image-picker` installed (`~16.0.6`). `app.json`: iOS `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, Android `CAMERA`+`READ_MEDIA_IMAGES`. Plugin registered.
- [x] `hooks/usePhotoCapture.ts` created — single source of truth for all camera logic. No screen imports ImagePicker directly. Day 8 extension point documented inline.
- [x] `(seller)/listing/step2.tsx` — real camera wired. Thumbnail preview. Permission denied inline amber banner. CTA disabled state reads `listingStore.photoUri` (STORE, not local state).
- [x] `(aggregator)/execution/weighing/[id].tsx` — real camera wired. Thumbnail preview. Permission banner. CTA disabled until `scalePhotoUri !== null` AND all weights > 0. Reads from `aggregatorStore.scalePhotoUri`.
- [x] `(auth)/aggregator/kyc.tsx` — new screen. Two independent `usePhotoCapture` instances. Each card independent. Submit disabled until both `kycAadhaarUri` + `kycShopPhotoUri` non-null.
- [x] `aggregatorStore.ts` — added `scalePhotoUri`, `kycAadhaarUri`, `kycShopPhotoUri` + 3 setters.

### 3.7 Next.js Web Portal Shell (Static)
- [ ] Scaffold Next.js 15 App Router in `apps/web/`:
  - `app/layout.tsx` — root layout, DM Sans font.
  - `app/(auth)/` — login page (phone OTP flow, web adaptation).
  - `app/(business)/` — Business Mode seller dashboard shell.
  - `app/(admin)/` — Admin dashboard shell (IP-gated — Day 9).
- [ ] Install Tailwind CSS + Radix UI. Configure with tokens.
- [ ] Security headers in `next.config.js` `headers()` (V34 — X-Frame-Options, HSTS, CSP, nosniff).
- [ ] **Business Dashboard Shell**: Sidebar (Listings, Orders, Invoices, Team, Settings). Empty state cards.
- [ ] **Admin Dashboard Shell**: Sidebar (KYC Queue, Disputes, Price Override, Audit Log). Static table rows.

### 🚦 DAY 3 VERIFICATION GATE
- [ ] **G3.1** — All aggregator screens render without crash on iOS + Android.
- [ ] **G3.2** — Order feed: locality only visible — no full address string in component tree.
- [ ] **G3.3** — 409 "Order already taken" state renders correctly with back navigation.
- [ ] **G3.4** — Weighing screen: "Send for Confirmation" disabled until weights > 0 AND scale photo captured.
- [ ] **G3.5** — Chat screen: phone pattern `9876543210` in mock data renders as `[phone number removed]`.
- [ ] **G3.6** — Next.js web portal boots on `localhost:3000` without errors.
- [ ] **G3.7** — `next.config.js` security headers present (`curl -I localhost:3000` → X-Frame-Options, X-Content-Type-Options).
- [ ] **G3.8** — Zero hardcoded hex values in `apps/web/`.
- [ ] **G3.9** — Zero TypeScript errors across mobile + web.

---

## ✅ DAY 4 — Database Schema, RLS & Azure PostgreSQL Configuration

> **Goal:** Complete database is live on Azure PostgreSQL. All RLS policies tested. No migration debt.
> **Rule:** Every migration is numbered, idempotent, and has a rollback strategy documented.
> **Stack:** Azure PostgreSQL Flexible Server B1ms (Central India). Extensions: `pgcrypto`, `uuid-ossp`. NO PostGIS (city_code matching used instead). NO pg_cron (node-cron on Express used instead).

### 4.1 Azure PostgreSQL Setup
- [ ] Create Azure Database for PostgreSQL Flexible Server in Azure Portal:
  - Tier: **Burstable B1ms** (free under Azure for Students — 750 hrs/month for 12 months).
  - Region: **Central India (Pune)**.
  - PostgreSQL version: 16.
  - Storage: 32 GB (stays within free tier).
  - Enable SSL — require SSL for all connections.
  - Firewall: add Azure App Service outbound IP only. No public 0.0.0.0 access.
- [ ] Enable extensions in Azure Portal → Server Parameters → `azure.extensions`:
  - `pgcrypto` — phone number hashing.
  - `uuid-ossp` — UUID primary keys.
  - **Do NOT enable PostGIS** — city_code matching replaces geospatial queries.
- [ ] Create `current_app_user_id()` helper function — reads `app.current_user_id` session variable set by Express:
  ```sql
  CREATE OR REPLACE FUNCTION current_app_user_id()
  RETURNS uuid AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
  $$ LANGUAGE sql STABLE SECURITY DEFINER;
  ```
- [ ] Test connection from local machine via `psql` with SSL required.

### 4.2 Migration Files (run in order via `psql` or migration tool)
- [ ] **`migrations/0001_reference_tables.sql`** — `cities` table + seed HYD + `material_types` table + seed all 6 materials.
- [ ] **`migrations/0002_users.sql`** — `users` table (`clerk_user_id` column included) + `users_public` VIEW (excludes `phone_hash` AND `clerk_user_id` — V24, V-CLERK-1).
- [ ] **`migrations/0003_profiles.sql`** — `seller_profiles` + `aggregator_profiles` (city_code, NOT GEOGRAPHY column).
- [ ] **`migrations/0004_orders.sql`** — `orders` (city_code + pickup_locality, NOT pickup_location GEOGRAPHY) + `order_items` + `order_status_history` + `order_media`.
- [ ] **`migrations/0005_transactions.sql`** — `ratings` + `invoices` (with `invoice_data JSONB NOT NULL DEFAULT '{}'`) + `disputes` + `dispute_evidence`.
- [ ] **`migrations/0006_messaging.sql`** — `messages` (partitioned by month) + `aggregator_availability` + `device_tokens` + `otp_log`.
- [ ] **`migrations/0007_security.sql`** — `seller_flags` + `admin_audit_log` + `business_members`.
- [ ] **`migrations/0008_prices.sql`** — `price_index` table.
- [ ] **`migrations/0009_rls.sql`** — all RLS policies (uses `current_app_user_id()`, NOT `auth.uid()`).
- [ ] **`migrations/0010_indexes.sql`** — all indexes.
- [ ] **`migrations/0011_triggers.sql`** — kyc_status guard trigger, status history trigger shell.
- [ ] **`migrations/0012_materialized_views.sql`** — `aggregator_rating_stats` + `current_price_index`.

### 4.3 Partitioned Messages Table
- [ ] Create `messages` parent table with range partitioning on `created_at`.
- [ ] Pre-create partitions: `messages_2026_03`, `messages_2026_04`, `messages_2026_05` (next 2 months).
- [ ] Compound index on each partition: `(order_id, created_at ASC)`.
- [ ] `create_next_month_message_partition()` PL/pgSQL function.
  > Note: Called at Express startup AND by node-cron on 25th of each month. NOT pg_cron.

### 4.4 Indexes
- [ ] `idx_orders_city_status` on `orders(city_code, status) WHERE status='created' AND deleted_at IS NULL` — replaces PostGIS GIST index.
- [ ] `idx_orders_seller_id` on `orders(seller_id, created_at DESC)`.
- [ ] `idx_orders_aggregator_id` on `orders(aggregator_id) WHERE aggregator_id IS NOT NULL`.
- [ ] `idx_device_tokens_user_id` on `device_tokens(user_id) WHERE is_active=true`.
- [ ] `idx_agg_availability_online` on `aggregator_availability(user_id) WHERE is_online=true`.
- [ ] `idx_agg_rates_aggregator` + `idx_agg_rates_material` on `aggregator_material_rates`.
- [ ] `idx_status_history_order_id` on `order_status_history(order_id, created_at ASC)`.

### 4.5 Triggers & Stored Procedures
- [ ] `kyc_status_guard()` trigger on `aggregator_profiles` — blocks `kyc_status` UPDATE when `app.is_admin_context` is not `'true'` (V35). Admin routes set this before executing.
- [ ] No `accept_order()` stored procedure — this logic lives in the Express route (§7.1). PostgreSQL `FOR UPDATE SKIP LOCKED` is called from the Express transaction, not from a DB-side function.
- [ ] No `verify_pickup_otp()` stored procedure — this logic lives in the Express route (§7.2).

### 4.6 Materialized Views
- [ ] `aggregator_rating_stats` view: `aggregator_id, avg_rating, total_orders, last_updated`.
- [ ] `current_price_index` view: `DISTINCT ON (city_code, material_code)` latest rate.
  > Refreshed by node-cron on Express, not pg_cron.

### 4.7 Row Level Security (ALL tables — no exceptions)
- [ ] Enable RLS on every table — verify: count of tables = count of RLS-enabled tables.
- [ ] `seller_own_orders_read` — SELECT: `USING (current_app_user_id() = seller_id)`.
- [ ] `seller_own_orders_write` — INSERT: `WITH CHECK (current_app_user_id() = seller_id)` (R2).
- [ ] `seller_own_orders_modify` — UPDATE: `USING (current_app_user_id() = seller_id)`.
- [ ] `aggregator_city_orders` — SELECT only: `status='created'`, `deleted_at IS NULL`, `city_code` matches aggregator's city, `is_online=true`, material rate exists. **No PostGIS. No ST_DWithin.**
- [ ] `aggregator_accepted_order` — SELECT: `aggregator_id = current_app_user_id()`.
- [ ] `message_parties` — ALL: `current_app_user_id() IN (seller_id UNION aggregator_id for that order)`.
- [ ] `device_tokens` — self-only read/write.
- [ ] `business_members` — admin: full access; operator: INSERT orders only; viewer: SELECT only.
- [ ] `ratings` — insert: order parties only; read: both parties.
- [ ] `order_media` — read: order parties + admin; insert: uploader only.
- [ ] `admin_audit_log` — read: admin only; no client INSERT (backend-only).
- [ ] `users_public` VIEW — readable by authenticated users. `clerk_user_id` and `phone_hash` absent.

### 🚦 DAY 4 VERIFICATION GATE
- [ ] **G4.1** — All 12 migration files run clean on Azure PostgreSQL (`psql` — zero errors).
- [ ] **G4.2** — RLS enabled on EVERY table (SQL check: count match).
- [ ] **G4.3** — `seller_own_orders` INSERT policy: Express sets `app.current_user_id = user_A`, attempts INSERT with `seller_id = user_B` → RLS rejection.
- [ ] **G4.4** — `aggregator_city_orders` SELECT: aggregator in city HYD sees only `status='created'` HYD orders. Aggregator with `is_online=false` sees zero orders.
- [ ] **G4.5** — `kyc_status` trigger: UPDATE without `app.is_admin_context = 'true'` → rejected. With it → succeeds.
- [ ] **G4.6** — `FOR UPDATE SKIP LOCKED` test: two concurrent psql sessions, both attempt to lock same order row → exactly one succeeds, one gets zero rows back.
- [ ] **G4.7** — `users_public` VIEW: `SELECT clerk_user_id FROM users_public` → column not found. `SELECT phone_hash FROM users_public` → column not found.
- [ ] **G4.8** — Messages partitioning: INSERT with `created_at = NOW()` routes to correct month partition.
- [ ] **G4.9** — Materialized views refresh without error.
- [ ] **G4.10** — SSL connection enforced: `psql` without `sslmode=require` → connection rejected.

---

## ✅ DAY 5 — Backend Foundation + Auth Integration (Live)

> **Goal:** Express backend is live on Azure App Service. Auth is end-to-end: phone → WhatsApp OTP → Clerk JWT issued. Mobile app auth screens connected to real backend.
> **Rule:** No route ships without Clerk JWT middleware. BSE reviews every route handler.

### 5.1 Express Scaffold + Azure App Service Deploy
- [ ] TypeScript Express server in `backend/src/index.ts`.
- [ ] `helmet()` applied globally as first middleware (V34).
- [ ] CORS middleware: reads `ALLOWED_ORIGINS` from env var, splits by comma. No wildcard (X1).
- [ ] `express.json()` body parser with `strict: true`, `limit: '10kb'`.
- [ ] Global error handler: scrubs `process.env` before Sentry `captureException` (D3). Never returns stack traces in production.
- [ ] `GET /health` — `{ status: 'ok', timestamp: <ISO> }`. No auth. UptimeRobot target.
- [ ] Deploy to **Azure App Service** (Central India — free tier hours under Azure for Students):
  - Runtime: Node.js 20.
  - Connect to GitHub repo for auto-deploy on `main` branch.
  - Add all environment variables from TRD v4.0 Appendix B in Azure App Service → Configuration.

### 5.2 Security Middleware
- [ ] `middleware/auth.ts` — Clerk JWT middleware:
  - Use `@clerk/clerk-sdk-node` `ClerkExpressRequireAuth()` to validate JWT.
  - After Clerk validation: query `users` table with `clerk_user_id` — attach internal user row to `req.user` (includes `user_type`, `is_active`).
  - Return 401 if JWT missing/invalid. Return 401 if internal user not found or `is_active=false`.
  - Applied to ALL routes except: `/health`, `POST /api/auth/request-otp`, `POST /api/auth/verify-otp`, `GET /api/rates`.
- [ ] `middleware/verifyRole.ts` — `verifyUserRole(userId, requiredRole)`: re-fetches from DB. 60-second Upstash Redis cache per user. Never reads `user_type` from JWT claim (V7, V-CLERK-2).
- [ ] `middleware/sanitize.ts` — applies `sanitize-html` with zero allowed tags to all `req.body` string fields (I2).
  > Note: No `webhookHmac.ts` or `hookHmac.ts` — no Supabase webhooks or hooks in this stack.

### 5.3 Upstash Redis Setup
- [ ] Initialise `@upstash/ratelimit` + `@upstash/redis` clients with env vars.
- [ ] `utils/rateLimit.ts`: export pre-configured rate limiter instances:
  - `otpRequestRateLimiter`: 3 requests / phone-hash / 10 min.
  - `otpVerifyRateLimiter`: 3 attempts / phone-hash / 10 min.
  - `analyzeRateLimiter`: 10 requests / user / hour.
  - `orderCreateRateLimiter`: 3 requests / seller / hour.
  - `globalGeminiCounter`: sliding window 1,200 / day (circuit breaker, RA1).
  - Meta conversation counter: increment-and-read, alert Sentry at 900/month (RA2).

### 5.4 WhatsApp OTP Routes (Direct — No Supabase Hook)
- [ ] `POST /api/auth/request-otp` (no JWT required):
  1. `otpRequestRateLimiter` applied first.
  2. Validate Indian phone number format (E.164: `+91XXXXXXXXXX`).
  3. Generate 6-digit OTP via `crypto.randomInt(100000, 999999)`.
  4. Store `HMAC-SHA256(otp, OTP_HMAC_SECRET)` in Upstash Redis. Key: `otp:phone:{HMAC(phone)}`. TTL: 600 seconds. (X3 — never store raw OTP).
  5. Call Meta WhatsApp Cloud API (`authentication` template message).
  6. Increment Meta conversation counter in Redis.
  7. Return HTTP 200 `{ success: true }`.
- [ ] `POST /api/auth/verify-otp` (no JWT required):
  1. `otpVerifyRateLimiter` applied first (max 3 attempts).
  2. Retrieve stored HMAC from Redis. If not found → 400 "OTP expired".
  3. `timingSafeEqual(storedHmac, HMAC-SHA256(submittedOtp, OTP_HMAC_SECRET))`.
  4. On success: DELETE Redis key (one-time use).
  5. Upsert user record in `users` table (create on first login, update `last_seen` thereafter).
  6. Create Clerk session via Clerk Backend API → return Clerk JWT.
  7. Return HTTP 200 `{ token: <clerk_jwt>, user: <user_public_dto> }`.

### 5.5 node-cron Scheduler
- [ ] `backend/src/scheduler.ts` — start on Express boot:
  - Aggregator culling: every 5 min → `UPDATE aggregator_availability SET is_online=false WHERE last_ping_at < NOW() - INTERVAL '5 minutes'` (C2).
  - Rating stats refresh: every 15 min → `REFRESH MATERIALIZED VIEW CONCURRENTLY aggregator_rating_stats`.
  - Price cache refresh: daily 00:30 UTC → `REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index`.
  - OTP log cleanup: nightly 02:00 UTC → `DELETE FROM otp_log WHERE expires_at < NOW() - INTERVAL '7 days'`.
  - Message partition: 25th of month 01:00 UTC → `createNextMonthMessagePartition()`.
- [ ] `createNextMonthMessagePartition()` function also called at Express startup — ensures partition always exists.

### 5.6 Connect Mobile Auth to Live Backend
- [ ] `apps/mobile/lib/clerk.ts` — Clerk Expo client (replaces `supabase.ts`).
- [ ] `apps/mobile/lib/api.ts` — fetch/axios wrapper. Auto-attaches `Authorization: Bearer <token>` from `authStore`.
- [ ] Wire `authStore`:
  - `requestOtp(phone)` → `POST /api/auth/request-otp`.
  - `verifyOtp(phone, otp)` → `POST /api/auth/verify-otp` → stores Clerk JWT in `authStore`.
  - `signOut()` → Clerk `signOut()` + clear `authStore`.
- [ ] Dual push token registration on successful login:
  - `Expo.getExpoPushTokenAsync()` → `expo_token`.
  - `Notifications.getDevicePushTokenAsync()` → `raw_token` (native FCM/APNs).
  - `POST /api/users/device-token` with both tokens → stored in `device_tokens` table.
- [ ] Auth routing: on JWT present → check `user_type` from `users` table → route to `(seller)` or `(aggregator)` group.

### 🚦 DAY 5 VERIFICATION GATE
- [ ] **G5.1** — `GET /health` returns 200 on Azure App Service URL.
- [ ] **G5.2** — Unauthenticated request to protected route → 401.
- [ ] **G5.3** — WhatsApp OTP end-to-end: enter phone → WhatsApp message received with 6-digit OTP → enter OTP → Clerk JWT returned → `authStore` has valid session.
- [ ] **G5.4** — 4th OTP request within 10 min → 429 (rate limit). Redis counter confirmed incrementing.
- [ ] **G5.5** — `user_type` re-fetched from DB: temporarily set wrong type in DB → privileged route rejects within 60s cache window.
- [ ] **G5.6** — Dual push tokens saved: both `expo_token` and `raw_token` present in `device_tokens` for test device.
- [ ] **G5.7** — `sanitize-html` middleware: POST body with `<script>alert(1)</script>` → sanitised before route handler.
- [ ] **G5.8** — OTP is one-time: same OTP used twice → second attempt returns 400 "OTP expired" (Redis key deleted after first use).
- [ ] **G5.9** — node-cron: aggregator culling job fires and correctly sets `is_online=false` for stale records. Check via scheduler log.
- [ ] **G5.10** — Azure App Service: no environment variable values visible in any client bundle (grep build output).

---

## ✅ DAY 6 — Core API Routes + DB Integration

> **Goal:** Seller and aggregator flows fully functional end-to-end with real data from Azure PostgreSQL.
> **Rule:** Every status transition goes through the state machine. No direct `status='completed'` via PATCH.

### 6.1 DB Connection Setup
- [ ] `backend/src/db.ts` — PostgreSQL connection pool via `pg` package:
  - `connectionString: process.env.DATABASE_URL` (Azure PostgreSQL SSL connection string).
  - `ssl: { rejectUnauthorized: true }`.
  - `max: 10` connections (B1ms constraint — stay well under limit).
- [ ] Helper: `withUser(userId, fn)` — wraps query in `SET LOCAL app.current_user_id = $1` → executes `fn(client)` → releases. Used on every DB call in protected routes.

### 6.2 Order Routes
- [ ] `POST /api/orders`:
  - Accept: material codes, estimated weights, pickup preference, seller note.
  - Reject: `kyc_status`, `aggregator_id`, `status` from body (V35, V13).
  - Geocode `pickup_address_text` via `IMapProvider.geocode()` → extract `city_code` + `pickup_locality`.
  - INSERT to `orders` + `order_items` in a transaction (using `withUser()`).
  - Trigger push to nearby aggregators: query `aggregator_availability` (is_online=true) + `aggregator_profiles` (same city_code) + `aggregator_material_rates` (matching materials).
  - INSERT `order_status_history` with `changed_by = req.user.id` (R3).
  - Apply `orderCreateRateLimiter` (3/seller/hour). Track consecutive cancellations (RA3).
- [ ] `GET /api/orders/:id` — two-phase address reveal:
  - If `req.user.id === order.aggregator_id` → return `pickup_address_text` (full).
  - Else → `pickup_address_text: null` in response DTO (V25 — enforced in DTO, not just UI).
- [ ] `PATCH /api/orders/:id/status` — state machine:
  - Hard-reject if `new_status in ['completed', 'disputed']` → 400 (V13).
  - Validate transition is allowed. INSERT to `order_status_history` with actor ID (R3).
  - Publish Ably event on status change.
- [ ] `DELETE /api/orders/:id` — soft delete: `deleted_at = NOW()`, `status = 'cancelled'`.

### 6.3 Media Routes
- [ ] `POST /api/orders/:id/media`:
  - Verify ownership (seller or aggregator of this order).
  - Strip ALL EXIF metadata via `sharp` before any further processing (V18).
  - Upload to Uploadthing via `IStorageProvider.upload()`. Store Uploadthing file key in `order_media.storage_path`.
  - INSERT to `order_media` table.
  - For `scale_photo`: generate OTP, store HMAC in Redis keyed `otp:order:{orderId}`, call Meta WhatsApp directly.
- [ ] `GET /api/orders/:id/media/:mediaId/url`:
  - Verify ownership. `IStorageProvider.getSignedUrl(fileKey, 300)` — 5-min expiry (D1). Return signed URL.

### 6.4 Aggregator Routes
- [ ] `GET /api/orders/feed` — aggregator order feed:
  - Query: `status='created'`, `deleted_at IS NULL`, same `city_code` as aggregator, `is_online=true`, material rate exists for aggregator.
  - Server-derives all filters — never accepts `radius` or `city_code` from client (V21 equivalent).
- [ ] `PATCH /api/aggregators/profile` — allowlist: `business_name`, `operating_hours`, `operating_area_text`. `kyc_status` blocklisted (V35). `city_code` blocklisted (set on KYC approval only).
- [ ] `POST /api/aggregators/heartbeat` — update `last_ping_at`. Clerk JWT required.
- [ ] `PATCH /api/aggregators/rates` — update `aggregator_material_rates` for authenticated aggregator.

### 6.5 Supporting Routes
- [ ] `GET /api/rates` — returns `current_price_index` view. No auth. `Cache-Control: public, max-age=300, stale-while-revalidate=600` + ETag (V17).
- [ ] `POST /api/messages` — phone number regex filter `/(?:\+91|0)?[6-9]\d{9}/g` → `[phone number removed]` BEFORE DB insert and Ably publish (V26). Apply `sanitize-html`.
- [ ] `POST /api/ratings` — rate-limited: only if `order.status='completed'` AND within 24 hours.
- [ ] `POST /api/disputes` — creates `disputes` record + atomically sets `orders.status='disputed'`.
- [ ] `GET /api/users/me` — returns `users_public` row for current user. No `phone_hash`, no `clerk_user_id` (V24, V-CLERK-1).

### 6.6 Connect Mobile Screens to Live API
- [ ] Wire Seller Listing Wizard → `POST /api/orders`. Real order ID in DM Mono on confirmation.
- [ ] Wire Seller Orders List → `GET /api/orders?role=seller`. Response filtered by JWT identity.
- [ ] Wire Order Detail → `GET /api/orders/:id`. Real address reveal logic verified in raw response.
- [ ] Wire Aggregator Feed → `GET /api/orders/feed`. Real city_code + material filtering.
- [ ] Wire Market Rates screen → `GET /api/rates`. Real ₹/kg values.
- [ ] Wire Profile screens → `GET /api/users/me`.
- [ ] Wire Aggregator Heartbeat → `POST /api/aggregators/heartbeat` every 2 min via `setInterval` in foreground.

### 🚦 DAY 6 VERIFICATION GATE
- [ ] **G6.1** — Seller creates listing → order in DB with correct `seller_id`, `city_code='HYD'`, `status='created'`.
- [ ] **G6.2** — `GET /api/orders/:id`: non-aggregator requester → `pickup_address_text` is literally `null` in JSON (inspect raw response, not just UI).
- [ ] **G6.3** — `PATCH /api/orders/:id/status` with `{ status: 'completed' }` → 400 (V13).
- [ ] **G6.4** — `PATCH /api/aggregators/profile` with `{ kyc_status: 'verified' }` → 400 (V35).
- [ ] **G6.5** — Image upload: JPEG with GPS EXIF → output file has no GPS data (`exiftool` or `sharp` metadata read).
- [ ] **G6.6** — Uploadthing signed URL: accessible within 5 min, 403 after 5 min.
- [ ] **G6.7** — `POST /api/messages` with phone `9876543210` → stored message contains `[phone number removed]`.
- [ ] **G6.8** — Market rates screen shows real data from `current_price_index` view.
- [ ] **G6.9** — Aggregator feed: create order in city_code='HYD' with matching material → appears in feed. Create with non-matching material → does NOT appear.
- [ ] **G6.10** — `order_status_history`: every status transition has `changed_by` populated (not NULL).

---

## ✅ DAY 7 — Atomic Operations + Ably Realtime + Push Notifications

> **Goal:** First-accept-wins is live in Express. Chat is real-time via Ably. Push notifications fire.
> **Rule:** Every Ably subscription has a cleanup path. No channel without `removeChannel`.
> **Stack note:** No Supabase Edge Functions. `accept-order` and `verify-pickup-otp` are Express routes using PostgreSQL `FOR UPDATE SKIP LOCKED` transactions.

### 7.1 First-Accept-Wins Express Route
- [ ] `POST /api/orders/:orderId/accept` — Clerk JWT required:
  1. Get dedicated `pool.connect()` — dedicated connection for transaction.
  2. `SET LOCAL app.current_user_id = $aggregatorId` on this connection.
  3. `BEGIN`.
  4. `SELECT id FROM orders WHERE id=$orderId AND status='created' FOR UPDATE SKIP LOCKED`.
  5. If 0 rows returned → `ROLLBACK` → return HTTP 409 `{ error: 'Order already taken' }`.
  6. `UPDATE orders SET status='accepted', aggregator_id=$aggregatorId`.
  7. `INSERT INTO order_status_history (order_id, old_status, new_status, changed_by) VALUES (...)` (R3).
  8. `COMMIT`.
  9. Publish Ably event: `order:{orderId}` channel, `status_updated` event.
  10. `client.release()` — always in `finally` block.

### 7.2 OTP Verification + Order Completion Express Route
- [ ] `POST /api/orders/:orderId/verify-otp` — Clerk JWT required:
  1. Get dedicated connection.
  2. `BEGIN`.
  3. `SET LOCAL app.current_user_id = $aggregatorId`.
  4. `SELECT aggregator_id, status FROM orders WHERE id=$orderId FOR UPDATE` — verify `aggregator_id = req.user.id` (V8). If not → `ROLLBACK` → 403.
  5. Retrieve OTP HMAC from Upstash Redis (`otp:order:{orderId}`). If missing → 400 "OTP expired".
  6. `timingSafeEqual(storedHmac, HMAC-SHA256(submittedOtp, OTP_HMAC_SECRET))`. If mismatch → 400.
  7. Validate `snapshotHmac` binds OTP to confirmed weight/amount values (C1). If mismatch → 400.
  8. `UPDATE orders SET status='completed'` (V13 — ONLY path to 'completed').
  9. `INSERT INTO order_status_history (...)`.
  10. `COMMIT`.
  11. `DEL otp:order:{orderId}` from Redis (one-time use).
  12. Trigger invoice generation (async, non-blocking).
  13. Return 200.

### 7.3 Wire Order Acceptance Flow in Mobile
- [ ] `(aggregator)` feed: "Accept Order" button → `POST /api/orders/:id/accept` (via `api.ts` wrapper).
- [ ] Handle 409: show "Order already taken" bottom sheet. Back to feed.
- [ ] Handle success: transition to post-acceptance Order Detail. Full address revealed.

### 7.4 Ably Realtime Channels
- [ ] Install `ably` in `apps/mobile/` and `backend/`.
- [ ] `useOrderChannel(orderId)` hook in mobile:
  ```typescript
  useFocusEffect(useCallback(() => {
    const channelToken = order.chatChannelToken; // HMAC suffix from API (V32)
    const unsub = realtimeProvider.subscribe(
      `order:${orderId}:chat:${channelToken}`,
      'message',
      (msg) => chatStore.addMessage(msg)
    );
    return () => unsub(); // Cleanup on screen blur/unmount
  }, [orderId]));
  ```
- [ ] `AppState.addEventListener` in root `_layout.tsx`: on `background` → `realtimeProvider.removeAllChannels()`.
- [ ] Wire Order Detail screen: Ably `status_updated` event → status timeline updates live.
- [ ] Wire Chat screen: messages appear via Ably. Send → `POST /api/messages` → backend publishes to Ably channel.
- [ ] `useAggregatorFeedChannel()` hook: subscribes to `orders:hyd:new` channel — new orders appear in feed instantly when backend publishes on `POST /api/orders`.
- [ ] Backend publishes to correct Ably channels on: order created, order accepted, status change, new message.
- [ ] Channel HMAC suffix: backend generates `hmac_sha256(orderId + userId + OTP_HMAC_SECRET)[:8]` and returns it as `chatChannelToken` in order detail API response (V32).

### 7.5 Push Notifications
- [ ] `backend/src/utils/pushNotifications.ts`:
  - `sendPush(userIds, title, body, data)` helper. Loads tokens from `device_tokens`.
  - `expo-server-sdk` chunked dispatch (D2).
  - **PII audit:** `title` and `body` NEVER contain address, phone, name, GSTIN. Generic copy only.
- [ ] Push triggers (all use generic copy — see TRD v4.0 §5.2 table):
  - Order created → all online aggregators in HYD with matching materials.
  - Order accepted → seller.
  - Status changes → relevant party.
  - New chat message → offline party.
- [ ] Ably connection monitor: log Sentry warning if approaching 150 connections (75% of 200 free limit).

### 🚦 DAY 7 VERIFICATION GATE
- [ ] **G7.1** — First-accept-wins: two devices accept same order simultaneously → exactly one 200, one 409. No duplicate `order_status_history` rows for `accepted`.
- [ ] **G7.2** — Chat message sent on Device A → appears on Device B within 1 second.
- [ ] **G7.3** — Phone number typed in chat (`9876543210`) → received as `[phone number removed]` on Device B.
- [ ] **G7.4** — Order status change on backend → Order Detail status timeline updates without manual refresh.
- [ ] **G7.5** — Navigate away from Order Detail → Ably `removeChannel` called (verify: Ably dashboard connection count decreases).
- [ ] **G7.6** — App backgrounded → `removeAllChannels()` called (all Ably connections drop).
- [ ] **G7.7** — Push notification received on aggregator device when seller creates new order in HYD.
- [ ] **G7.8** — Push body: grep all `sendPush` calls for `address`, `phone`, `name`, `gstin` → zero results.
- [ ] **G7.9** — `verify-otp` route: correct OTP → `status='completed'` in DB. Incorrect OTP → 400, status unchanged.
- [ ] **G7.10** — `verify-otp`: called with seller's JWT (not the assigned aggregator) → 403 (V8).

---

## ✅ DAY 8 — AI Integration + Invoice Generation + Provider Abstractions

> **Goal:** Gemini Vision working with circuit breaker. GST invoices generated. All 5 provider packages complete.

### 8.1 Provider Abstraction Packages
- [ ] `packages/maps/` — `IMapProvider` interface + `GoogleMapsProvider`:
  - `geocode(address): Promise<{ city_code, locality, display_address }>`.
  - `reverseGeocode(lat, lng): Promise<string>`.
  - `OlaMapsProvider` stub. Switch via `MAP_PROVIDER` env var.
- [ ] `packages/realtime/` — `IRealtimeProvider` interface + **`AblyRealtimeProvider`** (default impl):
  - `subscribe(channel, event, handler)`, `publish(channel, event, payload)`, `removeChannel(channel)`, `removeAllChannels()`.
  - `SoketiProvider` stub. Switch via `REALTIME_PROVIDER` env var.
  > Note: Ably is the DEFAULT. No Supabase Realtime implementation needed.
- [ ] `packages/auth/` — `IAuthProvider` + **`ClerkAuthProvider`** (default impl):
  - `signInWithOTP(phone)`, `verifyOTP(phone, token)`, `getSession()`, `signOut()`, `onAuthStateChange()`.
- [ ] `packages/storage/` — `IStorageProvider` + **`UploadthingStorageProvider`** (default impl):
  - `upload(bucket, path, data)` → returns Uploadthing file key.
  - `getSignedUrl(fileKey, expiresIn)` → 5-min expiry signed URL.
  - `delete(fileKey)`.
  - All files private by default — no public URL method exposed (D1).
- [ ] `packages/analysis/` — `IAnalysisProvider` + `GeminiVisionProvider`:
  - `analyzeScrapImage(imageBuffer): Promise<AnalysisResult>`.
  - `AnalysisResult` type defined independently of Gemini JSON schema.

### 8.2 Gemini Vision Integration
- [ ] `POST /api/scrap/analyze` route:
  - Apply `analyzeRateLimiter`: 10 req/user/hour (RA1).
  - Check `globalGeminiCounter` in Redis: if ≥ 1,200/day → return `{ status: 'degraded', manual_entry_required: true }` (V15b).
  - SHA-256 hash of image buffer → check Redis cache (24hr TTL). If cached → return cached result.
  - Strip EXIF via `sharp` before passing to Gemini (V18).
  - Call `IAnalysisProvider.analyzeScrapImage(buffer)`.
  - Schema-validate: `material_code` must exist in `material_types`, `weight_kg` must be positive. On failure → `{ status: 'analysis_failed' }` (I1).
  - Cache valid result. Increment `globalGeminiCounter`.
  - Return with `is_ai_estimate: true`.
  - **Never write Gemini output to DB as confirmed order data (I1 — hard rule).**
- [ ] Wire Listing Wizard Step 2: call `/api/scrap/analyze` after photo capture. AI estimate badge. Manual entry on `manual_entry_required: true`.

### 8.3 GST Invoice Generation
- [ ] `backend/src/utils/invoiceGenerator.ts`:
  - Triggered on `status='completed'` for orders with `seller_gstin` OR `total_amount > 50000`.
  - Validate GSTIN: `[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}` (I3).
  - Sanitise ALL user-supplied strings before `pdf-lib` draw calls (I3).
  - Generate PDF with `pdf-lib`. Upload via `IStorageProvider.upload()`. File key includes randomised hex segment (V27).
  - INSERT to `invoices` table: `invoice_data JSONB NOT NULL` with full structured data (GST legal record — TRD §14.4.5). PDF is rendering artifact only.
- [ ] Wire receipt screen: "Download Invoice" → `GET /api/orders/:id/invoice` → backend verifies ownership → `IStorageProvider.getSignedUrl()` → opens PDF.

### 8.4 Price Scraper (Python)
- [ ] Python 3.12 scraper in `scraper/main.py`.
- [ ] Hard-coded URL allowlist — never fetches from DB-stored URLs (V19 SSRF).
- [ ] Per-material sanity bounds before writing to `price_index` (X2). > 30% delta → `is_manual_override=true` + Sentry alert.
- [ ] Block private IP ranges in outbound requests (V19).
- [ ] Deploy as Render cron job (or Azure Functions timer trigger): daily 05:30 IST.

### 🚦 DAY 8 VERIFICATION GATE
- [ ] **G8.1** — All 5 provider packages: `pnpm build` succeeds, TypeScript compiles, interfaces fully implemented.
- [ ] **G8.2** — `MAP_PROVIDER=ola` → `OlaMapsProvider` instantiated. `geocode()` throws `NotImplemented` (confirms swap path works).
- [ ] **G8.3** — `REALTIME_PROVIDER=soketi` → `SoketiProvider` instantiated. Confirms Ably swap path is clean.
- [ ] **G8.4** — Gemini Vision: upload scrap photo → AI estimate returned with `is_ai_estimate: true`. Estimate NOT in `order_items` table.
- [ ] **G8.5** — Circuit breaker: set `globalGeminiCounter` to 1201 in Redis → next `/api/scrap/analyze` returns `{ manual_entry_required: true }` without calling Gemini.
- [ ] **G8.6** — EXIF strip: upload image with GPS EXIF → Gemini receives buffer with no GPS data (`sharp(buffer).metadata()` in test).
- [ ] **G8.7** — GST invoice generated for completed order with `seller_gstin`. PDF accessible via Uploadthing signed URL. `invoice_data` JSONB populated.
- [ ] **G8.8** — Invoice file key includes randomised component: two invoices for same order → different file keys (V27).
- [ ] **G8.9** — GSTIN with invalid format rejected → 400 (I3).
- [ ] **G8.10** — Price scraper: feed rate outside bounds (Iron at ₹200/kg) → not written to DB, Sentry alert triggered (X2).

---

## ✅ DAY 9 — Web Portal (Business + Admin) + Testing

> **Goal:** Web portal fully functional. All critical test cases passing. CI pipeline live.

### 9.1 Business Mode Web Dashboard (Full Implementation)
- [ ] **Bulk Listing Creation**: multi-material form → `POST /api/orders`.
- [ ] **Recurring Schedule**: weekly/bi-weekly/monthly. Stored in `seller_profiles`.
- [ ] **Sub-user Management**: invite by phone, `business_members` row with role, max 5 non-admin members, revoke access.
- [ ] **Order History**: paginated table. Filter by date, status, material. Export CSV.
- [ ] **GST Invoice History**: list + PDF download (Uploadthing signed URL via backend — D1).
- [ ] **E-Way Bill**: note field for bulk transactions (display only).

### 9.2 Admin Dashboard (Full Implementation)
- [ ] Vercel Edge Middleware `middleware.ts`: IP allowlist for all `/admin/*` routes (X4). Reads `ADMIN_IP_ALLOWLIST` env var.
- [ ] 15-minute inactivity timeout → auto logout.
- [ ] **KYC Queue**: table + detail view (Uploadthing signed URLs for Aadhaar/shop photos). Approve/Reject → `PATCH /api/admin/aggregators/:id/kyc` (sets `app.is_admin_context='true'` before updating `kyc_status`). Every action logged to `admin_audit_log` (X4).
- [ ] **Dispute Resolution**: chat history, scale photos, OTP log, both party accounts. 72-hour SLA indicator. Resolve/Dismiss route.
- [ ] **Price Override**: manual rate entry, `is_manual_override=true`, logged to `admin_audit_log`.
- [ ] **Flagged Aggregators**: avg rating < 3.0 after 10+ orders.

### 9.3 Unit Tests
- [ ] RLS policy tests (using `pg` pool with `SET LOCAL app.current_user_id`):
  - Seller cannot read other seller's orders.
  - Aggregator sees only `status='created'` orders in same city_code.
  - `phone_hash` and `clerk_user_id` absent from all API response fixtures (V24, V-CLERK-1).
- [ ] API route auth tests:
  - Every protected route → 401 without Clerk JWT.
  - `/api/admin/*` routes → 403 for non-admin.
  - `PATCH /api/orders/:id/status` with `completed` → 400 (V13).
- [ ] Business logic tests:
  - Order state machine: all allowed transitions, all blocked transitions.
  - `verifyUserRole`: returns false for suspended user (`is_active=false`).
  - OTP rate limiter: 4th request in 10 min → 429.

### 9.4 Integration Tests
- [ ] Full order lifecycle: seller creates → aggregator accepts (Express `FOR UPDATE SKIP LOCKED` route) → status transitions → scale photo → OTP verify (Express route) → `status='completed'` → invoice generated.
- [ ] First-accept-wins race: concurrent accept calls → exactly one 200, one 409.
- [ ] OTP snapshot binding (C1): correct OTP with wrong `snapshotHmac` → rejected.
- [ ] OTP one-time use: same OTP used twice → second attempt 400 (Redis key deleted).

### 9.5 CI/CD Setup
- [ ] GitHub Actions `.github/workflows/ci.yml`:
  - Triggers: PR open, push to `main`.
  - Steps: `pnpm install` → `pnpm type-check` → `pnpm lint` → `pnpm test`.
- [ ] Azure App Service auto-deploy: connected to `main` branch (GitHub Actions deployment action).
- [ ] Vercel auto-deploy: connected to `main` branch for `apps/web`.
- [ ] Expo EAS Build: `eas build --profile preview` for test APK (15 free builds/month).

### 🚦 DAY 9 VERIFICATION GATE
- [ ] **G9.1** — Admin route without IP allowlist match → 403 (test from non-whitelisted IP).
- [ ] **G9.2** — Business sub-user with `viewer` role: can read orders, `POST /api/orders` returns 403.
- [ ] **G9.3** — All unit tests pass: `pnpm test` → 0 failures.
- [ ] **G9.4** — Integration test: full order lifecycle completes. Invoice PDF generated. Receipt visible on mobile.
- [ ] **G9.5** — Race condition: concurrent acceptance → 1 success + 1 x 409. No duplicate `order_status_history` rows.
- [ ] **G9.6** — CI pipeline passes on fresh PR.
- [ ] **G9.7** — `pnpm type-check` monorepo-wide: 0 errors.
- [ ] **G9.8** — EAS preview build installs and runs on physical Android device.

---

## ✅ DAY 10 — Security Audit + Monitoring + Pre-Launch Hardening

> **Goal:** Every security checklist item is green. Monitoring is live. Ready for real users.

### 10.1 Full Security Audit (BSE-led)

- [ ] **A1** — Clerk JWT middleware: 401 without token on all non-exempt routes.
- [ ] **A2** — N/A (no Supabase webhook endpoint in this stack). Verify `GET /health` returns 200 for UptimeRobot.
- [ ] **A3** — Clerk JWT expiry: 1 hour. Clerk `signOutOtherSessions()` tested — clears all active sessions.
- [ ] **R1** — `business_members` RLS: test all 3 roles (admin/operator/viewer) with real Clerk JWTs.
- [ ] **R2** — Separate INSERT/SELECT RLS policies on `orders` — verified in unit tests.
- [ ] **R3** — `order_status_history.changed_by` never NULL — grep codebase + DB query.
- [ ] **RA1** — Gemini circuit breaker: Redis counter set to 1,201 → `manual_entry_required: true`.
- [ ] **RA2** — OTP rate limit: 4th request in 10 min → 429. Redis counter incrementing.
- [ ] **RA3** — Order spam: 4th order creation in 1 hour → 429.
- [ ] **I1** — Gemini output: grep codebase for any path writing Gemini response to `order_items` → zero results.
- [ ] **I2** — `sanitize-html`: POST XSS payload → sanitised. CSP header on all web routes.
- [ ] **I3** — PDF: `<script>` in GSTIN → rejected by regex. No raw user strings in pdf-lib draw calls.
- [ ] **D1** — All Uploadthing files private: confirm no public URL is ever returned to client — only signed URLs via backend ownership check.
- [ ] **D2** — Push body audit: grep all `sendPush` calls for `address`, `name`, `phone`, `gstin` → zero matches.
- [ ] **D3** — Error handler: trigger intentional error → Sentry event has no `process.env` keys in payload.
- [ ] **C1** — OTP screen: full transaction summary visible BEFORE OTP input (scroll test on iPhone SE).
- [ ] **C2** — Heartbeat + culling: stop heartbeat for 6 min → `is_online=false` in DB. node-cron job confirmed running.
- [ ] **C3** — Photo first: listing submission without photo upload → backend validation error.
- [ ] **X1** — CORS: `OPTIONS` with `Origin: https://evil.com` → no `Access-Control-Allow-Origin`.
- [ ] **X2** — Price scraper sanity bounds tested.
- [ ] **X3** — grep codebase for `bcrypt` in OTP paths → zero results. HMAC-SHA256 confirmed.
- [ ] **X4** — Admin audit log: every admin action generates a row in `admin_audit_log`.
- [ ] **V-CLERK-1** — `clerk_user_id` absent from all API response fixtures. Unit test asserts.
- [ ] **V-CLERK-2** — `user_type` re-fetched from DB: Redis cache works (correct type within 60s, stale type rejected after cache expires).
- [ ] **V-OTP-1** — OTP one-time use: Redis key deleted after first verification. Second attempt → 400.
- [ ] **V7** — `user_type` DB re-fetch confirmed. JWT claim not trusted on privileged routes.
- [ ] **V8** — `verify-otp` route: aggregator_id check inside transaction before OTP validation.
- [ ] **V13** — `PATCH status=completed` → 400. Unit test confirms.
- [ ] **V18** — EXIF strip: confirmed on production build (upload GPS-tagged JPEG → output no GPS).
- [ ] **V24** — Unit test: no API response contains `phone_hash`.
- [ ] **V25** — Pre-acceptance DTO: `pickup_address_text` is literally `null` in JSON (not UI-hidden).
- [ ] **V26** — Chat filter: phone replaced in DB + Ably broadcast.
- [ ] **V27** — Invoice file key: two generations → two different randomised keys.
- [ ] **V32** — Ably channel names: HMAC suffix present. Code review confirmed.
- [ ] **V34** — `helmet` headers: `curl -I <azure-backend-url>` shows X-Frame-Options, HSTS, nosniff.
- [ ] **V35** — `kyc_status` blocklisted from all non-admin routes. DB trigger confirmed active (`app.is_admin_context` required).

### 10.2 Monitoring Setup
- [ ] Sentry: crash reporting for React Native + Express + Next.js. Trigger test crash → event in Sentry.
- [ ] PostHog: funnel — `listing_started`, `listing_submitted`, `order_accepted`, `order_completed`. 1M events/month free.
- [ ] UptimeRobot: health checks every 5 min on Azure backend `/health` + Vercel URL. 50 monitors free.
- [ ] Ably Dashboard: monitor connection count. Alert rule at 150 connections (75% of 200 free limit).
- [ ] Upstash Dashboard: Meta OTP conversation counter → alert at 900/month.
- [ ] Azure Monitor: DB connection count, query performance (built into Azure Portal — no extra setup).

### 10.3 Meta WhatsApp Pre-Launch Checklist
- [ ] WhatsApp Business Account (WABA) registered and business verified.
- [ ] Phone number added and OTP-verified in Meta Business Manager.
- [ ] `authentication` category OTP template submitted and `APPROVED`.
- [ ] Template name matches `META_OTP_TEMPLATE_NAME` env var.
- [ ] End-to-end test: new unregistered phone → receives WhatsApp OTP → signs in successfully.

### 10.4 Clerk Pre-Launch Checklist
- [ ] Clerk Dashboard → SMS → Settings → India enabled in SMS allowlist.
- [ ] Clerk production instance configured (separate from development instance).
- [ ] Clerk `CLERK_SECRET_KEY` (production) set in Azure App Service env vars.
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (production) set in Vercel env vars.
- [ ] Test: new user on production Clerk instance can complete full auth flow.

### 10.5 Final Build & Deploy
- [ ] All env vars populated in Azure App Service, Vercel (production), and Clerk production.
- [ ] All 12 migration files applied to Azure PostgreSQL production instance.
- [ ] `eas build --profile production` — Android APK + iOS IPA.
- [ ] Azure App Service: confirm "Always On" setting active (prevents cold starts — check if within free tier allowance or upgrade to B1 paid).
- [ ] DNS configured for `[APP_DOMAIN]` and `admin.[APP_DOMAIN]` → Vercel.

### 🚦 DAY 10 FINAL LAUNCH GATE
> **Every single item must be ✅ before any real user traffic is accepted.**

- [ ] **L1** — BSE security audit: all items above have a passing test, not just code review.
- [ ] **L2** — Zero open BLOCK-level findings from any agent.
- [ ] **L3** — WhatsApp OTP template: status = APPROVED in Meta Business Manager.
- [ ] **L4** — Azure PostgreSQL: all 12 migrations applied, all RLS enabled, triggers active.
- [ ] **L5** — `CLERK_SECRET_KEY` absent from all deployed client bundles (grep production build output). `SUPABASE_SERVICE_KEY` also absent — should not exist anywhere in codebase.
- [ ] **L6** — Sentry receiving events from production React Native app.
- [ ] **L7** — UptimeRobot + Ably monitoring active on production URLs.
- [ ] **L8** — At least 2 full end-to-end test runs on physical devices: seller creates → aggregator accepts → weighing → OTP → receipt.
- [ ] **L9** — At least 1 test aggregator account with `kyc_status='verified'` in production DB (admin-approved).
- [ ] **L10** — `cities` table seeded with Hyderabad. `APP_NAME` and `APP_DOMAIN` updated from placeholder if final name decided.

---

## 🏁 SCALABILITY PREP (Post-Launch — Before City 2 / Scale)

> These are NOT Day 10 tasks.

- [ ] Ably connection count: if approaching 150 → audit culling. If approaching 200 → upgrade to Ably paid ($29/month).
- [ ] Clerk MAU approaching 10,000 → upgrade to Clerk Pro plan.
- [ ] Azure PostgreSQL B1ms approaching limits → migrate to DigitalOcean Managed PostgreSQL (use $200 DO credit reserve). OR upgrade to B2ms (~₹9,030/month).
- [ ] Azure App Service free tier hours exhausted → upgrade to paid Basic tier.
- [ ] `cities` reference table: add zone/ward columns before city 2 launch for sub-city precision matching.
- [ ] Message partition archival: partitions > 6 months → cold storage export + detach.
- [ ] Upstash Redis: confirm ALL rate limiters backed by Redis (no in-memory stores). Upgrade if approaching 10K req/day.
- [ ] EAS Production plan ($99/month) when build frequency exceeds 15/month.
- [ ] Meta WhatsApp paid billing: enable before monthly OTP volume exceeds 900 conversations.
- [ ] `IRealtimeProvider` swap: `REALTIME_PROVIDER=soketi` → deploy self-hosted Soketi on DigitalOcean if Ably cost becomes concern.

---

## 📊 STATUS TRACKER

> Last updated: 2026-03-01

### ✅ Completed

**Day 1 — Foundation & Design System** *(2026-02-26)*
- [x] §1.1 — pnpm monorepo, directories, workspace packages, .gitignore, .env.example
- [x] §1.2 — tokens.ts, app.ts (mobile + web mirror), tailwind.config.ts
- [x] §1.3 — Typography (DM Sans + DM Mono)
- [x] §1.4 — Full UI Component Library (Button, Card, StatusChip, MaterialChip, Avatar, SkeletonLoader, EmptyState, NavBar, TabBar)
- [x] Day 1 Gate PASSED

**Day 2 — Auth UI + ALL Seller Screens** *(2026-02-27 to 2026-03-01)*
- [x] §2.1 — Navigation shell (seller side), Zustand store scaffolds, routing
- [x] §2.2 — Auth screens (phone entry, OTP verify)
- [x] §2.3 — Seller onboarding (account type, individual profile, business setup)
- [x] §2.4 — Seller home screen
- [x] §2.5 — Scrap Listing Wizard (all 4 steps)
- [x] §2.6 — Order management screens (list, detail, OTP confirm, receipt)
- [x] §2.7 — Prices/browse screen, profile screen
- [x] Day 2 Gate PASSED (2026-02-28)
- [x] **All seller screens complete. All seller routing complete.** (confirmed 2026-03-01)

**Infrastructure Decision** *(2026-03-01)*
- [x] Supabase removed — India ISP block confirmed (Feb 2026). Firebase also blocked.
- [x] Final stack decided: Azure PostgreSQL B1ms (free, Azure for Students) + Clerk + Ably + Uploadthing + Express on Azure App Service.
- [x] TRD updated to v4.0 reflecting new stack.
- [x] PLAN.md updated to v2.0 reflecting new stack.

### 🔄 Next Up

**Day 2 — Remaining Items (complete before Day 3 gate)**
- [x] §2.1 — Splash screen animation `SplashAnimation.tsx` (Updated to onboarding flow)
- [x] §2.1 — `app/index.tsx` root route (Routes directly to onboarding)

**Day 3 — Aggregator UI + Web Portal Shell (Static)** ← CURRENT
- [/] Aggregator onboarding placeholder (§3.1 — 50% complete)
- Chat screen (§3.6)
- Next.js web portal shell (§3.7)

### 📋 Remaining
Days 4 through 10 — not started. Updated for new stack (see plan above).

---

## ⚡ QUICK REFERENCE — DAILY DECISION RULES

| Situation | Rule |
|---|---|
| Should I add a feature not in PRD? | No. Log it as post-MVP. |
| A gate item is failing — move on? | No. Fix it first. Gates are hard stops. |
| Logic in Express or DB? | Express UNLESS it requires `FOR UPDATE` atomicity (`accept-order`, `verify-otp` both live in Express routes now). |
| New vendor call needed? | Always through a provider abstraction package first. Never direct SDK import. |
| Unsure if a colour is from tokens? | grep for `#` in component file. Zero results required. |
| User `type` needed in route handler? | Fetch from DB (or 60s Redis cache) via `verifyUserRole()`. Never from Clerk JWT claim. |
| New env var needed? | Add to TRD v4.0 Appendix B first. Add to `.env.example`. Never commit actual value. |
| Push notification text needs user info? | Rewrite with generic copy. No PII in push bodies (D2). |
| Supabase package imported anywhere? | BLOCK. Remove immediately. `@supabase/supabase-js` must not appear in any file. |
| `auth.uid()` in a SQL query? | BLOCK. Replace with `current_app_user_id()` helper function. |
| pg_cron job being added? | No. All scheduled jobs go in `backend/src/scheduler.ts` as node-cron. |
| Edge Function being added? | No. Supabase Edge Functions removed. All logic in Express routes. |

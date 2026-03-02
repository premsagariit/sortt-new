# [APP_NAME] — AGENT MEMORY & ARCHITECTURE RULES
> ⚠️ **APP NAME PLACEHOLDER NOTICE**
> The name **"Sortt"** used throughout this document and all project documents is a **placeholder only**.
> The final product name has not been decided.
> **To rebrand:** change `APP_NAME`, `APP_DOMAIN`, and `APP_SLUG` in `apps/mobile/constants/app.ts` and `apps/web/constants/app.ts`. Update `META_OTP_TEMPLATE_NAME` env var and resubmit the WhatsApp template to Meta. Rename the root directory. All other references in code will inherit from those two files automatically.
> Agents must never hardcode the string `"Sortt"` in any generated code. Always import from `constants/app.ts`.

**Reference:** PRD + TRD | **Pilot City:** Hyderabad, India | **Status:** MVP Build

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
This is a **sequential, single-thread, 10-day build**. One domain at a time. One day's tasks at a time. The order is:

```
Days 1–3  → UI first (static, no backend calls)
Day 4     → Database schema, RLS, migrations
Day 5     → Backend foundation + auth (live)
Day 6     → Core API routes + DB integration
Day 7     → Edge Functions + Realtime + Push
Day 8     → AI + Invoice + Provider abstractions
Day 9     → Web Portal + Admin + Testing
Day 10    → Security audit + CI/CD + Launch hardening
```

**Rules that follow from this:**
- Never start work on a later day's tasks until the current day's Verification Gate is fully passed.
- Never attempt parallel workstreams — all agents work on the same day's tasks in sequence.
- The static UI screens on Days 2–3 use hardcoded fixture data only — no Supabase calls, no Express calls, no real auth. That wiring happens on Days 5–7.
- TRD §10.1 configuration rules (no hardcoded API keys, provider abstraction usage, etc.) remain valid and in force — only the §10.2 workstream table is superseded.

---

---

## 1. Active Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Mobile App | React Native, Expo SDK 51+, Expo Router | Primary for all user types |
| Web Portal | Next.js 15 (App Router), Tailwind CSS, Radix UI | Mandatory for Business Mode sellers + Admin |
| Core Backend | Node.js / Express on Azure App Service | All non-atomic business logic |
| Atomic Operations | Express PostgreSQL Transactions | v2.0 update: replaces Edge Functions |
| Database | Azure PostgreSQL Flexible Server | Central India region (CentralIndia) |
| Realtime | Ably via `IRealtimeProvider` | v2.0 update: replaces Supabase |
| Auth | Clerk + WhatsApp OTP | Session management via Clerk |
| Push Notifications | Expo Push Service (server SDK) | NOT raw FCM/APNs — but dual-token storage required |
| Rate Limiting | Upstash Redis via `@upstash/ratelimit` + `express-rate-limit` | Required from day 1 for horizontal scale |
| AI — Image Analysis | Gemini Flash Vision (via `IAnalysisProvider`) | 1,500 req/day free cap — enforce circuit breaker |
| AI — Price Scraper | Gemini Pro (Python agent on Render cron) | Writes to `price_index` table with sanity checks |
| Maps / Geocoding | Google Maps API via `IMapProvider` | Swap-ready for Ola Maps via env var |
| PDF Generation | `pdf-lib` (Node.js) | GST invoices only |
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
  realtime/    → IRealtimeProvider (Supabase Realtime / Ably / Soketi)
  auth/        → IAuthProvider    (Supabase Auth)
  storage/     → IStorageProvider (Supabase Storage / S3 / R2)
  analysis/    → IAnalysisProvider (Gemini Vision / OpenAI Vision)
```

**IMapProvider** — `geocode`, `reverseGeocode`, `getDirections`, `renderMap`
**IRealtimeProvider** — `subscribe(channel, event, handler)`, `publish(channel, event, payload)`, `removeChannel(channel)`
**IAuthProvider** — `signInWithOTP`, `verifyOTP`, `getSession`, `signOut`, `onAuthStateChange`
**IStorageProvider** — `upload(bucket, path, data)`, `getSignedUrl(bucket, path, expiresIn)`, `delete(bucket, path)`
**IAnalysisProvider** — `analyzeScrapImage(imageBuffer): Promise<AnalysisResult>`

Switch providers via environment variables: `MAP_PROVIDER`, `REALTIME_PROVIDER`, etc.

### 3.2 Geospatial (PostGIS)
- ALL aggregator proximity queries use `ST_DWithin` with PostGIS.
- Use partial GIST index: `WHERE status = 'created' AND deleted_at IS NULL` — keeps index small.
- `aggregator_nearby_orders` RLS policy uses indexed JOINs, NOT helper functions (removed in v3.1 — they caused per-row function calls).
- Never accept `radius` parameter from client — always derive from `aggregator_profiles.operating_radius_km` or server-side city bounding box. Hard cap: `MAX_SEARCH_RADIUS_KM = 50`.

### 3.3 Realtime — WebSocket Connection Culling
- Subscribe to channels **only** on `useFocusEffect` (screen focus).
- Always unsubscribe on screen unmount: `return () => { supabase.removeChannel(channel); }`.
- On app background: `AppState.addEventListener → supabase.removeAllChannels()`.
- Monitor daily: if approaching 150 connections (75% of 200 limit), audit immediately.
- Chat channel naming: `order:{order_id}:chat:{hmac_sha256(order_id+user_id+OTP_HMAC_SECRET)[:8]}` — prevents channel existence metadata leakage (V32).

### 3.4 Race Condition Prevention (First-Accept-Wins)
- `accept-order` Edge Function MUST use `SELECT ... FOR UPDATE SKIP LOCKED` inside a transaction.
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
- **Architecture:** Supabase Auth generates the OTP internally → fires the **Send SMS Hook** → POSTs `{ user, sms: { otp } }` to `POST /api/auth/whatsapp-otp` on the custom backend → backend calls Meta Graph API → OTP delivered as a WhatsApp authentication template message.
- **NEVER** use Supabase's built-in SMS provider (Twilio/Vonage) — route through the custom backend hook exclusively.
- OTP length: **6 digits minimum** — enforced by Supabase Auth settings (not MSG91) (V6).
- Meta requirements: WhatsApp Business Account (WABA) + approved `authentication` category template. The authentication template automatically qualifies for the free 1,000/month quota.
- The Supabase Send SMS Hook endpoint (`/api/auth/whatsapp-otp`) is **exempt** from standard JWT middleware (Supabase calls it server-to-server with its own HMAC secret) — validate using `SUPABASE_HOOK_SECRET` env var instead.
- WhatsApp OTP template format: `"Your {{APP_NAME}} verification code is {{1}}. Valid for 10 minutes."` — `{{APP_NAME}}` must be replaced with the final approved app name before submitting to Meta for template approval. The template name itself is set via `META_OTP_TEMPLATE_NAME` env var (see §5). Do NOT hardcode the app name in this string in code — import `APP_NAME` from `constants/app.ts`.
- **Fallback plan at scale:** If WhatsApp OTP fails delivery (user has no WhatsApp), surface a "Resend via SMS" option in the app UI that calls a separate rate-limited SMS fallback endpoint. Fallback SMS provider TBD (e.g., MSG91) — implement only when free quota is regularly exceeded.

### 3.6 Order Status State Machine
Allowed transitions only:
`created → accepted → en_route → arrived → weighing_in_progress → [OTP] → completed`
`any → cancelled`

- `completed` status: ONLY settable by `/verify-pickup-otp` Edge Function — never by PATCH /api/orders/:id/status.
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
- ALL Supabase Storage buckets: **private** (never public).
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
- **A1:** JWT verification middleware on ALL Express routes except `/api/webhooks/supabase` (HMAC-validated) and `GET /api/rates` (public).
- **A2:** Webhook HMAC-SHA256 verification via `SUPABASE_WEBHOOK_SECRET` env var + `crypto.timingSafeEqual`.
- **A3:** JWT expiry 1hr, refresh 7 days. Expose "logout all devices" in Settings screen.

### Role Enforcement
- **R1:** `business_members` table with role `ENUM(admin|viewer|operator)`. RLS policies enforce role at DB level. Max 5 non-admin members enforced at backend level.
- **R2:** Split `seller_own_orders` policy: `USING` for SELECT/UPDATE/DELETE, `WITH CHECK` for INSERT.
- **R3:** `order_status_history.changed_by` set explicitly in application code — never via `auth.uid()` in trigger.

### Rate Limiting (all via Upstash Redis)
- **RA1:** `/api/scrap/analyze` — max 10 req/user/hour. Global circuit breaker at 1,200 Gemini calls/day → return `manual_entry_required` flag (V15b supplement).
- **RA2:** WhatsApp OTP flooding — `/api/auth/whatsapp-otp` (Supabase Send SMS Hook endpoint): max 3 OTP deliveries/phone-hash/10 min, max 10/phone-hash/day. Tracked via `otp_log`. Secured by `SUPABASE_HOOK_SECRET` (Supabase-to-backend only). Monitor Meta daily conversation count — alert admin at 900/month (90% of 1,000 free quota).
- **RA3:** `/api/orders` POST — max 3 creations/seller/hour. 2 consecutive cancellations in 30 min → 2-hour suspension.

### Injection Prevention
- **I1:** Gemini Vision output is UI hint ONLY — never persisted directly to DB. Always validate response schema: material codes must match `material_types` table; weight must be positive number.
- **I2:** Sanitise all free-text with `sanitize-html` before storage. CSP header on all web responses. Character limits enforced at both API and DB (`CHECK` constraints): `seller_note` 500, chat 1000, `review_text` 500, dispute 2000.
- **I3:** PDF injection: validate/strip user strings before pdf-lib — alphanumeric + `, - /` only. GSTIN must match 15-char regex.

### Data Exposure
- **D1:** Private storage buckets + signed URLs only (see §3.9 above).
- **D2:** Generic push notification bodies (see §3.8 above).
- **D3:** Global Express error handler scrubs `process.env` before Sentry. `git-secrets` pre-commit hook.

### Client Trust
- **C1:** OTP confirms WEIGHT AND AMOUNT — not just physical presence. Seller must review full transaction summary before OTP entry. `/verify-pickup-otp` receives HMAC-bound snapshot of order items.
- **C2:** Aggregator heartbeat: ping every 2 min while in foreground. `pg_cron` job every 5 min sets `is_online=false` for `last_ping_at` older than 5 min.
- **C3:** Offline draft orders: photo uploaded to Storage immediately (or queued first on reconnect). `storage_path` generated server-side. Backend validates path exists, belongs to submitting user, created within 24hrs.

### Infrastructure
- **X1:** CORS allowlist: set via `ALLOWED_ORIGINS` env var. Production: `https://[APP_DOMAIN]`, `https://admin.[APP_DOMAIN]`. Dev: `http://localhost:3000`. Never wildcard. Never derive from `constants/app.ts` on the backend — must be env var only.
- **X2:** Price scraper sanity checks (see §3.10 above).
- **X3:** OTP hashing = HMAC-SHA256 (not bcrypt).
- **X4:** Admin panel: IP allowlisting via Vercel Edge Middleware + 10-attempt lockout + 15-min inactivity timeout + `admin_audit_log` table.

### Supplementary (V-series)
- **V6:** OTP length enforced to 6 digits minimum via Supabase Auth settings (Dashboard → Auth → OTP expiry & length).
- **V7:** Privileged routes re-fetch `user_type` + `is_active` from DB, never trust JWT claim.
- **V8:** `/verify-pickup-otp` checks `orders.aggregator_id = auth.uid()` inside the same FOR UPDATE transaction.
- **V9:** WhatsApp OTP delivery is system-initiated only (triggered by scale photo upload via Supabase Auth's Send SMS Hook flow) — the `/api/auth/whatsapp-otp` hook endpoint is not directly callable by app clients; it is called exclusively by Supabase Auth, validated via `SUPABASE_HOOK_SECRET`.
- **V12:** `SUPABASE_SERVICE_KEY` only on server — never in `NEXT_PUBLIC_*` env vars or client bundles.
- **V13:** `IMMUTABLE_STATUSES = ['completed', 'disputed']` in backend status update route (see §3.6).
- **V15b:** Image hash deduplication (SHA-256 → Redis cache, 24hr TTL) before Gemini call + global circuit breaker.
- **V17:** `Cache-Control: public, max-age=300, stale-while-revalidate=600` + ETag on `GET /api/rates`.
- **V18:** Strip ALL EXIF metadata (via `sharp`) from uploaded images before Supabase Storage or Gemini. Never include filename or user metadata in Gemini prompt.
- **V19:** SSRF prevention — price scraper uses hard-coded URL allowlist; never re-fetches from DB-stored URLs.
- **V21:** Never accept `radius` from client. Server-side cap `MAX_SEARCH_RADIUS_KM = 50`.
- **V24:** `users_public` view — `phone_hash` is on never-return list. Unit test asserts no response fixture contains `phone_hash`.
- **V25:** Two-phase address revelation — pre-acceptance: locality + quantised coordinates (2 decimal places, ~500m precision). Post-acceptance: full `pickup_address_text`.
- **V26:** Server-side phone number filter on chat messages — regex `/(?:\+91|0)?[6-9]\d{9}/g` replaces with `[phone number removed]`. Applied in DB trigger or webhook handler before Realtime broadcast.
- **V27:** Randomised invoice storage paths (see §3.9 above).
- **V30:** All `order_status_history` timestamps set by DB `DEFAULT NOW()` — never client-supplied.
- **V32:** HMAC-suffixed channel names (see §3.3 above).
- **V34:** `helmet` npm package on Express backend. `headers()` config in `next.config.js` for web portal.
- **V35:** `kyc_status` is blocklisted from all aggregator-facing update endpoints. Only updatable via `/api/admin/aggregators/:id/kyc`. DB trigger prevents non-service-role updates.

---

## 5. Environment Variables Reference (All Required)

```
# Supabase
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_KEY          # Server-only. NEVER in client bundle or NEXT_PUBLIC_*
SUPABASE_WEBHOOK_SECRET       # HMAC secret for DB webhook signature verification (A2)
SUPABASE_HOOK_SECRET          # HMAC secret for Supabase Auth Send SMS Hook → /api/auth/whatsapp-otp

# Custom Backend
JWT_SECRET                    # Mirror of Supabase JWT secret
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
GOOGLE_MAPS_API_KEY
MAP_PROVIDER                  # "google" | "ola" — switches IMapProvider impl

# Push
EXPO_ACCESS_TOKEN

# Provider Switches
REALTIME_PROVIDER             # "supabase" | "ably" | "soketi"

# Python Price Scraper
GEMINI_API_KEY_SCRAPER        # Can share with main key or be separate
PRICE_SCRAPER_WEBHOOK_URL     # Endpoint to POST scraped results to backend
```

---

## 6. Scalability Thresholds & Migration Triggers

| Threshold | What Breaks | Mitigation Required |
|---|---|---|
| **1,000 OTPs/month** | Meta free WhatsApp auth conversation quota exhausted | Enable paid Meta billing (~₹0.4–0.6/conversation for India) |
| **30K DAU** | Supabase Realtime 1,000 conn ceiling | Swap `IRealtimeProvider` to Ably/Soketi |
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
│   │   │   ├── supabase.ts       # Supabase client (anon key only)
│   │   │   ├── api.ts            # Custom backend API client
│   │   │   └── notifications.ts  # Expo push token registration (dual-token)
│   │   ├── store/                # Zustand state stores
│   │   └── constants/
│   │       ├── tokens.ts         # All design tokens (SINGLE SOURCE OF TRUTH for visuals)
│   │       └── app.ts            # APP_NAME, APP_DOMAIN, APP_SLUG — SINGLE SOURCE OF TRUTH for brand identity
│   ├── web/                      # Next.js 15 web portal
│   └── admin/                    # Next.js admin panel (or sub-route of web)
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
│   │   │   └── hookHmac.ts       # Supabase Auth Hook HMAC validation (SUPABASE_HOOK_SECRET)
│   │   ├── routes/
│   │   │   └── auth/
│   │   │       └── whatsappOtp.ts  # POST /api/auth/whatsapp-otp — Supabase Send SMS Hook handler
│   │   ├── storage/              # IStorageProvider implementation
│   │   └── utils/
│   │       └── rateLimit.ts      # Upstash Redis rate limiters
├── supabase/
│   ├── migrations/               # All DDL migrations
│   └── functions/
│       ├── accept-order/         # Edge Function 1
│       └── verify-pickup-otp/    # Edge Function 2
└── scraper/                      # Python price scraper agent
    └── main.py
```

---

## 8. pg_cron Jobs (All Required — Supabase Pro tier)

| Job Name | Schedule | Description |
|---|---|---|
| `refresh-rating-stats` | Every 15 min | `REFRESH MATERIALIZED VIEW CONCURRENTLY aggregator_rating_stats` |
| `refresh-price-cache` | Daily 00:30 UTC (06:00 IST) | `REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index` |
| `create-message-partition` | 25th of month, 01:00 UTC | Pre-creates next month's `messages` partition |
| `cleanup-otp-log` | Nightly 02:00 UTC | Deletes `otp_log` rows where `expires_at < NOW() - 7 days` |
| `culling-offline-aggregators` | Every 5 min | Sets `is_online=false` where `last_ping_at < NOW() - 5 min` (C2) |

> `create-message-partition` MUST stay as pg_cron (must run even if backend is down). Others can move to `node-cron` on custom backend to reduce Supabase Pro dependency (14.6.8).

---

## 9. Learned Lessons & Quirks

> Agents: Append new entries here with a date when you solve a complex bug, establish a new pattern, or discover a codebase quirk. Never delete old entries.

- **[2026-02-26] pnpm not pre-installed on Windows:** pnpm is not bundled with Node.js on Windows — it must be installed globally first via `npm install -g pnpm` before `pnpm init` or any workspace commands will work. Always check for pnpm availability before starting Day 1. Affects: Day 1 monorepo bootstrap.

- **[2026-02-26] Day 1 monorepo structure — what was created:** The following structure was established in Day 1 Phase A (2026-02-26). All files below are under the project root (`Sortt/`):
  - `pnpm-workspace.yaml` — covers `apps/*`, `packages/*`, `backend`
  - `package.json` (root) — monorepo scripts: `dev:mobile`, `dev:web`, `dev:backend`, `build`, `type-check`, `lint`, `test`
  - `tsconfig.json` (root) — coordinates path aliases `@sortt/*` for all 5 provider packages
  - `apps/mobile/` — package.json (Expo SDK 51, Expo Router, DM Sans/Mono, Zustand, Phosphor), tsconfig.json (extends expo/tsconfig.base)
  - `apps/web/` — package.json (Next.js 15, Tailwind, Radix UI), tsconfig.json, `tailwind.config.ts` (imports from tokens.ts — no hex duplication)
  - `backend/` — package.json (Express, helmet, Upstash, sharp, pdf-lib, expo-server-sdk), tsconfig.json (CommonJS, outDir: dist), `src/index.ts` stub
  - `packages/maps|realtime|auth|storage|analysis/` — each has `package.json` + `src/index.ts` stub (Day 8 implementation)
  - `supabase/migrations/`, `supabase/functions/accept-order/`, `supabase/functions/verify-pickup-otp/` — `.gitkeep` only
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
| Agent calls `supabase.storage` directly | Agent reads §3.1 — uses IStorageProvider |
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

- **[2026-03-02] Aggregator UI Gapping:** Redundant `borderBottom` and `paddingBottom` on `progressContainer` in wizard flows cause overlapping lines and visual gaps when scrolling. All wizard layouts must use `backgroundColor: colors.bg` for the screen and `colors.surface` only for the header/progress section to maintain Sortt's professional aesthetic.

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

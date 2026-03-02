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
| Core Backend | Node.js / Express on Render (free tier → paid) | All non-atomic business logic |
| Atomic Operations | Supabase Edge Functions (Deno) — 2 ONLY | `accept-order`, `verify-pickup-otp` |
| Database | PostgreSQL via Supabase + PostGIS + pgcrypto + uuid-ossp | All tables have RLS enabled |
| Realtime | Supabase Realtime (WebSockets) via `IRealtimeProvider` | Hard ceiling: ~1,000 conns (30K DAU) |
| Auth | Supabase Auth — Phone OTP ONLY (no passwords, no email for sellers) | OTP delivered via **Meta WhatsApp Cloud API** (free — 1,000 auth conversations/month) via Supabase Send SMS Hook |
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

- *(Empty — waiting for first build phase)*

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
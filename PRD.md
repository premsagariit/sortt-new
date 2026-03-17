# ♻ [APP_NAME]
## Hyperlocal Scrap Marketplace

> ⚠️ **APP NAME PLACEHOLDER NOTICE**
> The name **"Sortt"** used throughout this document is a **placeholder only**. The final product name has not been decided. All references to "Sortt" in this document — including the vision statement, user-facing copy examples, and section headings — should be read as `[APP_NAME]`. See MEMORY.md for rebrand instructions.

# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Version 1.4 | MVP Release**
**Pilot City: Hyderabad, India**
**February 2026**

> 📋 **v1.4 CHANGE SUMMARY (from v1.3)**
> PRD audited and updated against TRD v4.1, PLAN.md v2.0 (Days 4–17), UI_REFERENCE.md v2.0, and MEMORY.md.
> Key corrections in this version:
> - §5.3: Order matching corrected — city_code + material filter only. No PostGIS radius. "Broadcast radius expansion" language removed. "Viewed by aggregators" list removed (not in schema).
> - §5.8: E-Way Bill explicitly marked post-MVP (not in Days 4-17 plan).
> - §5.9: Route planning corrected to reference `IMapProvider` abstraction, not Google Maps SDK directly.
> - §5.11: Distance-based search filters removed (no PostGIS in MVP schema).
> - §6.2: Scrap Listing Wizard steps corrected to match UI_REFERENCE.md §3 layout.
> - §6.4: Aggregator My Orders "Scheduled" tab removed (Active/Completed/Cancelled only per UI_REFERENCE.md §4.5).
> - §8.3: Admin security respecified from "2FA" to TRD v4.1 §14 security controls (IP allowlist, lockout, audit log). V36/V37/V38 entries from TRD v4.1 §14.8 added.
> - §8.5: Telugu localisation marked post-MVP (English-only at MVP launch per PLAN.md Days 4-17).
> - §9: MVP scope roadmap corrected to 17-day plan matching PLAN.md v2.0.
> - §10: Build tool reference updated. TRD reference updated to v4.1.
> - §11: All 6 original open questions reviewed — 2 resolved (admin panel, GST template). 5 new TRD-derived open questions (OQ-1 to OQ-5) added.

> ✅ **Implementation Sync Note (2026-03-16)**
> - Human-readable order identifiers are now live via backend `order_display_id` (format `#000001`).
> - Database migration `0018_order_number_per_seller.sql` has been applied for per-seller sequential numbering.
> - Mobile execution flow now threads route `id` across navigate → weighing → OTP → confirm → receipt screens.
> - Workspace gate check: `pnpm type-check` exits 0.
> - ✅ **Order data integrity overhaul (2026-03-18):** aggregator acceptance now snapshots per-material buy-rates into order items; seller and aggregator order detail screens consume canonical item/totals fields; seller completed flow now supports inline rating submission gated by `seller_has_rated`.

---

## 1. Executive Summary

**[APP_NAME]** is a hyperlocal, two-sided marketplace mobile and web application that digitises India's informal scrap recycling economy. The platform connects individual households, residential communities, offices, industries, and factories (Sellers) with verified local scrap aggregators and kabadiwallas (Aggregators) to facilitate transparent, efficient, and trusted scrap transactions.

India's scrap and recycling sector is estimated at over ₹1 lakh crore annually, yet remains almost entirely unorganised. Sellers have no visibility into fair prices; aggregators waste time and fuel on fragmented logistics; and there is zero trust infrastructure between the two sides. **[APP_NAME]** resolves all three pain points through real-time price transparency, AI-assisted scrap evaluation, structured order management, and a robust trust layer.

The product will pilot in Hyderabad and expand city by city. The first six months operate on an ads-only revenue model; a hybrid subscription-and-ads model activates from Month 7 onward.

---

## 2. Product Vision & Goals

### 2.1 Vision Statement

To become the most trusted digital bridge between scrap sellers and aggregators across India — making scrap disposal fair, efficient, and sustainable for every household and business.

### 2.2 Goals for v1 MVP

- Onboard 30+ verified aggregators and 200+ sellers in Hyderabad within 3 months of launch.
- Achieve an average order completion rate of ≥ 70% within the first 60 days.
- Reduce average time-to-pickup from order creation to under 24 hours for 80% of orders.
- Establish the app as the go-to price reference for scrap in Hyderabad.

---

## 3. User Personas

### 3.1 Seller Personas

| Attribute | Household / Office Seller | Industry / Factory Seller |
| :--- | :--- | :--- |
| **Who they are** | Urban households, apartment residents, small offices | Manufacturing units, warehouses, hospitals, bulk offices |
| **Volume** | 5–50 kg per transaction, occasional | 500 kg – several tonnes, recurring |
| **Primary need** | Convenience, fair price, no price haggling | Compliance (GST/E-way), scheduled bulk pickup, invoice trail |
| **Platform** | Mobile app (Android/iOS) | Web portal + mobile app |
| **Tech comfort** | Medium — comfortable with WhatsApp/Swiggy-level UX | High — used to ERPs and portals |

### 3.2 Aggregator Personas

| Attribute | Shop-based Aggregator | Mobile Aggregator (Tempo/Auto) |
| :--- | :--- | :--- |
| **Who they are** | Fixed scrap shop owner with storage space | Travelling kabadiwalla, picks up from households |
| **Volume handled** | High volume, can negotiate bulk deals | Low-to-medium volume per trip |
| **Primary need** | Larger order pipeline, reduce missed pickups | Route optimisation, reduce empty travel time |
| **Tech comfort** | Low-to-medium — may need onboarding support | Low — must be extremely simple UX |

---

## 4. Platform Overview

### 4.1 Platforms Supported

- **Mobile App:** Android & iOS (primary for all user types)
- **Web Application:** Browser-based portal, mandatory for Industry/Factory sellers and recommended for shop-based aggregators. Must stay in real-time sync with the mobile app.

### 4.2 User Types

- Seller – Household/Office (mobile-first)
- Seller – Industry/Factory (web + mobile, 'Business Mode')
- Aggregator – Shop-based or Mobile (mobile-first)
- Admin – Internal operations panel (web only, integrated into the web portal behind a role-based auth wall)

---

## 5. Feature Requirements

### 5.1 Onboarding & Registration

#### 5.1.1 Seller (Household/Office)

- Phone number entry + OTP verification (no email required). OTP delivered via WhatsApp.
- Name, locality/area, and city selection.
- Profile photo (optional).
- Account type selection: Individual or Business (routes to Business Mode if Business selected).

#### 5.1.2 Seller (Industry/Factory) — Business Mode

- Phone + OTP verification. OTP delivered via WhatsApp.
- Business name, GSTIN (optional at signup, mandatory for GST invoice generation), address, and industry type.
- Multi-user access: Admin user can invite up to 5 sub-users under the same business account.
- Recurring pickup schedule configuration during onboarding (weekly/bi-weekly/monthly). Schedule stored as structured JSONB in `seller_profiles.recurring_schedule`.

#### 5.1.3 Aggregator

- Phone number + OTP verification. OTP delivered via WhatsApp.
- Full name, business name (if applicable), operating area (select city + locality zones).
- Aggregator type: Shop-based or Mobile (tempo/auto).
- Document upload (Lightweight KYC — reviewed manually by admin in v1): Aggregators must upload exactly 4 photos:
  1. **Aadhaar Card Front** — required for all aggregators.
  2. **Aadhaar Card Back** — required for all aggregators.
  3. **Selfie (face photo)** — required for all aggregators.
  4. **Shop exterior photo** (if `aggregator_type = 'shop'`) **OR Full vehicle photo** (if `aggregator_type = 'mobile'`) — conditional on aggregator type selected during onboarding.
  The conditional photo slot is determined server-side from `aggregator_profiles.aggregator_type` — never from client input.
- Material types handled: multi-select (paper, plastic, metal, electronics, glass, fabric).
- Operating hours and days.
- Price setting per material type per kg (can be updated anytime from Price Management screen).
- **Note:** Aggregator profiles go live only after admin approval of KYC documents. Status shown in-app.

### 5.2 Scrap Listing (Seller Flow)

- Material type selection: multi-select from predefined categories (Paper, Plastic — PET/HDPE/other, Metal — iron/copper/aluminium, Electronics/E-waste, Glass, Fabric/Clothes).
- Photo upload of scrap pile — mandatory for order creation. Taken via camera or gallery.
- AI image analysis (Gemini Vision API — **Day 15 feature**): validates that the image matches selected categories, estimates material mix, flags mismatches, and suggests any additional categories. AI output is a **hint only** — never used to pre-populate confirmed weights or invoice amounts.
- Approximate weight entry (kg) per material — enforced minimum threshold per category (e.g. 1 kg metal, 2 kg paper).
- Instant estimated quote shown to seller based on city-average aggregator rates after material + weight entry.
- Optional: Seller notes/description field (max 500 characters).
- Pickup preference: Schedule a pickup OR Drop-off at aggregator's location (free pickup is the default and highlighted).
- Preferred date/time window for pickup (if scheduling).
- In-app Earnings Calculator in this flow: as seller adds items and weights, a running estimate updates in real time based on live aggregator rates in their area.

### 5.3 Order Creation & Aggregator Matching

- On submission, the order is broadcast to all **verified, online aggregators in the seller's city** who handle at least one of the listed material types. Matching is by `city_code` (e.g. `HYD`) and the aggregator's configured material rates — **not by GPS radius or PostGIS proximity** (the schema does not use geospatial column types for matching in the MVP).
- Aggregators receive a push notification and in-app order card with: seller **locality** (not full address — V25), material types, approximate weight, and preferred pickup window.
- **First-accept-wins lock:** once an aggregator accepts, the order is locked to them and other aggregators see it as 'Taken' (HTTP 409 conflict).
- The accept operation is executed inside a single PostgreSQL transaction using `SELECT … FOR UPDATE SKIP LOCKED` to eliminate race conditions — no optimistic concurrency workaround.
- Aggregators may also open an in-app chat with the seller before accepting — for clarification only.
- **Pre-acceptance dismissal:** An aggregator may dismiss an order card from their feed locally. This is a client-side action only — no server state is updated and no `dismissed_by` table or column exists in the MVP schema (V36).

> **Post-MVP (not in Days 4–17):** Broadcast radius expansion logic, aggregator-viewed-order tracking, and seller-visible "aggregators who viewed" list are not implemented in the MVP. These require an `order_views` table and PostGIS proximity queries that are out of scope.

### 5.4 Pricing & Price Transparency

- **Daily Scrap Price Index:** An AI agent (Python scraper on Render) scrapes market data daily and publishes city-wise material rates (paper, plastic, metals, etc.) to the `price_index` table. Admin has manual override capability (`is_manual_override = true`). **This feature is delivered on Day 15.**
- Sellers see a city-average price range per material type (e.g. 'Paper: ₹8–12/kg in Hyderabad today') — sufficient to set expectations without enabling price wars.
- Aggregators set their own per-kg rates per material type from the Price Management screen. These rates are visible to sellers when browsing nearby aggregators.
- Sellers do not set prices. The market rate display removes unrealistic expectations.

### 5.5 In-App Communication

- Direct chat between seller and aggregator within an order context — no phone numbers exchanged.
- Chat is available from the moment an order is created through to order completion.
- Chat history stored per order for dispute resolution purposes.
- **Phone number filter (V26):** The backend applies a server-side regex to detect Indian phone number patterns and replace them with `[phone number removed]` before the message is stored in the database and before Ably broadcasts it. The stored content is always the filtered version.
- Push notifications for: new order nearby (aggregator), order accepted, message received, pickup ETA update, order completed, and pickup OTP sent.

### 5.6 Order Status Tracking

Both seller and aggregator track order status through the following states:

1. **Order Created** — Awaiting aggregator acceptance
2. **Order Accepted** — Aggregator confirmed, pickup scheduled
3. **En Route** — Aggregator is on the way (triggered manually by aggregator; displayed as "On the Way" in UI)
4. **Arrived** — Aggregator at seller location
5. **Weighing in Progress** — Scale photo submitted by aggregator
6. **OTP Verification** — Seller enters OTP to confirm pickup (seller sees transaction summary first)
7. **Order Completed** — Transaction recorded (only reachable via `/api/orders/:id/verify-otp` route)
8. **Cancelled** — By either party with mandatory reason selection
9. **Disputed** — Raised via `/api/disputes` route only; immutable thereafter (V13)

Statuses `completed` and `disputed` are **immutable**: no PATCH route may accept them as a target status. The state machine hard-rejects any direct client attempt.

Real-time status updates are delivered via **Ably** (V37). The Ably channel for an order is decommissioned after the order reaches a terminal status (`completed`, `cancelled`, `disputed`). The backend stops publishing to the channel post-terminal; mobile clients unsubscribe on screen unmount.

### 5.7 Pickup Confirmation & Weight Verification

- On arrival, the aggregator clicks a mandatory photo of the weighing scale with the scrap on it. The app timestamps and stores this image (EXIF metadata stripped via `sharp` — V18).
- The aggregator enters the final weight per material type and the total amount to be paid.
- **OTP delivery is system-initiated** — triggered automatically when the aggregator submits the scale photo. The backend generates a 6-digit OTP using `crypto.randomInt(100000, 999999)`, stores only an HMAC-SHA256 hash (keyed on `OTP_HMAC_SECRET`) in Upstash Redis with a 600-second TTL, and delivers the OTP via Meta WhatsApp Cloud API directly. No user-callable endpoint can trigger an OTP message; this architecture eliminates the WhatsApp harassment vector entirely (V9).
- The seller reviews the **full transaction summary** (material breakdown, confirmed weight per item, confirmed rate per kg, total amount) on screen — both parties see this together — before the seller enters the OTP. The OTP confirmation cryptographically binds to these specific confirmed values (C1), not merely to physical presence.
- The seller enters the OTP in the aggregator's app screen to confirm the pickup. This serves as digital acknowledgment of the transaction.
- For cash payments (default in v1): the app records the transaction as 'Cash Paid' with the agreed amount. No money flows through the app in v1.
- A transaction receipt is generated in-app for both parties showing: date, time, materials, weight, rate, total, and aggregator details.

### 5.8 GST Invoice Generation

- GST invoice generation is triggered for Business Mode seller transactions. For transactions exceeding ₹50,000 in value, generation is automatic.
- GST invoice generated using the seller's GSTIN (mandatory for Business Mode sellers) and aggregator's details.
- The invoice is template-based in v1 — full GST API integration is a v2 feature. In v1, a standard commercial template is sufficient; CA review is recommended but not a blocker for launch.
- Invoice PDFs stored in private storage (Uploadthing) with randomised path suffix. Accessible only via 5-minute signed URL after server-side ownership verification (D1).
- **Legal record:** The `invoices.invoice_data JSONB NOT NULL` column stores the structured invoice data for 6-year audit trail compliance under Indian GST law. The PDF is a rendering artifact only. This column must not be absent or `null` for any invoice record.

> **Post-MVP (not in Days 4–17):** E-Way Bill generation (for bulk goods in transit) is **not** in the Days 4–17 build plan and is deferred to a future release.

### 5.9 Bulk Pickup & Route Optimisation

- For mobile aggregators, the Route tab shows a map of pending orders within their operating area.
- Route map rendering uses the `IMapProvider` abstraction (`packages/maps/`) — **never** a direct Google Maps SDK import. The provider defaults to Google Maps but is swap-ready for Ola Maps via the `MAP_PROVIDER` environment variable.
- In v1: Aggregators manually select a cluster of nearby orders to batch into a single trip.
- The "Plan Route" button is live in the MVP UI but launches directions via `IMapProvider.getDirections()` for a single selected order. Multi-order batch routing is a v2 feature.

> **Post-MVP:** Algorithmic route optimisation (TSP-based) with automatic batch suggestions.

### 5.10 Ratings & Feedback

- After order completion, both seller and aggregator are prompted to rate each other (1–5 stars) and leave an optional text review (max 500 characters).
- Rating prompt appears once within 24 hours of order completion.
- Aggregator profiles display: average rating, total orders completed, and member since date.
- Seller profiles display: average rating and transaction history (visible to aggregators when reviewing an order).
- Aggregators with sustained ratings below 3.0 after 10+ orders are flagged for admin review.

### 5.11 Search & Filters

**For Sellers:**
- Browse aggregators by locality/area.
- Filter by: material type handled, rating.
- View aggregator profiles: materials, buy rates, operating hours, ratings.

> **Post-MVP:** Distance-based filtering and map-toggle view for aggregators require PostGIS proximity queries. The MVP schema uses `city_code` and `locality` text fields — no geospatial column types. Distance-based search is deferred until the cities table gains coordinate data.

**For Aggregators:**
- Browse pending orders in their city feed.
- Filter by: material type (via filter chips on the Order Feed screen).

> **Post-MVP:** Weight range filter, pickup date filter, and cross-locality distance filters require schema/query additions not in the MVP plan.

### 5.12 Dispute Resolution

**Layer 1 — Prevention**
- Mandatory scale photo at pickup (timestamped, EXIF-stripped — V18).
- OTP-based pickup confirmation creates a digital acknowledgment trail.
- In-app chat history preserved per order (including `[phone number removed]` filter — V26).

**Layer 2 — Complaint Filing**
- Either party can raise a dispute within 48 hours of order completion.
- Dispute form captures: issue type (wrong weight, payment not made, no-show, abusive behaviour, other), description (max 2000 characters), and optional evidence upload (photos via `IStorageProvider`).
- Both parties receive push notification and have 24 hours to submit their response and evidence.
- Disputes are raised via `POST /api/disputes`, which atomically sets `orders.status = 'disputed'` in the same database transaction.

**Layer 3 — Resolution (Manual in v1)**
- Admin manually reviews disputes using evidence (scale photos, chat history, OTP logs via `admin_audit_log`).
- Resolution communicated to both parties in-app via push notification within 72 hours.
- Outcomes: Dispute dismissed, warning issued, or order flagged.
- Policy of "3 upheld disputes = account review and possible ban" is displayed at aggregator onboarding.

> **Open Question OQ-1:** Is the "3 upheld disputes = account review" threshold enforced automatically (backend trigger or cron job suspends account) or requires manual admin action? If automated, a `seller_flags` insert + aggregator suspension trigger is needed. If manual, the admin panel needs a review queue UI. This decision is required before Day 10 disputes implementation. See §11.

---

## 6. Screen-by-Screen Breakdown

### 6.1 Common Screens (Both User Types)
| Screen | Key Elements |
| :--- | :--- |
| Splash / Launch | App logo, tagline, 4.8-second branded animation (`SplashAnimation.tsx`) |
| Onboarding (4 slides) | Feature highlights, Get Started CTA. Language selection not shown at MVP launch — English only. |
| User Type Selection | "I want to Sell Scrap" / "I am a Scrap Aggregator" |
| Phone OTP Screen | Phone number entry, OTP input (6 digits), resend timer, WhatsApp delivery copy |
| Profile Setup | Name, area/locality, account type — varies by user type |
| Notification Center | All alerts chronologically, tap to navigate to relevant order |
| Settings | Notification preferences, account details, help, logout |
| Help & Support | FAQ accordion, contact us, raise a dispute, terms & privacy |

> **Note on Onboarding:** The onboarding carousel has 4 slides (not 3). Language selection does not appear in the MVP onboarding flow — English is the only supported language at launch. See §8.5 and OQ-2.

### 6.2 Seller Screens (Household/Office)
| Screen | Key Elements |
| :--- | :--- |
| Home / Dashboard | Active orders summary, city scrap price range strip (Rate Ticker), nearby orders feed, "Sell Scrap" CTA card |
| **Listing Step 1 — Materials** | Material type multi-select with icons (`MaterialChip` grid), minimum weight guidance |
| **Listing Step 2 — Weights & Photo** | Photo capture (mandatory), per-material weight entry, AI estimate hint (read-only, Day 15), Earnings Calculator updating live |
| **Listing Step 3 — Pickup Preference** | Schedule vs Drop-off toggle, preferred date/time, address, seller notes field |
| **Listing Step 4 — Review & Submit** | Full order summary, Earnings Calculator total, Submit CTA |
| Order List | Tabs: Active / Completed / Cancelled. Each card shows status chip, materials, aggregator name (if accepted), pickup time |
| Order Detail | Full order timeline, aggregator profile card (post-acceptance), chat button, track on map button (en route), OTP entry on arrival |
| Browse Aggregators | List of aggregators in city with rating and top material buy rates. Filter by material |
| Aggregator Profile | Name, rating, materials handled, buy rates table, operating hours, reviews, Contact button |
| Transaction Receipt | Completion confirmation, invoice download (Business Mode only via signed URL), rating prompt |
| Rate & Review | Star rating input, optional text, submit — appears after order completion |

### 6.3 Seller Screens — Business Mode (Industry/Factory)
| Screen / Page | Key Elements |
| :--- | :--- |
| Business Dashboard | Monthly scrap volume chart, total earnings, upcoming scheduled pickups, compliance alerts |
| Bulk Listing | Same 4-step wizard as Household but with bulk weight fields, recurring schedule option, GSTIN entry for invoice |
| Recurring Pickup Manager | View/edit scheduled pickups, pause/resume, history |
| Compliance Documents | GST invoices for all eligible transactions, download as PDF (E-Way bills are post-MVP) |
| Team Management | Add / remove sub-users (up to 5), assign roles (View Only / Operator / Admin). Role enforcement at DB level via `business_members` table (R1). |

### 6.4 Aggregator Screens
| Screen | Key Elements |
| :--- | :--- |
| Home / Dashboard | Online/Offline toggle, greeting strip, nearby orders in city feed (locality only — V25), earnings today, Daily Price Index strip |
| Order Feed | All matching orders in city, material filter chips, Accept / Dismiss actions. Pre-acceptance: locality + material only. |
| Order Detail (Pre-Acceptance) | Seller locality, materials, approximate weight, pickup window, 409 conflict state ("Order already taken"), Accept button |
| Order Detail (Post-Acceptance) | Full address revealed (V25), seller name + phone last 4, Get Directions, Chat with Seller, status progression buttons |
| My Orders | Tabs: **Active / Completed / Cancelled** (3 tabs). Status progression controls (Mark On the Way, Mark Arrived, Start Weighing). |
| Pickup Confirmation | Scale photo upload (mandatory), weight entry per material, running total, OTP entry field from seller |
| Route Planner | Map placeholder via `IMapProvider` stub, pending order pins list with locality, "Plan Route" button |
| Price Management | Set/edit buy rate per kg per material type, last updated timestamp, market reference comparison |
| Earnings Dashboard | Today / This Week / This Month tabs. Total earnings (DM Mono, amber). Bar chart. Material breakdown. Completed orders list. Average rating. |
| Daily Price Index | City-wise material rates updated daily by AI scraper (Day 15), last updated timestamp, admin-corrected flag if manually adjusted |
| Profile & Settings | KYC status chip, operating area, materials handled, operating hours, buy rates, reviews, Log Out |

---

## 7. Revenue Model

### 7.1 Phase 1: Months 1–6 (Ads Only)

- Non-intrusive banner ads shown to all users (MVP: ad slots exist as placeholders; live ad network integration is post-MVP).
- Ad frequency: max 1 ad per 5 screens to avoid user irritation.
- No subscriptions, no platform fees, no transaction cuts.
- Goal: Build user base and transaction volume. Revenue is secondary.

### 7.2 Phase 2: Month 7 Onward (Hybrid Model)
| User Type | Free Tier | Subscription / Paid Tier |
| :--- | :--- | :--- |
| Household Seller | Ads shown | Small monthly fee (e.g. ₹29–49/month) → No ads for that month |
| Aggregator | Ads shown + platform commission on earnings (1–2%) | Subscription flat fee option → No ads, priority matching |
| Industry / Factory | Ads shown | Monthly flat fee → No ads, priority order matching, dedicated support |

> **Aggregator Commission:** The `aggregator_material_rates` table and `order_items` schema support commission calculation on a per-order basis. The backend route for automated commission calculation is **post-MVP**. In v1, commission tracking is manual/admin-only.

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Order broadcast to aggregators: < 3 seconds from seller submission.
- AI image analysis result: < 5 seconds for standard image (Day 15 feature).
- App load time (cold start): < 3 seconds to first interactive content on a 4G connection. The first-launch branded splash animation (`SplashAnimation.tsx`) runs for 4.8 seconds by design — this is a deliberate UX and brand moment, not a performance issue. The splash uses this window to prefetch auth session state and market rates in the background.

### 8.2 Availability

- Target uptime: 99.5% for v1 (improvement to 99.9% by v2).
- Graceful offline mode: sellers can draft a listing offline; it submits when connection is restored (photo queued locally, uploaded on reconnect — C3).

### 8.3 Security

All security constraints listed here are mandatory for MVP launch. Full technical specifications are in TRD v4.1 Section 14.

- All API calls over HTTPS/TLS. SSL enforced at Azure PostgreSQL level (`sslmode=require`).
- No personal phone numbers shared between users — all communication in-app. Phone numbers are stored only as HMAC-SHA256 hashes (`phone_hash` keyed on `PHONE_HASH_SECRET`). The hash is irreversible — rotation of `PHONE_HASH_SECRET` requires re-enrollment of all users.
- OTP-based authentication for all users. OTPs delivered via **Meta WhatsApp Cloud API** (free tier: 1,000 authentication conversations/month). OTPs are generated server-side in the custom backend (Express on Azure App Service) using `crypto.randomInt`, stored only as HMAC-SHA256 hashes (keyed on `OTP_HMAC_SECRET`), and delivered directly to WhatsApp.
- Scale photos, KYC documents, and GST invoices stored in **Uploadthing** private storage. All sensitive media served via short-lived signed URLs (5-minute expiry) generated server-side after ownership verification. No direct public file URLs exposed. See TRD v4.1 §14.5 (D1).
- **Admin panel security** is enforced via: IP allowlisting (`ADMIN_IP_ALLOWLIST` env var via Vercel Edge Middleware), 10-attempt lockout, 15-minute inactivity re-auth, and comprehensive `admin_audit_log` table for all admin actions. See TRD v4.1 §14.1 (X4).
- Custom backend (Azure App Service) must verify **Clerk JWT** on every API route via middleware before processing any request — after Clerk validation, the middleware additionally re-fetches `user_type` and `is_active` from the DB (never trusts JWT claims for these fields — V7). See TRD v4.1 §14.1 (A1).
- Push notification bodies must not include names, amounts, or location details visible on the device lock screen. Generic copy only; PII revealed in-app after authentication. See TRD v4.1 §5.2 (D2).
- OTP pickup confirmation must bind to the confirmed weight and amount values (not just physical presence). Seller must review the full transaction summary before entering the OTP. See TRD v4.1 §14.6 (C1).
- AI image analysis output (Gemini Vision) is a seller-facing hint only and must never be written directly to order records or used as the basis for invoice amounts. See TRD v4.1 §14.4 (I1).
- Business Mode sub-user roles (view-only / operator / admin) must be enforced at the database level via the `business_members` table and matching RLS policies. See TRD v4.1 §14.2 (R1).
- **Pre-acceptance order dismissal (V36):** When an aggregator dismisses an order from their feed, this is a client-side action only. No server state, no DB column (`dismissed_by`), and no `dismissed_orders` table exist or are required. The dismissed state resets if the aggregator refreshes the feed.
- **Ably channel lifecycle (V37):** The Ably realtime channel for an order is decommissioned once the order reaches a terminal status (`completed`, `cancelled`, `disputed`). The backend stops publishing to the channel; mobile clients unsubscribe on screen unmount. No explicit channel deletion call is required — Ably's channel inactivity TTL handles cleanup.
- **Price scraper SSRF hardening (V38):** The AI price scraper fetches material rates from a hard-coded allowlist of source URLs only. The `price_index.source_url` column is display-only — the scraper never re-fetches from a URL stored in the database. All outbound HTTP requests include pre-resolution IP validation to block RFC 1918 and loopback addresses.

### 8.4 Scalability & Vendor Lock-In Constraints

The following constraints arise from the MVP technology choices and must be accounted for in roadmap planning. Full technical detail is in TRD v4.1 §15.

- **Realtime chat and order status updates** are delivered via **Ably** (India edge nodes), which provides 200 concurrent WebSocket connections on the free tier and 6 million messages per month. The free connection ceiling is hit at approximately 200 simultaneous active users. The engineering team must upgrade to the Ably paid tier ($29/month) before that threshold. Mobile clients connect to Ably using **Token Auth** (`GET /api/realtime/token`) — not a hardcoded API key. The `ABLY_API_KEY` env var is backend-only and must never be exposed to the mobile client bundle. See TRD v4.1 §6.5.

- **The in-app AI scrap image analysis feature** (Gemini Vision) is rate-limited to 1,500 requests per day on the free tier. At approximately 75,000 DAU with a 2% daily listing rate, the daily quota is exceeded. Product must plan the transition to paid Gemini usage at that scale, with per-user rate limiting and a global circuit breaker in place from day one. See TRD v4.1 §15.1.

- **City expansion** requires a database schema update (adding coordinate or zone precision columns to the `cities` reference table). This is low-risk today and high-risk under live multi-city traffic. The cities table migration must be completed before the second city launches. Product roadmap must flag this as a technical prerequisite for city 2. See TRD v4.1 §15.2.

- **GST invoice PDFs** must be accompanied by structured source data stored in `invoices.invoice_data JSONB NOT NULL` for 6-year audit trail compliance under Indian GST law. The invoice generation feature may not ship without this — the PDF alone is not sufficient as a legal record. See TRD v4.1 §15.3.

- **Push notification delivery** relies on Expo Push Service (wrapping FCM and APNs). To avoid a forced re-registration migration, the mobile app must register **both** Expo push tokens and native FCM/APNs raw tokens in the `device_tokens` table from day one. See TRD v4.1 §15.2.

- **Multi-city pricing** requires per-city price indices. The current price scraper is single-city by design. Before city 2 launch, the scraper must be extended to support per-city source URLs, and the price index query must filter by `city_code`.

- **OTP delivery** via Meta's WhatsApp Cloud API provides 1,000 free authentication conversations per month. The engineering team must enable paid Meta billing before this threshold is reached. See TRD v4.1 §14.3 (RA2).

- **Aggregator OTP verification** must verify server-side that only the assigned aggregator (`aggregator_id` on the order) can submit OTP confirmation for a given order. This check runs inside the same database transaction as the OTP validation. See TRD v4.1 §14.1 (V8).

- **Order status `completed`** may only be set by the `POST /api/orders/:id/verify-otp` Express route after successful OTP validation within an atomic database transaction. No direct status update endpoint may accept `completed` or `disputed` as a target status (V13).

- **The order feed shown to aggregators** must display only locality-level address (not full street address) until after the aggregator accepts the order. The `pickup_address_text` field must be `null` in the API response DTO for pre-acceptance requests — not merely hidden in the UI (V25).

- **In-app chat must technically prevent phone number sharing.** A server-side regex filter must detect and remove Indian phone number patterns from messages before they are stored in the database and broadcast via Ably (V26).

- **The admin panel must never use backend service credentials client-side.** The Clerk secret key and database credentials must never appear in any client bundle or `NEXT_PUBLIC_*` environment variable (V12, V-CLERK-1).

- **Aggregator KYC status (`kyc_status`)** must only be updatable by admin-authenticated backend routes. It is blocklisted from all aggregator-facing profile update endpoints, enforced by a DB trigger that blocks updates from non-admin database sessions (V35).

### 8.5 Localisation

- **MVP Launch:** English only. All UI copy, onboarding, and error messages are in English.
- **Post-MVP:** Telugu language support is planned as a future release. The `preferred_language` column on the `users` table is present in the schema, but i18n library integration and translation files are **not** in the Days 4–17 build plan. See OQ-2 (§11).
- Number formats: Indian numbering system (lakhs/crores).
- Currency: INR (₹) throughout.

### 8.6 Accessibility

- Font size minimum 14px for body text, 16px for interactive elements.
- Aggregator app flows designed for low-tech-comfort users: maximum 3 taps to complete any primary action from the home screen (3-tap rule — hard UX constraint).
- Minimum 48dp touch target height on all interactive elements (WCAG AA).

---

## 9. MVP Scope vs Future Roadmap

The MVP is built over 17 days in a sequential single-thread model. The exact day ownership is defined in PLAN.md — this table provides the product-level view.

| Phase | Days | Focus | Key Deliverables |
| :--- | :--- | :--- | :--- |
| **Phase 1: UI Shells** | Days 1–3 | Static screens, no backend | Design system, all seller + aggregator mobile screens with mock data |
| **Phase 2: Database** | Days 4–5 | Schema + RLS + indexes | Azure PostgreSQL live, all migrations applied, RLS active on every table |
| **Phase 3: Backend Core** | Days 6–7 | Express foundation + Auth | Helmet, CORS, JWT middleware, WhatsApp OTP end-to-end, node-cron scheduler |
| **Phase 4: Auth Wiring** | Day 8 | Mobile auth live | Clerk integration, real OTP on device, push token registration |
| **Phase 5: Order Routes** | Days 9–10 | Core API live | Order CRUD, media upload, aggregator feed, market rates, chat, disputes |
| **Phase 6: Mobile Wiring** | Day 11 | Real data on mobile | Mock data replaced, all screens wired to live API |
| **Phase 7: Atomic Ops** | Day 12 | Accept + OTP routes | First-accept-wins race condition handled, OTP pickup verification live |
| **Phase 8: Realtime** | Day 13 | Ably + Push | Live chat, status updates without refresh, push notifications |
| **Phase 9: Providers** | Day 14 | Provider abstractions | All 5 provider packages complete (maps, realtime, auth, storage, analysis) |
| **Phase 10: Intelligence** | Day 15 | AI + Invoice + Scraper | Gemini image analysis, GST PDF invoices, daily price scraper |
| **Phase 11: Web + Admin** | Day 16 | Web portal + tests | Business Mode dashboard, Admin dispute/KYC panel, test suite |
| **Phase 12: Launch** | Day 17 | Security + CI/CD | Security audit, monitoring (PostHog, Sentry), production deploy |

**Post-MVP roadmap (not in Days 4–17):**
- Telugu (and other regional languages) localisation
- PostGIS proximity matching + distance-based search filters
- E-Way Bill generation
- Algorithmic route optimisation (TSP)
- Aggregator commission backend route (automated calculation)
- Referral & rewards system (`referral_code` / `referred_by` columns in `seller_profiles`)
- Subscription payment integration
- Paid ad network integration

---

## 10. Development Context

This document is a PRD only. Full technical architecture is in TRD v4.1.

- **Primary build approach:** Agent-assisted development using Antigravity (Google DeepMind) — structured, sequential feature development across frontend and backend.
- **AI features:** Google Gemini API (Gemini Flash Vision for image analysis; Gemini Pro for AI price-scraping agent). Delivered on Day 15.
- **OTP delivery:** Meta WhatsApp Cloud API called directly from Express backend — zero cost up to 1,000 authentication conversations/month.
- **Auth provider:** Clerk — handles session management, JWT issuance, and device sessions. India SMS/WhatsApp region must be enabled in Clerk Dashboard before launch.
- **Realtime:** Ably — India edge nodes ensure low latency for order status updates and in-app chat. Mobile clients use Token Auth via `GET /api/realtime/token` (no raw Ably key in client bundle).
- **Storage:** Uploadthing — private file storage with server-generated signed URLs for KYC documents, scale photos, and GST invoices.
- **Database:** Azure PostgreSQL Flexible Server B1ms (Central India) — full relational schema with Row Level Security on every table. No PostGIS — geospatial matching uses `city_code` and `locality` text fields.
- **Backend hosting:** Azure App Service (Central India, free tier) — all business logic, OTP generation, vendor API calls, and node-cron scheduled jobs.
- **Scheduled jobs:** node-cron on Express (replaces pg_cron). Five jobs: aggregator culling (5 min), rating stats refresh (15 min), price cache refresh (daily 00:30 UTC), OTP log cleanup (nightly 02:00 UTC), message partition creation (25th of month).
- **Atomic operations:** Express routes using PostgreSQL transactions with `SELECT … FOR UPDATE SKIP LOCKED` (replaces Supabase Edge Functions).
- Deployment, CI/CD, and hosting architecture defined in TRD v4.1.

> ⚠️ **India Infrastructure Note:** Supabase (`*.supabase.co`) and Firebase (`*.firebaseapp.com`) are subject to active ISP-level DNS blocks in India as of February 2026 under Section 69A of the IT Act. Neither service is used in this product. All infrastructure services use custom domains or India-accessible endpoints, ensuring no single government domain block can take the product offline.

---

## 11. Open Questions & Decisions Pending

### 11.1 Original Open Questions (Status Updated)

| Question | Status |
| :--- | :--- |
| What is the exact minimum weight threshold per material category? | **Open** — to be validated with aggregator feedback during onboarding pilot. Engineering default: 1 kg metal, 2 kg paper (from TRD §8.1 `material_types.min_weight_kg`). |
| What is the aggregator subscription fee percentage? | **Open** — suggested 1–2% of monthly earnings; needs market testing in Phase 7. |
| Should the app show the seller which specific aggregator has viewed their order before acceptance, or only the accepted aggregator? | **Resolved: Only the accepted aggregator is shown.** An `order_views` tracking table is not in the MVP schema. Pre-acceptance: seller sees "Awaiting aggregator" state. Post-acceptance: seller sees accepted aggregator's name and rating. |
| What is the exact security deposit amount for aggregators in v2? | **Open (v2)** — ₹500–₹1,000 suggested; research required. |
| Will the admin panel be a standalone web app or integrated into the main web portal behind a role-based auth wall? | **Resolved: Integrated into the web portal behind a role-based auth wall.** Admin routes (`/api/admin/*`) are protected by Clerk JWT + DB-verified `is_admin` role check. The web portal has an `/admin` section (Day 16). No separate deployment needed. |
| GST invoice template: does this need a CA's input for legal compliance, or is a standard template sufficient for v1? | **Resolved: Standard template is sufficient for v1.** CA review is recommended before launch but is not a blocker. The `invoices.invoice_data JSONB NOT NULL` column satisfies the audit trail requirement. Full GST API integration is v2. |

### 11.2 TRD-Derived Open Questions (Product Decisions Required)

These questions were identified in the TRD v4.1 patch session. They require product decisions before the indicated implementation day.

| ID | Question | Blocking Day | Owner |
| :--- | :--- | :--- | :--- |
| **OQ-1** | **Dispute escalation threshold:** The PRD states "3 upheld disputes = account review and possible ban." Is this automated (backend trigger / cron job suspends the aggregator account) or manual (admin reviews a queue in the admin panel)? If automated, a `seller_flags` insert path + aggregator suspension trigger is required. If manual, the admin panel (Day 16) needs a "flagged aggregators" queue view. | Day 10 | Product |
| **OQ-2** | **Localisation scope for MVP:** The `preferred_language` column exists in `users` schema. Is i18n (Telugu or other language) in-scope for Days 4–17? If yes, which library (i18next or expo-localization), which strings, and at which day? If no, `(seller)/language.tsx` must be explicitly annotated as post-MVP and the onboarding language selection slide disabled. Current PRD assumes English-only at MVP launch. | Day 14 | Product |
| **OQ-3** | **Ably key strategy for Next.js web portal (Day 16):** TRD §6.5 specifies Token Auth for mobile clients. Does the web portal also require full Token Auth (requiring a server-side token endpoint call per browser session), or is a restricted read-only Ably capability key acceptable for the web portal's use case (order status display only, no chat send)? | Day 14 | Engineering + Product |
| **OQ-4** | **Referral & rewards schema timing:** No `referral_code` or `referred_by` columns exist in `seller_profiles` schema. When does this need to be added — before or after MVP launch? Adding it post-launch requires a schema migration under live traffic. If pre-launch, it should be added to `migrations/0003_profiles.sql`. | Post-launch (or Day 4 if pre-launch) | Product |
| **OQ-5** | **`account-type.tsx` vs `user-type.tsx` filename:** UI_REFERENCE.md §3 lists the file as `account-type.tsx`. PLAN.md §2.1 lists it as `user-type.tsx`. The actual filename on disk must be confirmed, and whichever doc is wrong must be corrected before Day 12 auth wiring (which hardcodes this route). Needs a 30-second `ls` check, not a design decision. | Day 12 | Engineering |

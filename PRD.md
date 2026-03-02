# ♻ [APP_NAME]
## Hyperlocal Scrap Marketplace

> ⚠️ **APP NAME PLACEHOLDER NOTICE**
> The name **"Sortt"** used throughout this document is a **placeholder only**. The final product name has not been decided. All references to "Sortt" in this document — including the vision statement, user-facing copy examples, and section headings — should be read as `[APP_NAME]`. See MEMORY.md for rebrand instructions.

# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Version 1.3 | MVP Release**
**Pilot City: Hyderabad, India**
**February 2026**

> 📋 **v1.3 CHANGE SUMMARY (from v1.2)**
> Infrastructure stack changed. Supabase removed — active India ISP block effective February 2026.
> The following product-referenced services have changed:
> - Auth: Supabase Auth → **Clerk** + direct Meta WhatsApp OTP from Express (no hook layer)
> - Realtime: Supabase Realtime → **Ably** (India edge nodes)
> - Storage: Supabase Storage → **Uploadthing** (private files, signed URLs)
> - Backend hosting: Render → **Azure App Service** (Central India)
> - Database: Supabase PostgreSQL → **Azure PostgreSQL Flexible Server** (Central India)
> - Atomic operations: Supabase Edge Functions → **Express routes** with PostgreSQL transactions
> All product features, user flows, acceptance criteria, and revenue model are unchanged.
> Only the infrastructure references within §5.7, §8.3, §8.4, and §10 are updated.

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
- Admin – Internal operations panel (web only, handled manually in first 6 months)

---

## 5. Feature Requirements

### 5.1 Onboarding & Registration

#### 5.1.1 Seller (Household/Office)

- Phone number entry + OTP verification (no email required). OTP delivered via WhatsApp.
- Name, locality/area, and city selection.
- Profile photo (optional).
- Account type selection: Individual or Business (routes to Business Mode if Business selected).

#### 5.1.2 Seller (Industry/Factory) — Business Mode

- Phone/email + OTP verification. OTP delivered via WhatsApp.
- Business name, GSTIN (optional at signup, mandatory for GST invoice generation), address, and industry type.
- Multi-user access: Admin user can invite up to 5 sub-users under the same business account.
- Recurring pickup schedule configuration during onboarding (weekly/bi-weekly/monthly).

#### 5.1.3 Aggregator

- Phone number + OTP verification. OTP delivered via WhatsApp.
- Full name, business name (if applicable), operating area (select neighbourhoods/zones).
- Aggregator type: Shop-based or Mobile (tempo/auto).
- Document upload: Aadhaar photo + shop photo or vehicle photo. (Lightweight KYC — reviewed manually by admin in v1.)
- Material types handled: multi-select (paper, plastic, metal, electronics, glass, fabric, etc.).
- Operating hours and days.
- Price setting per material type per kg (can be updated anytime).
- **Note:** Aggregator profiles go live only after admin approval. Status shown in-app.

### 5.2 Scrap Listing (Seller Flow)

- Material type selection: multi-select from predefined categories (Paper, Cardboard, Plastic — PET/HDPE/other, Metal — iron/copper/aluminium, Electronics/E-waste, Glass, Fabric/Clothes, Rubber, Mixed).
- Approximate weight entry (kg) — enforced minimum threshold per category (e.g. 2 kg paper, 1 kg metal).
- Photo upload of scrap pile — mandatory for order creation.
- AI image analysis (Gemini Vision API): validates that the image matches selected categories, estimates material mix, flags mismatches, and suggests any additional categories the seller may have missed.
- Instant estimated quote shown to seller based on city-average rates after AI analysis.
- Optional: Seller notes/description field.
- Pickup preference: Schedule a pickup OR Drop-off at aggregator's location (free pickup is the default and highlighted).
- Preferred date/time window for pickup (if scheduling).
- In-app Earnings Calculator in this flow: as seller adds items and weights, a running estimate updates in real time based on live aggregator rates in their area.

### 5.3 Order Creation & Aggregator Matching

- On submission, the order is broadcast to all verified aggregators within the seller's city who handle at least one of the listed material types, ranked by proximity to the seller.
- Broadcast radius: starts at 5 km; expands to 10 km after 15 minutes if no acceptance.
- Aggregators receive a push notification and in-app order card with: seller locality, material types, approximate weight, and preferred pickup window.
- First-accept-wins lock: once an aggregator accepts, the order is locked to them and other aggregators see it as 'Taken'.
- 15-minute acceptance window per aggregator ring before re-broadcast.
- Aggregators may also choose to 'Contact Seller' (via in-app chat) before accepting — for clarification, not negotiation.
- Sellers see a list of aggregators who have viewed the order, with their ratings and offered prices.

### 5.4 Pricing & Price Transparency

- **Daily Scrap Price Index:** An AI agent scrapes market data daily and publishes city-wise material rates (paper, plastic, metals, etc.) visible to aggregators in their dashboard. Admin has manual override to correct any inaccurate entries.
- Sellers see a city-average price range per material type (e.g. 'Paper: ₹8–12/kg in Hyderabad today') — enough to set expectations without enabling price wars among aggregators.
- Aggregators set their own per-kg rates per material type. These rates are visible to sellers when browsing nearby aggregators.
- Sellers do not set prices. The market rate display removes unrealistic expectations.

### 5.5 In-App Communication

- Direct chat between seller and aggregator within an order context — no phone numbers exchanged.
- Chat is available from the moment an aggregator views an order through to order completion.
- Chat history stored per order for dispute resolution purposes.
- Push notifications for: new order, order accepted, message received, pickup ETA update, order completed, and payment receipt.

### 5.6 Order Status Tracking

Both seller and aggregator track order status through the following states:

1. Order Created — Awaiting aggregator acceptance
2. Order Accepted — Aggregator confirmed, pickup scheduled
3. En Route — Aggregator is on the way (triggered manually by aggregator)
4. Arrived — Aggregator at seller location
5. Weighing in Progress — Scale photo submitted by aggregator
6. OTP Verification — Seller enters OTP to confirm pickup
7. Order Completed — Transaction recorded
8. Cancelled — By either party with mandatory reason selection

### 5.7 Pickup Confirmation & Weight Verification

- On arrival, the aggregator clicks a mandatory photo of the weighing scale with the scrap on it. The app timestamps and stores this image.
- The aggregator enters the final weight per material type and the total amount to be paid.
- The seller receives an OTP on WhatsApp on their registered mobile number. OTP delivery is **system-initiated** — triggered automatically when the aggregator submits the scale photo. The backend generates a 6-digit OTP, stores a cryptographic hash (HMAC-SHA256), and calls Meta's WhatsApp Cloud API directly. No user-callable endpoint can trigger an OTP message; this architecture eliminates the WhatsApp harassment vector entirely.
- The seller reviews the **full transaction summary** (material breakdown, confirmed weight per item, confirmed rate per kg, total amount) on screen — both parties see this together — before the seller enters the OTP. The OTP confirmation cryptographically binds to these specific values, not merely to physical presence.
- The seller enters the OTP in the aggregator's app screen to confirm the pickup. This serves as digital acknowledgment of the transaction.
- For cash payments (default in v1): the app records the transaction as 'Cash Paid' with the agreed amount. No money flows through the app in v1.
- A transaction receipt is generated in-app for both parties showing: date, time, materials, weight, rate, total, and aggregator details.

### 5.8 GST Invoice & E-Way Bill Generation

- Automatically triggered for transactions exceeding ₹50,000 in value.
- GST invoice generated using the seller's GSTIN (mandatory for Business Mode sellers) and aggregator's details.
- E-Way Bill generated for bulk goods in transit (applicable primarily for industry/factory orders).
- Documents available for download as PDF from the order history.
- In v1, this is template-based generation. Full GST API integration is a v2 feature.

### 5.9 Bulk Pickup & Route Optimisation

- For mobile aggregators, the app shows a map of all pending orders within their operating area.
- In v1: Aggregators manually select a cluster of nearby orders to batch into a single trip.
- The app generates a suggested route (Google Maps integration) for the selected batch of pickups.
- In v2: Algorithmic route optimisation (TSP-based) with automatic batch suggestions.

### 5.10 Ratings & Feedback

- After order completion, both seller and aggregator are prompted to rate each other (1–5 stars) and leave an optional text review.
- Rating prompt appears once within 24 hours of order completion.
- Aggregator profiles display: average rating, total orders completed, and member since date.
- Seller profiles display: average rating and transaction history (visible to aggregators when reviewing an order).
- Aggregators with sustained ratings below 3.0 after 10+ orders are flagged for admin review.

### 5.11 Search & Filters

**For Sellers:**
- Search aggregators by name or area.
- Filter by: material type handled, distance, rating, available today.
- View aggregator profiles: materials, rates, operating hours, ratings, location on map.

**For Aggregators:**
- Search pending orders by area or material type.
- Filter by: distance, material type, weight range, pickup date.

### 5.12 Dispute Resolution

**Layer 1 — Prevention**
- Mandatory scale photo at pickup (timestamped).
- OTP-based pickup confirmation creates a digital acknowledgment trail.
- In-app chat history preserved per order.

**Layer 2 — Complaint Filing**
- Either party can raise a dispute within 48 hours of order completion.
- Dispute form captures: issue type (wrong weight, payment not made, no-show, abusive behaviour, other), description, and optional evidence upload (photos).
- Both parties receive notification and have 24 hours to submit their response and evidence.

**Layer 3 — Resolution**
- In v1: Admin manually reviews disputes using evidence (scale photos, chat history, OTP logs).
- Resolution communicated to both parties in-app within 72 hours.
- Outcomes: Dispute dismissed, warning issued, or order flagged.
- Three upheld disputes against an aggregator = permanent account review and possible ban. Policy is displayed at aggregator onboarding.
- A refundable security deposit from aggregators (to be determined, possibly ₹500–₹1,000) may be implemented in v2 to fund financial remediation in proven fraud cases.

---

## 6. Screen-by-Screen Breakdown

### 6.1 Common Screens (Both User Types)
| Screen | Key Elements |
| :--- | :--- |
| Splash / Launch | App logo, tagline, loading animation |
| Onboarding (3 slides) | Feature highlights, language selection (Telugu/English), Get Started CTA |
| User Type Selection | I want to Sell Scrap / I am a Scrap Dealer |
| Phone OTP Screen | Phone number entry, OTP input, resend timer |
| Profile Setup | Name, area, account type — varies by user type |
| Notification Center | All alerts chronologically, tap to navigate to relevant order |
| Settings | Language, notification preferences, account details, help, logout |
| Help & Support | FAQ accordion, contact us, raise a dispute, terms & privacy |

### 6.2 Seller Screens (Household/Office)
| Screen | Key Elements |
| :--- | :--- |
| Home / Dashboard | Active orders summary, city scrap price range strip, nearby aggregators count, quick 'Sell Scrap' CTA |
| Sell Scrap — Step 1 | Material type multi-select with icons, minimum weight guidance |
| Sell Scrap — Step 2 | Photo capture / upload, AI analysis result overlay (categories confirmed/added, estimated quote), approve or re-take |
| Sell Scrap — Step 3 | Weight entry per category, Earnings Calculator updating live, notes field, pickup vs drop-off toggle |
| Sell Scrap — Step 4 | Preferred date/time picker, address confirmation on map, order summary review, Submit Order button |
| Order List | Tabs: Active / Past. Each card shows status chip, materials, aggregator name (if accepted), pickup time |
| Order Detail | Full order timeline, aggregator profile card, chat button, track on map (when En Route), OTP entry on arrival |
| Browse Aggregators | List + map toggle, filter bar, aggregator cards with rating and top material rates |
| Aggregator Profile | Photo, name, rating, materials handled, rates table, operating hours, reviews, Contact button |
| Transaction History | List of completed orders with amount received, download receipt option |
| Rate & Review | Star rating, optional text, submit — appears as modal after order |

### 6.3 Seller Screens — Business Mode (Industry/Factory)
| Screen / Page | Key Elements |
| :--- | :--- |
| Business Dashboard | Monthly scrap volume chart, total earnings, upcoming scheduled pickups, compliance alerts |
| Bulk Listing | Same flow as household but with bulk weight fields, recurring schedule option (weekly / bi-weekly / monthly), GSTIN entry for invoice |
| Recurring Pickup Manager | View/edit scheduled pickups, pause/resume, history |
| Compliance Documents | GST invoices and E-Way bills for all eligible transactions, download as PDF |
| Team Management | Add / remove sub-users (up to 5), assign roles (view only / can create orders) |

### 6.4 Aggregator Screens
| Screen | Key Elements |
| :--- | :--- |
| Home / Dashboard | Today's pending orders nearby (map + list), earnings today / this week, Daily Price Index strip |
| Order Feed | All matching orders in operating area, filter bar (material, distance, date), Accept / Chat / Reject actions |
| Order Detail | Seller locality, materials, weight, pickup window, chat, map to seller, Accept button |
| My Orders | Tabs: Active / Scheduled / Completed / Cancelled. Status progression controls (Mark En Route, Arrived, etc.) |
| Pickup Confirmation | Scale photo upload, weight entry per material, total amount display, OTP entry field from seller |
| Route Planner | Map of pending orders, multi-select for batch trip, suggested Google Maps route |
| Price Management | Set/edit price per kg per material type, last updated timestamp |
| Earnings Dashboard | Daily/weekly/monthly earnings chart, material-wise breakdown, order count |
| Daily Price Index | City-wise material rates updated daily by AI agent, last updated timestamp, admin-corrected flag if manually adjusted |
| Profile & Verification | KYC status, document upload, operating area editor, materials handled |

---

## 7. Revenue Model

### 7.1 Phase 1: Months 1–6 (Ads Only)

- Non-intrusive banner ads shown to all users.
- Ad frequency: max 1 ad per 5 screens to avoid user irritation.
- No subscriptions, no platform fees, no transaction cuts.
- Goal: Build user base and transaction volume. Revenue is secondary.

### 7.2 Phase 2: Month 7 Onward (Hybrid Model)
| User Type | Free Tier | Subscription / Paid Tier |
| :--- | :--- | :--- |
| Household Seller | Ads shown | Small monthly fee (e.g. ₹29–49/month) → No ads for that month |
| Aggregator | Ads shown | Small % of monthly earnings (e.g. 1–2%) as subscription → No ads |
| Industry / Factory | Ads shown | Monthly flat fee (similar to aggregator tier) → No ads, priority order matching, dedicated support |

---

## 8. Non-Functional Requirements

### 8.1 Performance

- Order broadcast to aggregators: < 3 seconds from seller submission.
- AI image analysis result: < 5 seconds for standard image.
- App load time (cold start): < 3 seconds to first interactive content on a 4G connection. Note: the first-launch branded splash animation (`SplashAnimation.tsx`) runs for 4.8 seconds by design — this is a deliberate UX and brand moment, not a performance issue. The splash uses this window to prefetch auth session state and market rates in the background. Subsequent launches after the splash has been seen are not subject to the animation delay.

### 8.2 Availability

- Target uptime: 99.5% for v1 (improvement to 99.9% by v2).
- Graceful offline mode: sellers can draft a listing offline; it submits when connection is restored.

### 8.3 Security

- All API calls over HTTPS/TLS.
- No personal phone numbers shared between users — all communication in-app.
- OTP-based authentication for all users. OTPs delivered via **Meta WhatsApp Cloud API** (free tier: 1,000 authentication conversations/month). OTPs are generated server-side in the custom backend (Express on Azure App Service), stored only as HMAC-SHA256 hashes, and delivered directly to WhatsApp — no third-party auth hook layer required.
- Scale photos and transaction records stored securely with access restricted to involved parties and admin. All sensitive media (KYC documents, scale photos, GST invoices) served via short-lived signed URLs (5-minute expiry) generated server-side after ownership verification. No direct public file URLs exposed to clients. See TRD v4.0 Section 14.5 (D1).
- Admin access protected by 2FA.
- Custom backend (Azure App Service) must verify Clerk JWT on every API route via middleware before processing any request. See TRD v4.0 Section 14.1 (A1).
- Push notification bodies must not include names, amounts, or location details visible on the device lock screen. Generic copy only; PII revealed in-app after authentication. See TRD v4.0 Section 5.2 (D2).
- OTP pickup confirmation must bind to the confirmed weight and amount values (not just physical presence). Seller must review the full transaction summary before entering the OTP. See TRD v4.0 Section 14.6 (C1).
- AI image analysis output (Gemini Vision) is a seller-facing hint only and must never be written directly to order records or used as the basis for invoice amounts. Final values always come from aggregator-confirmed entries. See TRD v4.0 Section 14.4 (I1).
- Business Mode sub-user roles (view-only / operator) must be enforced at the database level via a `business_members` table and matching RLS policies, not only via UI controls. See TRD v4.0 Section 14.2 (R1).

### 8.4 Scalability & Vendor Lock-In Constraints

The following constraints arise from the MVP technology choices and must be accounted for in roadmap planning. Full technical detail is in TRD v4.0 Section 15.

- **Realtime chat and order status updates** are delivered via **Ably** (India edge nodes), which provides 200 concurrent WebSocket connections on the free tier and 6 million messages per month. The free connection ceiling is hit at approximately 200 simultaneous active users. The engineering team must upgrade to the Ably paid tier ($29/month) before that threshold. Product chat and live status features must be designed with this in mind. See TRD v4.0 Section 15.1.

- **The in-app AI scrap image analysis feature** (Gemini Vision) is rate-limited to 1,500 requests per day on the free tier. At approximately 75,000 DAU with a 2% daily listing rate, the daily quota is exceeded. Product must plan the transition to paid Gemini usage at that scale, with per-user rate limiting in place from day one. See TRD v4.0 Section 15.1.

- **City expansion** requires a database schema update (adding zone/ward precision columns to the `cities` reference table, replacing the locality text field for precise matching). This is low-risk today and high-risk under live multi-city traffic. The cities table migration must be completed before the second city launches, not after. Product roadmap must flag this as a technical prerequisite for city 2. See TRD v4.0 Section 15.2.

- **GST invoice PDFs** must be accompanied by structured source data (JSONB) for 6-year audit trail compliance under Indian GST law. The invoice generation feature may not ship without this — the PDF alone is not sufficient as a legal record. See TRD v4.0 Section 15.3.

- **Push notification delivery** relies on Expo Push Service, which wraps FCM and APNs. This creates a token format dependency: if [APP_NAME] ever migrates to direct FCM/APNs (for cost or SLA reasons), a forced app update is required for all users to re-register native tokens. To avoid this, the mobile app must register both Expo tokens and native FCM/APNs tokens from day one. This is a device registration requirement, not a user-facing feature. See TRD v4.0 Section 15.2.

- **Multi-city pricing** requires per-city price indices. The current price scraper and `current_price_index` materialized view are single-city by design. Before city 2 launch, the price scraper must be extended to support per-city source URLs, and the price index query logic must be updated to filter by city. This is a product requirement that directly drives a technical change.

- **OTP delivery** is routed via Meta's WhatsApp Cloud API, which provides 1,000 free authentication conversations per month. This ceiling is hit at approximately 1,000 new user sign-ins or pickup OTP events per month. The engineering team must enable paid Meta billing before this threshold is reached. OTP length is enforced at 6 digits via server-side generation using `crypto.randomInt(100000, 999999)`. See TRD v4.0 Section 14.3 (RA2).

- **Aggregator OTP verification** must verify server-side that only the assigned aggregator (`aggregator_id` on the order) can submit OTP confirmation for a given order. This check runs inside the same database transaction as the OTP validation — not before it — to prevent race conditions. See TRD v4.0 Section 14.1 (V8).

- **OTP delivery is system-initiated** (triggered by the scale photo upload), not user-callable. The backend generates the OTP and calls Meta WhatsApp directly. No client-facing endpoint can trigger a WhatsApp message, eliminating the messaging harassment vector. See TRD v4.0 Section 14.3 (RA2).

- **Order status `completed`** may only be set by the `POST /api/orders/:id/verify-otp` Express route after successful OTP validation within an atomic database transaction. No direct status update endpoint may accept `completed` or `disputed` as a target status. See TRD v4.0 Section 14.7 (V13).

- **The order feed shown to aggregators** must display only locality-level address (not full street address) until after the aggregator accepts the order. Full address is revealed post-acceptance only. The `pickup_address_text` field must be `null` in the API response DTO for pre-acceptance requests — not merely hidden in the UI. See TRD v4.0 Section 14.5 (V25).

- **In-app chat must technically prevent phone number sharing.** A server-side regex filter must detect and remove Indian phone number patterns from messages before they are stored in the database and broadcast via Ably. See TRD v4.0 Section 3.3 (V26).

- **The admin panel must never use backend service credentials client-side.** All admin operations must go through authenticated backend routes with DB-verified admin role checks. The Clerk secret key and database credentials must never appear in any client bundle or `NEXT_PUBLIC_*` environment variable. See TRD v4.0 Section 14.1 (V12, V-CLERK-1).

- **Aggregator KYC status (`kyc_status`)** must only be updatable by admin-authenticated backend routes. It must be blocklisted from all aggregator-facing profile update endpoints, and enforced by a database trigger that blocks updates from non-admin database sessions. See TRD v4.0 Section 14.8 (V35).

### 8.5 Localisation

- Language support: English and Telugu at launch.
- Number formats: Indian numbering system (lakhs/crores).
- Currency: INR (₹) throughout.

### 8.6 Accessibility

- Font size minimum 14px for body text, 16px for interactive elements.
- Aggregator app flows designed for low-tech-comfort users: maximum 3 taps to complete any primary action.

---

## 9. MVP Scope vs Future Roadmap

| Phase | Focus | Key Deliverables |
| :--- | :--- | :--- |
| **Phase 1: Foundation (Days 1–3)** | Core Infrastructure & UI shells | Monorepo, Design System, Static Seller/Aggregator apps |
| **Phase 2: Live Core (Days 4–7)** | Auth & Order Management live | Database, WhatsApp OTP, API, Real-time matching & Chat |
| **Phase 3: Intelligence (Day 8)** | AI & Provider Abstractions | Gemini Image Analysis, GST Invoices, Price Scraper |
| **Phase 4: Expansion (Day 9)** | Portals & Admin Dashboard | Business Mode Dashboard, Admin Dispute/KYC panel |
| **Phase 5: Launch (Day 10)** | Hardening & CI/CD | Security Audit, Testing, Automated Deployments |

---

## 10. Development Context

This document is a PRD only. Full technical architecture is in TRD v4.0.

- **Primary build tool:** Claude (Anthropic) — agent-assisted development enabling structured, sequential feature development across frontend and backend.
- **AI features:** Google Gemini API (Gemini Vision for image analysis; Gemini Pro for AI price-scraping agent).
- **OTP delivery:** Meta WhatsApp Cloud API called directly from Express backend — zero cost up to 1,000 authentication conversations/month.
- **Auth provider:** Clerk — handles session management, JWT issuance, and device sessions. India SMS region must be enabled in Clerk Dashboard before launch.
- **Realtime:** Ably — India edge nodes ensure low latency for order status updates and in-app chat.
- **Storage:** Uploadthing — private file storage with server-generated signed URLs for KYC documents, scale photos, and GST invoices.
- **Database:** Azure PostgreSQL Flexible Server (Central India) — full relational schema with Row Level Security.
- **Backend hosting:** Azure App Service (Central India) — all business logic, OTP generation, and vendor API calls.
- Deployment, CI/CD, and hosting architecture defined in TRD v4.0.

> ⚠️ **India Infrastructure Note:** Supabase (`*.supabase.co`) and Firebase (`*.firebaseapp.com`) are subject to active ISP-level DNS blocks in India as of February 2026 under Section 69A of the IT Act. Neither service is used in this product. All infrastructure services use custom domains (`*.sortt.in`) or India-accessible CDNs, ensuring no single government domain block can take the product offline.

---

## 11. Open Questions & Decisions Pending

- What is the exact minimum weight threshold per material category? (To be validated with aggregator feedback during onboarding.)
- What is the aggregator subscription fee percentage? (Suggested 1–2% of monthly earnings — needs market testing.)
- Should the app show the seller which specific aggregator has viewed their order before acceptance, or only show the accepted aggregator?
- What is the exact security deposit amount for aggregators in v2?
- Will the admin panel be a standalone web app or integrated into the main web portal behind a role-based auth wall?
- GST invoice template: does this need a CA's input for legal compliance, or is a standard template sufficient for v1?

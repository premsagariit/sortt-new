# [APP_NAME]
## Technical Requirements Document
**v4.0 · Minimalist Professional UI · Azure PostgreSQL · Clerk Auth · Ably Realtime · Uploadthing Storage · WhatsApp OTP**

> ⚠️ **APP NAME PLACEHOLDER NOTICE**
> The name **"Sortt"** used throughout this document is a **placeholder only**. The final product name has not been decided. All references to "Sortt" should be read as `[APP_NAME]`. In code, always import from `constants/app.ts` — never hardcode the string. See MEMORY.md for full rebrand instructions.

> 📋 **v4.0 CHANGE SUMMARY (from v3.2)**
> Supabase has been fully removed from this architecture. Reason: active ISP-level government block in India targeting `*.supabase.co` and `firebaseio.com` domains as of February 2026. All Supabase services (Auth, Realtime, Storage, Edge Functions, PostgreSQL) are replaced with India-accessible, non-blockable alternatives. PostGIS geospatial dependency removed and replaced with city-code/locality matching — appropriate for the single-city Hyderabad MVP pilot. Backend hosting moved from Render to Azure App Service (Central India). All other security controls, business logic, and UI rules are unchanged.

---

## 0. Local Development (3-Command Rule)

To prevent Metro server crashes, port contention, and path resolution discrepancies inherent to the React Native + Next.js + Express monorepo setup: all development servers MUST be run from the repository root using `pnpm` workspace filters.

Never `cd` into application child directories to launch local servers. Use only:
1. **Mobile:** `pnpm dev:mobile`
2. **Web Portal:** `pnpm dev:web`
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
| Web Portal | Next.js 15 (App Router), Tailwind CSS, Radix UI | Vercel hobby |
| Core Backend | Node.js / Express on **Azure App Service** (Central India — Pune) | Azure for Students free tier hours |
| Database | **Azure PostgreSQL Flexible Server B1ms** (Central India — Pune) + pgcrypto + uuid-ossp | Azure for Students — 750 hrs/month B1ms free for 12 months |
| Auth | **Clerk** — Phone OTP (enable India in Clerk Dashboard → SMS Settings) | Free up to 10,000 MAU |
| OTP Delivery | **Meta WhatsApp Cloud API** — called directly from Express backend | 1,000 free auth conversations/month |
| Realtime | **Ably** via `IRealtimeProvider` — India edge nodes | 6M messages/month, 200 concurrent connections free |
| Storage | **Uploadthing** via `IStorageProvider` — file uploads with Expo support | Free tier — 2GB storage, 500 uploads/month |
| Push Notifications | Expo Push Service (server SDK) | Unlimited |
| Rate Limiting + OTP Store | Upstash Redis via `@upstash/ratelimit` | 10,000 req/day free |
| AI — Image Analysis | Gemini Flash Vision via `IAnalysisProvider` | 1,500 req/day free |
| AI — Price Scraper | Gemini Pro (Python agent, node-cron scheduled) | 50 req/day free |
| Maps / Geocoding | Google Maps API via `IMapProvider` | $200 credit/month |
| PDF Generation | pdf-lib (Node.js) | Free / open-source |
| Icons | Phosphor Icons (MIT) | Free |
| State Management | Zustand | Free |
| Monorepo | pnpm workspaces | Free |
| CI/CD | GitHub Actions | Free — GitHub Student Pack Pro |

> ⚠️ **INDIA BLOCK NOTICE:** Supabase (`*.supabase.co`) and Firebase (`*.firebaseapp.com`, `firebaseio.com`) are currently blocked by Indian ISPs under Section 69A of the IT Act (effective February 2026). Neither service is used in this architecture. All services in the table above are confirmed accessible in India as of March 2026.

---

## 3. System Architecture

### 3.1 High-Level Architecture

The architecture places a Custom Backend (Node.js/Express on Azure App Service, Central India) as the intermediary between all client apps and the database. No client app talks directly to the database or any third-party service. All vendor calls go through provider abstraction packages.

```
Client Apps (Mobile / Web)
         │
         ▼
  Custom Backend (Express / Azure App Service — Central India, Pune)
    ├── Clerk JWT Middleware (A1)
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
         ├──▶ Uploadthing (Storage — via IStorageProvider)
         │       Private files, expiring signed URLs
         │       EXIF stripped by Express before upload (V18)
         │
         ├──▶ Clerk (Auth session validation)
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
3. Aggregator accepts → Express route runs `BEGIN; SELECT ... FOR UPDATE SKIP LOCKED WHERE id=$order_id AND status='created'; UPDATE ...; COMMIT;` (first-accept-wins). `Status→'accepted'`. Backend dispatches push to seller.
4. Aggregator updates En Route → Custom backend updates `status→'en_route'` → publishes event to Ably channel → seller's app receives real-time update.
5. Aggregator uploads scale photo → EXIF stripped by Express via `sharp` → uploaded to Uploadthing → Custom backend generates OTP, stores HMAC in Upstash Redis (TTL 10 min) → calls Meta WhatsApp Cloud API directly → OTP delivered to seller as WhatsApp authentication template message (free up to 1,000 conversations/month).
6. Seller reviews full transaction summary (material breakdown, confirmed weight, total amount) → Seller shares OTP with aggregator → Aggregator submits OTP → Express route validates: checks `aggregator_id = req.user.id`, validates OTP HMAC from Redis, updates `status='completed'` in a single transaction. `Status→'completed'` — the ONLY path to this status.
7. Custom backend on completion: calls `pdf-lib` to generate GST receipt → writes `invoice_data JSONB` to `invoices` table → uploads PDF to Uploadthing at randomised path → stores signed URL reference in DB.
8. Custom backend schedules Expo push to both parties for rating prompt after 2-hour delay.

### 3.3 Real-time Chat Architecture

- Each order has a dedicated **Ably** channel scoped by `order_id`. Channel name includes an HMAC suffix to prevent channel existence metadata leakage: `order:{order_id}:chat:{hmac_sha256(order_id+user_id+OTP_HMAC_SECRET)[:8]}` (V32).
- Messages stored in `messages` table (`order_id`, `sender_id`, `content`, `read_at`, `created_at`).
- Both parties subscribe on Order Detail screen open via `IRealtimeProvider.subscribe()`. Unsubscribe enforced on screen close.
- Delivery receipt: `read_at` timestamp updated when recipient client receives message.
- Offline fallback: Expo Push notification sent when recipient is not subscribed (app backgrounded). Express backend publishes to Ably and also dispatches push in the same message-insert handler.
- Chat history permanently retained per order. Accessible only to the two parties and admin.
- **Phone number filter:** All messages pass through server-side regex `/(?:\+91|0)?[6-9]\d{9}/g` before Ably broadcast, replacing detected numbers with `[phone number removed]` (V26).

### 3.4 Authentication Flow (Clerk + WhatsApp OTP)

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
   ├── Create Clerk session via Clerk Backend API
   └── Return Clerk JWT to client
         │
         ▼
5. Client stores JWT — sends as Authorization: Bearer on all subsequent requests
   Express middleware calls Clerk SDK to verify JWT on every protected route
```

---

## 4. Custom Backend — Node.js / Express on Azure App Service

### 4.1 Routes Handled by Custom Backend

| Route | Auth | Description |
|---|---|---|
| `POST /api/auth/request-otp` | Rate limit only | Generate OTP → store in Redis → call Meta WhatsApp API |
| `POST /api/auth/verify-otp` | Rate limit only | Verify OTP HMAC from Redis → create Clerk session → return JWT |
| `POST /api/orders` | Clerk JWT | Create order, geocode, city_code lookup, broadcast push |
| `GET /api/orders/:id` | Clerk JWT | Order detail with two-phase address reveal (V25) |
| `PATCH /api/orders/:id/status` | Clerk JWT | Status transitions — `completed`/`disputed` blocklisted (V13) |
| `POST /api/orders/:id/accept` | Clerk JWT | First-accept-wins PostgreSQL transaction (replaces Edge Function) |
| `POST /api/orders/:id/verify-otp` | Clerk JWT | OTP validation + order completion in single transaction (replaces Edge Function) |
| `POST /api/orders/:id/media` | Clerk JWT | Upload photo, strip EXIF via sharp (V18), trigger OTP on scale photo |
| `GET /api/orders/:id/media/:mediaId/url` | Clerk JWT | Generate expiring signed URL after ownership check (D1) |
| `POST /api/scrap/analyze` | Clerk JWT | Image hash dedup → Gemini Vision → schema-validate → UI hint only (I1) |
| `GET /api/aggregators/nearby` | Clerk JWT | city_code + material filter query, server-derived (V21 equivalent) |
| `PATCH /api/aggregators/profile` | Clerk JWT | Explicit field allowlist — `kyc_status` blocklisted (V35) |
| `POST /api/aggregators/heartbeat` | Clerk JWT | Update `last_ping_at` (C2) |
| `POST /api/messages` | Clerk JWT | Phone number regex filter before DB insert and Ably publish (V26) |
| `POST /api/ratings` | Clerk JWT | Only callable within 24hrs of completion |
| `POST /api/disputes` | Clerk JWT | Creates dispute + sets `status='disputed'` atomically |
| `GET /api/rates` | Public | `current_price_index` view with Cache-Control + ETag (V17) |
| `GET /api/admin/*` | Clerk JWT + DB role check | Admin operations only — DB-verified `user_type=admin` (V12) |

### 4.2 First-Accept-Wins Lock (Express Route — Replaces Edge Function)

```typescript
// POST /api/orders/:id/accept
// Clerk JWT middleware runs first — req.user.id is verified aggregator ID

app.post('/api/orders/:orderId/accept', clerkJwtMiddleware, async (req, res) => {
  const { orderId } = req.params;
  const aggregatorId = req.user.id; // From verified Clerk JWT

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
// Clerk JWT middleware runs first

app.post('/api/orders/:orderId/verify-otp', clerkJwtMiddleware, async (req, res) => {
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
    generateAndStoreInvoice(orderId).catch(err => Sentry.captureException(err));

    return res.status(200).json({ success: true });
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
});
```

### 4.4 Direct WhatsApp OTP Dispatch (Replaces Supabase Auth Send SMS Hook)

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

---

## 7. Location Services — Simplified City/Locality Matching

> ⚠️ **v4.0 CHANGE:** PostGIS and `ST_DWithin` geospatial queries have been removed. Aggregator matching now uses `city_code` equality + `pickup_locality` text matching. This is appropriate for the single-city Hyderabad MVP pilot. PostGIS can be re-introduced when multi-city expansion requires zone-level precision matching.

### 7.1 Aggregator Matching Logic

```typescript
// GET /api/aggregators/nearby (now: /api/orders/feed for aggregator)
// Returns orders in the aggregator's city that match their material rates

const { rows } = await db.query(
  `SELECT o.*, 
     CASE WHEN o.aggregator_id IS NOT NULL THEN null ELSE o.pickup_address_text END as full_address
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

All geocoding calls (address → city_code + locality) go through the `IMapProvider` interface. No component may import Google Maps directly.

```typescript
// packages/maps/src/IMapProvider.ts
export interface IMapProvider {
  geocode(address: string): Promise<{ city_code: string; locality: string; display_address: string }>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
  renderMap(props: MapRenderProps): React.ReactElement; // Display only — not for matching
}
```

### 7.3 Cost Reference

| Provider | Free Tier | Swap Trigger |
|---|---|---|
| Google Maps | $200/month credit | Ola Maps if India-specific coverage needed or cost exceeds credit |
| Ola Maps | TBD startup pricing | Available via `MAP_PROVIDER=ola` env var swap |

---

## 8. Database Schema — Azure PostgreSQL Flexible Server

All tables in Azure PostgreSQL Flexible Server B1ms (Central India — Pune). `uuid-ossp` for UUID primary keys. `pgcrypto` for phone number encryption. All tables have Row Level Security enabled.

> **RLS + Clerk JWT Pattern:** Since this architecture does not use Supabase Auth, `auth.uid()` is not available. Instead, the Express backend sets `SET LOCAL app.current_user_id = $userId` on each connection before executing queries. RLS policies use `current_app_user_id()` — a custom helper function — to enforce row-level ownership.

```sql
-- Helper function: reads user ID set by Express backend per request
CREATE OR REPLACE FUNCTION current_app_user_id()
RETURNS uuid AS $$
  SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid;
$$ LANGUAGE sql STABLE SECURITY DEFINER;
```

### 8.1 Core Tables

```sql
-- Users (auth session managed by Clerk — user record synced here on first login)
CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id   TEXT NOT NULL UNIQUE, -- Clerk's user ID for JWT cross-reference
  phone_hash      TEXT NOT NULL,        -- HMAC-SHA256 of phone number
  phone_last4     TEXT NOT NULL,        -- Display-only
  name            TEXT NOT NULL,
  user_type       TEXT NOT NULL CHECK (user_type IN ('seller','aggregator','admin')),
  is_active       BOOLEAN NOT NULL DEFAULT true,
  preferred_language TEXT DEFAULT 'en',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Safe view — phone_hash and clerk_user_id are NEVER returned via this view (V24)
CREATE VIEW users_public AS
  SELECT id, name, phone_last4, user_type, preferred_language, created_at
  FROM users;

-- Cities reference table (required before city 2 launch)
CREATE TABLE cities (
  code             TEXT PRIMARY KEY,
  display_name     TEXT NOT NULL,
  state            TEXT,
  timezone         TEXT DEFAULT 'Asia/Kolkata',
  default_language TEXT DEFAULT 'en',
  is_active        BOOLEAN DEFAULT false,
  launched_at      TIMESTAMPTZ
);
INSERT INTO cities VALUES ('HYD','Hyderabad','Telangana',DEFAULT,DEFAULT,true,NOW());

-- Seller profiles
CREATE TABLE seller_profiles (
  user_id         UUID PRIMARY KEY REFERENCES users(id),
  profile_type    TEXT NOT NULL CHECK (profile_type IN ('individual','business')),
  locality        TEXT,
  city_code       TEXT REFERENCES cities(code)
);

-- Aggregator profiles (no GEOGRAPHY column — city_code used for matching)
CREATE TABLE aggregator_profiles (
  user_id              UUID PRIMARY KEY REFERENCES users(id),
  business_name        TEXT,
  city_code            TEXT REFERENCES cities(code),   -- Aggregator's operating city
  operating_area_text  TEXT,                           -- Human-readable area description
  kyc_status           TEXT NOT NULL DEFAULT 'pending'
                         CHECK (kyc_status IN ('pending','verified','rejected')),
  operating_hours      JSONB,
  member_since         TIMESTAMPTZ DEFAULT NOW()
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
  colour_token    TEXT,
  min_weight_kg   NUMERIC NOT NULL DEFAULT 1
);

-- Aggregator material rates
CREATE TABLE aggregator_material_rates (
  aggregator_id   UUID NOT NULL REFERENCES users(id),
  material_code   TEXT NOT NULL REFERENCES material_types(code),
  rate_per_kg     NUMERIC NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (aggregator_id, material_code)
);

-- Orders (no GEOGRAPHY column — city_code + locality used for matching)
CREATE TABLE orders (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  seller_id               UUID NOT NULL REFERENCES users(id),
  aggregator_id           UUID REFERENCES users(id),
  city_code               TEXT NOT NULL REFERENCES cities(code),
  status                  TEXT NOT NULL DEFAULT 'created'
                            CHECK (status IN ('created','accepted','en_route','arrived',
                                              'weighing_in_progress','completed','cancelled','disputed')),
  pickup_address_text     TEXT,           -- Full address — revealed post-acceptance only (V25)
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
  changed_by  UUID,           -- Actor user ID from Clerk JWT — never auto-populated
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()  -- Always DB-set, never client-supplied (V30)
);

-- Order media (storage_path is Uploadthing file key)
CREATE TABLE order_media (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id     UUID NOT NULL REFERENCES orders(id),
  media_type   TEXT NOT NULL CHECK (media_type IN
                 ('scrap_photo','scale_photo','kyc_aadhaar','kyc_shop','invoice')),
  storage_path TEXT NOT NULL,   -- Uploadthing file key — used to generate signed URLs
  uploaded_by  UUID NOT NULL REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

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
  review_text TEXT CHECK (char_length(review_text) <= 500),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disputes
CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id        UUID NOT NULL REFERENCES orders(id),
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
  storage_path TEXT NOT NULL,   -- Uploadthing file key
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
  storage_path      TEXT,     -- Uploadthing file key for PDF (V27: randomised path)
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

> ⚠️ **v4.0 CHANGE:** pg_cron has been removed (pg_cron requires Supabase Pro or a manually-managed PostgreSQL extension). All cron jobs now run via `node-cron` on the Express backend. The message partition job is the only exception — it runs as a startup check on each Express deploy.

```typescript
// backend/src/scheduler.ts
import cron from 'node-cron';

// Aggregator online culling — every 5 minutes (C2)
cron.schedule('*/5 * * * *', async () => {
  await db.query(
    `UPDATE aggregator_availability SET is_online = false
     WHERE last_ping_at < NOW() - INTERVAL '5 minutes' AND is_online = true`
  );
});

// Aggregator rating stats refresh — every 15 minutes
cron.schedule('*/15 * * * *', async () => {
  await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY aggregator_rating_stats');
});

// Price index cache refresh — daily at 06:00 IST (00:30 UTC)
cron.schedule('30 0 * * *', async () => {
  await db.query('REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index');
});

// OTP log cleanup — nightly at 02:00 UTC (retains 7 days for dispute evidence)
cron.schedule('0 2 * * *', async () => {
  await db.query(
    `DELETE FROM otp_log WHERE expires_at < NOW() - INTERVAL '7 days'`
  );
});

// Message partition pre-creation — 25th of each month at 01:00 UTC
cron.schedule('0 1 25 * *', async () => {
  await createNextMonthMessagePartition();
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
│   │   │   ├── _layout.tsx           # Root layout — font loading, SplashScreen gate, Clerk provider
│   │   │   ├── index.tsx             # Root route — renders SplashAnimation, routes to auth or home
│   │   │   ├── (auth)/               # Login, OTP entry
│   │   │   ├── (seller)/             # Seller tab group
│   │   │   ├── (aggregator)/         # Aggregator tab group
│   │   │   └── (shared)/             # Order detail, chat, receipt, OTP confirm
│   │   ├── components/
│   │   │   ├── ui/                   # Design system components (unchanged)
│   │   │   └── domain/               # Feature-specific components
│   │   ├── lib/
│   │   │   ├── clerk.ts              # Clerk client (replaces supabase.ts)
│   │   │   ├── api.ts                # Custom backend API client
│   │   │   └── notifications.ts      # Expo push token registration (dual-token)
│   │   ├── store/                    # Zustand state stores
│   │   └── constants/
│   │       └── tokens.ts             # Design tokens (SINGLE SOURCE OF TRUTH — unchanged)
│   ├── web/                          # Next.js 15 web portal
│   └── admin/                        # Next.js admin panel
├── packages/
│   ├── maps/                         # IMapProvider abstraction
│   ├── realtime/                     # IRealtimeProvider → AblyRealtimeProvider
│   ├── auth/                         # IAuthProvider → ClerkAuthProvider
│   ├── storage/                      # IStorageProvider → UploadthingStorageProvider
│   └── analysis/                     # IAnalysisProvider abstraction
├── backend/                          # Node.js/Express — Azure App Service (Central India)
│   └── src/
│       ├── middleware/
│       │   ├── auth.ts               # Clerk JWT verification middleware (A1)
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
│       ├── storage/                  # IStorageProvider → Uploadthing implementation
│       └── utils/
│           └── rateLimit.ts          # Upstash Redis rate limiters
├── migrations/                       # Plain SQL migration files (replaces supabase/migrations)
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
- No agent may call Meta WhatsApp API, Ably, Uploadthing, Clerk, or Google Maps directly — only through the provider abstraction packages in `packages/`.
- No agent may import or reference `@supabase/supabase-js` or any Supabase package anywhere in the codebase.
- On Days 1–3 (UI-only phase): no agent makes any backend or third-party API calls from the mobile app. All screen data is hardcoded fixture data. Real wiring begins Day 5.
- Backend agents (Days 5–8): always call `SET LOCAL app.current_user_id = $userId` before DB queries in protected routes.

### 11.2 Build Sequence & Day Ownership

| Day | Domain | Primary Technologies |
|---|---|---|
| 1 | Foundation + Design System | pnpm monorepo, `tokens.ts`, `app.ts`, UI component library |
| 2 | Auth UI + All Seller Screens (static) | React Native, Expo Router, Zustand |
| 3 | Aggregator UI + Web Portal Shell (static) | React Native, Next.js 15, Tailwind |
| 4 | Database Schema, RLS, Azure PostgreSQL | PostgreSQL, pgcrypto, RLS, migration files |
| 5 | Backend Foundation + Live Auth | Express, Helmet, Upstash Redis, Clerk JWT, WhatsApp OTP direct |
| 6 | Core API Routes + DB Integration | Express routes, PostgreSQL, IMapProvider, all flows wired |
| 7 | Atomic Operations + Realtime + Push | accept-order route, verify-otp route, Ably channels, Expo Push |
| 8 | AI + Invoice + Provider Abstractions | Gemini Vision, pdf-lib, all 5 `packages/` interfaces |
| 9 | Web Portal + Admin + Testing | Next.js dashboards, Admin panel, Jest tests, CI/CD |
| 10 | Security Audit + Monitoring + Launch | All TRD §13 items verified, Sentry, PostHog, EAS build |

---

## 12. Testing & Deployment

### 12.1 Test Strategy

| Test Type | Scope | Tool |
|---|---|---|
| Unit | Route handlers, RLS policies, status machine, no `phone_hash` in responses (V24) | Jest |
| Integration | Order lifecycle, first-accept-wins race, OTP binding (C1), Clerk JWT validation | Jest + Supertest |
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
| Sentry | Crash reporting — React Native + Next.js + Express | 5K errors/month |
| PostHog | User funnel analytics | 1M events/month |
| UptimeRobot | Health checks every 5 min | 50 monitors |
| Azure Monitor | Backend memory/CPU, DB connections, query performance | Included with Azure for Students |
| Ably Dashboard | Realtime connection count — alert at 150 (75% of 200 free) | Included |
| Redis Monitor | Meta WhatsApp daily OTP counter — alert at 900/month | Included in Upstash |

### 12.4 Free Tier Limits at MVP Scale (10K DAU)

| Service | Free Limit | Estimated Usage at 10K DAU | Buffer |
|---|---|---|---|
| Azure PostgreSQL B1ms | 750 hrs/month (12 months) | 744 hrs | ~1% |
| Ably Realtime | 200 conns, 6M msgs/month | ~100 peak conns | 50% |
| Clerk Auth | 10,000 MAU | ~2,000 active users | 80% |
| Uploadthing | 2GB storage, 500 uploads/month | ~200 uploads | 60% |
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
-- changed_by comes from Clerk JWT, never from DB trigger (R3)
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

#### A1 — Clerk JWT Verification Middleware

**Requirement:** All protected routes must validate the Clerk JWT before any business logic executes.

**Implementation:**
```typescript
// middleware/auth.ts
import { ClerkExpressRequireAuth } from '@clerk/clerk-sdk-node';

export const clerkJwtMiddleware = ClerkExpressRequireAuth({
  onError: (err, req, res) => res.status(401).json({ error: 'Unauthorised' })
});

// Attach internal user record to req.user after Clerk validation
export const attachInternalUser = async (req, res, next) => {
  const { userId: clerkUserId } = req.auth;
  const { rows } = await db.query(
    'SELECT * FROM users WHERE clerk_user_id = $1 AND is_active = true',
    [clerkUserId]
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

Clerk JWT access tokens expire in 1 hour. Refresh tokens expire in 7 days. Admin panel enforces 15-minute inactivity re-auth. "Sign out all devices" clears all Clerk sessions for the user.

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

The Express backend explicitly INSERTs `changed_by = req.user.id` from the Clerk JWT into `order_status_history`. No trigger or `current_app_user_id()` is used for this field — it is always application-provided.

---

### 14.3 Rate Abuse

#### RA1 — Gemini API Quota Exhaustion

Per-user rate limiting: max 10 Gemini requests per user per hour (Upstash Redis). Global circuit breaker: if daily Gemini calls exceed 1,200 (80% of 1,500 free limit), return `manual_entry_required: true` (graceful degradation). SHA-256 image deduplication cache (TTL 24h) prevents identical image re-analysis.

#### RA2 — WhatsApp OTP Flooding

Rate limiting on `POST /api/auth/request-otp`: max 3 OTP requests per phone per 10-minute window, max 10 per day. Running daily conversation counter in Upstash Redis — alert via Sentry when counter reaches 900 (90% of 1,000 free monthly quota).

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

All Uploadthing files are stored as **private**. Express backend generates expiring signed URLs after verifying ownership of the `order_media` record. No file URL is ever returned directly to clients. Expiry: 5 minutes.

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

When seller captures scrap photo (online or offline), app queues image for upload as first operation on reconnect. Order submission must reference a `storage_path` (Uploadthing file key) validated by the backend: file must exist, uploaded by this user, created within last 24 hours.

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

#### V-CLERK-1 — clerk_user_id Must Never Appear in API Responses

The `clerk_user_id` field on the `users` table must never appear in any API response DTO. It is an internal cross-reference only. The `users_public` view excludes it. Add a unit test asserting no response fixture contains `clerk_user_id`.

#### V-CLERK-2 — user_type Must Always Be Re-Fetched from DB

On every privileged route, `req.user.user_type` and `req.user.is_active` come from the `attachInternalUser` middleware which queries the DB — not from the Clerk JWT claims. Cache DB result in Upstash Redis for max 60 seconds per user. This prevents a banned aggregator from using their old JWT.

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

---

## 15. Scalability & Vendor Lock-In Analysis

### 15.1 100K DAU Traffic Projections

| Metric | At 10K DAU | At 100K DAU | Ceiling Hit |
|---|---|---|---|
| Ably WebSocket connections | ~100 peak | ~1,000 peak | Ably paid tier ($29/month) |
| Gemini Vision calls | ~180/day | ~1,800/day | Free tier (1,500/day) exceeded at ~75K DAU |
| WhatsApp OTP conversations | ~300/month | ~3,000/month | Free tier (1,000/month) exceeded at ~1K DAU |
| Azure PostgreSQL B1ms | Adequate | Upgrade to B2ms | ~₹9,030/month — migrate to DO at that point |
| Clerk MAU | ~2,000 | ~20,000 | Pro plan needed above 10K MAU |

### 15.2 Lock-In Risk Register

| Component | Lock-In Type | Trigger | Mitigation | Status |
|---|---|---|---|---|
| Ably Realtime | Cost ceiling | 30K DAU | `IRealtimeProvider` — swap to Soketi or Pusher | Interface built |
| Clerk Auth | Phone hash coupling | Auth migration | `IAuthProvider` — re-enrollment required on swap | Interface built |
| Uploadthing | File key format | Storage migration | `IStorageProvider` — bulk export available | Interface built |
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
export interface IStorageProvider {
  upload(bucket: string, path: string, data: Buffer, opts?: object): Promise<string>;
  getSignedUrl(bucket: string, path: string, expiresIn: number): Promise<string>;
  delete(bucket: string, path: string): Promise<void>;
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
| `@clerk/clerk-sdk-node` | Clerk JWT verification on backend | Replaces Supabase Auth |
| `@clerk/clerk-expo` | Clerk session management on mobile | Replaces Supabase JS client auth |
| `ably` | Realtime WebSockets via IRealtimeProvider | Replaces Supabase Realtime |
| `uploadthing` | File storage via IStorageProvider | Replaces Supabase Storage |
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
| `sharp` | Image re-encoding + EXIF stripping | V18 — before Gemini or Uploadthing |
| `sanitize-html` | Free-text sanitisation | I2 |
| `@upstash/ratelimit` | Redis-backed rate limiting | All rate limiters + OTP store |
| `phosphor-react-native` | Icon library | Outline, 1.5px stroke |
| `zustand` | Lightweight state management | No Redux |
| `next@15` | Web app framework | — |
| `@google/generative-ai` | Gemini API client | Via `IAnalysisProvider` |
| `pg` | PostgreSQL client | Azure PostgreSQL connection |
| `jose` | JWT utilities if needed beyond Clerk | — |

**Removed from v3.2:**
- `@supabase/supabase-js` — removed entirely. No Supabase dependency anywhere.
- `bcryptjs` — replaced by `crypto` built-in HMAC-SHA256 (X3)

### B. Environment Variables

| Variable | Location | Purpose |
|---|---|---|
| `CLERK_SECRET_KEY` | **Backend only** | Clerk backend API key — NEVER in client bundle |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Client apps | Clerk publishable key — safe for client use |
| `DATABASE_URL` | Backend only | Azure PostgreSQL connection string (SSL required) |
| `ABLY_API_KEY` | Backend only | Ably server API key — NEVER in client bundle |
| `NEXT_PUBLIC_ABLY_KEY` | Client apps | Ably client-side key (read-only token, scoped) |
| `UPLOADTHING_SECRET` | Backend only | Uploadthing secret key |
| `UPLOADTHING_APP_ID` | Backend + Client | Uploadthing app identifier |
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
| `GOOGLE_MAPS_API_KEY` | Backend + Mobile | Via `IMapProvider` |
| `MAP_PROVIDER` | Backend + Mobile | `"google"` or `"ola"` |
| `EXPO_ACCESS_TOKEN` | Backend only | Expo server SDK token for push dispatch |
| `REALTIME_PROVIDER` | All | `"ably"` (default) — switches `IRealtimeProvider` |
| `SENTRY_DSN` | All | Sentry error reporting |

**Removed from v3.2:**
- `SUPABASE_URL` — removed
- `SUPABASE_ANON_KEY` — removed
- `SUPABASE_SERVICE_KEY` — removed (this key must never reappear anywhere)
- `SUPABASE_WEBHOOK_SECRET` — removed
- `SUPABASE_HOOK_SECRET` — removed

---

*— End of [APP_NAME] TRD v4.0 —*
*Supersedes TRD v3.2. Reason for major version bump: complete removal of Supabase dependency due to India ISP block (Feb 2026). Stack: Azure PostgreSQL + Clerk + Ably + Uploadthing + Express on Azure App Service.*

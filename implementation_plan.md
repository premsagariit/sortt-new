# Day 16 — Admin Web Dashboard + Unit & Integration Tests (Revised)

## Overview

Day 15 is complete. This revised plan addresses all review feedback before execution.

**Scope Lock:** Admin web pages only — business/aggregator web remains deferred.
**UI authority:** `sortt_admin_ui.html` in project root.

---

## Review Resolutions

| Issue | Resolution |
|-------|-----------|
| **BLOCK 1** — Admin login must use WhatsApp OTP | Login page calls `POST /api/auth/request-otp` (mode: `login`) → `POST /api/auth/verify-otp` → checks `user_type === 'admin'`. Email/password env vars **removed**. |
| **BLOCK 2** — KYC must be two separate endpoints | Split: `GET /api/admin/kyc/pending` (metadata only) + `GET /api/admin/kyc/:userId/documents` (signed URLs, on-demand). |
| **BLOCK 3** — Dispute resolve must write audit log inside same transaction | `PATCH /api/admin/disputes/:id` wraps dispute UPDATE + `admin_audit_log` INSERT in a single `BEGIN/COMMIT`. Audit INSERT failure rolls back the whole transaction. |
| **WARN 1** — Stats counters corrected | `GET /api/admin/stats` returns exactly: `total_pending_kyc`, `total_open_disputes`, `total_orders_today`, `total_completed_orders`, `total_active_aggregators`. No GMV. |
| **WARN 2** — Layout auth guard is DB-fetched server-side | Admin layout server component re-fetches `user_type` from DB (via `verifyUserRole`), never trusts JWT claim (V7). Redirects to `/admin/login` if not `admin`. |
| **WARN 3** — Inactivity timer polls every 30 seconds | Client-side timer: `mousemove`/`keydown`/`click` events update `sessionStorage.setItem('lastActivity', Date.now())`. A `setInterval` every 30 seconds reads that value and redirects if `Date.now() - lastActivity > 15 * 60 * 1000`. |

---

## Proposed Changes

---

### Component A — Backend Admin Routes

#### [NEW] `backend/src/routes/admin.ts`

New Express router mounted at `/api/admin`. All routes require:
- Valid Clerk JWT (existing `authMiddleware`)
- `verifyAdminRole()` middleware — re-fetches `user_type` from DB (60s Redis cache), returns 403 if not `admin` (V7)

**Endpoints:**

```
GET  /api/admin/stats
GET  /api/admin/kyc/pending
GET  /api/admin/kyc/:userId/documents
PATCH /api/admin/aggregators/:id/kyc
GET  /api/admin/disputes
PATCH /api/admin/disputes/:id
GET  /api/admin/prices
POST /api/admin/prices/override
GET  /api/admin/flagged
```

**`GET /api/admin/stats`**
Returns exactly five counters (WARN 1):
```jsonc
{
  "total_pending_kyc": 7,
  "total_open_disputes": 3,
  "total_orders_today": 42,
  "total_completed_orders": 1240,
  "total_active_aggregators": 84
}
```
Queries: `aggregator_profiles WHERE kyc_status='pending'`, `disputes WHERE status='open'`, `orders WHERE DATE(created_at)=TODAY`, `orders WHERE status='completed'`, `aggregator_availability WHERE is_online=true`. All counts, no joins needed.

**`GET /api/admin/kyc/pending`** (BLOCK 2)
Returns metadata only — **no signed URLs**:
```jsonc
[{
  "user_id": "uuid",
  "business_name": "...",
  "aggregator_type": "shop|mobile",
  "city_code": "HYD",
  "submitted_at": "ISO",
  "kyc_status": "pending",
  "document_count": 4
}]
```
Query: `aggregator_profiles JOIN users` filtered to `kyc_status='pending'`. Count of related `order_media` rows for `document_count`.

**`GET /api/admin/kyc/:userId/documents`** (BLOCK 2)
Called on-demand when admin opens a specific record. Returns signed URLs (5-min expiry via `IStorageProvider.getSignedUrl()`):
```jsonc
[{
  "media_type": "kyc_aadhaar_front",
  "signed_url": "https://...",
  "expires_at": "ISO"
}]
```
Writes `admin_audit_log` entry: `action: 'kyc_documents_viewed'`, `target_table: 'order_media'`, `target_id: userId`.

**`PATCH /api/admin/aggregators/:id/kyc`**
Body: `{ "kyc_status": "verified" | "rejected", "note": "..." }`.
- Opens transaction, executes: `SET LOCAL app.is_admin_context='true'` (V35 guard), UPDATE `aggregator_profiles SET kyc_status`, INSERT `admin_audit_log`.
- If audit INSERT fails → full rollback.
- Returns 200 on success.

**`GET /api/admin/disputes`**
Returns open disputes with joined data: dispute fields, scale photo signed URLs (on-demand — same pattern as KYC, sign only when expanding), OTP log entries for the order.
- Chat history: returns last 20 messages for the linked `order_id` (text only, filtered by V26 server-side phone filter).
- SLA calculation: `hours_since_raised = EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600`. Client renders SLA bar from this.

**`PATCH /api/admin/disputes/:id`** (BLOCK 3)
Body: `{ "action": "resolve" | "dismiss", "resolution_note": "..." }`.
```sql
BEGIN;
  UPDATE disputes SET status = $action, resolution_note = $note, resolved_at = NOW()
    WHERE id = $id;
  INSERT INTO admin_audit_log (admin_user_id, action, target_table, target_id, metadata)
    VALUES ($adminId, $action, 'disputes', $id, $metadataJson);
COMMIT;
-- If either statement fails → ROLLBACK (transaction ensures atomicity)
```
Returns 200. Failure of audit INSERT propagates the transaction rollback — never silently skips the audit trail.

**`GET /api/admin/prices`**
Returns latest `price_index` entry per material (from `current_price_index` materialized view):
```jsonc
[{
  "material_code": "metal",
  "rate_per_kg": 28.5,
  "is_manual_override": false,
  "source": "scraper",
  "scraped_at": "ISO"
}]
```

**`POST /api/admin/prices/override`**
Body: `{ "material_code": "metal", "rate_per_kg": 31.0 }`.
- Validates rate within per-material sanity bounds (§3.10 — X2):
  - Iron: ₹20–60/kg, Copper: ₹400–900/kg, Paper: ₹5–20/kg, Plastic: ₹5–25/kg
- Rejects if outside bounds → 422 with message.
- Inserts `price_index` row with `is_manual_override=true`.
- Writes `admin_audit_log` inside same transaction.
- Calls `REFRESH MATERIALIZED VIEW CONCURRENTLY current_price_index` after commit.

**`GET /api/admin/flagged`**
Queries `aggregator_rating_stats` materialized view:
```sql
SELECT aggregator_id, avg_rating, total_orders, last_updated
FROM aggregator_rating_stats
WHERE avg_rating < 3.0 AND total_orders >= 10
ORDER BY avg_rating ASC;
```
Joins `aggregator_profiles` for business name. Returns list.

#### [MODIFY] `backend/src/index.ts`
```typescript
import adminRouter from './routes/admin';
// ...after existing routes:
app.use('/api/admin', adminRouter);
```

#### [NEW] `backend/src/middleware/verifyAdmin.ts`
Separate middleware (distinct from `verifyRole`):
- Calls `verifyUserRole(userId)` — re-fetches from DB with 60s Redis cache (V7)
- Returns 403 `{ error: 'Forbidden — admin only' }` if `user_type !== 'admin'`
- Used on all admin routes

---

### Component B — Next.js Security Layer

#### [NEW] `apps/web/next.config.ts`
```typescript
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self'",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob:",
            "connect-src 'self' https:",
            "frame-ancestors 'none'",
          ].join('; '),
        },
      ],
    }];
  },
};

export default nextConfig;
```

#### [NEW] `apps/web/middleware.ts`
Vercel Edge Middleware (X4, G16.1):
```typescript
import { NextRequest, NextResponse } from 'next/server';

export const config = { matcher: ['/admin/:path*'] };

export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV !== 'production') return NextResponse.next(); // dev bypass

  const allowlist = (process.env.ADMIN_IP_ALLOWLIST ?? '').split(',').map(s => s.trim()).filter(Boolean);
  if (allowlist.length === 0) return NextResponse.next(); // open if not configured

  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? '';

  if (!allowlist.includes(clientIp)) {
    return new NextResponse(JSON.stringify({ error: 'Access denied' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return NextResponse.next();
}
```

---

### Component C — Admin Web Pages

#### [MODIFY] `apps/web/app/admin/layout.tsx`

**Auth guard (WARN 2 — DB-fetched, server-side):**
```typescript
// Server component — verifies admin role via backend, not JWT claim
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

async function verifyAdminSession(): Promise<boolean> {
  const token = (await cookies()).get('admin_token')?.value;
  if (!token) return false;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) return false;
  const data = await res.json();
  return data?.user_type === 'admin'; // DB-fetched field (V7 — re-fetched in /api/users/me)
}

// In layout: if (!(await verifyAdminSession())) redirect('/admin/login');
```

**Session timer UI:**
- Topbar session countdown pill matching `sortt_admin_ui.html` `.session-timer` styles.

**Inactivity timer client component (WARN 3):**
```typescript
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const POLL_INTERVAL_MS = 30 * 1000; // poll every 30 seconds

export function InactivityGuard() {
  const router = useRouter();

  useEffect(() => {
    const updateActivity = () =>
      sessionStorage.setItem('lastActivity', String(Date.now()));

    // Record activity on interaction events
    ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt =>
      window.addEventListener(evt, updateActivity, { passive: true })
    );
    updateActivity(); // set initial timestamp

    const interval = setInterval(() => {
      const last = Number(sessionStorage.getItem('lastActivity') ?? 0);
      if (Date.now() - last > TIMEOUT_MS) {
        sessionStorage.removeItem('admin_token');
        router.replace('/admin/login?reason=timeout');
      }
    }, POLL_INTERVAL_MS);

    return () => {
      ['mousemove', 'keydown', 'click', 'touchstart'].forEach(evt =>
        window.removeEventListener(evt, updateActivity)
      );
      clearInterval(interval);
    };
  }, [router]);

  return null;
}
```

**Nav items** updated to use Next.js `<Link>` with `usePathname()` for active state.

#### [MODIFY] `apps/web/app/admin/page.tsx`
Replace mock KPI values with live `fetch` from `GET /api/admin/stats` (server component):
- `total_pending_kyc`, `total_open_disputes`, `total_orders_today`, `total_completed_orders`, `total_active_aggregators`

#### [NEW] `apps/web/app/admin/login/page.tsx`
**Admin login using WhatsApp OTP (BLOCK 1):**

Phase 1 — Phone entry:
- Single phone field (Indian `+91` format, matching existing mobile auth pattern)
- "Send OTP" button → `POST /api/auth/request-otp` with `{ phone, mode: 'login' }`
- Error: 404 response (`no_account`) → "This number is not registered as an admin."
- Error: 429 → standard rate-limit message

Phase 2 — OTP entry (same screen, step switch):
- 6-box OTP input (matches `apps/mobile/app/(auth)/phone.tsx` pattern)
- "Verify" button → `POST /api/auth/verify-otp` with `{ phone, otp, mode: 'login' }`
- On success: check `user.user_type === 'admin'`
  - If **not admin**: call backend sign-out, show error "This account does not have admin access."
  - If **admin**: `document.cookie = 'admin_token=<jwt>; path=/; SameSite=Strict'`, `sessionStorage.setItem('lastActivity', Date.now())`, `router.replace('/admin')`

> No email, no password. ADMIN_EMAIL, ADMIN_PASSWORD_HASH, ADMIN_SESSION_SECRET env vars are **not added**.

#### [NEW] `apps/web/app/admin/kyc/page.tsx`
- Server fetch `GET /api/admin/kyc/pending` → render metadata table
- Each row has "Review" button → client-side: triggers `GET /api/admin/kyc/:userId/documents`, renders doc grid with signed URL `<img>` tags
- Actions: Approve / Reject → `PATCH /api/admin/aggregators/:userId/kyc`
- Status chips: `chip-pending`, `chip-verified`, `chip-rejected` (matching HTML reference)

#### [NEW] `apps/web/app/admin/disputes/page.tsx`
- Server fetch `GET /api/admin/disputes`
- SLA bar: `hours_since_raised / 72 * 100`% fill; color: <24hr = teal, 24–60hr = amber, >60hr = red
- Expandable row shows scale photo signed URLs, dispute text, last 20 chat messages
- Actions: `PATCH /api/admin/disputes/:id` with `{ action: 'resolve' | 'dismiss', resolution_note }`

#### [NEW] `apps/web/app/admin/prices/page.tsx`
- Server fetch `GET /api/admin/prices`
- Per-material rate row (matching `sortt_admin_ui.html` `.rate-row` spec): DM Mono amber current rate, source chip, ₹-prefixed input
- Save → `POST /api/admin/prices/override`, shows bounds error if rate out of range

#### [NEW] `apps/web/app/admin/flagged/page.tsx`
- Server fetch `GET /api/admin/flagged`
- Table: business name, avg rating (star display + DM Mono number), total orders, status

#### [NEW] `apps/web/lib/adminApi.ts`
Typed fetch wrapper:
```typescript
export function adminFetch<T>(path: string, init?: RequestInit): Promise<T>
```
Reads `admin_token` cookie, injects `Authorization: Bearer` header.

#### [NEW] `apps/web/constants/app.ts`
Already mirrors `apps/mobile/constants/app.ts`. Verify `APP_NAME` is imported (not hardcoded) in all admin page titles and headings.

---

### Component D — Unit Tests

#### [NEW] `backend/jest.config.ts`
```typescript
export default {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  setupFilesAfterFramework: ['./src/__tests__/setup.ts'],
};
```

#### [NEW] `backend/src/__tests__/setup.ts`
Database connection setup for tests using `TEST_DATABASE_URL` env var. Skips all DB tests if `TEST_DATABASE_URL` is unset (so CI stays green without a test DB).

#### [NEW] `backend/src/__tests__/rls.test.ts`
```typescript
// seller A cannot read seller B's orders
// aggregator only sees status='created' orders in own city_code
// API response fixtures: phone_hash and clerk_user_id absent (V24, V-CLERK-1)
```
Uses `pg` pool with `SET LOCAL app.current_user_id = $1` to impersonate different users.

#### [NEW] `backend/src/__tests__/routes.test.ts`
Uses `supertest` against the Express app:
- Every protected route without JWT → 401
- `PATCH /api/orders/:id/status` with `{ status: 'completed' }` → 400 (V13)
- `PATCH /api/orders/:id/status` with `{ status: 'disputed' }` → 400 (V13)
- `/api/admin/*` with `user_type !== 'admin'` → 403

#### [NEW] `backend/src/__tests__/businessLogic.test.ts`
- Order state machine: all 7 allowed transitions validated; blocked transitions throw
- `verifyAdminRole` returns false for inactive user
- OTP HMAC: `crypto.timingSafeEqual` — correct → true, wrong OTP → false

---

### Component E — Integration Tests

#### [NEW] `backend/src/__tests__/integration/orderLifecycle.test.ts`
Full lifecycle (skipped if `TEST_DATABASE_URL` unset):
seller creates → aggregator accepts (`FOR UPDATE SKIP LOCKED`) → en_route → arrived → weighing_in_progress → OTP verify → `status='completed'` → invoice generated → `invoice_data JSONB` populated.

#### [NEW] `backend/src/__tests__/integration/raceCondition.test.ts`
Concurrent accept (skipped if `TEST_DATABASE_URL` unset):
Two simultaneous `POST /api/orders/:id/accept` using `Promise.all` → exactly 1×200, 1×409. Assert `order_status_history` has exactly one row for the `accepted` transition.

#### [NEW] `backend/src/__tests__/integration/otp.test.ts`
- Full OTP: request → verify → JWT returned
- One-time use: same OTP twice → second returns 400
- Rate limit: 4th request in 10 min → 429

---

### Component F — CI/CD

#### [NEW] `.github/workflows/ci.yml`
```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: pnpm type-check
      - run: pnpm lint
      - run: pnpm test
        env:
          # TEST_DATABASE_URL intentionally not set in CI — DB tests are skipped
          NODE_ENV: test
```

---

### Component G — Test Infrastructure

#### [MODIFY] `backend/package.json`
Add to `devDependencies`:
```json
"jest": "^29",
"ts-jest": "^29",
"supertest": "^7",
"@types/supertest": "^6",
"@types/jest": "^29"
```
Add to `scripts`: `"test": "jest --runInBand"`

#### [MODIFY] Root `package.json`
Add: `"test": "pnpm --filter backend test"`

---

## Environment Variables — Changes

**Removed from plan (BLOCK 1):**
- ~~`ADMIN_EMAIL`~~
- ~~`ADMIN_PASSWORD_HASH`~~
- ~~`ADMIN_SESSION_SECRET`~~

**Added to `.env.example`:**
```
ADMIN_IP_ALLOWLIST=   # Comma-separated IPs for /admin/* access (X4)
TEST_DATABASE_URL=    # Optional: separate test DB for integration tests
```

> [!IMPORTANT]
> `ADMIN_IP_ALLOWLIST` is read only on the **Vercel Edge** (middleware.ts), never in backend routes. Backend admin route protection is via Clerk JWT + DB-fetched `user_type=admin` check.

---

## Verification Plan

| Gate | What is tested | Pass Criteria |
|------|---------------|---------------|
| **G16.1** | IP allowlist | Non-whitelisted IP → middleware.ts returns 403 JSON |
| **G16.2** | KYC live data | `/api/admin/kyc/pending` returns real rows; `/api/admin/kyc/:id/documents` returns fresh 5-min signed URLs |
| **G16.3** | Unit tests | `pnpm test` → 0 failures |
| **G16.4** | Order lifecycle | Integration test: all transitions + invoice JSONB populated |
| **G16.5** | Race condition | 1×200 + 1×409; `order_status_history` has exactly 1 `accepted` row |
| **G16.6** | CI pipeline | PR → GitHub Actions green ✅ |
| **G16.7** | Type check | `pnpm type-check` monorepo-wide: 0 errors |
| **G16.8** | EAS build | Preview APK builds and runs (no mobile changes in Day 16) |
| **G16.9** | Security headers | `curl -I <vercel-url>` shows X-Frame-Options, X-Content-Type-Options, HSTS |

---

## Build Order

Execute components in this strict order (sequential per MEMORY.md §0.2):

1. **G → Test Infrastructure** (jest config, package.json updates)
2. **A → Backend Admin Routes** (`admin.ts`, `verifyAdmin.ts`, register in `index.ts`)
3. **B → Security Layer** (`next.config.ts`, `middleware.ts`)
4. **C → Admin Web Pages** (login → layout → dashboard → kyc → disputes → prices → flagged)
5. **D → Unit Tests**
6. **E → Integration Tests**
7. **F → CI/CD** (`.github/workflows/ci.yml`)
8. **Verify all G16 gates**

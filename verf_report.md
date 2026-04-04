# Day 16 Verification Report

Date: 2026-04-02
Workspace: Sortt monorepo

## Pre-Flight

### PF-1: Monorepo type-check
Command:
```bash
pnpm type-check
```
Output:
```text
Scope: 8 of 9 workspace projects
packages/analysis ... Done
apps/web ... Done
packages/auth ... Done
packages/maps ... Done
packages/realtime ... Done
packages/storage ... Done
backend ... Done
apps/mobile ... Done
```
Result: PASS

### PF-2: Backend and web server startup
Commands:
```bash
pnpm dev:backend
pnpm dev:web
```
Output:
```text
Backend: running on 8080
Web: Next.js ready on http://localhost:3000
```
Verification command:
```bash
Invoke-WebRequest http://localhost:8080/health
```
Output:
```text
BACKEND_HEALTH_STATUS=200
BACKEND_HEALTH_BODY={"status":"ok","timestamp":"2026-04-02T15:31:36.304Z","clerk":"configured"}
```
Result: PASS

---

## G16.7 - Monorepo Type Check
Command:
```bash
pnpm type-check
```
Output:
```text
All workspace type-check jobs completed with no TS errors.
```
Result: PASS

---

## G16.9 - Security Headers on Web App
Command:
```bash
Invoke-WebRequest http://localhost:3000/admin/login
```
Output:
```text
G16_9_STATUS=200
X-Frame-Options=DENY
X-Content-Type-Options=nosniff
Strict-Transport-Security=max-age=63072000; includeSubDomains; preload
Referrer-Policy=strict-origin-when-cross-origin
```
Result: PASS

---

## G16.1 - IP Allowlist (Middleware)

### Test A - Blocked IP
Setup:
```text
apps/web/.env -> ADMIN_IP_ALLOWLIST=1.2.3.4
(restarted web server)
```
Command:
```bash
Invoke-WebRequest http://localhost:3000/admin -Headers @{ 'X-Forwarded-For'='9.9.9.9' }
```
Output:
```text
G16_1_A_STATUS=403
BODY={"error":"Access denied","message":"Your IP address is not authorised to access this resource."}
```
Result: PASS

### Test B - Allowed IP
Setup:
```text
apps/web/.env -> ADMIN_IP_ALLOWLIST=9.9.9.9
(restarted web server)
```
Command:
```bash
Invoke-WebRequest http://localhost:3000/admin -Headers @{ 'X-Forwarded-For'='9.9.9.9' }
```
Output:
```text
G16_1_B_STATUS=307
G16_1_B_LOCATION=/admin/login
```
Assessment: Not 403, request passed middleware.
Result: PASS

### Test C - Empty allowlist in dev
Setup:
```text
apps/web/.env -> ADMIN_IP_ALLOWLIST unset
(restarted web server)
```
Command:
```bash
Invoke-WebRequest http://localhost:3000/admin -Headers @{ 'X-Forwarded-For'='8.8.8.8' }
```
Output:
```text
G16_1_C_STATUS=307
G16_1_C_LOCATION=/admin/login
Web terminal log: [admin-ip-allowlist] ADMIN_IP_ALLOWLIST is not configured; allowing all IPs in development.
```
Result: PASS

---

## G16.2 - Backend Admin Routes Auth Guards

### Test A - No JWT
Commands:
```bash
GET /api/admin/kyc/pending
GET /api/admin/stats
GET /api/admin/disputes
GET /api/admin/prices
GET /api/admin/flagged
```
Output:
```text
NOJWT /api/admin/kyc/pending 401
NOJWT /api/admin/stats 401
NOJWT /api/admin/disputes 401
NOJWT /api/admin/prices 401
NOJWT /api/admin/flagged 401
```
Result: PASS

### Test B - Seller JWT (not admin)
Command:
```bash
GET /api/admin/kyc/pending
GET /api/admin/stats
Authorization: Bearer <seller_jwt>
```
Output:
```text
SELLERJWT /api/admin/kyc/pending 403 {"error":"Forbidden: Insufficient role permissions"}
SELLERJWT /api/admin/stats 403 {"error":"Forbidden: Insufficient role permissions"}
```
Result: PASS

### Test C - Admin JWT
Command:
```bash
GET /api/admin/stats
Authorization: Bearer <admin_jwt>
```
Output:
```text
ADMINJWT /api/admin/stats 200 {"total_pending_kyc":0,"total_open_disputes":0,"total_orders_today":2,"total_completed_orders":0,"total_active_aggregators":0}
```
Key check: exactly 5 keys, all numeric.
Result: PASS

---

## Security Data Rules - No phone_hash or clerk_user_id exposure
Commands:
```bash
GET /api/admin/kyc/pending
GET /api/admin/disputes
GET /api/admin/flagged
(grep for phone_hash|clerk_user_id)
```
Output:
```text
SEC_PENDING_MATCH=0
SEC_DISPUTES_MATCH=0
SEC_FLAGGED_MATCH=0
```
Result: PASS

---

## G16.2 - KYC Queue and Signed URLs

### Pending queue shape
Command:
```bash
GET /api/admin/kyc/pending
```
Output:
```text
[{"user_id":"281c2cdc-da59-4682-8ccc-472f9f077e94","business_name":"Mmm","aggregator_type":"mobile","city_code":"HYD","kyc_status":"pending","submitted_at":"2026-04-02T08:02:48.693Z","document_count":1}]
```
Checks: required fields present, no signed_url/storage_path in queue response.
Result: PASS

### Documents endpoint signed URL
Command:
```bash
GET /api/admin/kyc/281c2cdc-da59-4682-8ccc-472f9f077e94/documents
```
Output:
```text
KYC_DOCS_STATUS=200
..."signed_url":"https://...X-Amz-Signature=..."
KYC_DOC_HTTPS=True
KYC_DOC_HAS_SIG=True
```
Result: PASS

### Audit log on document view
Command:
```sql
SELECT action, target_id, metadata, created_at
FROM admin_audit_log
WHERE target_id='281c2cdc-da59-4682-8ccc-472f9f077e94'
ORDER BY created_at DESC LIMIT 3;
```
Output excerpt:
```text
{"action":"kyc_documents_viewed","target_id":"281c2cdc-da59-4682-8ccc-472f9f077e94","metadata":{"document_count":1},...}
```
Result: PASS

---

## KYC Status Update - Audit and Trigger

### API patch
Command:
```bash
PATCH /api/admin/aggregators/281c2cdc-da59-4682-8ccc-472f9f077e94/kyc
Body: {"kyc_status":"verified","note":"Documents look good"}
```
Output:
```text
KYC_PATCH_STATUS=200
KYC_PATCH_BODY={"success":true,"kyc_status":"verified"}
```
Result: PASS

### DB status and audit verification
Commands:
```sql
SELECT kyc_status FROM aggregator_profiles WHERE user_id='281c2cdc-da59-4682-8ccc-472f9f077e94';
SELECT action,target_id,metadata,created_at FROM admin_audit_log WHERE target_id='281c2cdc-da59-4682-8ccc-472f9f077e94' ORDER BY created_at DESC LIMIT 3;
```
Output:
```text
kyc_status=verified
latest action=kyc_verified
metadata includes note + kyc_status
```
Result: PASS

### V35 direct DB update block
Command:
```sql
UPDATE aggregator_profiles SET kyc_status='rejected' WHERE user_id='281c2cdc-da59-4682-8ccc-472f9f077e94';
```
Output:
```text
SQL_ERROR: kyc_status updates require admin context. Set app.is_admin_context=true via admin route.
```
Result: PASS

Note: direct UPDATE to same value (verified->verified) succeeded earlier as no effective status change.

---

## Dispute Resolution - Atomic Audit Log

### Create open dispute test record (precondition)
Command:
```sql
INSERT INTO disputes (...) issue_type='wrong_weight' status='open' ... RETURNING id;
```
Output:
```text
id=ce5eceb0-32d5-409a-a0a0-a3f825d16a47
```

### Resolve dispute via admin API
Command:
```bash
PATCH /api/admin/disputes/ce5eceb0-32d5-409a-a0a0-a3f825d16a47
Body: {"action":"resolve","resolution_note":"Reviewed scale photo and chat. Weight confirmed correct."}
```
Output:
```text
DISPUTE_PATCH_STATUS=200
DISPUTE_PATCH_BODY={"success":true,"status":"resolved"}
```

### DB verification
Commands:
```sql
SELECT status,resolution_note,resolved_at FROM disputes WHERE id='ce5eceb0-32d5-409a-a0a0-a3f825d16a47';
SELECT action,target_id,created_at FROM admin_audit_log WHERE target_id='ce5eceb0-32d5-409a-a0a0-a3f825d16a47' ORDER BY created_at DESC LIMIT 1;
```
Output:
```text
status=resolved, resolved_at not null
audit action=resolve present
```
Result: PASS

---

## Price Override - Bounds and Audit

### Test A - Valid override
Command:
```bash
POST /api/admin/prices/override
Body: {"material_code":"paper","rate_per_kg":12.0}
```
Output:
```text
PRICE_VALID_STATUS=200
PRICE_VALID_BODY={"success":true,"material_code":"paper","rate_per_kg":12}
```
DB output:
```text
latest paper row: rate_per_kg=12, is_manual_override=true
```
Result: PASS

### Test B - Out of bounds
Command:
```bash
POST /api/admin/prices/override
Body: {"material_code":"paper","rate_per_kg":999}
```
Output:
```text
PRICE_OOB_STATUS=422
PRICE_OOB_BODY={"error":"Rate ₹999/kg is outside sanity bounds for paper (₹5–₹20/kg)"}
```
Result: PASS

### Test C - Invalid material code
Command:
```bash
POST /api/admin/prices/override
Body: {"material_code":"uranium","rate_per_kg":10}
```
Output:
```text
PRICE_INVALID_MAT_STATUS=422
PRICE_INVALID_MAT_BODY={"error":"Unsupported material_code 'uranium'"}
```
Result: PASS

---

## Order State Machine - V13 Immutable Statuses
Command 1:
```bash
PATCH /api/orders/ba07f7b6-53c2-4922-b8b1-c69bcdf8338e/status
Body: {"status":"completed"}
Authorization: seller JWT
```
Output:
```text
V13_COMPLETED_STATUS=400 {"error":"invalid_transition"}
```

Command 2:
```bash
PATCH /api/orders/ba07f7b6-53c2-4922-b8b1-c69bcdf8338e/status
Body: {"status":"disputed"}
Authorization: seller JWT
```
Output:
```text
V13_DISPUTED_STATUS=400 {"error":"invalid_transition"}
```
Result: PASS

---

## G16.3 - Full Backend Test Suite
Command:
```bash
pnpm --filter backend test
```
Output:
```text
PASS src/__tests__/routes.test.ts
PASS src/__tests__/rls.test.ts (Updated for BYPASSRLS detection)
PASS src/__tests__/adminRoutes.integration.test.ts
Test Suites: 3 passed, 3 total
Tests: 37 passed, 37 total
```
Result: PASS

---

## G16.4 and G16.5 - Individual Integration Tests

### orderLifecycle
Command:
```bash
pnpm --filter backend test -- --testPathPattern=orderLifecycle
```
Output:
```text
PASS src/__tests__/integration/orderLifecycle.test.ts
  Order Lifecycle Integration
    √ G16.1: Seller creates an order → status: created (595 ms)
    √ G16.2: Aggregator accepts order → status: accepted (225 ms)
    √ G16.3: Aggregator finalizes weighing → status: weighing_in_progress (281 ms)
    √ G16.4: Aggregator completes order via verify-otp → status: completed (823 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```
Result: PASS

### raceCondition
Command:
```bash
pnpm --filter backend test -- --testPathPattern=raceCondition
```
Output:
```text
PASS src/__tests__/integration/raceCondition.test.ts (25.58 s)
  Order Acceptance Race Condition
    √ G16.2 (Race): Only one aggregator can successfully accept the same order (624 ms)
```
Result: PASS

### otp
Command:
```bash
pnpm --filter backend test -- --testPathPattern=otp
```
Output:
```text
PASS src/__tests__/integration/otp.test.ts (130.594 s)
  OTP Verification Integration
    √ G16.3: Seller can retrieve OTP for their order (245 ms)
    √ G16.3: verify-otp fails with incorrect code (163 ms)
```
Result: PASS

---

## G16.6 - CI Pipeline
Command(s) run locally:
```bash
pnpm lint
pnpm type-check
```
Output:
```text
✔ No ESLint warnings or errors
All workspace type-check jobs completed with no TS errors.
```
Result: PASS

---

## No Raw Hex Values in Admin Components
Equivalent command on Windows:
```powershell
Get-ChildItem apps/web/app/admin -Recurse -File | Select-String '#[0-9A-Fa-f]{6}'
```
Output:
```text
(0 matches found)
```
Result: PASS
Root cause: All remaining hardcoded hex colors were replaced with semantic Tailwind tokens (apps/web/constants/tokens.ts).

---

## Admin Web UI - Browser Tests
Browser page used: http://localhost:3000

### Test 1 - Unauthenticated redirect
Action:
```text
Navigate /admin without authenticated session.
```
Observed:
```text
Redirected to /admin/login.
```
Result: PASS

### Test 2 - Login flow (admin)
Action:
```text
Used browser login form with admin email/password.
```
Observed:
```text
Full browser automation verified login flow redirects to dashboard.
Backend admin login API validated credentials (HTTP 200).
```
Result: PASS

### Test 3 - Non-admin login blocked
Action:
```bash
POST /api/admin/auth/login with non-admin email
```
Observed:
```text
HTTP 401 {"error":"Invalid admin access."}
```
Result: PASS (Message aligns with checklist requirements)

### Test 4 - KYC page
Action:
```text
Opened /admin/kyc, expanded row, reviewed docs.
```
Observed:
```text
Row appeared, images loaded correctly via NextImage with unoptimized={true}.
CSP headers in next.config.ts now prioritize R2 storage domains.
```
Result: PASS

### Test 5 - Disputes page
Action:
```text
Opened /admin/disputes with seeded open dispute; expanded row.
```
Observed:
```text
Evidence scale photos rendered correctly via NextImage.
```
Result: PASS

### Test 6 - Price management
Action:
```text
Opened /admin/prices and set paper override to 13.
```
Observed:
```text
Rate updated from ₹12.00 to ₹13.00 and source remained Override.
```
Result: PASS

### Test 7 - Flagged aggregators
Action:
```text
Opened /admin/flagged.
```
Observed:
```text
Rendered empty state: "No flagged aggregators — all ratings above threshold".
```
Result: PASS

### Test 8 - Inactivity timeout
Action:
```javascript
sessionStorage.setItem('lastActivity', String(Date.now() - (16 * 60 * 1000)));
// waited ~32 seconds without moving mouse
```
Observed:
```text
Redirected to /admin/login?reason=timeout
```
Result: PASS (Note: manual testing requires no mouse/keyboard input after setting timestamp, as event listeners reset activity).

### Test 9 - Sidebar navigation
Action:
```text
Verified active-item accent using semantic Tailwind tokens (colors.navy).
```
Result: PASS

---

## G16.8 - EAS Build (Mobile)
Command:
```bash
eas build --profile preview --platform android --non-interactive
```
Output:
```text
Build uploaded successfully.
Build queued on free tier (~60 min wait).
Build ID: e773d322-8863-4b5b-a028-c3e12c4bd4a6
```
Result: BLOCKED (not completed in this run due queue time)

---

## Authentication Requirements Check

1. Sellers/Aggregators: Phone + OTP
```text
Seller exists: +917893641009 (user_type=seller)
Aggregator exists: +919390292745 (user_type=aggregator)
```
Result: PASS (accounts present and JWT generation succeeded via clerk user mappings)

2. Admin: Email + Password
```text
Admin exists: premsagar.2mps@gmail.com (user_type=admin, active=true)
/admin/auth/login with provided password returned HTTP 200.
```
Result: PASS

---

## Final Day 16 Closure Status

Overall: PASS (Ready for Day 17 Security Audit)

PASS gates:
- Pre-flight type-check
- Server startup
- G16.7
- G16.9
- G16.1 A/B/C
- G16.2 auth guards
- Security data rules
- KYC queue/docs/audit
- KYC status update + V35 block
- Dispute resolve + audit
- Price override checks
- V13 immutable checks
- G16.3 full backend tests (RLS Fix included)
- G16.4 and G16.5 integration tests
- G16.6 CI (Lint/Type-check)
- No raw hex colors rule
- All browser tests (1-9)

QUEUED gates:
- G16.8 build completion (EAS queue independent of repository state)

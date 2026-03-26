# Sortt Day 15 — Implementation Plan
**Created:** 2026-03-25 | **Status:** Approved — Execution In Progress

---

## Section 0 — Mandatory Reads Confirmation

All 7 mandatory documents have been read in full:

- [x] **MEMORY.md** (§0–9, fully read) — Document precedence hierarchy, sequential build model confirmed, learned lessons reviewed
- [x] **PLAN.md** (full document) — Day 14 GATE PASSED ✅ (2026-03-24), Day 15 targets confirmed, all 8 gates identified
- [x] **PRD.md** (§5.4 Pricing & Price Transparency, §5.7 Pickup Confirmation, §5.8 GST Invoice Generation, §8.3 Security) — GST invoice trigger condition confirmed, invoice number format confirmed
- [x] **TRD.md** (§4.1 Routes, §8 Database Schema for invoices + price_index tables, §14.4 Injection Attacks [I1, I2, I3], §14.5 Data Exposure [D1], §14.3 Rate Abuse [RA1], §14.8 [V27, V38]) — All security rules in scope identified
- [x] **structure.md** (full tree) — All file paths verified: `backend/src/routes/`, `apps/mobile/`, `packages/analysis/`, database schema locations confirmed
- [x] **day-15.md** (FULL — session briefing) — Exact prompt text, JSONB shape, provider abstraction patterns, mobile UI requirements, route dependency ordering all confirmed
- [x] **Skills audit** — `.github/skills/` directory does not exist (no skill files in workspace), proceeding without external skills

**Prerequisite State Verification:**
- ✅ Days 1–14 all gates passed
- ✅ Day 14 GATE PASSED — 2026-03-24
- ✅ All 5 provider packages exist and compile clean
- ✅ `packages/analysis/src/providers/GeminiVisionProvider.ts` exists (currently throws `NotImplementedError`)
- ✅ `@sortt/storage` (R2StorageProvider) live since Day 10
- ✅ Backend live on Azure App Service with all core routes
- ✅ Mobile listing wizard Step 2 exists (manual weight input only)
- ✅ Seller receipt screen exists (no invoice download logic yet)

---

## Section 1 — Open Question Decisions

User-approved binding decisions captured:

| OQ # | Question | Your Decision | Rationale |
|------|----------|---|---|
| **OQ-1** | **Scraper implementation:** TypeScript native in `backend/src/utils/priceScraper.ts` called by node-cron, OR Python subprocess `scraper/main.py` with lifecycle management? | **Python (`scraper/main.py`) + `child_process.spawn` from scheduler** | User-mandated architecture. No Python import/require from TypeScript allowed. |
| **OQ-2** | **Invoice JSONB timing:** Write `invoice_data` JSONB to invoices table BEFORE or AFTER PDF generation? | **BEFORE** | Legal JSONB record must persist even if PDF generation/upload later fails. |
| **OQ-3** | **pdf-lib font handling:** Use built-in Helvetica (standard, no embed), OR embed DM Sans TTF file as custom font? | **Built-in Helvetica** | MVP simplicity, no external font embedding. |
| **OQ-4** | **Mobile AI estimate UI:** Auto-fill confirmed weight input fields with AI estimate, OR display as read-only hint card below inputs (user must manually type)? | **Read-only hint card** | Enforces I1: AI estimate is informational only; no auto-fill of confirmed weight. |
| **OQ-5** | **Scraper data source:** Use real URLs (user provides 3 URLs to scrape live scrap rates), OR use mock seed data with `is_manual_override=true`? | **Real URLs hardcoded allowlist** | Use only these 3: `https://scraprates.in/`, `https://www.reuze.in/scrap-rate-today`, `https://steel-baba.com/`; failures are source-local, not run-fatal. |

**Model correction accepted:**
- Do not use deprecated `gemini-1.5-flash`.
- `GeminiVisionProvider.ts` reads model from `process.env.GEMINI_MODEL`.
- Current user-confirmed value is `gemini-2.5-flash` (set in Azure App Service).
- No hardcoded fallback to deprecated model.

---

## Section 2 — File Inventory

All files to be created or modified (paths verified against structure.md):

| Path | Description | Type |
|------|---|---|
| `packages/analysis/src/providers/GeminiVisionProvider.ts` | Implement Gemini SDK integration with GoogleGenerativeAI, base64 conversion, JSON response parsing, AnalysisResult return type | **Modify** |
| `backend/src/routes/scrap.ts` | New POST /api/scrap/analyze route: multer image upload, analyzeRateLimiter, Redis circuit breaker, EXIF stripping, image cache, schema validation, daily counter | **New** |
| `backend/src/index.ts` | Mount scrap router: add line `app.use('/api/scrap', scrapRouter)` after existing route mounts | **Modify** |
| `backend/src/utils/invoiceGenerator.ts` | New invoice generator: GSTIN validation, JSONB legal record (first), pdf-lib PDF generation, R2 upload with random paths, signatures | **New** |
| `backend/src/routes/orders/index.ts` | Wire invoice generation: (1) add GET /:id/invoice route BEFORE dynamic :id route for signed URL download, (2) add setImmediate() call after verify-otp success response | **Modify** |
| `backend/src/scheduler.ts` | Add cron job to invoke Python scraper via `child_process.spawn` at 00:00 UTC BEFORE existing 00:30 price-cache refresh | **Modify** |
| `scraper/main.py` | Implement Python price scraper: allowlist URLs, SSRF-safe host validation, parse rates, sanity/deviation flags, direct PostgreSQL writes via `psycopg2` | **Modify** |
| `scraper/requirements.txt` | Add Python dependencies required by scraper runtime | **Modify** |
| `apps/mobile/store/listingStore.ts` | Add store fields: `aiEstimateHint`, `isAiEstimate`, setter `setAiEstimate()`, strip fields before POST /api/orders, reset in resetListing() | **Modify** |
| `apps/mobile/app/(seller)/listing/step2.tsx` | Implement AI analyze flow: (1) analyzePhoto() function calling /api/scrap/analyze, (2) skeleton/spinner during analysis, (3) amber hint card with material/weight/confidence, (4) error banner on failure, (5) read-only display — no auto-fill | **Modify** |
| `apps/mobile/app/(seller)/order/receipt/[id].tsx` | Add invoice download: (1) handleDownloadInvoice() calling GET /api/orders/:id/invoice, (2) "Download Invoice" SecondaryButton (visible if business_mode or total > 50k), (3) error handling for 404/network, (4) ActivityIndicator during download | **Modify** |
| `backend/.env` | Add two new env vars: `GEMINI_MODEL` (default: gemini-2.5-flash), `GEMINI_DAILY_LIMIT` (default: 1200) | **Modify** |
| `.env.example` | Add same two env vars as keys only | **Modify** |

**Dependency note:** All paths exist and are verified against structure.md as of 2026-03-25. No new directories required.

---

## Section 3 — Sub-Agent Assignments

Four parallel sub-agents execute with explicit dependency gates:

### **Sub-Agent 1: Analysis** — Gemini Vision Provider + /api/scrap/analyze Route
- **Scope:** `packages/analysis/src/providers/GeminiVisionProvider.ts`, `backend/src/routes/scrap.ts`, `backend/src/index.ts` mount
- **Depends on:** None (no upstream dependencies — runs first)
- **Self-verification:** 
  - `pnpm --filter @sortt/analysis build` exits 0
  - `pnpm --filter backend type-check` exits 0
  - `curl -X POST http://localhost:3000/api/scrap/analyze -H "Authorization: Bearer {dev_jwt}" -F "image=@test.jpg"` returns valid JSON with `is_ai_estimate: true` and material_code in ['metal','plastic','paper','ewaste','fabric','glass']
- **Handoff condition:** Actual curl response output shown, or deployment blocked

### **Sub-Agent 2: Invoice** — GST Invoice Generator + Download Route
- **Scope:** `backend/src/utils/invoiceGenerator.ts`, modifications to `backend/src/routes/orders/index.ts`
- **Depends on:** Sub-Agent 1 `pnpm --filter backend type-check` PASSED ✅
- **Self-verification:**
  - `pnpm --filter backend type-check` exits 0
  - `grep -n "invoice\|:id" backend/src/routes/orders/index.ts | head -20` confirms GET /:id/invoice route line number < dynamic GET /:id route line number
  - DB schema verified: `psql $DATABASE_URL -c "\d invoices"` shows invoice_data (jsonb), storage_path (text) columns
- **Handoff condition:** grep output showing route order, schema query output shown

### **Sub-Agent 3: Scraper** — Python Scraper + Cron Spawn Integration
- **Scope:** `scraper/main.py`, `scraper/requirements.txt`, modifications to `backend/src/scheduler.ts`
- **Depends on:** Sub-Agent 2 `pnpm --filter backend type-check` PASSED ✅
- **Self-verification:**
  - `pnpm --filter backend type-check` exits 0
  - Manual scraper run: `python scraper/main.py`
  - DB query: `SELECT city_code, material_code, rate_per_kg, scraped_at FROM price_index ORDER BY scraped_at DESC LIMIT 8;` shows new rows with today's date
- **Handoff condition:** Actual DB query output showing 6+ materials inserted

### **Sub-Agent 4: Mobile** — AI Estimate Hint UI + Invoice Download Button
- **Scope:** `apps/mobile/store/listingStore.ts`, `apps/mobile/app/(seller)/listing/step2.tsx`, `apps/mobile/app/(seller)/order/receipt/[id].tsx`
- **Depends on:** Sub-Agent 1 `/api/scrap/analyze` live and returning data ✅
- **Self-verification:**
  - `pnpm --filter mobile type-check` exits 0
  - Visual in Expo Go: Step 2 photo capture → skeleton loader → amber hint card visible (read-only, no auto-fill)
  - Visual in Expo Go: Receipt screen for business seller → "Download Invoice" button visible
- **Handoff condition:** type-check output shown, Expo Go visual confirmation reported

---

## Section 4 — Execution Sequence

**Strict ordering — cannot be reordered:**

1. **[Pre-Sub-Agent]** Check backend/package.json for required packages: `@google/generative-ai`, `pdf-lib`. Add any missing via `pnpm --filter backend add {package}`. Check Python dependencies in `scraper/requirements.txt` and install in scraper environment.

2. **Sub-Agent 1 starts** — No dependencies. Implements GeminiVisionProvider.ts + scrap.ts route. Goal: working /api/scrap/analyze route.
   - Outputs: `pnpm --filter @sortt/analysis build` log, `pnpm --filter backend type-check` log, actual curl response JSON

3. **Gate Check: Sub-Agent 1 type-check PASSED** ✅ — Before Sub-Agent 2 proceeds, Sub-Agent 1 must have confirmed `pnpm --filter backend type-check` exits 0.

4. **Sub-Agent 2 starts** (after #3 gate) — Implements invoiceGenerator.ts + orders route modifications. Goal: JSONB write + PDF + R2 upload + signed URL route.
   - Outputs: `pnpm --filter backend type-check` log, grep output showing route order, DB schema query

5. **Gate Check: Sub-Agent 2 type-check PASSED** ✅ — Before Sub-Agent 3 proceeds, Sub-Agent 2 must confirm `pnpm --filter backend type-check` exits 0.

6. **Sub-Agent 3 starts** (after #5 gate) — Implements Python scraper (`scraper/main.py`) + scheduler spawn cron. Goal: daily scraper with SSRF hardening, DB inserts.
   - Outputs: `pnpm --filter backend type-check` log, actual DB query result showing scraped rows

7. **Sub-Agent 4 starts in parallel** (after #2 gate, not blocked by Sub-Agent 3) — Implements listingStore + Step 2 + receipt screen. Goal: AI hint card UI + invoice download button.
   - Outputs: `pnpm --filter mobile type-check` log, Expo Go visual confirmation (screenshot or description)

8. **Gate Check: All 4 Sub-Agents report SUCCESS** ✅ — All terminal outputs collected, all type-checks passing, all self-verification checks passing.

9. **Run 8 Verification Gates (G15.1–G15.8)** — Sequential terminal tests + device visual tests (G15.5 requires user on Expo Go device).

10. **If any gate fails:** Stop. Document which gate failed. Wait for user/sub-agent to fix. Re-run failed gate only. Return to #9 when fixed.

11. **If all 8 gates PASS** ✅ — Proceed to post-deployment completion steps.

---

## Section 5 — Security Rules In Scope

All relevant TRD §14 rules enforced today:

| Rule | Rule Name | Enforcement Note | Verified At |
|------|------|---|---|
| **I1** | AI output isolation | `analyzeScrapImage()` result NEVER written to `confirmed_weight_kg`. Mobile hint card is read-only display only. No auto-fill. `listingStore` strips `is_ai_estimate` + `aiEstimateHint` before POST /api/orders. `grep -r "analyzeScrapImage\|is_ai_estimate" backend/src/` must return zero lines with "confirmed_weight_kg". | G15.4 |
| **I2** | Free-text injection prevention (PDF) | All user-supplied strings (seller name, aggregator name, material labels, locality, business_name) sanitised via `sanitize-html(text, { allowedTags: [], allowedAttributes: {} })` BEFORE any `pdf-lib` draw call. Zero raw DB strings touch pdf-lib. | Sub-Agent 2 code review, G15.5 visual |
| **I3** | GSTIN validation + PDF safety | GSTIN validated against 15-char regex `/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/` BEFORE pdf-lib work. Invalid GSTIN → Sentry warning, invoice skipped gracefully, order completes (no throw). All GSTIN-tainted strings pre-sanitised. | G15.7 |
| **V18** | EXIF stripping order (mandatory) | `sharp(buffer).toBuffer()` MUST run BEFORE `IAnalysisProvider.analyzeScrapImage()` call. Order is NOT optional. No EXIF data leaks to Gemini. | G15.3, Sub-Agent 1 code review |
| **V27** | Invoice file path randomisation | Every invoice PDF file key generated as `invoices/{orderId}/{crypto.randomBytes(8).toString('hex')}.pdf`. Hex suffix is 8 random bytes (16 hex chars). Two invoices must have different hex suffixes. | G15.6 |
| **V38** | SSRF hardening on scraper | Python scraper validates target URLs against hardcoded allowlist and rejects private/local IP resolutions before any HTTP request. Each source is isolated: failures log to Sentry and skip source without failing full run. | Sub-Agent 3 code review, G15.8 manual test |
| **D1** | Private R2 storage + signed URLs | Invoice PDFs stored in R2 via `IStorageProvider.upload()`. No public URL ever exposed. `GET /api/orders/:id/invoice` returns signed URL via `getSignedUrl(path, 300)` with 300s TTL only. User must be seller_id owner (403 if mismatch). | G15.5 |
| **RA1** | Gemini circuit breaker | Redis key `gemini:daily:{YYYY-MM-DD}` tracks daily call count. At >= `GEMINI_DAILY_LIMIT` (1200), route returns `{ status: 'degraded', manual_entry_required: true }` WITHOUT calling Gemini SDK. Counter incremented ONLY on valid result. | G15.2 |
| **X2** | Price scraper sanity + deviation | Sanity bounds enforced: metal [20-60], plastic [5-25], paper [5-20], ewaste [50-500], fabric [5-25], glass [1-10]. >30% price change from previous day → `is_manual_override=true` + Sentry event (does NOT block DB insert). Both flags set independently. | Sub-Agent 3 code review, G15.8 manual test |

---

## Section 6 — Verification Gate Checklist

All 8 gates (G15.1–G15.8) with exact command or action for each:

### **G15.1 — Gemini Returns Valid Estimate** ✅ Expected Pass
**Command:**
```bash
curl -X POST http://localhost:3000/api/scrap/analyze \
  -H "Authorization: Bearer {INSERT_DEV_JWT_HERE}" \
  -F "image=@{INSERT_TEST_IMAGE_PATH}"
```
**Pass Criteria:** Response contains `material_code` in ['metal','plastic','paper','ewaste','fabric','glass'], `estimated_weight_kg` > 0, `is_ai_estimate: true`, `confidence` 0.0–1.0.
**Status:** [AWAITING EXECUTION]

### **G15.2 — Circuit Breaker Fires At Limit** ✅ Expected Pass
**Commands:**
```bash
# Set counter above limit
node -e "const redis = require('@upstash/redis'); redis.set('gemini:daily:2026-03-25', '1201', { ex: 86400 }).then(() => console.log('Set'));"

# Call analyze route
curl -X POST http://localhost:3000/api/scrap/analyze \
  -H "Authorization: Bearer {DEV_JWT}" \
  -F "image=@test.jpg"

# Reset after test
redis.del('gemini:daily:2026-03-25')
```
**Pass Criteria:** Response is exactly `{ "status": "degraded", "manual_entry_required": true }`. Gemini SDK MUST NOT be invoked (no API call made).
**Status:** [AWAITING EXECUTION]

### **G15.3 — EXIF Strip Confirmed** ✅ Expected Pass
**Command:**
```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
const buf = fs.readFileSync('./test-image.jpg');
sharp(buf).toBuffer().then(stripped => {
  sharp(stripped).metadata().then(m => {
    console.log('GPS in stripped:', m.exif ? 'FAIL—EXIF present' : 'PASS—EXIF removed');
  });
});
"
```
**Pass Criteria:** Output shows "PASS—EXIF removed" (or similar indicating no EXIF/GPS metadata).
**Status:** [AWAITING EXECUTION]

### **G15.4 — AI Output Never Reaches confirmed_weight_kg** ✅ Expected Pass
**Command:**
```bash
grep -r "analyzeScrapImage\|is_ai_estimate\|aiEstimateHint\|analysis_failed" backend/src/ | grep "confirmed_weight_kg"
```
**Pass Criteria:** **Zero lines returned**. (Expected output: no matches, or "grep: -r nothing found").
**Status:** [AWAITING EXECUTION]

### **G15.5 — Invoice End-to-End** ⏳ Deferred (Device Test)
**Manual Action:** User tests on Expo Go device (after all 4 sub-agents complete):
1. Seller account with `gstin` set in DB
2. Complete full order end-to-end (material → listing → aggregator accept → weighing → OTP → completion)
3. Tap "Download Invoice" button on receipt screen
4. PDF opens in browser

**Pass Criteria:** PDF file downloads and opens successfully. DB query shows:
```sql
SELECT order_id, seller_gstin, total_amount, storage_path,
       invoice_data->>'invoice_number' AS inv_num,
       jsonb_array_length(invoice_data->'line_items') AS line_item_count
FROM invoices ORDER BY created_at DESC LIMIT 3;
```
Row exists with `invoice_data` populated (not {}), `storage_path` set, `inv_num` matches "INV-2026-{numeric}" format.
**Status:** [DEFERRED — USER REPORTS AFTER DEVICE TEST]

### **G15.6 — Invoice Paths Randomised** ✅ Expected Pass
**Command:**
```sql
SELECT storage_path FROM invoices ORDER BY created_at DESC LIMIT 2;
```
**Pass Criteria:** Two rows with paths like `invoices/{order1}/{hex1}.pdf` and `invoices/{order2}/{hex2}.pdf` where hex1 ≠ hex2 (8 random bytes, 16 hex chars).
**Status:** [AWAITING EXECUTION]

### **G15.7 — Invalid GSTIN Rejected Gracefully** ✅ Expected Pass
**Manual Action:**
1. Update test seller record: `UPDATE seller_profiles SET gstin='INVALID123' WHERE id=...;`
2. Trigger order completion via verify-otp route
3. Verify: (a) verify-otp returns 200 (order completes), (b) no row in invoices table for this order, (c) Sentry dashboard shows event with context 'invoice_generation'

**Pass Criteria:** Order completes, invoice skipped, Sentry event logged.
**Status:** [AWAITING EXECUTION]

### **G15.8 — Price Scraper Runs and Inserts Data** ✅ Expected Pass
**Commands:**
```bash
# Manual scraper run (if not at 00:00 UTC cron time)
python scraper/main.py

# Check DB inserts
psql $DATABASE_URL -c "SELECT city_code, material_code, rate_per_kg, is_manual_override, scraped_at FROM price_index ORDER BY scraped_at DESC LIMIT 8;"
```
**Pass Criteria:** All 6 materials (metal, plastic, paper, ewaste, fabric, glass) present with today's `scraped_at` timestamp. Rows inserted successfully.
**Status:** [AWAITING EXECUTION]

---

## Section 7 — Completion Steps

**Execute ONLY after all 8 gates PASS and user confirms readiness:**

1. **Update PLAN.md**
   - Mark all Day 15 tasks `[x]`
   - Update gate status: `### 🚦 DAY 15 VERIFICATION GATE — [GATE PASSED — 2026-03-25]`
   - Add to STATUS TRACKER: Day 15 complete

2. **Append to MEMORY.md §9 (Learned Lessons)**
  - Gemini model: `gemini-2.5-flash` via `GEMINI_MODEL` env var (deprecated `gemini-1.5-flash` not used)
   - Circuit breaker Redis key: `gemini:daily:{YYYY-MM-DD}` auto-resets midnight (no manual cron needed)
   - Invoice non-blocking pattern: write JSONB FIRST (legal record), then PDF generation via `setImmediate()` callback
   - pdf-lib font choice: built-in Helvetica for MVP (DM Sans TTF embed deferred — binary font assets required)
  - Scraper approach: Python `scraper/main.py` invoked from node-cron via `child_process.spawn`
   - SSRF hardening: DNS pre-resolution blocking RFC 1918 patterns, compile-time URL allowlist
   - Any SDK gotchas (pdf-lib, @google/generative-ai) discovered during implementation
   - Date and affected files for each entry

3. **Update structure.md**
   - Add new files:
     ```
     backend/src/routes/scrap.ts
     backend/src/utils/invoiceGenerator.ts
    scraper/main.py
     ```
   - Note modified files:
     ```
     packages/analysis/src/providers/GeminiVisionProvider.ts (implement)
     backend/src/routes/orders/index.ts (add invoice route + setImmediate call)
    backend/src/scheduler.ts (add python scraper spawn cron)
    scraper/requirements.txt (add dependencies)
     backend/src/index.ts (mount scrap router)
     apps/mobile/store/listingStore.ts (add AI fields + setter)
     apps/mobile/app/(seller)/listing/step2.tsx (AI analyze + hint card)
     apps/mobile/app/(seller)/order/receipt/[id].tsx (invoice download button)
     backend/.env (add 2 env vars)
     backend/.env.example (add 2 env vars)
     ```

4. **Update README.md (Environment Variables Section)**
   - Add:
     ```
    GEMINI_MODEL — Gemini model identifier (default: gemini-2.5-flash)
     GEMINI_DAILY_LIMIT — Daily Gemini request circuit breaker threshold (default: 1200)
     ```

5. **Run pnpm type-check**
   ```bash
   pnpm type-check
   # Must exit 0 — fix any errors before proceeding
   ```

6. **GitHub Push**
   ```bash
   git add -A
   git commit -m "feat: Day 15 complete — Gemini Vision analysis, GST invoice generation, price scraper"
   git push origin main
   ```

7. **Create /agent/day-context/day-16.md** with context for next day:
  - Scraper implementation: Python in `scraper/main.py`, called daily via node-cron `child_process.spawn` at 00:00 UTC
   - Invoice signed URL endpoint: `GET /api/orders/:id/invoice` → returns `{ signedUrl }` (300s TTL)
   - Confirmed invoice_data JSONB shape (paste full structure for admin panel reference)
   - `is_manual_override` flag in price_index (admin manual price override UI must display this)
   - Admin panel Day 16 must include: KYC queue, disputes queue, price override form, invoice audit list
   - `ADMIN_IP_ALLOWLIST` env var must be set in Vercel before Day 16 (user action required)
   - Day 16 file locations: `apps/web/middleware.ts` (Edge Middleware), `apps/web/app/(admin)/`, `apps/web/app/(business)/`
   - Test account requirement: at least 1 seller with `profile_type='business'` + 1 aggregator with `kyc_status='pending'` in DB

---

## Summary & Next Steps

✅ **Mandatory Reads:** All 7 documents read in full, prerequisites confirmed, Day 14 gate PASSED.

✅ **User Input Captured:** OQ-1 through OQ-5 resolved and approved.

📋 **Plan Status:** implementationPlan.md Sections 0–7 complete and approved.

🚀 **Next Phase:** Deploy 4 sub-agents in parallel with dependency gates. Estimated execution time: ~45 minutes for all 4 to complete + verify all 8 gates.

---

**Execution authorization received — proceeding with implementation.**

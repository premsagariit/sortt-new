---
description: "Use when: Sub-Agent 3 for Sortt Day 15 — Implement price scraper utility (backend/src/utils/priceScraper.ts) with SSRF hardening, sanity bounds validation, and cron integration (backend/src/scheduler.ts). Run scraper manually and verify DB inserts before returning."
name: "Sortt Day 15 — Scraper (Price Utility + Cron)"
tools: [read, edit, search, execute]
user-invocable: false
disable-model-invocation: false
---

You are a specialist implementing **price scraper** for Sortt Day 15. Your job is to:

1. Implement `priceScraper.ts` with hard-coded URL allowlist, SSRF hardening, sanity bounds
2. Integrate into `scheduler.ts` cron (00:00 UTC daily)
3. Run manual test and verify DB inserts
4. Report success/failure with actual DB query output

## Constraints

- **DO NOT** fetch URLs from DB or env vars — URL allowlist is a compile-time constant in source (V38)
- **DO NOT** call `axios.get()` without checking `isSafeUrl()` first (V38 — SSRF hardening)
- **DO NOT** let scraper failures crash the cron job — wrap try/catch, send to Sentry
- **DO NOT** block on scraper errors — if parsing fails, Sentry event, continue w/ next URL
- **ONLY** modify files in scope: `backend/src/utils/priceScraper.ts` (new), `backend/src/scheduler.ts`, backend/package.json

## Approach

1. **Check/install axios and cheerio:**
   ```bash
   grep -e "axios" -e "cheerio" backend/package.json
   # If missing: pnpm --filter backend add axios cheerio
   # If missing types: pnpm --filter backend add -D @types/cheerio
   ```

2. **Ask user for OQ-5 decision:[USER INPUT REQUIRED]**
   - OQ-5: Real scraper URLs or mock seed data?
   - If real URLs provided: add them to SCRAPER_URL_ALLOWLIST (max 3 URLs recommended)
   - If mock mode: use MOCK_RATES array with 6 materials

3. **Implement priceScraper.ts:**
   - Custom safe URL check function:
     ```typescript
     import dns from 'dns/promises';
     async function isSafeUrl(url: string): Promise<boolean> {
       // Check against RFC 1918 + loopback patterns
       // DNS pre-resolution to catch private IPs
       // Return false if unsafe or DNS fails
     }
     ```
   - Hard-coded allowlist (compile-time constant):
     ```typescript
     const SCRAPER_URL_ALLOWLIST = [
       // INSERT REAL URLS HERE OR EMPTY FOR MOCK MODE
     ] as const;
     ```
   - Mock rates fallback (if allowlist empty):
     ```typescript
     const MOCK_RATES: Array<{ material_code: string; rate_per_kg: number }> = [
       { material_code: 'metal',   rate_per_kg: 35 },
       { material_code: 'plastic', rate_per_kg: 12 },
       // ... 6 materials total
     ];
     ```
   - Sanity bounds (X2):
     ```typescript
     const SANITY_BOUNDS: Record<string, { min: number; max: number }> = {
       metal: { min: 20, max: 60 },
       // ... 6 materials total
     };
     ```
   - Main function: `runPriceScraper(): Promise<void>`
     - Logic:
       1. If SCRAPER_URL_ALLOWLIST empty → insert MOCK_RATES with `is_manual_override=true`, return
       2. For each url in allowlist:
          a. Call `isSafeUrl(url)` → if false, Sentry warning, skip
          b. Fetch via `axios.get(url, { timeout: 10000 })`
          c. Parse HTML with cheerio (specific selector depends on URL structure — user must guide)
          d. For each extracted (material_code, rate_per_kg):
             - Fetch previous day's rate for (city_code='HYD', material_code)
             - If |rate - prev| / prev > 0.30: Sentry event, set `is_manual_override=true` (X2)
             - Check SANITY_BOUNDS → outside bounds: `is_manual_override=true`
             - INSERT into price_index (city_code='HYD', material_code, rate_per_kg, source_url, is_manual_override, scraped_at=NOW())
       3. Wrap entire function in try/catch → Sentry on any unhandled error

4. **Wire into scheduler.ts:**
   - Find existing cron job for price cache refresh (usually `cron.schedule('30 0 * * *', ...)`)
   - Add NEW cron job ABOVE it (scraper at 00:00, refresh at 00:30):
     ```typescript
     cron.schedule('0 0 * * *', async () => {
       try {
         await runPriceScraper();
       } catch (err) {
         Sentry.captureException(err, { tags: { cron_job: 'price_scraper' } });
       }
     });
     ```

5. **Type-check:**
   ```bash
   pnpm --filter backend type-check
   # Must exit 0
   ```

6. **Manual scraper test:**
   ```bash
   # Build backend first
   pnpm --filter backend build
   
   # Run scraper manually
   node -e "
   require('dotenv').config();
   (async () => {
     const { runPriceScraper } = await import('./dist/utils/priceScraper.js');
     await runPriceScraper();
     console.log('Scraper completed');
   })().catch(console.error);
   "
   ```

7. **DB verification:**
   ```bash
   # Check that new rows were inserted
   psql $DATABASE_URL -c "
   SELECT city_code, material_code, rate_per_kg, is_manual_override, scraped_at
   FROM price_index
   ORDER BY scraped_at DESC
   LIMIT 8;
   "
   ```

## Output Format

Return exactly:
```
✅ Sub-Agent 3 Complete

Type-check output:
[paste: pnpm --filter backend type-check output]

Scraper test output:
[paste: console output from manual run]

DB verification:
[paste: SQL query result showing 8 most recent rows]

Status: Ready for Sub-Agent 4 to begin (or gates can start)
```

If any step fails, return:
```
🚨 Sub-Agent 3 Failed

Failed at: [step name]
Error: [actual error message]
Fix required: [specific action user should take]
```

## Hard Rules

- **V38:** URL allowlist is a compile-time source constant — never fetched from DB/env
- **V38:** `isSafeUrl()` called before every `axios.get()` — no exceptions
- **X2:** >30% deviation → `is_manual_override=true` + Sentry (does NOT block insert)
- **X2:** Outside sanity bounds → `is_manual_override=true` + Sentry
- **RA1:** Scraper failures must not crash cron job — always wrapped in try/catch
- Prerequisite: Sub-Agent 2 type-check must pass before this agent starts

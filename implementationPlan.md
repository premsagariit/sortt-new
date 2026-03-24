# Day 14 Implementation Plan — Provider Abstractions (All 5 Packages)

**Status:** ⏳ AWAITING APPROVAL  
**Date Created:** 2026-03-24  
**Based on:** MEMORY.md, PLAN.md, TRD.md, day-14.md (context file), structure.md  
**Responsible Team:** Lead + 9 Sub-Agents (A-I)  

---

## ✅ SECTION 1 — PRE-FLIGHT AUDIT RESULTS

### Pre-flight Check 1: Confirm EXPO_PUBLIC_ABLY_KEY is Absent

**Command:**
```bash
grep -rn "EXPO_PUBLIC_ABLY_KEY" apps/mobile/ .env.example .env
```

**Expected Result:** 0 results (Token Auth only — no direct API key on mobile)  
**Status:** ⏳ PENDING EXECUTION  
**Notes:** If found, must be removed before proceeding. Mobile uses `EXPO_PUBLIC_ABLY_AUTH_URL` instead.

---

### Pre-flight Check 2: Verify Thin Wrapper Pattern is in Place

**Command:**
```bash
grep -rn "from 'ably'" backend/src/routes/ apps/mobile/app/
```

**Expected Result:** 0 results in route handlers / screen files (only in `backend/src/lib/realtime.ts` and `apps/mobile/lib/realtime.ts` is acceptable)  
**Status:** ⏳ PENDING EXECUTION  
**Notes:** All Ably calls must go through wrapper modules, not direct SDK imports in route/screen files.

---

### Pre-flight Check 3: Confirm Provider Stubs Exist

**Command:**
```bash
ls -la packages/maps/src/ \
       packages/realtime/src/ \
       packages/auth/src/ \
       packages/storage/src/ \
       packages/analysis/src/
```

**Expected Result:** Each directory exists; `index.ts` may be empty or minimal  
**Status:** ⏳ PENDING EXECUTION  
**Notes:** If any `src/` directory is missing, create it now.

---

### Pre-flight Check 4: Confirm @sortt/* Package Names

**Command:**
```bash
cat packages/maps/package.json | grep '"name"' && \
cat packages/realtime/package.json | grep '"name"' && \
cat packages/auth/package.json | grep '"name"' && \
cat packages/storage/package.json | grep '"name"' && \
cat packages/analysis/package.json | grep '"name"'
```

**Expected Result:**
```
"name": "@sortt/maps"
"name": "@sortt/realtime"
"name": "@sortt/auth"
"name": "@sortt/storage"
"name": "@sortt/analysis"
```

**Status:** ⏳ PENDING EXECUTION  
**Notes:** If any name is incorrect, fix `package.json` before proceeding.

---

## ✅ SECTION 2 — FILE INVENTORY

### New files to CREATE

| Path | Type | Description |
|---|---|---|
| `packages/maps/src/types.ts` | NEW | `IMapProvider` interface + `GeoResult` DTO |
| `packages/maps/src/providers/GoogleMapsProvider.ts` | NEW | Google Geocoding implementation |
| `packages/maps/src/providers/OlaMapsProvider.ts` | NEW | OlaMapsProvider stub (throws NotImplementedError) |
| `packages/maps/src/index.ts` | NEW | Exports + `createMapProvider()` factory |
| `packages/realtime/src/types.ts` | NEW | `IRealtimeProvider` interface + `RealtimeMessage` type |
| `packages/realtime/src/providers/AblyBackendProvider.ts` | NEW | Backend publish-only Ably wrapper (`Ably.Rest`) |
| `packages/realtime/src/providers/AblyMobileProvider.ts` | NEW | Mobile Token Auth Ably wrapper (`Ably.Realtime`) |
| `packages/realtime/src/providers/SoketiProvider.ts` | NEW | SoketiProvider stub (throws NotImplementedError) |
| `packages/realtime/src/index.ts` | NEW | Exports + `createRealtimeProvider(context)` factory |
| `packages/auth/src/types.ts` | NEW | `IAuthProvider` interface + `Session` DTO |
| `packages/auth/src/providers/ClerkAuthProvider.ts` | NEW | Clerk authentication wrapper |
| `packages/auth/src/index.ts` | NEW | Exports + `createAuthProvider()` factory |
| `packages/storage/src/types.ts` | NEW | `IStorageProvider` interface (no `getPublicUrl()` — D1) |
| `packages/storage/src/providers/UploadthingStorageProvider.ts` | NEW | Uploadthing implementation |
| `packages/storage/src/providers/StubStorageProvider.ts` | NEW | StubStorageProvider (throws NotImplementedError) |
| `packages/storage/src/index.ts` | NEW | Exports + `createStorageProvider()` factory |
| `packages/analysis/src/types.ts` | NEW | `IAnalysisProvider` interface + `AnalysisResult` (is_ai_estimate: true) |
| `packages/analysis/src/providers/GeminiVisionProvider.ts` | NEW | Gemini Vision stub (Day 15 completes implementation) |
| `packages/analysis/src/index.ts` | NEW | Exports + `createAnalysisProvider()` factory |

### Files to MODIFY

| Path | Type | Change |
|---|---|---|
| `packages/maps/package.json` | MODIFY | Add `dependencies: { "@googlemaps/google-maps-services-js": "^3.0.0" }` + build scripts |
| `packages/maps/tsconfig.json` | MODIFY | Extend root tsconfig, set `outDir: "./dist"` |
| `packages/realtime/package.json` | MODIFY | Add ably dependency matching version in apps/mobile/package.json (run: `grep '"ably"' apps/mobile/package.json backend/package.json` to get current version) + build scripts |
| `packages/realtime/tsconfig.json` | MODIFY | Extend root tsconfig, set `outDir: "./dist"` |
| `packages/auth/package.json` | MODIFY | Empty dependencies (ClerkAuthProvider calls backend API only, NOT Clerk SDK) + build scripts |
| `packages/auth/tsconfig.json` | MODIFY | Extend root tsconfig, set `outDir: "./dist"` |
| `packages/storage/package.json` | MODIFY | Add `dependencies: { "uploadthing": "^6.0.0" }` + build scripts |
| `packages/storage/tsconfig.json` | MODIFY | Extend root tsconfig, set `outDir: "./dist"` |
| `packages/analysis/package.json` | MODIFY | Empty dependencies (GeminiVisionProvider stub throws NotImplementedError; Gemini SDK added Day 15) + build scripts |
| `packages/analysis/tsconfig.json` | MODIFY | Extend root tsconfig, set `outDir: "./dist"` |
| `backend/package.json` | MODIFY | Add workspace dependencies: `"@sortt/realtime": "workspace:*"`, `"@sortt/maps": "workspace:*"`, `"@sortt/storage": "workspace:*"`, `"@sortt/analysis": "workspace:*"` |
| `backend/src/lib/realtime.ts` | MODIFY | Become factory for `AblyBackendProvider` from `@sortt/realtime` |
| `backend/src/lib/storage.ts` | MODIFY | Become factory for `UploadthingStorageProvider` from `@sortt/storage` |
| `backend/src/providers/maps.ts` | MODIFY | Become re-export of `createMapProvider()` from `@sortt/maps` |
| `backend/src/providers/ablyProvider.ts` | DELETE | Remove after all callers migrated to `backend/src/lib/realtime.ts` |
| `apps/mobile/package.json` | MODIFY | Add workspace dependencies: `"@sortt/realtime": "workspace:*"`, `"@sortt/auth": "workspace:*"` (NOT analysis — backend-only) |
| `apps/mobile/lib/realtime.ts` | MODIFY | Become factory for `AblyMobileProvider` from `@sortt/realtime` |
| `.env.example` | MODIFY | Remove `EXPO_PUBLIC_ABLY_KEY` (if present); add `SOKETI_URL=ws://localhost:6001  # Only if REALTIME_PROVIDER=soketi` |

---

## ✅ SECTION 3 — SUB-AGENT ASSIGNMENTS

| Agent | Scope | Dependencies | Self-Verification |
|---|---|---|---|
| **A: Pre-flight** | Run 4 pre-flight checks; fix `EXPO_PUBLIC_ABLY_KEY` if found; audit existing wrapper files | None | All 4 checks pass; audit report shows zero direct SDK calls in route handlers/screens |
| **B: packages/realtime/** | `IRealtimeProvider`, `AblyBackendProvider`, `AblyMobileProvider`, `SoketiProvider`, factory | A complete | `REALTIME_PROVIDER=soketi` instantiates correctly; `pnpm type-check` passes |
| **C: packages/maps/** | `IMapProvider`, `GoogleMapsProvider`, `OlaMapsProvider`, factory | A complete | `MAP_PROVIDER=ola` instantiates correctly; `pnpm type-check` passes |
| **D: packages/storage/** | `IStorageProvider`, `UploadthingStorageProvider`, `StubStorageProvider`, factory | A complete | `typeof provider.getPublicUrl === 'undefined'`; `pnpm type-check` passes |
| **E: packages/auth/** | `IAuthProvider`, `Session` DTO, `ClerkAuthProvider`, factory | A complete | `grep -n "phone\|clerk_user_id" src/types.ts` → 0 results; `pnpm type-check` passes |
| **F: packages/analysis/** | `IAnalysisProvider`, `AnalysisResult` (is_ai_estimate: true), `GeminiVisionProvider` stub (throws NotImplementedError immediately; no Gemini SDK imported) | A complete | `GeminiVisionProvider` stub throws on call; `pnpm type-check` passes; zero Gemini imports |
| **G: Backend migration** | Update `backend/src/lib/realtime.ts`, `backend/src/lib/storage.ts`, `backend/src/providers/maps.ts` to import from `@sortt/*`; DELETE `backend/src/providers/ablyProvider.ts`; update `backend/package.json` | B, C, D complete | `grep -rn "from 'ably'" backend/src/` → confirms zero Ably direct imports; `pnpm install` succeeds |
| **H: Mobile migration** | Update `apps/mobile/lib/realtime.ts` to import from `@sortt/realtime`; update `apps/mobile/package.json` | B complete | `grep -rn "from 'ably'" apps/mobile/app/` → 0 results; `pnpm install` succeeds |
| **I: Verification** | Run G14.1–G14.6 gates sequentially; report PASS/FAIL per gate | G, H complete | All gates pass; `pnpm type-check` from repo root exits 0 |

---

## ✅ SECTION 4 — EXECUTION SEQUENCE

### Phase 1: Pre-flight (Single Agent)
1. **Agent A:** Run 4 pre-flight checks. Flag any issues. Remove `EXPO_PUBLIC_ABLY_KEY` if found. Output: audit report.

### Phase 2: Package Creation (5 Agents in PARALLEL)
2. **Agent B:** Create `packages/realtime/` with `IRealtimeProvider`, `AblyBackendProvider`, `AblyMobileProvider`, `SoketiProvider`, factory.
3. **Agent C:** Create `packages/maps/` with `IMapProvider`, `GoogleMapsProvider`, `OlaMapsProvider`, factory.
4. **Agent D:** Create `packages/storage/` with `IStorageProvider`, `UploadthingStorageProvider`, `StubStorageProvider`, factory.
5. **Agent E:** Create `packages/auth/` with `IAuthProvider`, `Session` DTO, `ClerkAuthProvider`, factory.
6. **Agent F:** Create `packages/analysis/` with `IAnalysisProvider`, `AnalysisResult`, `GeminiVisionProvider` stub, factory index.ts.

**Parallel Execution Safe:** Agents B, C, D, E, F have no inter-package dependencies — all can run simultaneously.

### Phase 3: Backend + Mobile Migration (Sequential After Packages)
7. **Agent G (depends on B+C+D):** After packages built, refactor backend code to import from `@sortt/*` instead of direct SDKs.
   - Update `backend/src/lib/realtime.ts` → factory for `AblyBackendProvider`
   - Update `backend/src/lib/storage.ts` → factory for `UploadthingStorageProvider`
   - Update `backend/src/providers/maps.ts` → re-export `createMapProvider()`
   - Update `backend/package.json` with workspace dependencies

8. **Agent H (depends on B):** After `packages/realtime/` built, refactor mobile realtime code.
   - Update `apps/mobile/lib/realtime.ts` → factory for `AblyMobileProvider`
   - Update `apps/mobile/package.json` with workspace dependencies

9. **Agent G & H (parallel post-package):** Both can run simultaneously after their dependencies are met.

### Phase 4: Integrated Verification (Sequential After Refactoring)
10. **Agent I (depends on G+H):** Run all 6 verification gates (G14.1–G14.6) sequentially. Report PASS/FAIL + actual command output for each.

### Phase 5: Completion (Sequential After All Gates Pass)
11. Update `PLAN.md` — mark all Day 14 tasks `[x]`; mark gate `[GATE PASSED — 2026-03-24]`.
12. Update `MEMORY.md` §9 — append learned lessons from today.
13. Update `structure.md` — add all 5 new packages to directory tree.
14. Update `README.md` — add `MAP_PROVIDER`, `REALTIME_PROVIDER`, `STORAGE_PROVIDER` to env vars table.
15. Run `pnpm type-check` from repo root — must exit 0.
16. **GitHub push:** `feat: Day 14 complete — Provider abstractions for all 5 packages + swap stubs + zero SDK leakage`.
17. Create `agent/day-context/day-15.md` context file for next day.

---

## ✅ SECTION 5 — SECURITY RULES IN SCOPE

### TRD §14 Security Mitigations Enforced Today

| Rule ID | Name | How Enforced |
|---|---|---|
| **D1** | Private Storage Only | `IStorageProvider` interface has NO `getPublicUrl()` method. Gate G14.5 verifies absence. All files use signed URLs (300s expiry). |
| **V18** | EXIF Stripping Before AI | Deferred to Day 15 (GeminiVisionProvider is stub in Day 14). When implemented: `stripEXIF()` must be called BEFORE Gemini in `analyzeScrapImage()`. Day 15 gate will verify timing via grep. |
| **V19** | SSRF Prevention | `GoogleMapsProvider.geocode()` uses official Google API only — no UDF-supplied URLs. Comment in code: "Coordinates validation: log warning if out-of-India." |
| **V24 + V-CLERK-1** | Phone & Clerk ID Redaction | `IAuthProvider.Session` DTO MUST NOT include `phone`, `phone_hash`, or `clerk_user_id`. Gate G14.6 verifies absence. |
| **V32** | HMAC-Suffixed Channels | Backend and mobile always use server-provided channel tokens (HMAC suffix). No client-side channel name reconstruction. Already enforced by Day 13; Day 14 preserves via wrapper. |
| **I1** | AI Output Non-Authoritative | `AnalysisResult.is_ai_estimate: true` is a literal type (not `boolean`). Type-level guarantee. Deferred to Day 15: EXIF stripping and data assignment audit. |
| **A1** | JWT on Token Endpoint | `GET /api/realtime/token` protected by `clerkJwtMiddleware` (already in place from Day 13). Day 14 preserves. |
| **V34** | Helmet Security Headers | Day 13 enforced; Day 14 preserves. No changes. |

---

## ✅ SECTION 6 — INTERFACE CONTRACTS (EXACT TYPESCRIPT)

### IRealtimeProvider (packages/realtime/src/types.ts)

```typescript
export type Unsubscribe = () => void;

export interface RealtimeMessage {
  event: string;
  data: object;
  timestamp: number;
}

export interface IRealtimeProvider {
  /**
   * Subscribe to a channel event.
   * Returns an unsubscribe function.
   */
  subscribe(
    channel: string,
    event: string,
    handler: (message: RealtimeMessage) => void
  ): Unsubscribe;

  /**
   * Publish an event to a channel.
   * Wraps SDK publish call. Errors logged but not thrown (graceful degradation).
   */
  publish(channel: string, event: string, payload: object): Promise<void>;

  /**
   * Detach a specific channel (backend) or unsubscribe all listeners (mobile).
   */
  removeChannel(channel: string): void;

  /**
   * Remove all channels (app backgrounding).
   */
  removeAllChannels(): void;

  /**
   * Disconnect the realtime client (mobile Token Auth cleanup).
   * Backend: no-op.
   */
  disconnect(): void;
}
```

### IMapProvider (packages/maps/src/types.ts)

```typescript
export interface GeoResult {
  city_code: string;         // e.g., "hyd", "blr"
  locality: string;          // e.g., "Banjara Hills"
  display_address: string;   // e.g., "Banjara Hills, Hyderabad"
}

export interface IMapProvider {
  /**
   * Geocode an address to city code, locality, and display address.
   * Calls Google Maps Geocoding API.
   * Throws if address is invalid or API fails.
   */
  geocode(address: string): Promise<GeoResult>;

  /**
   * Reverse geocode coordinates to a display address.
   * Calls Google Maps Reverse Geocoding API.
   * Returns a human-readable address string.
   */
  reverseGeocode(lat: number, lng: number): Promise<string>;
}
```

### IAuthProvider (packages/auth/src/types.ts)

```typescript
/**
 * CRITICAL (V24 + V-CLERK-1):
 * Session MUST NOT include phone, phone_hash, or clerk_user_id.
 * Only exposed DTO fields: id, user_type.
 * Matches existing authStore contract.
 */
export interface Session {
  id: string;                                           // Internal user.id (UUID)
  user_type: 'seller' | 'aggregator' | 'admin' | null; // User type or null if not set
}

export interface IAuthProvider {
  /**
   * Initiate OTP flow for the given phone number.
   * Mode determines behavior: 'login' checks existence, 'signup' checks non-existence.
   */
  signInWithOTP(phone: string, mode: 'login' | 'signup'): Promise<void>;

  /**
   * Verify OTP and return Clerk token.
   */
  verifyOTP(phone: string, token: string): Promise<{ clerkToken: string }>;

  /**
   * Get current session (null if not authenticated).
   */
  getSession(): Promise<Session | null>;

  /**
   * Sign out current session.
   */
  signOut(): Promise<void>;

  /**
   * Listen for auth state changes.
   * Returns unsubscribe function.
   */
  onAuthStateChange(callback: (session: Session | null) => void): () => void;
}
```

### IStorageProvider (packages/storage/src/types.ts)

```typescript
/**
 * CRITICAL (D1):
 * This interface has NO getPublicUrl() method.
 * All files are private; access via expiring signed URLs only.
 */
export interface IStorageProvider {
  /**
   * Upload a file to the given bucket and path.
   * Returns the file key for later reference (signed URL generation, deletion).
   */
  upload(
    bucket: string,
    path: string,
    data: Buffer
  ): Promise<{ fileKey: string }>;

  /**
   * Generate a signed URL for the given file key.
   * Expires in the specified number of seconds (default 300s / 5 minutes).
   * CRITICAL: always returns private, expiring URLs — never public URLs.
   */
  getSignedUrl(
    fileKey: string,
    expiresInSeconds?: number
  ): Promise<string>;

  /**
   * Delete a file from storage.
   */
  delete(fileKey: string): Promise<void>;
}
```

### IAnalysisProvider (packages/analysis/src/types.ts)

```typescript
/**
 * CRITICAL (I1):
 * is_ai_estimate MUST be a literal true (not boolean).
 * This is a type-level guarantee that the result is non-authoritative.
 * Callers must NOT write estimated_weight_kg directly to confirmed_weight_kg.
 *
 * CRITICAL (V18):
 * EXIF must be stripped BEFORE Gemini call, inside analyzeScrapImage().
 * Never pass raw image buffer with EXIF data to Gemini.
 */
export interface AnalysisResult {
  material_code: string;        // Must match material_types.code
  estimated_weight_kg: number;  // > 0
  confidence: number;           // 0.0 - 1.0
  is_ai_estimate: true;         // Literal true — non-authoritative hint only
}

export interface IAnalysisProvider {
  /**
   * Analyze a scrap image with Gemini Vision.
   * 
   * CRITICAL (V18): Method implementation must:
   * 1. Call stripEXIF(imageBuffer) FIRST
   * 2. Pass clean buffer to Gemini
   * 3. Never pass buffer with EXIF metadata
   * 
   * Returns AnalysisResult with is_ai_estimate: true.
   * Throws if Gemini call fails or response is unparseable.
   */
  analyzeScrapImage(imageBuffer: Buffer): Promise<AnalysisResult>;
}
```

---

## ✅ SECTION 7 — VERIFICATION GATE CHECKLIST

### Gate G14.1: All 5 Packages Build + Type Check

**Command:**
```bash
pnpm install
pnpm build
pnpm type-check
```

**Expected Output:**
- All commands exit 0
- No TypeScript errors
- Each package generates `dist/index.js` and `dist/index.d.ts`

**Report Required:** Full terminal output showing successful build + type check.

---

### Gate G14.2: Map Provider Swap via ENV VAR

**Command:**
```bash
MAP_PROVIDER=ola pnpm --filter @sortt/maps build && \
MAP_PROVIDER=ola node -e "
  const { createMapProvider } = require('./packages/maps/dist/index.js');
  const provider = createMapProvider();
  provider.geocode('test address').catch(e => console.log('✓ Expected error:', e.message));
"
```

**Expected Output:** Message showing `NotImplementedError` or similar indicating OlaMapsProvider was instantiated.

**Report Required:** Captured error message proving OlaMapsProvider was used, not GoogleMapsProvider.

---

### Gate G14.3: Realtime Provider Swap via ENV VAR

**Command:**
```bash
REALTIME_PROVIDER=soketi pnpm --filter @sortt/realtime build && \
REALTIME_PROVIDER=soketi SOKETI_URL=ws://localhost:6001 node -e "
  const { createRealtimeProvider } = require('./packages/realtime/dist/index.js');
  const provider = createRealtimeProvider('backend');
  provider.publish('test', 'event', {}).catch(e => console.log('✓ Expected error:', e.message));
"
```

**Expected Output:** Message showing `NotImplementedError` indicating SoketiProvider was instantiated.

**Report Required:** Captured error message.

---

### Gate G14.4: Zero Direct SDK Imports in Application Code

**Command:**
```bash
grep -rn "from 'ably'" apps/mobile/ backend/src/ --exclude-dir=node_modules 2>/dev/null
```

**Expected Output:** `0` (zero lines matching the pattern)

**Report Required:** Full grep output (should be empty) — save to file and show.

---

### Gate G14.5: Storage Interface + getSignedUrl Default Expiry

**Command A (Storage interface — no getPublicUrl):**
```bash
grep -n "getPublicUrl" packages/storage/src/types.ts
```

**Expected Output:** `0` results (no getPublicUrl method in interface).

**Command B (getSignedUrl default expiry):**
```bash
# Verify default expiry is 300s
grep -A 5 "getSignedUrl" packages/storage/src/types.ts | grep -i "300\|expiresInSeconds\|default"
```

**Expected Output:** Shows JSDoc or code comment confirming default 300 seconds.

**Report Required:** Both grep outputs confirming storage has no getPublicUrl and getSignedUrl defaults to ≤300s.

---

### Gate G14.6: Zero Gemini Types in Application Code

**Command:**
```bash
grep -rn "@google/generative-ai\|@google-cloud/generative-ai" apps/mobile/ backend/src/ --exclude-dir=node_modules 2>/dev/null
```

**Expected Output:** `0` (zero results — Gemini SDK isolated to `packages/analysis/src/` only).

**Report Required:** Full grep output (should be empty).

---

## ✅ SECTION 7B — SECURITY SIGN-OFF (Non-Gate Compliance Checks)

These checks confirm security rules are enforced but are NOT formal verification gates. They are completed by individual agents during package creation.

### Security Check: EXIF Stripping Timing (V18 — Day 15 Scope)
**Note:** GeminiVisionProvider is a stub in Day 14. This check deferred to Day 15 when actual Gemini implementation is added.
- Verify: `stripEXIF()` must be called INSIDE `analyzeScrapImage()` BEFORE any Gemini API call.
- When implemented on Day 15, run: `grep -A 15 "analyzeScrapImage" packages/analysis/src/providers/GeminiVisionProvider.ts | grep -n "stripEXIF"`
- Expected: stripEXIF line appears before Gemini API call line.

### Security Check: Auth DTO Sensitive Field Exclusion (V24 + V-CLERK-1)
**Command (Agent E — Sub-Agent 3):**
```bash
grep -n "phone\|clerk_user_id\|phone_hash\|display_name\|role" packages/auth/src/types.ts
```

**Expected Output:** 
- `0` results for `phone`, `clerk_user_id`, `phone_hash`, `display_name`, `role`
- ONLY acceptable results: `user_type` enum definitions

**Report Required:** Grep output confirming Session DTO contains only `id` and `user_type` fields.

---

## ✅ SECTION 8 — COMPLETION STEPS (In Order)

After all gates G14.1–G14.6 pass:

1. ✅ **Update PLAN.md**
   - Mark all Day 14 tasks under §14.1: `[x]`
   - Mark the gate section: `[GATE PASSED — 2026-03-24]`
   - Update STATUS TRACKER if present

2. ✅ **Update MEMORY.md §9 (Learned Lessons)**
   - Append entry: `[2026-03-24] Day 14 Complete — Provider abstractions: 5 packages created with zero SDK leakage. Key lessons: [list key findings].`

3. ✅ **Update structure.md**
   - Add to directory tree under `packages/`:
     ```
     packages/
     ├── maps/          # NEW ← IMapProvider abstraction
     ├── realtime/      # NEW ← IRealtimeProvider abstraction
     ├── auth/          # NEW ← IAuthProvider abstraction
     ├── storage/       # NEW ← IStorageProvider abstraction
     └── analysis/      # NEW ← IAnalysisProvider abstraction
     ```

4. ✅ **Verify README.md**
   - Confirm existence of env vars table
   - Add if missing:
     ```
     | MAP_PROVIDER | backend | "google" | Swap IMapProvider: "google" | "ola" |
     | REALTIME_PROVIDER | backend | "ably" | Swap IRealtimeProvider: "ably" | "soketi" |
     | STORAGE_PROVIDER | backend | "uploadthing" | Swap IStorageProvider |
     | SOKETI_URL | backend | - | Soketi server URL (only if REALTIME_PROVIDER=soketi) |
     ```

5. ✅ **Run final type check**
   ```bash
   pnpm type-check
   ```
   Must exit 0 with zero errors.

6. ✅ **GitHub push**
   ```bash
   git add -A
   git commit -m "feat: Day 14 complete — Provider abstractions for all 5 packages + swap stubs + zero SDK leakage in app code"
   git push origin main
   ```

7. ✅ **Create agent context for Day 15**
   - Create `.agent/day-context/day-15.md`
   - Include: Gemini Vision implementation details, GST invoice requirements, price scraper architecture

---

## APPROVAL CHECKPOINT

**This plan is ready for review and approval before any code is written.**

**To approve, confirm:**
- ✅ All 8 sections complete and logically sound
- ✅ Pre-flight checks are feasible
- ✅ File inventory matches structure.md
- ✅ Sub-agent assignments are clear with dependencies
- ✅ Interface contracts are type-safe and match TRD requirements
- ✅ Verification gates are testable and have exact commands
- ✅ Completion steps are actionable

**Once approved, execution will proceed in this exact order:**
1. Agent A runs pre-flight → audit report
2. Agents B,C,D,E,F run in parallel → package creation
3. Agents G,H run after dependencies → refactoring
4. Agent I runs last → verification
5. Lead runs completion steps 1-7 → final reports

---

**Plan Status:** ⏳ AWAITING APPROVAL  
**Lead:** Team Lead (you)  
**Next Action:** Review and approve, then authorize Agent A pre-flight execution.


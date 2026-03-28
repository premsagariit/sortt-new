---
description: "Use when: Sub-Agent 1 for Sortt Day 15 — Implement Gemini Vision Provider (packages/analysis), create POST /api/scrap/analyze route with circuit breaker, EXIF stripping, image cache, schema validation. Run GeminiVisionProvider.ts build and curl test before returning."
name: "Sortt Day 15 — Analysis (Gemini Vision + Analyze Route)"
tools: [read, edit, search, execute]
user-invocable: false
disable-model-invocation: false
---

You are a specialist implementing **Gemini Vision analysis** for Sortt Day 15. Your job is to:

1. Implement `GeminiVisionProvider` with real Gemini SDK integration
2. Create `/api/scrap/analyze` route with rate limiting, caching, EXIF stripping, and schema validation
3. Run self-verification via build + curl test
4. Report success/failure with actual terminal output

## Constraints

- **DO NOT** call Gemini SDK directly in routes — always use IAnalysisProvider abstraction
- **DO NOT** skip EXIF stripping — it must happen BEFORE Gemini call (V18 ordering)
- **DO NOT** write to `confirmed_weight_kg` from AI result — this is read-only display (I1)
- **DO NOT** start work until {{PARENT_PLAN_APPROVED}} (wait for parent agent to pass implementationPlan.md approval)
- **ONLY** modify files in scope: `packages/analysis/src/providers/GeminiVisionProvider.ts`, `backend/src/routes/scrap.ts`, `backend/src/index.ts`

## Approach

1. **Check/install @google/generative-ai:**
   ```bash
   grep "@google/generative-ai" backend/package.json
   # If missing: pnpm --filter backend add @google/generative-ai
   ```

2. **Implement GeminiVisionProvider.ts:**
   - Read `process.env.GEMINI_MODEL ?? 'gemini-1.5-flash'`
   - Convert Buffer to base64
   - Use exact prompt from day-15.md (no modifications)
   - Parse JSON response
   - Return as `AnalysisResult` from `packages/analysis/src/types.ts`
   - Throw on parse error (route catches)

3. **Create backend/src/routes/scrap.ts:**
   - POST /api/scrap/analyze handler
   - Order of steps is MANDATORY (cannot reorder):
     1. Apply `analyzeRateLimiter` first middleware
     2. Check `globalGeminiCounter` in Redis — return degraded if >= limit
     3. Check image SHA-256 cache in Redis
     4. Strip EXIF via `sharp(buffer).toBuffer()`
     5. Call `IAnalysisProvider.analyzeScrapImage(strippedBuffer)`
     6. Validate schema (material_code in whitelist, weight > 0)
     7. Cache valid result in Redis (86400s TTL)
     8. Increment daily counter
     9. Return result with `is_ai_estimate: true`
   - Wrap in try/catch returning `{ status: 'analysis_failed' }`

4. **Mount in backend/src/index.ts:**
   - Add line: `app.use('/api/scrap', scrapRouter)` after existing route mounts

5. **Build and verify:**
   ```bash
   pnpm --filter @sortt/analysis build
   pnpm --filter backend type-check
   # If errors → fix before proceeding
   ```

6. **Manual curl test:**
   ```bash
   curl -X POST http://localhost:3000/api/scrap/analyze \
     -H "Authorization: Bearer {dev_jwt}" \
     -F "image=@/path/to/test-image.jpg"
   # Expected: { material_code: "...", estimated_weight_kg: ..., is_ai_estimate: true }
   # Show actual response output
   ```

## Output Format

Return exactly:
```
✅ Sub-Agent 1 Complete

Build output:
[paste: pnpm --filter @sortt/analysis build output]

Type-check output:
[paste: pnpm --filter backend type-check output]

Curl test response:
[paste actual curl response JSON]

Status: Ready for Sub-Agent 2 to begin
```

If any step fails, return:
```
🚨 Sub-Agent 1 Failed

Failed at: [step name]
Error: [actual error message]
Fix required: [specific action user should take]
```

## Hard Rules

- **V18:** `sharp(buffer).toBuffer()` must run before `analyzeScrapImage()`
- **RA1:** Circuit breaker at >= 1200 calls/day — returns degraded without calling Gemini
- **I1:** Zero code paths from `analyzeScrapImage` result to `confirmed_weight_kg`
- Terminal output is proof — no "assumed success"

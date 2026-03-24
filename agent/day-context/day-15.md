# Day 15 Context — Gemini Vision + GST Invoice + Price Scraper

## Day 14 Handoff Status (2026-03-24)
- All 5 provider packages are in place and emit `dist/` artifacts.
- Backend and mobile moved to provider abstractions for realtime/storage/maps.
- Direct `from 'ably'` imports removed from app/backend source.
- Realtime swap stubs verified:
  - `MAP_PROVIDER=ola` -> `OlaMapsProvider.geocode()` throws `NotImplementedError`.
  - `REALTIME_PROVIDER=soketi` -> `SoketiProvider.publish()` throws `NotImplementedError`.

## Day 15 Scope
1. Implement `GeminiVisionProvider.analyzeScrapImage()` (currently stub).
2. Enforce V18: EXIF stripping inside provider before Gemini call.
3. Enforce I1: AI output remains non-authoritative (`is_ai_estimate: true`), never written directly to confirmed weights.
4. Build GST invoice generation flow + signed URL retrieval.
5. Add price scraper checks with bounds and SSRF-safe URL allowlist.

## Critical Constraints
- No direct SDK imports in app code; keep integrations inside package providers.
- Preserve auth DTO redaction rules (no phone / clerk_user_id leaks).
- Storage remains private-only access via signed URLs (no public URL method).

## Suggested First Checks (Day 15 start)
- Confirm `packages/analysis/src/providers/GeminiVisionProvider.ts` still stub-only.
- Validate backend route wiring for analysis endpoint uses provider factory.
- Add/verify EXIF strip utility under analysis package before Gemini API call.

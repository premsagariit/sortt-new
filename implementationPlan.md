# Sortt — Maps Migration Implementation Plan (Google Maps → Ola Maps / Krutrim)

## Status
- Planning complete (read-only investigations done via 5 parallel tracks).
- No integration/code changes started.
- Waiting for approval before implementation.

## Objective
Implement Ola Maps end-to-end while preserving current contracts and Expo Go stability:
- **Part 1 (Backend):** Replace `OlaMapsProvider` stub with production geocode/reverse implementation and wire map APIs through provider abstraction.
- **Part 2 (Mobile):** Migrate map rendering paths to MapLibre + Ola tiles with hard fallback for Expo Go (`MAP_RENDERING_AVAILABLE = false` by default).

## Hard Constraints (will be enforced)
1. `IMapProvider` interface remains unchanged (`geocode`, `reverseGeocode`).
2. No direct Ola SDK/API calls inside screen files or route handlers; use provider/factory or `/api/maps/*`.
3. `EXPO_PUBLIC_OLA_MAPS_API_KEY` allowed client-side for tile rendering.
4. `MAP_RENDERING_AVAILABLE` defaults to `false` until dev build support is confirmed.
5. `pnpm type-check` must pass.

## Parallel Investigation Consolidation (5 tracks)

### 1) Schema + migration + RLS track
- No DB migration required for this migration scope.
- Map migration is provider/API/rendering level; existing address/order schemas are reusable.
- Existing address ownership/RLS behavior remains the same; no schema-level policy changes planned.

### 2) Backend routes + ownership + DTO mapping track
- `packages/maps/src/providers/OlaMapsProvider.ts` is currently stubbed and must be replaced.
- `packages/maps/src/index.ts` factory already supports provider switching; will ensure key passing for Ola path.
- `/api/maps/geocode` and `/api/maps/reverse` exist; `/api/maps/autocomplete` may need addition.
- Plan includes explicit auth enforcement and consistent response contracts.

### 3) Mobile store + wizard state + navigation track
- Address/listing flows already route through map-first address flow and draft handoff.
- Plan preserves store and wizard behavior; no state reset regressions allowed.
- Introduce map-availability gating utility to avoid Expo Go crashes.

### 4) Seller screens + UX parity track
- Map usage exists in seller/aggregator map surfaces (address picker/preview + route/tracking surfaces).
- Scope for this task per request: update `address-form.tsx` + `(aggregator)/route.tsx` only.
- Keep existing placeholder behavior unchanged when map rendering is unavailable.

### 5) Compliance + verification-gates track
- Add explicit checks for abstraction boundaries and no direct provider calls in screens.
- Validate auth requirement on map endpoints.
- Enforce workspace type-check gate before completion.

## Dependency-Ordered Implementation Plan

## Phase 0 — Baseline and safety checks
1. Inspect current files and confirm exact signatures:
	- `packages/maps/src/types.ts`
	- `packages/maps/src/providers/OlaMapsProvider.ts`
	- `packages/maps/src/index.ts`
	- `backend/src/routes/maps.ts` (or route mount target)
	- `apps/mobile/app/(aggregator)/route.tsx`
	- `apps/mobile/app/(seller)/address-form.tsx`
	- `apps/mobile/app/(seller)/address-map.tsx`
2. Confirm existing map routes and auth behavior.
3. Record direct `MapView` usages for targeted migration safety.

## Phase 1 — Part 1 backend provider implementation
1. **Dependency check** (`packages/maps/package.json`):
	- If `axios` missing, add `"axios": "^1.6.0"`.
	- Run `pnpm install` at repo root.
2. **Replace `OlaMapsProvider` stub** in `packages/maps/src/providers/OlaMapsProvider.ts`:
	- Implement `geocode(address)` with Ola geocode API.
	- Implement `reverseGeocode(lat,lng)` with Ola reverse API.
	- Implement internal `autocomplete(input)` helper (provider-local method; no interface change).
	- Add resilient null/empty-result handling with explicit error messages.
3. **Factory update** in `packages/maps/src/index.ts`:
	- Ensure `createMapProvider()` passes `process.env.OLA_MAPS_API_KEY` for `ola`.
	- Preserve Google path behavior.

## Phase 2 — Backend map routes
1. Search existing backend routes for map endpoints.
2. If `autocomplete` route is missing, add:
	- `GET /api/maps/autocomplete?input=...`
	- Clerk JWT required.
	- If provider is Ola, call provider autocomplete helper.
	- If provider is Google, return `{ predictions: [] }`.
3. Ensure `geocode` and `reverse` response contracts match request spec.
4. Keep all map calls routed through `createMapProvider()`.

## Phase 3 — Environment + docs updates
1. Update root `.env.example` and relevant package `.env.example` entries:
	- Add `OLA_MAPS_API_KEY=` and `MAP_PROVIDER=ola`.
	- Add `EXPO_PUBLIC_OLA_MAPS_API_KEY=`.
	- Comment/de-emphasize `GOOGLE_MAPS_API_KEY` for ola default path.
2. If needed for controlled rollout, add optional flag:
	- `EXPO_PUBLIC_MAP_RENDERING_AVAILABLE=false` (default false).

## Phase 4 — Part 2 mobile rendering migration
1. Add dependency in `apps/mobile/package.json`:
	- `@maplibre/maplibre-react-native@^10.0.0`
	- Run `pnpm install`.
2. Add gating utility:
	- `apps/mobile/utils/mapAvailable.ts`
	- `export const MAP_RENDERING_AVAILABLE = false;`
3. Update `apps/mobile/app/(aggregator)/route.tsx`:
	- If available: render MapLibre with Ola style URL centered on Hyderabad.
	- If unavailable: preserve current placeholder UI unchanged.
4. Update `apps/mobile/app/(seller)/address-form.tsx`:
	- Replace `react-native-maps` usage with MapLibre usage.
	- Use Ola style URL with `process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY`.
	- Keep same UX behavior; marker drag or coordinate updates call `/api/maps/reverse`.
	- Add TODO note for dev-build requirement and Expo Go fallback.

## Phase 5 — Verification gates
1. **Provider functional check** (Ola geocode).
2. **No direct Google SDK in backend source** (for ola migration path).
3. **No direct Ola API host/key usage in screen files** (screens call backend routes; tile config only where required for MapLibre style).
4. **`MAP_RENDERING_AVAILABLE` flag exists and defaults false.**
5. **Autocomplete route exists and returns expected shape.**
6. **`pnpm type-check` exits 0.**
7. Build maps package: `pnpm --filter @sortt/maps build`.

## Planned File Touch List (expected)
- `packages/maps/package.json` (only if axios missing)
- `packages/maps/src/providers/OlaMapsProvider.ts`
- `packages/maps/src/index.ts`
- `backend/src/routes/maps.ts` (or new `backend/src/routes/maps.ts` + mount if absent)
- `.env.example` (root and/or relevant app examples)
- `apps/mobile/package.json`
- `apps/mobile/utils/mapAvailable.ts` (new)
- `apps/mobile/app/(aggregator)/route.tsx`
- `apps/mobile/app/(seller)/address-form.tsx`

## Risks + Mitigations
- **MapLibre in Expo Go:** hard-gate rendering and preserve fallback UI.
- **Provider response-shape drift:** keep strict return contract from existing `IMapProvider` types.
- **Route auth ambiguity:** explicitly verify unauthenticated access is blocked for `/api/maps/*`.
- **Regression risk in listing/address flow:** avoid store contract changes; UI-only map swap in scoped files.

## Out of Scope (for this task)
- No unrelated screen refactors.
- No broad aggregator execution screen rewrites beyond requested files.
- No schema refactors unrelated to map provider/rendering migration.

## Approval Gate (required before coding)
On approval, execution will proceed in this exact order:
1. Provider + factory
2. Backend routes
3. Env/docs
4. Mobile map rendering + fallback
5. Verification gates + type-check


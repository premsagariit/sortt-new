# Implementation Plan: Camera Functional Photo Capture (Day 3 §3.X)

## Summary
Wire the placeholder camera zones in three screens to `expo-image-picker`. Photos are captured from the device camera and stored in local Zustand state only — no upload, no backend. Day 8 slots the upload as a second step inside the hook without touching any screen file.

---

## BSE Numbered Finding List

> **ALL screens, the hook, and the stores must pass this list before implementation begins.**

1. **[PASS] EXIF not stripped client-side** — By design per V18. The hook returns only the raw `file.uri` from `expo-image-picker`. No image parsing, no EXIF traversal, no ArrayBuffer operations occur client-side. EXIF is stripped on Day 8 server-side via `sharp` before the image reaches Uploadthing or Gemini.
2. **[PASS] No upload endpoint called** — `usePhotoCapture.ts` calls only `ImagePicker.launchCameraAsync()`. The returned `result.assets[0].uri` is stored directly in Zustand state. No `fetch`, `axios`, or Uploadthing call anywhere.
3. **[PASS] Permission denial handled gracefully** — Hook sets `permissionDenied: true` when either Camera or MediaLibrary permission is denied. The calling screen renders an inline amber banner "Camera access denied. Enable it in Settings." — **no `alert()` call**, **no crash path**, no `throw`.
4. **[BLOCK → FIXED] Camera permission strings in app.json** — `app.json` currently has NO `NSCameraUsageDescription`, `NSPhotoLibraryUsageDescription`, or `android.permissions`. These will be added as the **first step** of execution (before any screen code). Without them, camera silently fails on physical devices.
5. **[PASS] Photo URI never logged** — No `console.log`, `console.debug`, or Sentry/Crashlytics call will reference `photoUri`, `scalePhotoUri`, `kycAadhaarUri`, or `kycShopPhotoUri` in any file created or modified by this task.

**SCR Pre-Assessment:** LGTM contingent on finding #4 being resolved as first execution step.

---

## Files to Create or Modify

### 1. `apps/mobile/app.json` — [MODIFY]
Add iOS permission strings and Android permissions to unblock camera on physical devices.

> **Design choice: literal strings in `app.json` (not `app.config.ts`).**
> `app.json` is static JSON — template variables like `${APP_NAME}` are not interpolated. Options are:
> (a) Use literal strings in `app.json` — simpler, no migration risk, managed workflow unchanged.
> (b) Migrate to `app.config.ts` and import from `constants/app.ts` — enables dynamic APP_NAME but is an unnecessary scope expansion for this task.
> **Decision: option (a).** Permission strings describe the app to the OS user — they are read at install time and are not re-deployed dynamically. Hardcoding the human-readable description here is acceptable. `APP_NAME` placeholder is for generated code only, not for OS-level native strings that will change when the project renames.

- **iOS keys added:**
  - `NSCameraUsageDescription` → `"Sortt uses the camera to photograph your scrap pile and weighing scale."`
  - `NSPhotoLibraryUsageDescription` → `"Sortt needs photo library access to attach images to your listing."`
- **Android keys added:**
  - `android.permissions` array → `["CAMERA", "READ_MEDIA_IMAGES"]`
- **Plugin added:** `"expo-image-picker"` added to `plugins` array (required for managed workflow permission injection on both platforms)

### 2. `apps/mobile/package.json` — [MODIFY]
Add `expo-image-picker` to `dependencies`. Verify the Expo 54 compatible version.
- `"expo-image-picker": "~16.0.6"` (Expo SDK 54 compatible version based on `expo` `~54.0.33`)

### 3. `apps/mobile/hooks/usePhotoCapture.ts` — [NEW]
Single reusable hook. ALL camera logic lives here — no screen imports `ImagePicker` directly.
- **Accepts:** `options?: { allowsEditing?: boolean; aspect?: [number, number] }`  
- **Requests** `Camera` permission via `ImagePicker.requestCameraPermissionsAsync()`
- **Launches** `ImagePicker.launchCameraAsync()` with `quality: 0.7`, `mediaTypes: ImagePicker.MediaTypeOptions.Images`, and options passthrough
- **Returns:** `{ photoUri: string | null; pickPhoto: () => Promise<void>; permissionDenied: boolean; isLoading: boolean }`
- **Day 8 extension point:** `pickPhoto()` will gain a second async step after URI capture: call `presignUpload(uri)` → `attachUri(storageKey)` → return `storageKey`. Only this file changes on Day 8. Screen interface is unchanged.

### 4. `apps/mobile/store/listingStore.ts` — [NO CHANGE NEEDED]
`listingStore` already has `photoUri: string | null` and `setPhotoUri: (uri: string | null) => void`. No store changes required for Screen 1.

### 5. `apps/mobile/store/aggregatorStore.ts` — [MODIFY]
Add three new KYC/execution photo fields to `AggregatorStoreState`:
- `scalePhotoUri: string | null` — the weighing scale photo (Weighing screen)
- `kycAadhaarUri: string | null` — Aadhaar card photo (KYC screen card 1)
- `kycShopPhotoUri: string | null` — Shop/vehicle photo (KYC screen card 2)
- Three corresponding setters: `setScalePhotoUri`, `setKycAadhaarUri`, `setKycShopPhotoUri`

### 6. `apps/mobile/app/(seller)/listing/step2.tsx` — [MODIFY]
Replace the mock `handleTakePhoto` function (currently just calls `setPhotoUri('mock://photo-123.jpg')`) with `usePhotoCapture` hook.
- Import `usePhotoCapture` from `../../../hooks/usePhotoCapture`
- Call `setPhotoUri(photoUri)` from hook into store when `photoUri` changes via `useEffect`
- Show inline amber banner if `permissionDenied === true`
- Show loading spinner if `isLoading === true` while camera is launching
- Camera icon: `<Camera weight="light" />` (already using `Camera` from phosphor — just update `weight` prop)
- `canProceed` reads from `listingStore.photoUri !== null` (store-driven, not local state)

### 7. `apps/mobile/app/(aggregator)/execution/weighing.tsx` — [MODIFY]
Wire photo zone to `usePhotoCapture` hook; store result in `aggregatorStore.scalePhotoUri`.
- After capture: show thumbnail preview container + "✓ Scale photo captured" badge in `colors.teal`
- "Retake" `SecondaryButton` below thumbnail
- `PrimaryButton` "Upload Scale Photo & Send OTP →" disabled until `scalePhotoUri !== null` AND all entered material weights > 0
- Amber inline banner on permission denial
- Touch target for camera zone: minimum 48dp height enforced via `minHeight: 48`

### 8. `apps/mobile/app/(auth)/aggregator/kyc.tsx` — [MODIFY] (or [NEW] if file doesn't exist)
Two independent camera cards, each using a separate `usePhotoCapture` call.
- Card 1: Aadhaar front photo → `aggregatorStore.kycAadhaarUri`
- Card 2: Shop/vehicle photo → `aggregatorStore.kycShopPhotoUri`
- Each card independently shows: placeholder (camera icon + "Tap to upload") vs thumbnail + "✓ Uploaded" badge
- "Submit & Continue" button enabled only when BOTH URIs are non-null
- Amber inline banner per card if that card's permission is denied

---

## Day 8 Extension Point Design

The hook's return interface **will not change** on Day 8. Only the `pickPhoto()` implementation body adds:
```ts
// Day 8 — add these lines inside pickPhoto() AFTER local uri is set:
// const storageKey = await uploadViaProvider(uri); // IStorageProvider
// onUploadComplete?.(storageKey); // optional callback
```
Screens call `usePhotoCapture()` and read `photoUri` → this interface is stable. Day 8 only modifies `usePhotoCapture.ts`.

---

## Verification Plan

### Automated
- `pnpm type-check` must exit 0 across all modified files
- `grep -r "launchCameraAsync\|ImagePicker" apps/mobile/app/` must return 0 results (all camera logic is in the hook only)
- `grep -r "#[0-9A-Fa-f]\{6\}" apps/mobile/hooks/ apps/mobile/app/\(seller\)/listing/step2.tsx apps/mobile/app/\(aggregator\)/execution/weighing.tsx` must return 0 results

### Manual (Expo Go on physical device)
1. Run `pnpm dev:mobile` and open in Expo Go.
2. Navigate: Seller → "List Scrap" → Step 2. Tap the camera zone. Verify OS permission prompt appears. Grant permission. Verify camera opens. Take photo. Verify:
   - Photo thumbnail appears in place of placeholder
   - "✓ Photo added" badge appears
   - "Retake" secondary button appears
   - "Next →" button becomes enabled
3. Navigate: Aggregator → active order → Weighing screen. Tap camera zone. Take scale photo. Verify thumbnail + badge + "Retake" appear. Enter non-zero weights. Verify the main CTA becomes enabled.
4. Navigate: Aggregator Onboarding → KYC screen. Tap Aadhaar card. Capture. Tap shop photo card. Capture. Verify both cards show thumbnails and "Submit" becomes enabled.
5. Deny camera permission (revoke in device Settings). Return to any camera zone. Tap it. Verify amber inline banner appears — no JS alert, no crash.

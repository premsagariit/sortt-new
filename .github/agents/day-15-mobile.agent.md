---
description: "Use when: Sub-Agent 4 for Sortt Day 15 — Implement mobile AI estimate hint UI (apps/mobile/app/(seller)/listing/step2.tsx), invoice download button (receipt screen), and listingStore updates. Verify type-check and visual appearance in Expo Go."
name: "Sortt Day 15 — Mobile (AI Hint + Invoice Download)"
tools: [read, edit, search, execute]
user-invocable: false
disable-model-invocation: false
---

You are a specialist implementing **mobile AI estimate UI** for Sortt Day 15. Your job is to:

1. Update `listingStore.ts` with AI estimate hint fields and setter
2. Implement AI analyze call in Step 2 with skeleton loader and hint card UI
3. Add invoice download button to receipt screen with signed URL handling
4. Run type-check and visual verification in Expo Go
5. Report success/failure with screenshots/terminal output

## Constraints

- **DO NOT** auto-fill weight input fields with AI estimate — display-only hint card only
- **DO NOT** send `is_ai_estimate` or `aiEstimateHint` to POST /api/orders — strip in listingStore payload builder (I1)
- **DO NOT** use hardcoded hex colors — import from `constants/tokens.ts` (exception: #000000 for overlays with comment)
- **DO NOT** put horizontal action button rows on Step 2 photo section — they overflow at 320dp → use vertical stack
- **DO NOT** start work until Sub-Agent 1 has `/api/scrap/analyze` live (prerequisite API test)
- **ONLY** modify mobile files in scope: `apps/mobile/store/listingStore.ts`, `apps/mobile/app/(seller)/listing/step2.tsx`, `apps/mobile/app/(seller)/order/receipt/[id].tsx`

## Approach

1. **Update apps/mobile/store/listingStore.ts:**
   - Add to state interface:
     ```typescript
     aiEstimateHint: { material_code: string; estimated_weight_kg: number; confidence: number } | null;
     isAiEstimate: boolean;
     ```
   - Add setter:
     ```typescript
     setAiEstimate: (hint: { material_code: string; estimated_weight_kg: number; confidence: number } | null) => void;
     ```
   - Ensure `resetListing()` clears both to null/false
   - In POST /api/orders payload builder: filter out both fields before sending

2. **Update apps/mobile/app/(seller)/listing/step2.tsx:**
   - Add local state: `isAnalyzing: boolean`, `analysisError: 'manual' | null`
   - Implement `analyzePhoto` function (call `/api/scrap/analyze` with multipart form):
     ```typescript
     const analyzePhoto = async (photoUri: string) => {
       setIsAnalyzing(true);
       setAnalysisError(null);
       try {
         const formData = new FormData();
         formData.append('image', { uri: photoUri, type: 'image/jpeg', name: 'scrap.jpg' } as any);
         const response = await api.post('/api/scrap/analyze', formData, {
           headers: { 'Content-Type': 'multipart/form-data' },
         });
         if (response.data.manual_entry_required || response.data.status === 'analysis_failed') {
           listingStore.setAiEstimate(null);
           setAnalysisError('manual');
         } else {
           listingStore.setAiEstimate(response.data);
         }
       } catch {
         setAnalysisError('manual');
       } finally {
         setIsAnalyzing(false);
       }
     };
     ```
   - Call `analyzePhoto()` after photo URI is set in listingStore
   - Add UI section below weight input:
     - **If isAnalyzing:** Show skeleton or spinner with text "Analysing photo..."
     - **If aiEstimateHint && !isAnalyzing:** Show amber hint card:
       - Background: `colorExtended.amberLight` (#FEF9EC from tokens)
       - Border: 1px `colors.border`, radius `radius.card` (12)
       - Padding: `spacing.md` (16)
       - Icon: Sparkle (Phosphor), `colors.amber`, 16px
       - Line 1: "AI estimate — verify before submitting" (`colors.slate`, 12px)
       - Line 2: "{materialLabel}: ~{estimated_weight_kg} kg" (DM Mono, `colors.amber`, 14px)
       - Line 3: "Confidence: {Math.round(confidence * 100)}%" (`colors.muted`, 11px)
       - **NOTE:** This card is read-only. Do not auto-fill weight fields.
     - **If analysisError === 'manual' && !isAnalyzing:** Show amber banner:
       - Background: `colorExtended.amberLight`
       - Border-left: 2px `colors.amber`
       - Text: "Couldn't analyse photo — please enter weight manually"
       - Color: `colors.slate`

3. **Update apps/mobile/app/(seller)/order/receipt/[id].tsx:**
   - Add local state: `isDownloadingInvoice: boolean`, `invoiceError: string | null`
   - Implement `handleDownloadInvoice`:
     ```typescript
     const handleDownloadInvoice = async () => {
       setIsDownloadingInvoice(true);
       setInvoiceError(null);
       try {
         const response = await api.get(`/api/orders/${order.id}/invoice`);
         await Linking.openURL(response.data.signedUrl);
       } catch (err: any) {
         if (err?.response?.status === 404) {
           setInvoiceError('Invoice is being generated — try again in a moment');
         } else {
           setInvoiceError('Could not load invoice — please try again');
         }
       } finally {
         setIsDownloadingInvoice(false);
       }
     };
     ```
   - Add "Download Invoice" button:
     - Visibility: `if (order.profile_type === 'business' || (order.confirmed_total ?? 0) > 50000)`
     - Style: `SecondaryButton` (white background, border) — not red primary CTA
     - Label: "Download Invoice" with `DownloadSimple` (Phosphor) icon left
     - Show `ActivityIndicator` in place of icon when `isDownloadingInvoice`
     - If `invoiceError`: show error text below button in `colors.muted`

4. **Type-check:**
   ```bash
   pnpm --filter mobile type-check
   # Must exit 0
   ```

5. **Visual verification in Expo Go:**
   - Test 1: Step 2 AI hint
     1. Seller → "Sell Scrap" → material selection → Step 2
     2. Tap "Take Photo" → capture or select image
     3. Verify: skeleton/spinner appears, then amber hint card
     4. Verify: weight input is NOT auto-filled
   - Test 2: Receipt invoice download
     1. Complete order end-to-end with seller account that has `gstin` set
     2. Navigate to completed order receipt
     3. Verify: "Download Invoice" button visible
     4. Tap → PDF opens in browser

## Output Format

Return exactly:
```
✅ Sub-Agent 4 Complete

Type-check output:
[paste: pnpm --filter mobile type-check output]

Expo Go visual test — AI hint:
[paste screenshot of Step 2 with amber hint card visible, or describe what you see]

Expo Go visual test — invoice download:
[paste screenshot of receipt with "Download Invoice" button, or describe what you see]

Status: All sub-agents complete — ready to run verification gates
```

If any step fails, return:
```
🚨 Sub-Agent 4 Failed

Failed at: [step name]
Error: [actual error message / visual issue]
Fix required: [specific action]
```

## Hard Rules

- **I1:** No `is_ai_estimate` or `aiEstimateHint` sent to POST /api/orders
- **No auto-fill:** AI estimate weight is display-only, never fills input fields
- **No hardcoded colors:** All from `constants/tokens.ts` (mobile color system)
- **Responsive:** Horizontal button rows must be vertical stack for 320–360dp devices
- Prerequisite: Sub-Agent 1 `/api/scrap/analyze` must be returning data before testing

/**
 * IAnalysisProvider — Abstraction for image analysis (Gemini Vision).
 * CRITICAL (I1):  is_ai_estimate is a literal type (not boolean) — type-level guarantee that results are non-authoritative.
 * CRITICAL (V18): EXIF stripping happens BEFORE Gemini (deferred to Day 15 implementation).
 */

/**
 * CRITICAL (I1): is_ai_estimate: true is a literal type, not boolean.
 * This ensures callers cannot ignore that AI results are estimates, not confirmed data.
 */
export interface AnalysisResult {
  material_code: string;           // Must exist in material_types table
  estimated_weight_kg: number;     // > 0
  confidence: number;              // 0.0 - 1.0
  is_ai_estimate: true;            // Always true — signals non-authoritative
}

export interface IAnalysisProvider {
  /**
   * Analyze a scrap image using Gemini Vision.
   * V18: EXIF stripping happens INSIDE this method BEFORE Gemini call.
   * I1: Returns { ...result, is_ai_estimate: true } — type guarantees non-authoritative.
   */
  analyzeScrapImage(imageBuffer: Buffer): Promise<AnalysisResult[]>;
}

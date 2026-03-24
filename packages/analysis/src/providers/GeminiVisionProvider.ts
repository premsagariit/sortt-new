import { IAnalysisProvider, AnalysisResult } from '../types';

/**
 * Gemini Vision stub implementation of IAnalysisProvider.
 * Full implementation deferred to Day 15.
 * V18: EXIF stripping will be added in Day 15 implementation.
 * I1: Result always returns is_ai_estimate: true (literal type).
 */
export class GeminiVisionProvider implements IAnalysisProvider {
  async analyzeScrapImage(_imageBuffer: Buffer): Promise<AnalysisResult> {
    throw new NotImplementedError(
      'GeminiVisionProvider.analyzeScrapImage() not yet implemented. Day 15 adds full Gemini Vision integration.'
    );
  }
}

/**
 * Custom error for unimplemented methods.
 */
class NotImplementedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

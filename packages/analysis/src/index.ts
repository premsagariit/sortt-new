import type { IAnalysisProvider } from './types';
import { GeminiVisionProvider } from './providers/GeminiVisionProvider';

export { IAnalysisProvider, AnalysisResult } from './types';
export { GeminiVisionProvider } from './providers/GeminiVisionProvider';

/**
 * Factory function to create analysis provider.
 * Currently only Gemini Vision stub is available (full impl Day 15).
 */
export function createAnalysisProvider(): IAnalysisProvider {
  return new GeminiVisionProvider();
}

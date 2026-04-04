import { GoogleGenerativeAI } from '@google/generative-ai';
import { IAnalysisProvider, AnalysisLanguage, AnalysisResult } from '../types';

const OUTPUT_LANGUAGE_NAME: Record<AnalysisLanguage, string> = {
  en: 'English',
  te: 'Telugu',
  hi: 'Hindi',
};

const buildAnalyzePrompt = (language: AnalysisLanguage): string => {
  const outputLanguage = OUTPUT_LANGUAGE_NAME[language] ?? 'English';

  return `Analyse this scrap/recyclable material image.
Identify all distinct types of scrap materials present. For each material type found, estimate its weight.
Return ONLY a valid JSON object with this exact shape:
{ "items": [
  {
    "material_code": "<one of: metal|plastic|paper|ewaste|fabric|glass>",
    "material_label": "<short ${outputLanguage} label for the material>",
    "estimated_weight_kg": <positive number>,
    "confidence": <0.0 to 1.0>
  }
] }
No preamble, no explanation, no markdown formatting. JSON only.`;
};

const VALID_CODES = new Set(['metal', 'plastic', 'paper', 'ewaste', 'fabric', 'glass']);

const CODE_ALIASES: Record<string, string> = {
  metal: 'metal',
  steel: 'metal',
  iron: 'metal',
  plastic: 'plastic',
  pet: 'plastic',
  paper: 'paper',
  cardboard: 'paper',
  ewaste: 'ewaste',
  'e-waste': 'ewaste',
  electronic: 'ewaste',
  fabric: 'fabric',
  textile: 'fabric',
  cloth: 'fabric',
  glass: 'glass',
};

const normalizeCode = (value: unknown): string => {
  const raw = String(value || '').trim().toLowerCase();
  if (VALID_CODES.has(raw)) return raw;
  if (CODE_ALIASES[raw]) return CODE_ALIASES[raw];
  for (const [key, mapped] of Object.entries(CODE_ALIASES)) {
    if (raw.includes(key)) return mapped;
  }
  return 'metal';
};

const extractJsonObject = (text: string): any => {
  const normalized = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  try {
    return JSON.parse(normalized);
  } catch {
    const start = normalized.indexOf('{');
    const end = normalized.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(normalized.slice(start, end + 1));
    }
    return {};
  }
};

export class GeminiVisionProvider implements IAnalysisProvider {
  private readonly client: GoogleGenerativeAI;
  private readonly modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is required for GeminiVisionProvider');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    this.modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  }

  async analyzeScrapImage(imageBuffer: Buffer, language: AnalysisLanguage = 'en'): Promise<AnalysisResult[]> {
    const model = this.client.getGenerativeModel({ model: this.modelName });
    const response = await model.generateContent({
      contents: [
        {
          role: 'user',
          parts: [
            { text: buildAnalyzePrompt(language) },
            {
              inlineData: {
                data: imageBuffer.toString('base64'),
                mimeType: 'image/jpeg',
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: 'application/json',
      },
    });

    const text = response.response.text().trim();
    const parsed = extractJsonObject(text);
    
    const items = parsed?.items || [];
    if (!Array.isArray(items)) {
      return [];
    }

    const results: AnalysisResult[] = [];
    
    for (const item of items) {
      const materialCode = normalizeCode(item?.material_code);
      const estimatedWeightRaw = Number(item?.estimated_weight_kg);
      const estimatedWeight = Number.isFinite(estimatedWeightRaw) && estimatedWeightRaw > 0
        ? estimatedWeightRaw
        : 0.001;
      const confidence = Number(item?.confidence);
      const materialLabel = typeof item?.material_label === 'string'
        ? item.material_label.trim()
        : undefined;

      results.push({
        material_code: materialCode,
        ...(materialLabel ? { material_label: materialLabel } : {}),
        estimated_weight_kg: estimatedWeight,
        confidence: Number.isFinite(confidence) ? Math.max(0, Math.min(1, confidence)) : 0,
        is_ai_estimate: true,
      });
    }

    return results;
  }
}

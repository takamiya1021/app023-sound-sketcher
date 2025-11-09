import { BeatNote, DEFAULT_VELOCITY, SoundType } from '@/types';

const API_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
const API_KEY_STORAGE_KEY = 'gemini_api_key';

interface AnalyzeOptions {
  bpm?: number;
  style?: string;
  bars?: number;
}

export interface GeminiAnalysisResult {
  genre: string;
  summary: string;
  suggestions: string[];
  nextPattern: BeatNote[];
}

type Fetcher = typeof fetch;

const generateId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

const serialiseNotes = (notes: BeatNote[]) =>
  notes.map((note) => ({
    id: note.id,
    sound: note.sound,
    time: Number(note.time.toFixed(4)),
    velocity: Number(note.velocity.toFixed(3)),
  }));

const buildPrompt = (notes: BeatNote[], options: AnalyzeOptions = {}): string => {
  const payload = {
    bpm: options.bpm ?? 120,
    style: options.style ?? 'unknown',
    bars: options.bars ?? 4,
    notes: serialiseNotes(notes),
  };

  return `You are an assistant that analyzes drum patterns. Respond ONLY with JSON following this schema:
{
  "genre": string,
  "summary": string,
  "suggestions": string[],
  "nextPattern": [{"time": number, "sound": string, "velocity": number}]
}

Important instructions:
- すべての文字列（genre, summary, suggestions）は自然な日本語で記述してください。
- suggestions にはユーザーが次に試せるアクションを日本語で3件まで入れてください。
- nextPattern はJSONのまま英語のsound識別子で構いません。

Pattern payload:
${JSON.stringify(payload, null, 2)}
`;
};

const extractJsonFromResponse = async (responseJson: any): Promise<any> => {
  const text = responseJson?.candidates?.[0]?.content?.parts?.find(
    (part: { text?: string }) => typeof part?.text === 'string'
  )?.text;
  if (!text) {
    throw new Error('Gemini API returned no usable content');
  }

  const sanitized = text
    .replace(/^```json\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  return JSON.parse(sanitized);
};

const normaliseNextPattern = (raw: any[]): BeatNote[] =>
  (raw ?? []).map((note) => ({
    id: note.id ?? generateId(),
    time: typeof note.time === 'number' ? note.time : Number(note.time) || 0,
    sound: (note.sound ?? 'kick') as SoundType,
    velocity:
      typeof note.velocity === 'number'
        ? Math.min(1, Math.max(0, note.velocity))
        : DEFAULT_VELOCITY,
  }));

export interface GeminiService {
  setApiKey: (key: string) => void;
  getApiKey: () => string | undefined;
  analyzeBeat: (notes: BeatNote[], options?: AnalyzeOptions) => Promise<GeminiAnalysisResult>;
  suggestNextPattern: (notes: BeatNote[], options?: AnalyzeOptions) => Promise<BeatNote[]>;
}

export const createGeminiService = (fetcher: Fetcher = fetch): GeminiService => {
  let cachedApiKey: string | undefined =
    typeof window !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE_KEY) ?? undefined : undefined;

  const ensureApiKey = () => {
    if (!cachedApiKey) {
      cachedApiKey =
        typeof window !== 'undefined' ? localStorage.getItem(API_KEY_STORAGE_KEY) ?? undefined : undefined;
    }
    if (!cachedApiKey) {
      throw new Error('API key is required for Gemini requests');
    }
    return cachedApiKey;
  };

  const analyzeBeat = async (
    notes: BeatNote[],
    options: AnalyzeOptions = {}
  ): Promise<GeminiAnalysisResult> => {
    const apiKey = ensureApiKey();
    const prompt = buildPrompt(notes, options);

    let response: Response;
    try {
      response = await fetcher(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
        }),
      });
    } catch (error) {
      throw new Error(`Gemini APIリクエストに失敗しました: ${(error as Error).message}`);
    }

    if (!response.ok) {
      const message = await response.text();
      const errorMessage =
        response.status === 401
          ? `Gemini APIリクエストが認証エラーで失敗しました: ${message}`
          : `Gemini APIリクエストが失敗しました (${response.status}): ${message}`;
      throw new Error(errorMessage);
    }

    let payload: any;
    try {
      payload = await response.json();
    } catch (error) {
      throw new Error(`Failed to parse Gemini response: ${(error as Error).message}`);
    }

    let parsed: any;
    try {
      parsed = await extractJsonFromResponse(payload);
    } catch (error) {
      throw new Error(`Failed to extract Gemini suggestions: ${(error as Error).message}`);
    }

    return {
      genre: parsed.genre ?? 'unknown',
      summary: parsed.summary ?? '',
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      nextPattern: normaliseNextPattern(parsed.nextPattern),
    };
  };

  return {
    setApiKey: (key: string) => {
      const trimmed = key.trim();
      if (!trimmed) {
        throw new Error('API key cannot be empty');
      }
      cachedApiKey = trimmed;
      if (typeof window !== 'undefined') {
        localStorage.setItem(API_KEY_STORAGE_KEY, trimmed);
      }
    },
    getApiKey: () => cachedApiKey,
    analyzeBeat,
    suggestNextPattern: async (notes, options) => {
      const analysis = await analyzeBeat(notes, options);
      return analysis.nextPattern;
    },
  };
};

export const geminiService = createGeminiService();

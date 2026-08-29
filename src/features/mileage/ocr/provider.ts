import type { DistanceUnit } from '@/types/domain';

import { parseOdometerFromText, readingFromUnknown, MIN_ACCEPT_CONFIDENCE } from './parse';

export type OdometerExtraction = {
  reading?: number;
  unit?: DistanceUnit;
  recorded_on?: string;
  recorded_time?: string;
  confidence: number;
  provider: string;
  candidates?: number[];
  raw?: unknown;
  requires_confirmation: true;
};

export type OdometerDraft = {
  vehicle_id: string;
  kind: 'start_of_day' | 'end_of_day' | 'manual';
  photoUri: string;
  photoPath: string | null;
  extraction: OdometerExtraction;
};

export interface OdometerOcrProvider {
  extract(input: { imageUri: string; storagePath?: string; hintReading?: number }): Promise<OdometerExtraction>;
}

export function emptyExtraction(provider = 'none'): OdometerExtraction {
  return {
    confidence: 0,
    provider,
    requires_confirmation: true,
  };
}

export function normalizeOdometerExtraction(raw: unknown, fallbackProvider = 'none'): OdometerExtraction {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const parsedText =
    typeof row.raw_text === 'string'
      ? parseOdometerFromText(row.raw_text, { hint: readingFromUnknown(row.hint_reading) })
      : undefined;
  const reading = readingFromUnknown(row.reading) ?? parsedText?.reading;
  const confidenceRaw = Number(row.confidence);
  const confidence =
    reading == null
      ? 0
      : Number.isFinite(confidenceRaw)
        ? Math.max(0, Math.min(1, confidenceRaw))
        : (parsedText?.confidence ?? 0);

  return {
    reading,
    unit: row.unit === 'mi' || row.unit === 'km' ? row.unit : undefined,
    recorded_on: typeof row.recorded_on === 'string' ? row.recorded_on : undefined,
    recorded_time: typeof row.recorded_time === 'string' ? row.recorded_time : undefined,
    confidence,
    provider: String(row.provider ?? fallbackProvider),
    requires_confirmation: true,
    raw: row.raw ?? raw,
  };
}

export function extractionFromOcrText(
  text: string,
  options?: { hint?: number; provider?: string; engineConfidence?: number },
): OdometerExtraction {
  const parsed = parseOdometerFromText(text, { hint: options?.hint });
  const engine = options?.engineConfidence;
  const confidence =
    engine != null && Number.isFinite(engine) ? Math.min(parsed.confidence, engine) : parsed.confidence;
  const reliable = parsed.reading != null && confidence >= MIN_ACCEPT_CONFIDENCE;

  return {
    reading: reliable ? parsed.reading : undefined,
    confidence: reliable ? confidence : Math.min(confidence, parsed.confidence),
    provider: options?.provider ?? 'on-device',
    candidates: parsed.candidates,
    requires_confirmation: true,
    raw: {
      reason: reliable ? undefined : parsed.reading == null ? 'no_digits' : 'uncertain',
      text: parsed.rawText,
      candidates: parsed.candidates,
    },
  };
}

export function mergeOdometerExtractions(primary: OdometerExtraction, fallback: OdometerExtraction): OdometerExtraction {
  const candidates = [...new Set([...(primary.candidates ?? []), ...(fallback.candidates ?? [])])];
  if (primary.reading != null && fallback.reading == null) {
    return { ...primary, candidates, requires_confirmation: true };
  }
  if (primary.reading == null && fallback.reading != null) {
    return { ...fallback, candidates, requires_confirmation: true };
  }
  if (primary.reading == null && fallback.reading == null) {
    return {
      ...emptyExtraction(primary.provider === 'none' ? fallback.provider : primary.provider),
      candidates,
      raw: { primary: primary.raw, fallback: fallback.raw },
    };
  }
  const chosen = (primary.confidence ?? 0) >= (fallback.confidence ?? 0) ? primary : fallback;
  return {
    ...chosen,
    candidates,
    requires_confirmation: true,
    raw: {
      primary: { reading: primary.reading, provider: primary.provider, confidence: primary.confidence },
      fallback: { reading: fallback.reading, provider: fallback.provider, confidence: fallback.confidence },
      chosen: chosen.provider,
    },
  };
}

export class UnconfiguredOdometerOcrProvider implements OdometerOcrProvider {
  async extract(_input?: { imageUri: string; storagePath?: string; hintReading?: number }): Promise<OdometerExtraction> {
    return emptyExtraction('none');
  }
}

export class EdgeFunctionOdometerOcrProvider implements OdometerOcrProvider {
  constructor(
    private readonly invoke: (input: {
      storagePath: string;
      hintReading?: number;
    }) => Promise<OdometerExtraction>,
  ) {}

  async extract(input: { imageUri: string; storagePath?: string; hintReading?: number }): Promise<OdometerExtraction> {
    if (!input.storagePath) {
      return emptyExtraction('none');
    }
    const extraction = await this.invoke({ storagePath: input.storagePath, hintReading: input.hintReading });
    return normalizeOdometerExtraction(extraction, extraction.provider);
  }
}

// OCR odomètre. La lecture n'écrit pas dans odometer_readings.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_READING = 9_999_999;
const BUCKET = 'odometer-photos';

type Extraction = {
  reading?: number;
  unit?: 'km' | 'mi';
  recorded_on?: string;
  recorded_time?: string;
  confidence: number;
  provider: string;
  raw?: unknown;
  requires_confirmation: true;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  const supabase = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: 'unauthorized' }, 401);

  const body = await req.json();
  const storagePath = body.storage_path as string | undefined;
  const hintReading = asWholeReading(body.hint_reading);
  if (!storagePath || !storagePath.startsWith(`${user.id}/`)) {
    return json({ error: 'storage_path required' }, 400);
  }

  const provider = Deno.env.get('OCR_PROVIDER') ?? 'none';
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const ocrSpaceKey = Deno.env.get('OCR_SPACE_API_KEY');

  let imageBase64: string | null = null;
  try {
    imageBase64 = await downloadOdometerImage(supabaseUrl, authHeader, storagePath);
  } catch (error) {
    return json({
      extraction: empty(provider, { reason: 'download_failed', error: String(error), storage_path: storagePath }),
    });
  }

  if (!imageBase64) {
    return json({
      extraction: empty(provider, { reason: 'empty_image', storage_path: storagePath }),
    });
  }

  try {
    if ((provider === 'openai' || provider === 'openai-vision') && openaiKey) {
      const extraction = await extractWithOpenAi(openaiKey, imageBase64, hintReading);
      return json({ extraction });
    }
    if (provider === 'ocrspace' && ocrSpaceKey) {
      const extraction = await extractWithOcrSpace(ocrSpaceKey, imageBase64, hintReading);
      return json({ extraction });
    }
  } catch (error) {
    return json({
      extraction: empty(provider, { reason: 'provider_failed', error: String(error) }),
    });
  }

  return json({
    extraction: empty(provider, {
      reason: provider === 'none' ? 'OCR provider not configured' : 'Provider adapter not implemented',
      storage_path: storagePath,
    }),
  });
});

function empty(provider: string, raw?: unknown): Extraction {
  return {
    confidence: 0,
    provider,
    requires_confirmation: true,
    raw,
  };
}

function asWholeReading(value: unknown): number | undefined {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(parsed)) return undefined;
  const whole = Math.trunc(parsed);
  if (whole < 0 || whole > MAX_READING) return undefined;
  return whole;
}

function parseDigits(text: string, hint?: number): { reading?: number; confidence: number; candidates: number[] } {
  const candidates: number[] = [];
  const push = (value: number) => {
    if (!candidates.includes(value)) candidates.push(value);
  };
  for (const line of text.replace(/\r/g, '\n').split('\n')) {
    for (const match of line.matchAll(/\b\d{1,3}(?:[\s,]\d{3}){1,2}\b/g)) {
      const digits = (match[0] ?? '').replace(/[\s,]/g, '');
      if (digits.length >= 4 && digits.length <= 7) push(Number(digits));
    }
    for (const match of line.matchAll(/\d+/g)) {
      const digits = match[0] ?? '';
      if (digits.length >= 4 && digits.length <= 7) {
        push(Number(digits));
      } else if (digits.length === 8 || digits.length === 9) {
        push(Number(digits.slice(0, 3)));
        push(Number(digits.slice(3)));
      }
    }
  }
  const usable = candidates.filter((value) => Number.isInteger(value) && value >= 0 && value <= MAX_READING);
  if (!usable.length) return { confidence: 0, candidates: usable };

  const hasLong = usable.some((value) => String(value).length >= 5);
  const score = (value: number) => {
    const digits = String(value).length;
    let points = digits >= 5 && digits <= 6 ? 5 : digits === 7 ? 3 : digits === 4 ? 1.5 : hasLong ? -4 : 0.5;
    if (hint == null) return points;
    const delta = value - hint;
    if (delta >= 0 && delta <= 2500) points += 6;
    else if (value < hint) points -= 4;
    return points;
  };
  const ranked = [...usable].sort((a, b) => score(b) - score(a));
  const reading = ranked[0];
  if (reading == null) return { confidence: 0, candidates: usable };
  const best = score(reading);
  const confidence = best >= 9 ? 0.86 : best >= 6 ? 0.74 : best >= 4 ? 0.58 : 0.38;
  if (confidence < 0.62) return { confidence, candidates: usable };
  return { reading, confidence, candidates: usable };
}

async function downloadOdometerImage(supabaseUrl: string, authHeader: string, storagePath: string): Promise<string | null> {
  const encodedPath = storagePath.split('/').map(encodeURIComponent).join('/');
  const response = await fetch(`${supabaseUrl}/storage/v1/object/${BUCKET}/${encodedPath}`, {
    headers: { Authorization: authHeader, apikey: Deno.env.get('SUPABASE_ANON_KEY') ?? '' },
  });
  if (!response.ok) {
    throw new Error(`storage_${response.status}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.byteLength) return null;
  return bytesToBase64(bytes);
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

async function extractWithOpenAi(apiKey: string, imageBase64: string, hint?: number): Promise<Extraction> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_OCR_MODEL') ?? 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: [
                'Read the vehicle odometer mileage shown in this dashboard photo.',
                'Return JSON only: {"reading": number|null, "unit": "km"|"mi"|null, "raw_text": string}.',
                'If the digits are unreadable, set reading to null.',
                hint != null ? `The previous known odometer was ${hint}. Use it only to choose among visible digit groups.` : '',
              ].join(' '),
            },
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${imageBase64}` },
            },
          ],
        },
      ],
    }),
  });
  if (!response.ok) {
    throw new Error(`openai_${response.status}`);
  }
  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;
  const parsed = typeof content === 'string' ? JSON.parse(content) : {};
  const fromModel = asWholeReading(parsed.reading);
  const fromText = parseDigits(String(parsed.raw_text ?? ''), hint);
  const reading =
    fromModel != null && (fromText.candidates.includes(fromModel) || fromText.reading == null)
      ? fromModel
      : fromText.reading;
  if (reading == null) {
    return empty('openai', { reason: 'unreadable', raw_text: parsed.raw_text ?? null });
  }
  return {
    reading,
    unit: parsed.unit === 'mi' || parsed.unit === 'km' ? parsed.unit : undefined,
    confidence: fromText.candidates.includes(reading) ? Math.max(fromText.confidence, 0.75) : 0.55,
    provider: 'openai',
    requires_confirmation: true,
    raw: { raw_text: parsed.raw_text ?? null, candidates: fromText.candidates },
  };
}

async function extractWithOcrSpace(apiKey: string, imageBase64: string, hint?: number): Promise<Extraction> {
  const body = new URLSearchParams({
    apikey: apiKey,
    language: 'eng',
    isOverlayRequired: 'false',
    OCREngine: '2',
    scale: 'true',
    base64Image: `data:image/jpeg;base64,${imageBase64}`,
  });
  const response = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!response.ok) {
    throw new Error(`ocrspace_${response.status}`);
  }
  const payload = await response.json();
  const text = String(payload?.ParsedResults?.[0]?.ParsedText ?? '');
  const parsed = parseDigits(text, hint);
  if (parsed.reading == null) {
    return empty('ocrspace', { reason: 'unreadable', raw_text: text });
  }
  return {
    reading: parsed.reading,
    confidence: parsed.confidence,
    provider: 'ocrspace',
    requires_confirmation: true,
    raw: { raw_text: text, candidates: parsed.candidates },
  };
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Lecture d'un reçu. Ne crée pas la dépense.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

import { hasReceiptValues, parseReceiptFromText } from './parse.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BUCKET = 'receipts';

type Extraction = {
  merchant_name?: string;
  incurred_on?: string;
  incurred_time?: string;
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  currency?: string;
  category_hint?: string;
  fuel_quantity?: number;
  price_per_unit?: number;
  payment_method?: string;
  reference_number?: string;
  confidence: number;
  provider: string;
  requires_confirmation: true;
  raw?: unknown;
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
  const receiptId = body.receipt_id as string | undefined;
  const storagePath = body.storage_path as string | undefined;

  if (storagePath && !storagePath.startsWith(`${user.id}/`)) {
    return json({ error: 'forbidden' }, 403);
  }

  type ReceiptRow = { id: string; user_id: string; storage_path: string };
  let receipt: ReceiptRow | undefined;
  if (receiptId) {
    const { data, error } = await supabase
      .from('receipts')
      .select('id, user_id, storage_path')
      .eq('id', receiptId)
      .single<ReceiptRow>();
    if (error || !data || data.user_id !== user.id) {
      return json({ error: 'receipt not found' }, 404);
    }
    if (!data.storage_path.startsWith(`${user.id}/`)) {
      return json({ error: 'forbidden' }, 403);
    }
    receipt = data;
  } else if (storagePath) {
    receipt = { id: '', user_id: user.id, storage_path: storagePath };
  } else {
    return json({ error: 'receipt_id or storage_path required' }, 400);
  }
  if (!receipt) return json({ error: 'receipt not found' }, 404);

  const provider = Deno.env.get('OCR_PROVIDER') ?? 'none';
  const openaiKey = Deno.env.get('OPENAI_API_KEY');
  const ocrSpaceKey = Deno.env.get('OCR_SPACE_API_KEY');

  let imageBase64: string | null = null;
  try {
    imageBase64 = await downloadReceiptImage(supabaseUrl, authHeader, receipt.storage_path);
  } catch (error) {
    return json({
      extraction: empty(provider, { reason: 'download_failed', error: String(error), storage_path: receipt.storage_path }),
    });
  }

  let extraction = empty(provider, { reason: 'unreadable', storage_path: receipt.storage_path });
  try {
    if ((provider === 'openai' || provider === 'openai-vision') && openaiKey && imageBase64) {
      extraction = await extractWithOpenAi(openaiKey, imageBase64);
    } else if (provider === 'ocrspace' && ocrSpaceKey && imageBase64) {
      extraction = await extractWithOcrSpace(ocrSpaceKey, imageBase64);
    } else if (imageBase64 && ocrSpaceKey) {
      extraction = await extractWithOcrSpace(ocrSpaceKey, imageBase64);
    } else if (imageBase64 && openaiKey) {
      extraction = await extractWithOpenAi(openaiKey, imageBase64);
    }
  } catch (error) {
    extraction = empty(provider, { reason: 'provider_failed', error: String(error) });
  }

  if (receipt.id) {
    await supabase
      .from('receipts')
      .update({
        ocr_status: extraction.confidence > 0 ? 'complete' : provider === 'none' ? 'skipped' : 'failed',
        ocr_provider: extraction.provider,
        ocr_payload: extraction,
      })
      .eq('id', receipt.id)
      .eq('user_id', user.id);
  }

  return json({ extraction });
});

function empty(provider: string, raw?: unknown): Extraction {
  return {
    confidence: 0,
    provider,
    requires_confirmation: true,
    raw,
  };
}

function fromParsed(text: string, provider: string, extra?: unknown): Extraction {
  const parsed = parseReceiptFromText(text);
  if (!hasReceiptValues(parsed)) {
    return empty(provider, { reason: 'unreadable', raw_text: text, extra });
  }
  return {
    merchant_name: parsed.merchant_name,
    incurred_on: parsed.incurred_on,
    incurred_time: parsed.incurred_time,
    total: parsed.total,
    currency: parsed.currency,
    confidence: parsed.confidence,
    provider,
    requires_confirmation: true,
    raw: { raw_text: parsed.raw_text, extra },
  };
}

async function downloadReceiptImage(supabaseUrl: string, authHeader: string, storagePath: string): Promise<string | null> {
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

async function extractWithOpenAi(apiKey: string, imageBase64: string): Promise<Extraction> {
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
                'Read only these fields from the receipt. Return JSON only:',
                '{"merchant_name": string|null, "total": number|null, "incurred_on": "YYYY-MM-DD"|null,',
                '"incurred_time": "HH:MM"|null, "currency": "CAD"|"USD"|null, "raw_text": string}.',
                'Skip taxes, litres, category and payment method.',
                'Unreadable fields are null.',
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
  const fromText = fromParsed(String(parsed.raw_text ?? ''), 'openai', parsed);
  const total = typeof parsed.total === 'number' ? parsed.total : fromText.total;
  if (total == null && !hasReceiptValues(fromText)) {
    return empty('openai', { reason: 'unreadable', raw_text: parsed.raw_text ?? null });
  }
  return {
    ...fromText,
    merchant_name: parsed.merchant_name || fromText.merchant_name,
    total: total ?? fromText.total,
    incurred_on: parsed.incurred_on || fromText.incurred_on,
    incurred_time: parsed.incurred_time || fromText.incurred_time,
    currency: parsed.currency === 'USD' || parsed.currency === 'CAD' ? parsed.currency : fromText.currency,
    provider: 'openai',
    confidence: Math.max(fromText.confidence, total != null ? 0.8 : 0),
  };
}

async function extractWithOcrSpace(apiKey: string, imageBase64: string): Promise<Extraction> {
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
  return fromParsed(text, 'ocrspace');
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

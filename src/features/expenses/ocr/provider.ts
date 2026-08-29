import { parseReceiptFromText, hasReceiptValues } from './parse';
import type { CanonicalExpenseCode } from '../types';

export type ReceiptExtraction = {
  merchant_name?: string;
  incurred_on?: string;
  incurred_time?: string;
  subtotal?: number;
  tax_amount?: number;
  total?: number;
  currency?: string;
  category_hint?: CanonicalExpenseCode | string;
  fuel_quantity?: number;
  price_per_unit?: number;
  payment_method?: string;
  reference_number?: string;
  confidence: number;
  field_confidence?: Record<string, number>;
  provider: string;
  requires_confirmation: true;
  raw?: unknown;
};

export type ReceiptDraft = {
  photoUri: string;
  storagePath: string;
  receiptId: string | null;
  extraction: ReceiptExtraction;
};

export interface ReceiptOcrProvider {
  extract(input: { imageUri: string; storagePath?: string; receiptId?: string }): Promise<ReceiptExtraction>;
}

export function emptyReceiptExtraction(provider = 'none'): ReceiptExtraction {
  return {
    confidence: 0,
    provider,
    requires_confirmation: true,
  };
}

export function extractionFromReceiptText(
  text: string,
  options?: { provider?: string; engineConfidence?: number },
): ReceiptExtraction {
  const parsed = parseReceiptFromText(text, options?.engineConfidence ?? 0);
  if (!hasReceiptValues(parsed)) {
    return {
      ...emptyReceiptExtraction(options?.provider ?? 'on-device'),
      raw: { raw_text: parsed.raw_text },
    };
  }
  return {
    merchant_name: parsed.merchant_name,
    incurred_on: parsed.incurred_on,
    incurred_time: parsed.incurred_time,
    total: parsed.total,
    currency: parsed.currency,
    confidence: parsed.confidence,
    provider: options?.provider ?? 'on-device',
    requires_confirmation: true,
    raw: { raw_text: parsed.raw_text },
  };
}

export function mergeReceiptExtractions(primary: ReceiptExtraction, fallback: ReceiptExtraction): ReceiptExtraction {
  const pick = <K extends keyof ReceiptExtraction>(key: K): ReceiptExtraction[K] =>
    primary[key] ?? fallback[key];
  const total = pick('total');
  const provider = hasReceiptValues(primary) ? primary.provider : fallback.provider;
  return {
    merchant_name: pick('merchant_name'),
    incurred_on: pick('incurred_on'),
    incurred_time: pick('incurred_time'),
    subtotal: pick('subtotal'),
    tax_amount: pick('tax_amount'),
    total,
    currency: pick('currency'),
    category_hint: pick('category_hint'),
    fuel_quantity: pick('fuel_quantity'),
    price_per_unit: pick('price_per_unit'),
    payment_method: pick('payment_method'),
    reference_number: pick('reference_number'),
    confidence: Math.max(primary.confidence, fallback.confidence),
    field_confidence: primary.field_confidence ?? fallback.field_confidence,
    provider,
    requires_confirmation: true,
    raw: { primary: primary.raw, fallback: fallback.raw },
  };
}

function asNumber(value: unknown): number | undefined {
  if (value == null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function normalizeReceiptExtraction(raw: unknown, fallbackProvider = 'none'): ReceiptExtraction {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return {
    merchant_name: (row.merchant_name ?? row.vendor_name) as string | undefined,
    incurred_on: row.incurred_on as string | undefined,
    incurred_time: (row.incurred_time ?? row.transaction_time) as string | undefined,
    subtotal: asNumber(row.subtotal),
    tax_amount: asNumber(row.tax_amount ?? row.taxes),
    total: asNumber(row.total ?? row.amount),
    currency: row.currency as string | undefined,
    category_hint: (row.category_hint ?? row.category) as string | undefined,
    fuel_quantity: asNumber(row.fuel_quantity ?? row.quantity),
    price_per_unit: asNumber(row.price_per_unit),
    payment_method: row.payment_method as string | undefined,
    reference_number: (row.reference_number ?? row.receipt_number) as string | undefined,
    confidence: asNumber(row.confidence) ?? 0,
    field_confidence: (row.field_confidence as ReceiptExtraction['field_confidence']) ?? undefined,
    provider: String(row.provider ?? fallbackProvider),
    requires_confirmation: true,
    raw: row.raw ?? raw,
  };
}

export class UnconfiguredReceiptOcrProvider implements ReceiptOcrProvider {
  async extract(_input?: { imageUri: string; storagePath?: string; receiptId?: string }): Promise<ReceiptExtraction> {
    return emptyReceiptExtraction('none');
  }
}

export class EdgeFunctionReceiptOcrProvider implements ReceiptOcrProvider {
  constructor(private readonly invoke: (input: { storagePath?: string; receiptId?: string }) => Promise<ReceiptExtraction>) {}

  async extract(input: { imageUri: string; storagePath?: string; receiptId?: string }): Promise<ReceiptExtraction> {
    const extraction = await this.invoke({ storagePath: input.storagePath, receiptId: input.receiptId });
    return normalizeReceiptExtraction(extraction, extraction.provider);
  }
}

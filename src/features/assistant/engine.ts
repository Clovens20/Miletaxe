import { addDays, convertDistance } from '@/lib/format';
import type { AssistantConfidence, LocalizedString } from '@/types/domain';
import type { AssistantAnalyzeInput, AssistantSignal, ProposedPatch } from './types';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function numConfig(config: Record<string, unknown> | null | undefined, key: string, fallback: number): number {
  const value = config?.[key];
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function stringList(config: Record<string, unknown> | null | undefined, key: string): string[] {
  const value = config?.[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function daysBetween(from: string, to: string): number {
  const start = new Date(`${from}T00:00:00`).getTime();
  const end = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end)) return 0;
  return Math.round((end - start) / 86_400_000);
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const left = sorted[mid - 1];
  const right = sorted[mid];
  if (sorted.length % 2 === 1) return right ?? null;
  if (left == null || right == null) return right ?? left ?? null;
  return (left + right) / 2;
}

function normalizeVendor(value: string | null | undefined): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join(':');
}

function checkOf(input: AssistantAnalyzeInput, code: string) {
  return input.checks.find((row) => row.code === code);
}

function signal(
  input: AssistantAnalyzeInput,
  code: string,
  partial: Omit<AssistantSignal, 'check_code' | 'source' | 'requires_review' | 'title_i18n' | 'body_i18n'> & {
    title_i18n?: LocalizedString;
    body_i18n?: LocalizedString;
    confidence?: AssistantConfidence;
  },
): AssistantSignal | null {
  const check = checkOf(input, code);
  if (!check) return null;
  return {
    check_code: code,
    fingerprint: partial.fingerprint,
    entity_type: partial.entity_type,
    entity_id: partial.entity_id,
    related_entity_id: partial.related_entity_id,
    confidence: partial.confidence ?? check.default_confidence,
    source: 'deterministic',
    title_i18n: partial.title_i18n ?? check.title_i18n,
    body_i18n: partial.body_i18n ?? check.description_i18n,
    evidence: partial.evidence,
    proposed_patch: partial.proposed_patch,
    requires_review: true,
  };
}

function missingOdometer(input: AssistantAnalyzeInput): AssistantSignal[] {
  const check = checkOf(input, 'missing_odometer_reading');
  const lookback = numConfig(check?.config, 'lookback_days', 7);
  const weekAgo = addDays(input.today, -lookback);
  const out: AssistantSignal[] = [];
  for (const vehicle of input.vehicles) {
    const rows = input.readings.filter((row) => row.vehicle_id === vehicle.id);
    if (!rows.length) {
      const item = signal(input, 'missing_odometer_reading', {
        fingerprint: `missing_odometer_reading:vehicle:${vehicle.id}:opening`,
        entity_type: 'odometer',
        entity_id: vehicle.id,
        related_entity_id: null,
        confidence: 'high',
        evidence: { vehicle_id: vehicle.id, kind: 'opening' },
        proposed_patch: null,
      });
      if (item) out.push(item);
      continue;
    }
    const todayRows = rows.filter((row) => row.recorded_on === input.today);
    const started = todayRows.some((row) => row.kind === 'start_of_day' && row.is_valid);
    const ended = todayRows.some((row) => row.kind === 'end_of_day' && row.is_valid);
    const recent = rows.some((row) => row.recorded_on >= weekAgo && row.recorded_on < input.today && row.is_valid);
    if (!started && (ended || recent)) {
      const item = signal(input, 'missing_odometer_reading', {
        fingerprint: `missing_odometer_reading:vehicle:${vehicle.id}:start:${input.today}`,
        entity_type: 'odometer',
        entity_id: vehicle.id,
        related_entity_id: null,
        confidence: ended ? 'high' : 'medium',
        evidence: { vehicle_id: vehicle.id, kind: 'start_of_day', date: input.today },
        proposed_patch: null,
      });
      if (item) out.push(item);
    }
    if (started && !ended) {
      const item = signal(input, 'missing_odometer_reading', {
        fingerprint: `missing_odometer_reading:vehicle:${vehicle.id}:end:${input.today}`,
        entity_type: 'odometer',
        entity_id: vehicle.id,
        related_entity_id: null,
        confidence: 'high',
        evidence: { vehicle_id: vehicle.id, kind: 'end_of_day', date: input.today },
        proposed_patch: null,
      });
      if (item) out.push(item);
    }
  }
  return out;
}

function inconsistentOdometer(input: AssistantAnalyzeInput): AssistantSignal[] {
  const out: AssistantSignal[] = [];
  for (const row of input.readings) {
    if (row.is_valid && row.validation_status !== 'invalid') continue;
    const item = signal(input, 'inconsistent_odometer', {
      fingerprint: `inconsistent_odometer:reading:${row.id}`,
      entity_type: 'odometer',
      entity_id: row.id,
      related_entity_id: null,
      confidence: 'high',
      evidence: { reading_id: row.id, reading: row.reading, recorded_on: row.recorded_on },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  const byVehicle = new Map<string, typeof input.readings>();
  for (const row of input.readings.filter((item) => item.is_valid)) {
    const list = byVehicle.get(row.vehicle_id) ?? [];
    list.push(row);
    byVehicle.set(row.vehicle_id, list);
  }
  for (const [, rows] of byVehicle) {
    const ordered = [...rows].sort((a, b) => a.recorded_on.localeCompare(b.recorded_on) || a.id.localeCompare(b.id));
    for (let index = 1; index < ordered.length; index += 1) {
      const prev = ordered[index - 1];
      const curr = ordered[index];
      if (!prev || !curr) continue;
      const prevKm = convertDistance(Number(prev.reading), prev.unit, 'km');
      const currKm = convertDistance(Number(curr.reading), curr.unit, 'km');
      if (currKm >= prevKm) continue;
      const item = signal(input, 'inconsistent_odometer', {
        fingerprint: `inconsistent_odometer:reading:${curr.id}:mono`,
        entity_type: 'odometer',
        entity_id: curr.id,
        related_entity_id: prev.id,
        confidence: 'high',
        evidence: { previous: prev.reading, current: curr.reading, previous_date: prev.recorded_on },
        proposed_patch: null,
      });
      if (item) out.push(item);
    }
  }
  return out;
}

function duplicateExpenses(
  input: AssistantAnalyzeInput,
  code: 'duplicate_receipt' | 'duplicate_transaction',
  requireReceipt: boolean,
): AssistantSignal[] {
  const out: AssistantSignal[] = [];
  const rows = input.expenses.filter((row) => (requireReceipt ? Boolean(row.receipt_id) : true));
  for (let i = 0; i < rows.length; i += 1) {
    const a = rows[i];
    if (!a) continue;
    for (let j = i + 1; j < rows.length; j += 1) {
      const b = rows[j];
      if (!b) continue;
      const vendorA = normalizeVendor(a.vendor_name);
      const vendorB = normalizeVendor(b.vendor_name);
      if (!vendorA || vendorA !== vendorB) continue;
      if (a.incurred_on !== b.incurred_on) continue;
      if (Number(a.amount) !== Number(b.amount)) continue;
      if (code === 'duplicate_transaction' && a.receipt_id && b.receipt_id) continue;
      const sameRef = Boolean(a.reference_number && a.reference_number === b.reference_number);
      const item = signal(input, code, {
        fingerprint: `${code}:expense:${pairKey(a.id, b.id)}`,
        entity_type: 'expense',
        entity_id: a.id,
        related_entity_id: b.id,
        confidence: sameRef || requireReceipt ? 'high' : 'medium',
        evidence: {
          vendor_name: a.vendor_name,
          incurred_on: a.incurred_on,
          amount: a.amount,
          reference_match: sameRef,
        },
        proposed_patch: null,
      });
      if (item) out.push(item);
    }
  }
  return out;
}

function duplicateIncome(input: AssistantAnalyzeInput): AssistantSignal[] {
  const out: AssistantSignal[] = [];
  for (let i = 0; i < input.income.length; i += 1) {
    const a = input.income[i];
    if (!a) continue;
    for (let j = i + 1; j < input.income.length; j += 1) {
      const b = input.income[j];
      if (!b) continue;
      if (normalizeVendor(a.source_name) !== normalizeVendor(b.source_name)) continue;
      if (a.received_on !== b.received_on) continue;
      if (Number(a.amount) !== Number(b.amount)) continue;
      const item = signal(input, 'duplicate_transaction', {
        fingerprint: `duplicate_transaction:income:${pairKey(a.id, b.id)}`,
        entity_type: 'income',
        entity_id: a.id,
        related_entity_id: b.id,
        confidence: a.reference_number && a.reference_number === b.reference_number ? 'high' : 'medium',
        evidence: { source_name: a.source_name, received_on: a.received_on, amount: a.amount },
        proposed_patch: null,
      });
      if (item) out.push(item);
    }
  }
  return out;
}

function missingTotals(input: AssistantAnalyzeInput): AssistantSignal[] {
  const out: AssistantSignal[] = [];
  for (const row of input.expenses) {
    const extractedTotal = row.extracted_payload?.total;
    if (Number(row.amount) === 0) {
      const patch: ProposedPatch | null =
        extractedTotal != null && Number.isFinite(Number(extractedTotal)) && Number(extractedTotal) > 0
          ? { table: 'expenses', id: row.id, fields: { amount: Number(extractedTotal) } }
          : null;
      const item = signal(input, 'missing_receipt_total', {
        fingerprint: `missing_receipt_total:expense:${row.id}`,
        entity_type: 'expense',
        entity_id: row.id,
        related_entity_id: row.receipt_id,
        confidence: patch ? 'needs_review' : 'high',
        evidence: { amount: row.amount, extracted_total: extractedTotal ?? null, suggestion: Boolean(patch) },
        proposed_patch: patch,
      });
      if (item) out.push(item);
      continue;
    }
    if (row.extracted_payload && extractedTotal == null) {
      const item = signal(input, 'missing_receipt_total', {
        fingerprint: `missing_receipt_total:expense:${row.id}:ocr`,
        entity_type: 'expense',
        entity_id: row.id,
        related_entity_id: row.receipt_id,
        confidence: 'medium',
        evidence: { amount: row.amount, extracted_total: null },
        proposed_patch: null,
      });
      if (item) out.push(item);
    }
  }
  return out;
}

function expensesWithoutDocument(input: AssistantAnalyzeInput): AssistantSignal[] {
  const out: AssistantSignal[] = [];
  const byId = Object.fromEntries(input.categories.map((row) => [row.id, row]));
  for (const row of input.expenses) {
    if (row.receipt_id) continue;
    const category = row.category_id ? byId[row.category_id] : undefined;
    if (category && !category.requires_receipt) continue;
    const item = signal(input, 'expense_without_document', {
      fingerprint: `expense_without_document:expense:${row.id}`,
      entity_type: 'expense',
      entity_id: row.id,
      related_entity_id: null,
      confidence: category?.requires_receipt ? 'high' : 'medium',
      evidence: { vendor_name: row.vendor_name, category_code: category?.code ?? null },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  return out;
}

function unusualAmounts(input: AssistantAnalyzeInput): AssistantSignal[] {
  const check = checkOf(input, 'unusual_expense_amount');
  const minSample = numConfig(check?.config, 'min_sample', 3);
  const mediumMul = numConfig(check?.config, 'medium_multiplier', 3);
  const highMul = numConfig(check?.config, 'high_multiplier', 5);
  const complete = input.expenses.filter((row) => row.status === 'complete' && Number(row.amount) > 0);
  const out: AssistantSignal[] = [];
  for (const row of complete) {
    const peers = complete.filter((item) => item.id !== row.id && item.category_id === row.category_id).map((item) => Number(item.amount));
    if (peers.length < minSample) {
      continue;
    }
    const mid = median(peers);
    if (mid == null || mid <= 0) continue;
    const ratio = Number(row.amount) / mid;
    if (ratio < mediumMul) continue;
    const confidence: AssistantConfidence = peers.length >= 5 && ratio >= highMul ? 'high' : 'medium';
    const item = signal(input, 'unusual_expense_amount', {
      fingerprint: `unusual_expense_amount:expense:${row.id}`,
      entity_type: 'expense',
      entity_id: row.id,
      related_entity_id: null,
      confidence,
      evidence: { amount: row.amount, category_median: mid, ratio: Number(ratio.toFixed(2)), sample: peers.length },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  return out;
}

function missingDates(input: AssistantAnalyzeInput): AssistantSignal[] {
  const out: AssistantSignal[] = [];
  for (const row of input.expenses) {
    if (DATE_RE.test(row.incurred_on)) {
      if (row.extracted_payload && !row.extracted_payload.incurred_on) {
        const item = signal(input, 'missing_date', {
          fingerprint: `missing_date:expense:${row.id}:extracted`,
          entity_type: 'expense',
          entity_id: row.id,
          related_entity_id: null,
          confidence: 'needs_review',
          evidence: { incurred_on: row.incurred_on, extracted_date: null },
          proposed_patch: null,
        });
        if (item) out.push(item);
      }
      continue;
    }
    const item = signal(input, 'missing_date', {
      fingerprint: `missing_date:expense:${row.id}`,
      entity_type: 'expense',
      entity_id: row.id,
      related_entity_id: null,
      confidence: 'high',
      evidence: { incurred_on: row.incurred_on },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  for (const row of input.income) {
    if (DATE_RE.test(row.received_on)) continue;
    const item = signal(input, 'missing_date', {
      fingerprint: `missing_date:income:${row.id}`,
      entity_type: 'income',
      entity_id: row.id,
      related_entity_id: null,
      confidence: 'high',
      evidence: { received_on: row.received_on },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  for (const row of input.readings) {
    if (DATE_RE.test(row.recorded_on)) continue;
    const item = signal(input, 'missing_date', {
      fingerprint: `missing_date:odometer:${row.id}`,
      entity_type: 'odometer',
      entity_id: row.id,
      related_entity_id: null,
      confidence: 'high',
      evidence: { recorded_on: row.recorded_on },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  return out;
}

function mileageGaps(input: AssistantAnalyzeInput): AssistantSignal[] {
  const check = checkOf(input, 'mileage_gap');
  const gapDays = numConfig(check?.config, 'gap_days', 31);
  const highGap = numConfig(check?.config, 'high_gap_days', 90);
  const out: AssistantSignal[] = [];
  for (const vehicle of input.vehicles) {
    const ordered = input.readings
      .filter((row) => row.vehicle_id === vehicle.id && row.is_valid)
      .sort((a, b) => a.recorded_on.localeCompare(b.recorded_on));
    for (let index = 1; index < ordered.length; index += 1) {
      const prev = ordered[index - 1];
      const curr = ordered[index];
      if (!prev || !curr) continue;
      const gap = daysBetween(prev.recorded_on, curr.recorded_on);
      if (gap < gapDays) continue;
      const item = signal(input, 'mileage_gap', {
        fingerprint: `mileage_gap:vehicle:${vehicle.id}:${prev.id}:${curr.id}`,
        entity_type: 'odometer',
        entity_id: curr.id,
        related_entity_id: prev.id,
        confidence: gap >= highGap ? 'high' : 'medium',
        evidence: { from: prev.recorded_on, to: curr.recorded_on, gap_days: gap },
        proposed_patch: null,
      });
      if (item) out.push(item);
    }
  }
  return out;
}

function classificationConflicts(input: AssistantAnalyzeInput): AssistantSignal[] {
  const check = checkOf(input, 'classification_conflict');
  const mixedCodes = stringList(check?.config, 'mixed_use_codes');
  const out: AssistantSignal[] = [];
  const byVendor = new Map<string, typeof input.expenses>();
  for (const row of input.expenses) {
    const vendor = normalizeVendor(row.vendor_name);
    if (!vendor) continue;
    const list = byVendor.get(vendor) ?? [];
    list.push(row);
    byVendor.set(vendor, list);
  }
  for (const [vendor, rows] of byVendor) {
    const categories = new Set(rows.map((row) => row.category_id).filter(Boolean));
    if (categories.size < 2) continue;
    const first = rows[0];
    const second = rows.find((row) => row.category_id !== first?.category_id);
    if (!first) continue;
    const item = signal(input, 'classification_conflict', {
      fingerprint: `classification_conflict:vendor:${vendor}`,
      entity_type: 'expense',
      entity_id: first.id,
      related_entity_id: second?.id ?? null,
      confidence: 'needs_review',
      evidence: { vendor_name: first.vendor_name, distinct_categories: categories.size },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  const otherIds = new Set(input.categories.filter((row) => mixedCodes.includes(row.code)).map((row) => row.id));
  for (const row of input.expenses) {
    if (!row.category_id || !otherIds.has(row.category_id)) continue;
    const item = signal(input, 'classification_conflict', {
      fingerprint: `classification_conflict:expense:${row.id}:other`,
      entity_type: 'expense',
      entity_id: row.id,
      related_entity_id: null,
      confidence: 'needs_review',
      evidence: { vendor_name: row.vendor_name, category: 'other' },
      proposed_patch: null,
    });
    if (item) out.push(item);
  }
  return out;
}

export function analyzeRecords(input: AssistantAnalyzeInput): AssistantSignal[] {
  const signals = [
    ...missingOdometer(input),
    ...inconsistentOdometer(input),
    ...duplicateExpenses(input, 'duplicate_receipt', true),
    ...missingTotals(input),
    ...expensesWithoutDocument(input),
    ...unusualAmounts(input),
    ...missingDates(input),
    ...duplicateExpenses(input, 'duplicate_transaction', false),
    ...duplicateIncome(input),
    ...mileageGaps(input),
    ...classificationConflicts(input),
  ].filter((row): row is AssistantSignal => Boolean(row));

  const rank: Record<AssistantConfidence, number> = { high: 0, medium: 1, needs_review: 2 };
  const seen = new Set<string>();
  return signals
    .filter((row) => {
      if (seen.has(row.fingerprint)) return false;
      seen.add(row.fingerprint);
      return true;
    })
    .sort((a, b) => rank[a.confidence] - rank[b.confidence]);
}

function asLocalized(value: unknown, fallback: LocalizedString): LocalizedString {
  if (value && typeof value === 'object' && 'fr' in value) {
    const row = value as { fr?: unknown; en?: unknown };
    const fr = String(row.fr ?? fallback.fr);
    const en = String(row.en ?? fr);
    return { fr, en };
  }
  if (typeof value === 'string' && value.trim()) {
    return { fr: value, en: value };
  }
  return fallback;
}

export function clampAiSignal(raw: unknown): AssistantSignal | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const check_code = String(row.check_code ?? '').trim();
  const fingerprint = String(row.fingerprint ?? '').trim();
  if (!check_code || !fingerprint) return null;
  const evidence =
    row.evidence && typeof row.evidence === 'object' && !Array.isArray(row.evidence)
      ? (row.evidence as Record<string, unknown>)
      : {};
  return {
    check_code,
    fingerprint,
    entity_type: String(row.entity_type ?? 'record'),
    entity_id: row.entity_id ? String(row.entity_id) : null,
    related_entity_id: row.related_entity_id ? String(row.related_entity_id) : null,
    confidence: 'needs_review',
    source: 'ai',
    title_i18n: asLocalized(row.title_i18n, {
      fr: 'J’ai trouvé quelque chose que vous pourriez vouloir revoir.',
      en: 'I found something you may want to review.',
    }),
    body_i18n: asLocalized(row.body_i18n, {
      fr: 'À revoir avec votre comptable. Ce n’est pas un avis fiscal.',
      en: 'Review with your accountant. This is not tax advice.',
    }),
    evidence,
    proposed_patch: null,
    requires_review: true,
  };
}

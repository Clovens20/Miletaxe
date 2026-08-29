import type { ReceiptReviewValues } from '@/lib/validation/schemas';
import type { ExpenseCategoryRecord } from '@/features/tax-config/types';
import {
  CANONICAL_EXPENSE_CODES,
  type CanonicalExpenseCode,
  type CategoryTotal,
  type ExpenseFilters,
  type ExpenseRecord,
  type MonthlyExpenseSummary,
  type PaymentMethod,
} from './types';
import type { ReceiptExtraction } from './ocr/provider';

const CATEGORY_ALIASES: Record<string, CanonicalExpenseCode> = {
  fuel: 'fuel',
  gas: 'fuel',
  gasoline: 'fuel',
  essence: 'fuel',
  carburant: 'fuel',
  diesel: 'fuel',
  maintenance: 'maintenance',
  entretien: 'maintenance',
  repairs: 'repairs',
  repair: 'repairs',
  reparations: 'repairs',
  réparation: 'repairs',
  parking: 'parking',
  stationnement: 'parking',
  tolls: 'tolls',
  toll: 'tolls',
  peages: 'tolls',
  péages: 'tolls',
  insurance: 'insurance',
  assurance: 'insurance',
  vehicle: 'vehicle',
  vehicle_expenses: 'vehicle',
  other_vehicle: 'vehicle',
  office: 'office',
  office_expenses: 'office',
  supplies: 'office',
  phone: 'phone',
  telephone: 'phone',
  téléphone: 'phone',
  other: 'other',
  autre: 'other',
  other_business: 'other',
};

export function isCanonicalCategory(code: string): boolean {
  return (CANONICAL_EXPENSE_CODES as readonly string[]).includes(code);
}

export function canonicalCategories(rows: ExpenseCategoryRecord[]): ExpenseCategoryRecord[] {
  return rows
    .filter((row) => isCanonicalCategory(row.code))
    .sort((a, b) => a.sort_order - b.sort_order);
}

export function normalizeCategoryHint(hint?: string | null): CanonicalExpenseCode | undefined {
  if (!hint) return undefined;
  const key = hint.trim().toLowerCase().replace(/[\s-]+/g, '_');
  return CATEGORY_ALIASES[key] ?? (isCanonicalCategory(key) ? (key as CanonicalExpenseCode) : undefined);
}

export function categoryIdFromHint(
  hint: string | undefined,
  categories: ExpenseCategoryRecord[],
): string {
  const code = normalizeCategoryHint(hint);
  if (!code) return '';
  return categories.find((row) => row.code === code)?.id ?? '';
}

export function normalizePaymentMethod(raw?: string | null): PaymentMethod | '' {
  if (!raw) return '';
  const value = raw.toLowerCase();
  if (value.includes('cash') || value.includes('comptant')) return 'cash';
  if (value.includes('debit') || value.includes('interac')) return 'debit';
  if (value.includes('credit') || value.includes('visa') || value.includes('master') || value.includes('amex')) {
    return 'credit';
  }
  if (value.includes('uber') || value.includes('lyft') || value.includes('platform') || value.includes('plateforme')) {
    return 'platform';
  }
  if (value === 'other' || value === 'autre') return 'other';
  return 'other';
}

export function normalizeCurrency(raw?: string | null, fallback = 'CAD'): string {
  if (!raw) return fallback;
  const value = raw.trim().toUpperCase();
  if (value === 'CAD' || value === 'USD') return value;
  if (value.includes('CA')) return 'CAD';
  if (value.includes('US')) return 'USD';
  return fallback;
}

export function yearMonthOf(isoDate: string): string {
  return isoDate.slice(0, 7);
}

export function filterExpenses(expenses: ExpenseRecord[], filters: ExpenseFilters): ExpenseRecord[] {
  const query = filters.query?.trim().toLowerCase();
  return expenses.filter((row) => {
    if (filters.categoryId && row.category_id !== filters.categoryId) return false;
    if (filters.month && yearMonthOf(row.incurred_on) !== filters.month) return false;
    if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false;
    if (query) {
      const haystack = [row.vendor_name, row.reference_number, row.notes, row.payment_method]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function monthlySummary(
  expenses: ExpenseRecord[],
  month: string,
  categories: ExpenseCategoryRecord[],
): MonthlyExpenseSummary {
  const inMonth = expenses.filter((row) => yearMonthOf(row.incurred_on) === month && row.status === 'complete');
  const byId = new Map<string | null, CategoryTotal>();
  for (const row of inMonth) {
    const current = byId.get(row.category_id) ?? {
      category_id: row.category_id,
      code: categories.find((item) => item.id === row.category_id)?.code,
      total: 0,
      count: 0,
    };
    current.total += Number(row.amount);
    current.count += 1;
    byId.set(row.category_id, current);
  }
  return {
    month,
    total: inMonth.reduce((sum, row) => sum + Number(row.amount), 0),
    tax_total: inMonth.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0),
    count: inMonth.length,
    by_category: [...byId.values()].sort((a, b) => b.total - a.total),
  };
}

export function availableMonths(expenses: ExpenseRecord[]): string[] {
  return [...new Set(expenses.map((row) => yearMonthOf(row.incurred_on)))].sort().reverse();
}

export type FieldDiff = { field: string; extracted: string; confirmed: string };

export function extractionDiffs(extracted: ReceiptExtraction | null | undefined, confirmed: Record<string, string | number | null | undefined>): FieldDiff[] {
  if (!extracted) return [];
  const pairs: Array<[string, string | number | undefined | null, string | number | null | undefined]> = [
    ['merchant_name', extracted.merchant_name, confirmed.vendor_name],
    ['incurred_on', extracted.incurred_on, confirmed.incurred_on],
    ['incurred_time', extracted.incurred_time, confirmed.incurred_time],
    ['subtotal', extracted.subtotal, confirmed.subtotal],
    ['tax_amount', extracted.tax_amount, confirmed.tax_amount],
    ['total', extracted.total, confirmed.amount],
    ['currency', extracted.currency, confirmed.currency],
    ['category_hint', extracted.category_hint, confirmed.category_code],
    ['fuel_quantity', extracted.fuel_quantity, confirmed.fuel_quantity],
    ['price_per_unit', extracted.price_per_unit, confirmed.price_per_unit],
    ['payment_method', extracted.payment_method, confirmed.payment_method],
    ['reference_number', extracted.reference_number, confirmed.reference_number],
  ];
  return pairs
    .filter(([, from, to]) => from != null && String(from) !== String(to ?? ''))
    .map(([field, from, to]) => ({
      field,
      extracted: String(from),
      confirmed: String(to ?? ''),
    }));
}

export function formatOptionalNumber(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '';
  return String(value);
}

export function parseOptionalAmount(value?: string | null): number | null {
  if (!value?.trim()) return null;
  const parsed = Number(value.trim().replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

export function receiptFormDefaults(input: {
  extraction?: ReceiptExtraction | null;
  expense?: ExpenseRecord | null;
  categories: ExpenseCategoryRecord[];
  currency: string;
  today: string;
}): ReceiptReviewValues {
  if (input.expense) {
    const row = input.expense;
    return {
      vendor_name: row.vendor_name ?? '',
      amount: formatOptionalNumber(row.amount),
      subtotal: formatOptionalNumber(row.subtotal),
      tax_amount: formatOptionalNumber(row.tax_amount),
      category_id: row.category_id ?? '',
      incurred_on: row.incurred_on,
      incurred_time: row.incurred_time ?? '',
      currency: row.currency,
      vehicle_id: row.vehicle_id ?? '',
      fuel_quantity: formatOptionalNumber(row.fuel_quantity),
      price_per_unit: formatOptionalNumber(row.price_per_unit),
      payment_method: row.payment_method ?? '',
      reference_number: row.reference_number ?? '',
      notes: row.notes ?? '',
    };
  }
  const extracted = input.extraction;
  return {
    vendor_name: extracted?.merchant_name ?? '',
    amount: formatOptionalNumber(extracted?.total),
    subtotal: '',
    tax_amount: '',
    category_id: '',
    incurred_on: extracted?.incurred_on ?? input.today,
    incurred_time: extracted?.incurred_time ?? '',
    currency: normalizeCurrency(extracted?.currency, input.currency),
    vehicle_id: '',
    fuel_quantity: '',
    price_per_unit: '',
    payment_method: '',
    reference_number: '',
    notes: '',
  };
}

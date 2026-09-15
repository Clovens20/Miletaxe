import type { ReceiptReviewValues } from '@/lib/validation/schemas';
import type { ExpenseCategoryRecord } from '@/features/tax-config/types';
import {
  addDays,
  addMonths,
  lastDayOfMonth,
  startOfMonthIso,
  startOfWeekIso,
} from '@/lib/format';
import {
  CANONICAL_EXPENSE_CODES,
  type CanonicalExpenseCode,
  type CategoryTotal,
  type ExpenseFilters,
  type ExpenseListItem,
  type ExpenseRecord,
  type MonthlyExpenseSummary,
  type PaymentMethod,
} from './types';
import type { ReceiptExtraction } from './ocr/provider';
import { inferCategoryFromMerchant } from './ocr/parse';

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
  vehicle_rental: 'vehicle_rental',
  rental: 'vehicle_rental',
  location: 'vehicle_rental',
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

export function rentalCategoryOf(categories: ExpenseCategoryRecord[]): ExpenseCategoryRecord | undefined {
  return categories.find((row) => row.code === 'vehicle_rental');
}

function categoryCodeOf(categoryId: string | null | undefined, categories: ExpenseCategoryRecord[]): string | undefined {
  if (!categoryId) return undefined;
  return categories.find((row) => row.id === categoryId)?.code;
}

function matchesCategoryFilter(
  item: { kind?: string; category_id: string | null },
  categoryId: string,
  categories: ExpenseCategoryRecord[],
): boolean {
  if (item.category_id === categoryId) return true;
  const wanted = categoryCodeOf(categoryId, categories);
  if (wanted === 'vehicle_rental' && item.kind === 'rental') return true;
  return Boolean(wanted && categoryCodeOf(item.category_id, categories) === wanted);
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

export function buildExpenseList(
  expenses: ExpenseRecord[],
  rentalDays: Array<{
    id: string;
    work_date: string;
    rental_amount: number;
    notes?: string | null;
  }>,
  rentalCategoryId: string | null,
  rentalLabel?: string | null,
): ExpenseListItem[] {
  const receipts: ExpenseListItem[] = expenses.map((row) => ({
    kind: 'expense',
    id: row.id,
    incurred_on: row.incurred_on,
    amount: Number(row.amount),
    currency: row.currency,
    vendor_name: row.vendor_name,
    notes: row.notes,
    category_id: row.category_id,
    status: row.status,
  }));
  const rentals: ExpenseListItem[] = rentalDays.map((row) => ({
    kind: 'rental',
    id: row.id,
    incurred_on: row.work_date,
    amount: Number(row.rental_amount),
    currency: null,
    vendor_name: rentalLabel ?? null,
    notes: row.notes ?? null,
    category_id: rentalCategoryId,
    status: 'complete',
  }));
  return [...receipts, ...rentals].sort(
    (a, b) => b.incurred_on.localeCompare(a.incurred_on) || b.id.localeCompare(a.id),
  );
}

export function filterExpenseList(
  items: ExpenseListItem[],
  filters: ExpenseFilters,
  categories: ExpenseCategoryRecord[] = [],
): ExpenseListItem[] {
  const query = filters.query?.trim().toLowerCase();
  return items.filter((row) => {
    if (filters.categoryId && !matchesCategoryFilter(row, filters.categoryId, categories)) return false;
    if (filters.month && yearMonthOf(row.incurred_on) !== filters.month) return false;
    if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false;
    if (query) {
      const haystack = [row.vendor_name, row.notes, row.kind === 'rental' ? 'location rental loueur' : '']
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
}

export function filterExpenses(
  expenses: ExpenseRecord[],
  filters: ExpenseFilters,
  categories: ExpenseCategoryRecord[] = [],
): ExpenseRecord[] {
  const query = filters.query?.trim().toLowerCase();
  return expenses.filter((row) => {
    if (filters.categoryId && !matchesCategoryFilter(row, filters.categoryId, categories)) return false;
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
  rentalDays: Array<{ work_date: string; rental_amount: number }> = [],
): MonthlyExpenseSummary {
  const inMonth = expenses.filter((row) => yearMonthOf(row.incurred_on) === month && row.status === 'complete');
  const rentals = rentalDays.filter((row) => yearMonthOf(row.work_date) === month);
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
  const rentalTotal = rentals.reduce((sum, row) => sum + Number(row.rental_amount), 0);
  if (rentalTotal > 0 || rentals.length) {
    const rentalCat = rentalCategoryOf(categories);
    const key = rentalCat?.id ?? '__vehicle_rental__';
    const current = byId.get(key) ?? {
      category_id: rentalCat?.id ?? null,
      code: 'vehicle_rental',
      total: 0,
      count: 0,
    };
    current.total += rentalTotal;
    current.count += rentals.length;
    byId.set(key, current);
  }
  return {
    month,
    total: inMonth.reduce((sum, row) => sum + Number(row.amount), 0) + rentalTotal,
    tax_total: inMonth.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0),
    count: inMonth.length + rentals.length,
    by_category: [...byId.values()].sort((a, b) => b.total - a.total),
  };
}

export function availableMonths(
  expenses: ExpenseRecord[],
  rentalDays: Array<{ work_date: string }> = [],
): string[] {
  return [
    ...new Set([
      ...expenses.map((row) => yearMonthOf(row.incurred_on)),
      ...rentalDays.map((row) => yearMonthOf(row.work_date)),
    ]),
  ]
    .sort()
    .reverse();
}

export type SpendingPeriodKind = 'today' | 'week' | 'month' | 'year';

export function spendingWindow(
  kind: SpendingPeriodKind,
  anchor: string,
  today: string,
  year?: { start: string; end: string },
): { start: string; end: string } {
  if (kind === 'today') return { start: anchor, end: anchor };
  if (kind === 'week') {
    const start = startOfWeekIso(anchor);
    const weekEnd = addDays(start, 6);
    return { start, end: weekEnd > today ? today : weekEnd };
  }
  if (kind === 'month') {
    const start = startOfMonthIso(anchor);
    const monthEnd = lastDayOfMonth(anchor.slice(0, 7));
    return { start, end: monthEnd > today ? today : monthEnd };
  }
  const start = year?.start ?? `${anchor.slice(0, 4)}-01-01`;
  const rawEnd = year?.end ?? today;
  return { start, end: rawEnd > today ? today : rawEnd };
}

export function shiftSpendingAnchor(
  kind: SpendingPeriodKind,
  anchor: string,
  delta: number,
  today: string,
  minDate?: string,
): string {
  const floor = minDate && minDate < today ? minDate : addDays(today, -730);
  let next = anchor;
  if (kind === 'today') next = addDays(anchor, delta);
  else if (kind === 'week') next = addDays(anchor, delta * 7);
  else if (kind === 'month') {
    const month = addMonths(anchor.slice(0, 7), delta);
    next = `${month}-01`;
  } else {
    return anchor;
  }
  if (next > today) return today;
  if (next < floor) return floor;
  return next;
}

export type PeriodExpenseSnapshot = {
  start: string;
  end: string;
  expenseTotal: number;
  rentalTotal: number;
  total: number;
  taxTotal: number;
  completeCount: number;
  incomplete: ExpenseRecord[];
  complete: ExpenseRecord[];
  rentals: Array<{ id: string; work_date: string; rental_amount: number }>;
  by_category: CategoryTotal[];
};

export function periodExpenseSnapshot(
  expenses: ExpenseRecord[],
  rentalDays: Array<{ id: string; work_date: string; rental_amount: number }>,
  range: { start: string; end: string },
  categories: ExpenseCategoryRecord[],
  rentalCategoryId?: string | null,
): PeriodExpenseSnapshot {
  const inRange = (date: string) => date >= range.start && date <= range.end;
  const rows = expenses.filter((row) => inRange(row.incurred_on));
  const complete = rows
    .filter((row) => row.status === 'complete')
    .sort((a, b) => b.incurred_on.localeCompare(a.incurred_on) || b.created_at.localeCompare(a.created_at));
  const incomplete = rows
    .filter((row) => row.status !== 'complete')
    .sort((a, b) => b.incurred_on.localeCompare(a.incurred_on));
  const rentals = rentalDays
    .filter((row) => inRange(row.work_date))
    .sort((a, b) => b.work_date.localeCompare(a.work_date));
  const expenseTotal = complete.reduce((sum, row) => sum + Number(row.amount), 0);
  const taxTotal = complete.reduce((sum, row) => sum + Number(row.tax_amount ?? 0), 0);
  const rentalTotal = rentals.reduce((sum, row) => sum + Number(row.rental_amount), 0);

  const byId = new Map<string | null, CategoryTotal>();
  for (const row of complete) {
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
  if (rentalTotal > 0) {
    const rentalKey = rentalCategoryId ?? '__vehicle_rental__';
    const current = byId.get(rentalKey) ?? {
      category_id: rentalCategoryId ?? null,
      code: categories.find((item) => item.id === rentalCategoryId)?.code ?? 'vehicle_rental',
      total: 0,
      count: 0,
    };
    current.total += rentalTotal;
    current.count += rentals.length;
    byId.set(rentalKey, current);
  }

  return {
    start: range.start,
    end: range.end,
    expenseTotal,
    rentalTotal,
    total: expenseTotal + rentalTotal,
    taxTotal,
    completeCount: complete.length + rentals.length,
    incomplete,
    complete,
    rentals,
    by_category: [...byId.values()].sort((a, b) => b.total - a.total),
  };
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

function normalizeVendor(value?: string | null): string {
  return (value ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function suggestFromVendorHistory(
  vendor: string | undefined,
  expenses: ExpenseRecord[] | undefined,
): Partial<Pick<ReceiptReviewValues, 'category_id' | 'vehicle_id' | 'payment_method'>> {
  const key = normalizeVendor(vendor);
  if (!key) return {};
  const hits = (expenses ?? [])
    .filter((row) => row.status === 'complete' && normalizeVendor(row.vendor_name))
    .filter((row) => {
      const name = normalizeVendor(row.vendor_name);
      return name === key || name.includes(key) || key.includes(name);
    })
    .sort((a, b) => b.incurred_on.localeCompare(a.incurred_on));
  const last = hits[0];
  if (!last) return {};
  return {
    category_id: last.category_id ?? '',
    vehicle_id: last.vehicle_id ?? '',
    payment_method: last.payment_method ?? '',
  };
}

export function receiptFormDefaults(input: {
  extraction?: ReceiptExtraction | null;
  expense?: ExpenseRecord | null;
  categories: ExpenseCategoryRecord[];
  currency: string;
  today: string;
  emptyDate?: boolean;
  expenses?: ExpenseRecord[];
  defaultVehicleId?: string;
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
  const history = suggestFromVendorHistory(extracted?.merchant_name, input.expenses);
  const hasFuel = extracted?.fuel_quantity != null || extracted?.price_per_unit != null;
  const categoryHint = extracted?.category_hint ?? inferCategoryFromMerchant(extracted?.merchant_name, hasFuel);
  const categoryId = categoryIdFromHint(categoryHint, input.categories) || history.category_id || '';
  const category = input.categories.find((row) => row.id === categoryId);
  const vehicleId =
    history.vehicle_id ||
    (category?.code === 'fuel' || hasFuel ? input.defaultVehicleId ?? '' : '');
  return {
    vendor_name: extracted?.merchant_name ?? '',
    amount: formatOptionalNumber(extracted?.total),
    subtotal: formatOptionalNumber(extracted?.subtotal),
    tax_amount: formatOptionalNumber(extracted?.tax_amount),
    category_id: categoryId,
    incurred_on: extracted?.incurred_on ?? (input.emptyDate ? '' : input.today),
    incurred_time: extracted?.incurred_time ?? '',
    currency: normalizeCurrency(extracted?.currency, input.currency),
    vehicle_id: vehicleId ?? '',
    fuel_quantity: formatOptionalNumber(extracted?.fuel_quantity),
    price_per_unit: formatOptionalNumber(extracted?.price_per_unit),
    payment_method: extracted?.payment_method ?? history.payment_method ?? '',
    reference_number: extracted?.reference_number ?? '',
    notes: '',
  };
}

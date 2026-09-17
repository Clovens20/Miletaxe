import { convertDistance } from '@/lib/format';
import type { AccountantPackageSummary, PackageExpenseLine, PackageIncomeLine } from '@/features/reports/package';
import type { DistanceUnit, LocalizedString, SupportedLocale } from '@/types/domain';
import { localize } from '@/lib/i18n/localize';

export function lineRef(prefix: string, index: number): string {
  return `${prefix}-${String(index + 1).padStart(3, '0')}`;
}

export function isCompleteExpense(row: PackageExpenseLine): boolean {
  return row.status === 'complete';
}

export function completeExpenseLines(summary: AccountantPackageSummary): PackageExpenseLine[] {
  return summary.expenses.filter(isCompleteExpense);
}

export function incompleteExpenseLines(summary: AccountantPackageSummary): PackageExpenseLine[] {
  return summary.expenses.filter((row) => !isCompleteExpense(row));
}

export function isCompleteMileageDay(row: AccountantPackageSummary['daily_mileage'][number]): boolean {
  if (typeof row.complete === 'boolean') return row.complete;
  return row.start != null && row.end != null && row.distance != null;
}

export function incompleteMileageDays(summary: AccountantPackageSummary) {
  return summary.daily_mileage.filter((row) => !isCompleteMileageDay(row));
}

export type MonthlyBucket = {
  month: string;
  expenses: number;
  expenseCount: number;
  income: number;
  incomeCount: number;
  distance: number;
  dayCount: number;
};

export function monthlyBuckets(summary: AccountantPackageSummary): MonthlyBucket[] {
  const unit = summary.totals.unit as DistanceUnit;
  const map = new Map<string, MonthlyBucket>();
  const bucket = (month: string) => {
    const current = map.get(month) ?? {
      month,
      expenses: 0,
      expenseCount: 0,
      income: 0,
      incomeCount: 0,
      distance: 0,
      dayCount: 0,
    };
    map.set(month, current);
    return current;
  };

  for (const row of completeExpenseLines(summary)) {
    const item = bucket(row.incurred_on.slice(0, 7));
    item.expenses += row.amount;
    item.expenseCount += 1;
  }
  for (const row of summary.income) {
    const item = bucket(row.received_on.slice(0, 7));
    item.income += row.amount;
    item.incomeCount += 1;
  }
  for (const row of summary.daily_mileage) {
    if (!isCompleteMileageDay(row) || row.distance == null) continue;
    const item = bucket(row.date.slice(0, 7));
    item.distance += convertDistance(row.distance, row.unit, unit);
    item.dayCount += 1;
  }

  return [...map.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function groupByMonth<T>(rows: T[], dateOf: (row: T) => string): { month: string; rows: T[] }[] {
  const map = new Map<string, T[]>();
  for (const row of rows) {
    const month = dateOf(row).slice(0, 7);
    const list = map.get(month) ?? [];
    list.push(row);
    map.set(month, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, grouped]) => ({ month, rows: grouped }));
}

export function mileageByVehicle(summary: AccountantPackageSummary) {
  const map = new Map<
    string,
    { vehicle: string; distance: number; days: number; incomplete: number; unit: DistanceUnit }
  >();
  for (const row of summary.daily_mileage) {
    const current = map.get(row.vehicle) ?? {
      vehicle: row.vehicle,
      distance: 0,
      days: 0,
      incomplete: 0,
      unit: row.unit,
    };
    if (isCompleteMileageDay(row) && row.distance != null) {
      current.distance += convertDistance(row.distance, row.unit, current.unit);
      current.days += 1;
    } else {
      current.incomplete += 1;
    }
    map.set(row.vehicle, current);
  }
  return [...map.values()];
}

export function incomeKindKey(kind: PackageIncomeLine['source_kind']): string {
  if (kind === 'platform') return 'income.kindPlatform';
  if (kind === 'invoice') return 'income.kindInvoice';
  if (kind === 'cash') return 'income.kindCash';
  return 'income.kindOther';
}

export const HEADLINE_EXPENSE_CODES = ['fuel', 'vehicle_rental', 'repairs'] as const;

export type HeadlineExpenseCode = (typeof HEADLINE_EXPENSE_CODES)[number];

export type HeadlineExpenseRow = {
  code: string;
  label: string;
  total: number;
  count: number;
  featured: boolean;
};

export function inferExpenseCategoryCode(row: {
  category_code?: string | null;
  code?: string | null;
  category_i18n: LocalizedString | null;
}): string {
  const direct = row.category_code || row.code;
  if (direct) return direct;
  const haystack = `${row.category_i18n?.fr ?? ''} ${row.category_i18n?.en ?? ''}`.toLowerCase();
  if (haystack.includes('carburant') || haystack.includes('essence') || haystack.includes('fuel')) return 'fuel';
  if (haystack.includes('location') || haystack.includes('rental')) return 'vehicle_rental';
  if (haystack.includes('répar') || haystack.includes('repar') || haystack.includes('repair')) return 'repairs';
  if (haystack.includes('entretien') || haystack.includes('vidange') || haystack.includes('maintenance')) {
    return 'maintenance';
  }
  return '';
}

export function headlineExpenseLabel(code: HeadlineExpenseCode, locale: SupportedLocale): string {
  const labels: Record<HeadlineExpenseCode, LocalizedString> = {
    fuel: { fr: 'Essence', en: 'Fuel' },
    vehicle_rental: { fr: 'Location de véhicule', en: 'Vehicle rental' },
    repairs: { fr: 'Réparations', en: 'Repairs' },
  };
  return localize(labels[code], locale);
}

export function headlineExpenseRows(
  summary: AccountantPackageSummary,
  locale: SupportedLocale,
  uncategorized: string,
): HeadlineExpenseRow[] {
  const buckets = new Map<string, { total: number; count: number; label: LocalizedString | null }>();
  const add = (code: string, amount: number, label: LocalizedString | null) => {
    const key = code || 'other';
    const current = buckets.get(key) ?? { total: 0, count: 0, label };
    current.total += amount;
    current.count += 1;
    if (!current.label) current.label = label;
    buckets.set(key, current);
  };

  for (const row of completeExpenseLines(summary)) {
    add(inferExpenseCategoryCode(row), row.amount, row.category_i18n);
  }
  for (const row of summary.rental_days ?? []) {
    add('vehicle_rental', row.amount, { fr: 'Location de véhicule', en: 'Vehicle rental' });
  }

  const featured = HEADLINE_EXPENSE_CODES.map((code) => {
    const match = buckets.get(code);
    return {
      code,
      label: headlineExpenseLabel(code, locale),
      total: match?.total ?? 0,
      count: match?.count ?? 0,
      featured: true,
    };
  });
  const rest = [...buckets.entries()]
    .filter(([code]) => !HEADLINE_EXPENSE_CODES.includes(code as HeadlineExpenseCode))
    .map(([code, row]) => ({
      code,
      label: localize(row.label, locale, uncategorized),
      total: row.total,
      count: row.count,
      featured: false,
    }))
    .sort((a, b) => b.total - a.total);
  return [...featured, ...rest];
}

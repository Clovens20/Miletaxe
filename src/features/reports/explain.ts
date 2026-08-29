import { convertDistance } from '@/lib/format';
import type { AccountantPackageSummary, PackageExpenseLine, PackageIncomeLine } from '@/features/reports/package';
import type { DistanceUnit } from '@/types/domain';

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

export function expensesWithoutReceipt(summary: AccountantPackageSummary): PackageExpenseLine[] {
  return completeExpenseLines(summary).filter((row) => !row.has_receipt);
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

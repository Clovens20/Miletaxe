import { PRODUCT } from '@/lib/constants';
import { todayIso } from '@/lib/format';
import { inInclusiveRange, type ReportPeriod } from '@/features/reports/period';
import { groupDailyMileage, sumPositiveDistance } from '@/features/mileage/engine';
import type { DailyMileage, DistanceSegment, OdometerReading } from '@/features/mileage/types';
import type { ExpenseRecord } from '@/features/expenses/types';
import type { IncomeEntry } from '@/features/income/hooks';
import type { Vehicle } from '@/features/vehicles/hooks';
import type { IntegrityFinding } from '@/features/integrity/engine';
import type { ExpenseCategoryRecord, ReportSectionRecord } from '@/features/tax-config/types';
import type { CurrencyCode, DistanceUnit, LocalizedString } from '@/types/domain';

type ProfileLike = {
  full_name: string | null;
  occupancy: string | null;
  country_code: string | null;
  accountant_name: string | null;
  accountant_email: string | null;
  default_distance_unit?: DistanceUnit | null;
  default_currency?: string | null;
};

export type PackageExpenseLine = {
  id: string;
  incurred_on: string;
  vendor_name: string | null;
  category_i18n: LocalizedString | null;
  amount: number;
  tax_amount: number | null;
  currency: string;
  has_receipt: boolean;
  status: string;
  notes: string | null;
  reference_number: string | null;
  payment_method?: string | null;
};

export type PackageIncomeLine = {
  id: string;
  received_on: string;
  source_name: string;
  source_kind: string;
  amount: number;
  currency: string;
  notes: string | null;
  reference_number: string | null;
};

export type AccountantPackageSummary = {
  disclaimer: string;
  disclaimer_version: string;
  note: string;
  generated_on?: string;
  period: ReportPeriod;
  profile: {
    full_name: string | null;
    occupancy: string | null;
    country_code: string | null;
    accountant_name: string | null;
    accountant_email: string | null;
  };
  sections: { code: string; title_i18n: LocalizedString; notes_i18n?: LocalizedString | null }[];
  totals: {
    recorded_distance: number;
    recorded_expenses: number;
    recorded_income: number;
    expense_count: number;
    income_count: number;
    vehicle_count: number;
    odometer_reading_count: number;
    unit: DistanceUnit;
    currency: string;
  };
  expenses_by_category: { category_i18n: LocalizedString | null; total: number; count: number }[];
  income_by_source: { source_name: string; total: number; count: number }[];
  vehicles: { id: string; nickname: string; make: string | null; model: string | null; plate: string | null }[];
  expenses: PackageExpenseLine[];
  income: PackageIncomeLine[];
  daily_mileage: Array<{
    date: string;
    vehicle: string;
    start: number | null;
    end: number | null;
    distance: number | null;
    unit: DistanceUnit;
    complete?: boolean;
    warnings?: Array<'missing_end' | 'missing_start' | 'invalid_reading'>;
  }>;
  findings: { severity: string; title_i18n: LocalizedString; description_i18n: LocalizedString }[];
};

type BuildInput = {
  period: ReportPeriod;
  profile: ProfileLike | null;
  sections: ReportSectionRecord[];
  vehicles: Vehicle[];
  readings: OdometerReading[];
  segments: DistanceSegment[];
  expenses: ExpenseRecord[];
  income: IncomeEntry[];
  expenseCategories: ExpenseCategoryRecord[];
  findings: IntegrityFinding[];
};

function categoryLabel(categories: ExpenseCategoryRecord[], id: string | null): LocalizedString | null {
  if (!id) return null;
  const row = categories.find((item) => item.id === id);
  return row?.accountant_label_i18n ?? row?.name_i18n ?? null;
}

export function buildAccountantPackage(input: BuildInput): AccountantPackageSummary {
  const { period } = input;
  const unit = (input.profile?.default_distance_unit ?? 'km') as DistanceUnit;
  const currency = (input.profile?.default_currency ?? 'CAD') as CurrencyCode;

  const expenses = input.expenses
    .filter((row) => inInclusiveRange(row.incurred_on, period.start, period.end))
    .sort((a, b) => a.incurred_on.localeCompare(b.incurred_on));
  const completeExpenses = expenses.filter((row) => row.status === 'complete');
  const income = input.income
    .filter((row) => inInclusiveRange(row.received_on, period.start, period.end))
    .sort((a, b) => a.received_on.localeCompare(b.received_on));
  const readings = input.readings.filter((row) => inInclusiveRange(row.recorded_on, period.start, period.end));

  const expensesByCategory = new Map<string, { category_i18n: LocalizedString | null; total: number; count: number }>();
  for (const row of completeExpenses) {
    const key = row.category_id ?? 'uncategorized';
    const current = expensesByCategory.get(key) ?? {
      category_i18n: categoryLabel(input.expenseCategories, row.category_id),
      total: 0,
      count: 0,
    };
    current.total += Number(row.amount);
    current.count += 1;
    expensesByCategory.set(key, current);
  }

  const incomeBySource = new Map<string, { source_name: string; total: number; count: number }>();
  for (const row of income) {
    const key = row.source_name || '—';
    const current = incomeBySource.get(key) ?? { source_name: key, total: 0, count: 0 };
    current.total += Number(row.amount);
    current.count += 1;
    incomeBySource.set(key, current);
  }

  const daily_mileage: AccountantPackageSummary['daily_mileage'] = [];
  for (const vehicle of input.vehicles) {
    const days = groupDailyMileage(input.readings, vehicle.id, vehicle.distance_unit ?? unit).filter((day: DailyMileage) =>
      inInclusiveRange(day.date, period.start, period.end),
    );
    for (const day of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
      daily_mileage.push({
        date: day.date,
        vehicle: vehicle.nickname,
        start: day.start?.reading ?? null,
        end: day.end?.reading ?? null,
        distance: day.distance,
        unit: day.unit,
        complete: day.complete,
        warnings: day.warnings,
      });
    }
  }

  return {
    disclaimer: PRODUCT.positioning,
    disclaimer_version: PRODUCT.disclaimerVersion,
    note: 'Totals are sums of complete user-entered records. No tax is calculated.',
    generated_on: todayIso(),
    period,
    profile: {
      full_name: input.profile?.full_name ?? null,
      occupancy: input.profile?.occupancy ?? null,
      country_code: input.profile?.country_code ?? null,
      accountant_name: input.profile?.accountant_name ?? null,
      accountant_email: input.profile?.accountant_email ?? null,
    },
    sections: input.sections.map((section) => ({
      code: section.code,
      title_i18n: section.title_i18n,
      notes_i18n: section.notes_i18n,
    })),
    totals: {
      recorded_distance: sumPositiveDistance(input.segments, period.start, period.end, unit),
      recorded_expenses: completeExpenses.reduce((sum, row) => sum + Number(row.amount), 0),
      recorded_income: income.reduce((sum, row) => sum + Number(row.amount), 0),
      expense_count: completeExpenses.length,
      income_count: income.length,
      vehicle_count: input.vehicles.length,
      odometer_reading_count: readings.length,
      unit,
      currency,
    },
    expenses_by_category: [...expensesByCategory.values()].sort((a, b) => b.total - a.total),
    income_by_source: [...incomeBySource.values()].sort((a, b) => b.total - a.total),
    vehicles: input.vehicles.map((row) => ({
      id: row.id,
      nickname: row.nickname,
      make: row.make,
      model: row.model,
      plate: row.plate,
    })),
    expenses: expenses.map((row) => ({
      id: row.id,
      incurred_on: row.incurred_on,
      vendor_name: row.vendor_name,
      category_i18n: categoryLabel(input.expenseCategories, row.category_id),
      amount: Number(row.amount),
      tax_amount: row.tax_amount,
      currency: row.currency,
      has_receipt: Boolean(row.receipt_id),
      status: row.status,
      notes: row.notes,
      reference_number: row.reference_number,
      payment_method: row.payment_method,
    })),
    income: income.map((row) => ({
      id: row.id,
      received_on: row.received_on,
      source_name: row.source_name,
      source_kind: row.source_kind,
      amount: Number(row.amount),
      currency: row.currency,
      notes: row.notes,
      reference_number: row.reference_number,
    })),
    daily_mileage,
    findings: input.findings.map((item) => ({
      severity: item.severity,
      title_i18n: item.title_i18n,
      description_i18n: item.description_i18n,
    })),
  };
}

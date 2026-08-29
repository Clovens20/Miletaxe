import { addMonths, lastDayOfMonth, todayIso } from '@/lib/format';
import type { LocalizedString, ReportPeriodKind, ReportingCadence } from '@/types/domain';
import type { TaxYearRecord } from '@/features/tax-config/types';

export type ReportPeriod = {
  kind: ReportPeriodKind;
  start: string;
  end: string;
  tax_year: number;
  half?: 1 | 2;
  month?: string;
  label_i18n: LocalizedString;
};

export function profileReportingCadence(value?: string | null): ReportingCadence {
  return value === 'semiannual' ? 'semiannual' : 'annual';
}

export function currentSemiannualHalf(today: string, taxYear: TaxYearRecord): 1 | 2 {
  const mid = `${taxYear.year}-06-30`;
  return today <= mid ? 1 : 2;
}

export function monthsInTaxYear(taxYear: TaxYearRecord): string[] {
  const months: string[] = [];
  let cursor = taxYear.starts_on.slice(0, 7);
  const end = taxYear.ends_on.slice(0, 7);
  while (cursor <= end) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
    if (months.length > 24) break;
  }
  return months.reverse();
}

export function resolveReportPeriod(
  taxYear: TaxYearRecord,
  input: { kind: ReportPeriodKind; half?: 1 | 2; month?: string },
  today = todayIso(),
): ReportPeriod {
  if (input.kind === 'monthly') {
    const month = input.month ?? (today >= taxYear.starts_on && today <= taxYear.ends_on ? today.slice(0, 7) : taxYear.ends_on.slice(0, 7));
    const start = `${month}-01`;
    const end = lastDayOfMonth(month);
    return {
      kind: 'monthly',
      start: start < taxYear.starts_on ? taxYear.starts_on : start,
      end: end > taxYear.ends_on ? taxYear.ends_on : end,
      tax_year: taxYear.year,
      month,
      label_i18n: {
        fr: `Mois de ${month} · ${taxYear.year}`,
        en: `Month of ${month} · ${taxYear.year}`,
      },
    };
  }

  if (input.kind === 'semiannual') {
    const half = input.half ?? currentSemiannualHalf(today, taxYear);
    const start = half === 1 ? taxYear.starts_on : `${taxYear.year}-07-01`;
    const end = half === 1 ? `${taxYear.year}-06-30` : taxYear.ends_on;
    return {
      kind: 'semiannual',
      start,
      end,
      tax_year: taxYear.year,
      half,
      label_i18n: {
        fr: half === 1 ? `1er semestre ${taxYear.year}` : `2e semestre ${taxYear.year}`,
        en: half === 1 ? `1st half ${taxYear.year}` : `2nd half ${taxYear.year}`,
      },
    };
  }

  return {
    kind: 'annual',
    start: taxYear.starts_on,
    end: taxYear.ends_on,
    tax_year: taxYear.year,
    label_i18n: {
      fr: `Année d'imposition ${taxYear.year}`,
      en: `Tax year ${taxYear.year}`,
    },
  };
}

export function preferredPeriodInput(
  cadence: ReportingCadence,
  taxYear: TaxYearRecord,
  today = todayIso(),
): { kind: ReportPeriodKind; half?: 1 | 2 } {
  if (cadence === 'semiannual') {
    return { kind: 'semiannual', half: currentSemiannualHalf(today, taxYear) };
  }
  return { kind: 'annual' };
}

export function inInclusiveRange(isoDate: string, start: string, end: string): boolean {
  return isoDate >= start && isoDate <= end;
}

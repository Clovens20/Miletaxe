import { todayIso } from '@/lib/format';
import type { TaxYearRecord } from './types';

export function calendarYearNumber(today = todayIso()): number {
  return Number(today.slice(0, 4));
}

export function calendarTaxYear(countryCode: string, year: number, today = todayIso()): TaxYearRecord {
  const starts_on = `${year}-01-01`;
  const ends_on = `${year}-12-31`;
  return {
    id: `${countryCode.toLowerCase()}-${year}`,
    country_code: countryCode,
    year,
    starts_on,
    ends_on,
    is_current: today >= starts_on && today <= ends_on,
  };
}

export function nearbyCalendarYears(countryCode: string, today = todayIso()): TaxYearRecord[] {
  const year = calendarYearNumber(today);
  return [year - 1, year, year + 1].map((item) => calendarTaxYear(countryCode, item, today));
}

export function mergeCalendarTaxYears(
  rows: TaxYearRecord[] | undefined,
  countryCode?: string | null,
  today = todayIso(),
): TaxYearRecord[] {
  const existing = rows ?? [];
  const countries = countryCode
    ? [countryCode]
    : [...new Set([...existing.map((row) => row.country_code), 'CA', 'US'])];
  const byKey = new Map(existing.map((row) => [`${row.country_code}:${row.year}`, row]));
  for (const country of countries) {
    for (const generated of nearbyCalendarYears(country, today)) {
      const key = `${generated.country_code}:${generated.year}`;
      if (!byKey.has(key)) byKey.set(key, generated);
    }
  }
  return [...byKey.values()]
    .map((row) => ({
      ...row,
      is_current: today >= row.starts_on && today <= row.ends_on,
    }))
    .sort((a, b) => b.year - a.year || a.country_code.localeCompare(b.country_code));
}

export function currentTaxYear(
  years?: TaxYearRecord[],
  countryCode?: string | null,
  today = todayIso(),
): TaxYearRecord {
  const merged = mergeCalendarTaxYears(years, countryCode, today);
  return (
    merged.find((row) => today >= row.starts_on && today <= row.ends_on) ??
    calendarTaxYear(countryCode || 'CA', calendarYearNumber(today), today)
  );
}

import { useQuery } from '@tanstack/react-query';

import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { todayIso } from '@/lib/format';
import { localize } from '@/lib/i18n/localize';
import type { LocalizedString, SupportedLocale } from '@/types/domain';
import { calendarYearNumber, mergeCalendarTaxYears } from './years';
import {
  fallbackAssistantChecks,
  fallbackCountries,
  fallbackExpenseCategories,
  fallbackIncomeCategories,
  fallbackIntegrityRules,
  fallbackJurisdictions,
  fallbackMileageMethods,
  fallbackOccupations,
  fallbackReportSections,
  fallbackTaxYears,
} from './fallbackCatalog';
import type {
  AssistantCheckRecord,
  CountryRecord,
  ExpenseCategoryRecord,
  IncomeCategoryRecord,
  IntegrityRuleRecord,
  JurisdictionRecord,
  MileageMethodRecord,
  OccupationRecord,
  ReportSectionRecord,
  TaxYearRecord,
} from './types';

async function readTable<T>(table: string, fallback: T[], filter?: (rows: T[]) => T[]): Promise<T[]> {
  if (isLocalMode()) {
    return filter ? filter(fallback) : fallback;
  }
  const { data, error } = await getSupabase().from(table as never).select('*');
  if (error || !data) {
    return filter ? filter(fallback) : fallback;
  }
  const rows = data as T[];
  return filter ? filter(rows) : rows;
}

const catalogQuery = {
  staleTime: 30 * 60 * 1000,
  gcTime: 60 * 60 * 1000,
};

export function useCountries() {
  return useQuery({
    queryKey: ['catalog', 'countries'],
    queryFn: () => readTable<CountryRecord>('countries', fallbackCountries),
    ...catalogQuery,
  });
}

export function useJurisdictions(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'jurisdictions', countryCode],
    queryFn: () =>
      readTable<JurisdictionRecord>('jurisdictions', fallbackJurisdictions, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
    enabled: Boolean(countryCode),
    ...catalogQuery,
  });
}

export function useTaxYears(countryCode?: string | null) {
  const today = todayIso();
  return useQuery({
    queryKey: ['catalog', 'tax-years', countryCode, calendarYearNumber(today)],
    queryFn: async () => {
      if (!isLocalMode()) {
        await getSupabase().rpc('ensure_calendar_tax_years', {
          p_country: countryCode ?? null,
          p_today: today,
        });
      }
      const rows = await readTable<TaxYearRecord>('tax_years', fallbackTaxYears, (list) =>
        countryCode ? list.filter((row) => row.country_code === countryCode) : list,
      );
      return mergeCalendarTaxYears(rows, countryCode, today);
    },
    ...catalogQuery,
  });
}

export function useOccupations(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'occupations', countryCode],
    queryFn: () =>
      readTable<OccupationRecord>('occupation_catalog', fallbackOccupations, (rows) =>
        rows.filter((row) => !row.country_code || row.country_code === countryCode),
      ),
    ...catalogQuery,
  });
}

export function useExpenseCategories(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'expense-categories', countryCode],
    queryFn: () =>
      readTable<ExpenseCategoryRecord>('expense_category_catalog', fallbackExpenseCategories, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
    enabled: Boolean(countryCode),
    ...catalogQuery,
  });
}

export function useIncomeCategories(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'income-categories', countryCode],
    queryFn: () =>
      readTable<IncomeCategoryRecord>('income_category_catalog', fallbackIncomeCategories, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
    enabled: Boolean(countryCode),
    ...catalogQuery,
  });
}

export function useMileageMethods(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'mileage-methods', countryCode],
    queryFn: () =>
      readTable<MileageMethodRecord>('mileage_rate_methods', fallbackMileageMethods, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
    ...catalogQuery,
  });
}

export function useReportSections(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'report-sections', countryCode],
    queryFn: () =>
      readTable<ReportSectionRecord>('report_section_templates', fallbackReportSections, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
    ...catalogQuery,
  });
}

export function useIntegrityRules() {
  return useQuery({
    queryKey: ['catalog', 'integrity-rules'],
    queryFn: () => readTable<IntegrityRuleRecord>('integrity_rule_definitions', fallbackIntegrityRules),
    ...catalogQuery,
  });
}

export function useAssistantChecks() {
  return useQuery({
    queryKey: ['catalog', 'assistant-checks'],
    queryFn: () => readTable<AssistantCheckRecord>('assistant_check_definitions', fallbackAssistantChecks),
    ...catalogQuery,
  });
}

export { calendarYearNumber, currentTaxYear } from './years';

export function labelOf(
  value: { name_i18n: LocalizedString } | null | undefined,
  locale: SupportedLocale,
): string {
  return localize(value?.name_i18n, locale);
}

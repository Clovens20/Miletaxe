import { useQuery } from '@tanstack/react-query';

import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { localize } from '@/lib/i18n/localize';
import type { LocalizedString, SupportedLocale } from '@/types/domain';
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

export function useCountries() {
  return useQuery({
    queryKey: ['catalog', 'countries'],
    queryFn: () => readTable<CountryRecord>('countries', fallbackCountries),
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
  });
}

export function useTaxYears(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'tax-years', countryCode],
    queryFn: () =>
      readTable<TaxYearRecord>('tax_years', fallbackTaxYears, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
  });
}

export function useOccupations(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'occupations', countryCode],
    queryFn: () =>
      readTable<OccupationRecord>('occupation_catalog', fallbackOccupations, (rows) =>
        rows.filter((row) => !row.country_code || row.country_code === countryCode),
      ),
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
  });
}

export function useMileageMethods(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'mileage-methods', countryCode],
    queryFn: () =>
      readTable<MileageMethodRecord>('mileage_rate_methods', fallbackMileageMethods, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
  });
}

export function useReportSections(countryCode?: string | null) {
  return useQuery({
    queryKey: ['catalog', 'report-sections', countryCode],
    queryFn: () =>
      readTable<ReportSectionRecord>('report_section_templates', fallbackReportSections, (rows) =>
        countryCode ? rows.filter((row) => row.country_code === countryCode) : rows,
      ),
  });
}

export function useIntegrityRules() {
  return useQuery({
    queryKey: ['catalog', 'integrity-rules'],
    queryFn: () => readTable<IntegrityRuleRecord>('integrity_rule_definitions', fallbackIntegrityRules),
  });
}

export function useAssistantChecks() {
  return useQuery({
    queryKey: ['catalog', 'assistant-checks'],
    queryFn: () => readTable<AssistantCheckRecord>('assistant_check_definitions', fallbackAssistantChecks),
  });
}

export function currentTaxYear(years: TaxYearRecord[] | undefined): TaxYearRecord | undefined {
  return years?.find((year) => year.is_current) ?? years?.[0];
}

export function labelOf(
  value: { name_i18n: LocalizedString } | null | undefined,
  locale: SupportedLocale,
): string {
  return localize(value?.name_i18n, locale);
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';
import { useTranslation } from 'react-i18next';

import { PRODUCT } from '@/lib/constants';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { todayIso } from '@/lib/format';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { useAuth } from '@/features/auth/AuthProvider';
import { useVehicles } from '@/features/vehicles/hooks';
import { useDistanceSegments, useOdometerReadings } from '@/features/mileage/hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useIncome } from '@/features/income/hooks';
import { useIntegrityFindings } from '@/features/integrity/engine';
import { useRentalDays } from '@/features/rental/hooks';
import {
  currentTaxYear,
  useExpenseCategories,
  useReportSections,
  useTaxYears,
} from '@/features/tax-config/hooks';
import type { TaxYearRecord } from '@/features/tax-config/types';
import { buildAccountantPackage, type AccountantPackageSummary } from '@/features/reports/package';
import { downloadAccountantPackage, shareAccountantPackage } from '@/features/reports/share';
import {
  preferredPeriodInput,
  profileReportingCadence,
  resolveReportPeriod,
  type ReportPeriod,
} from '@/features/reports/period';
import type { TableRow } from '@/types/database';
import type { ReportPeriodKind, SupportedLocale } from '@/types/domain';

export type TaxReport = TableRow<'tax_reports'>;

export type GenerateReportInput = {
  kind: ReportPeriodKind;
  half?: 1 | 2;
  month?: string;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function persistedTaxYear(year: TaxYearRecord): Promise<TaxYearRecord> {
  if (isLocalMode() || UUID_RE.test(year.id)) return year;
  const { data } = await getSupabase().rpc('ensure_calendar_tax_years', {
    p_country: year.country_code,
    p_today: todayIso(),
  });
  const match = (Array.isArray(data) ? data : []).find(
    (row) =>
      row &&
      typeof row === 'object' &&
      'year' in row &&
      Number((row as TaxYearRecord).year) === year.year &&
      (row as TaxYearRecord).country_code === year.country_code,
  ) as TaxYearRecord | undefined;
  return match ?? year;
}

export function reportSummary(row: TaxReport): AccountantPackageSummary | null {
  const raw = row.summary;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as AccountantPackageSummary;
}

export function useReports() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['reports', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return local.reports as TaxReport[];
      }
      const { data, error } = await getSupabase()
        .from('tax_reports')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as TaxReport[];
    },
  });
}

export function usePreferredReportPeriod(): ReportPeriod | undefined {
  const { profile } = useAuth();
  const years = useTaxYears(profile?.country_code);
  const taxYear = currentTaxYear(years.data, profile?.country_code);
  if (!taxYear) return undefined;
  return resolveReportPeriod(taxYear, preferredPeriodInput(profileReportingCadence(profile?.reporting_cadence), taxYear));
}

export function useGenerateReport() {
  const { user, profile } = useAuth();
  const years = useTaxYears(profile?.country_code);
  const sections = useReportSections(profile?.country_code);
  const expenseCategories = useExpenseCategories(profile?.country_code);
  const vehicles = useVehicles();
  const readings = useOdometerReadings();
  const segments = useDistanceSegments();
  const expenses = useExpenses();
  const income = useIncome();
  const rentalDays = useRentalDays();
  const findings = useIntegrityFindings();
  const taxYear = currentTaxYear(years.data, profile?.country_code);
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input?: GenerateReportInput) => {
      if (!user) throw new Error('missing_context');
      const year = await persistedTaxYear(taxYear);
      const cadence = profileReportingCadence(profile?.reporting_cadence);
      const period = resolveReportPeriod(year, input ?? preferredPeriodInput(cadence, year));
      const summary = buildAccountantPackage({
        period,
        profile,
        sections: sections.data ?? [],
        vehicles: vehicles.data ?? [],
        readings: readings.data ?? [],
        segments: segments.data ?? [],
        expenses: expenses.data ?? [],
        income: income.data ?? [],
        rentalDays: rentalDays.data ?? [],
        expenseCategories: expenseCategories.data ?? [],
        findings: findings.data ?? [],
      });

      const row = {
        user_id: user.id,
        tax_year_id: year.id,
        jurisdiction_id: profile?.jurisdiction_id,
        status: 'generated' as const,
        generated_at: new Date().toISOString(),
        package_path: null,
        summary,
        disclaimer_version: PRODUCT.disclaimerVersion,
      };

      if (isLocalMode()) {
        const saved = { id: await newId(), created_at: new Date().toISOString(), ...row };
        await updateLocal((state) => ({ ...state, reports: [saved, ...state.reports] }));
        return saved as TaxReport;
      }

      const { data, error } = await getSupabase().from('tax_reports').insert(row).select('*').single();
      if (error) throw error;
      return data as TaxReport;
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ['reports'] }),
  });
}

export function useAccountantPdfActions(
  summary: AccountantPackageSummary | null | undefined,
  locale: SupportedLocale,
  country?: string | null,
) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<'share' | 'download' | null>(null);

  const share = async () => {
    if (!summary) return;
    setBusy('share');
    try {
      await shareAccountantPackage(summary, locale, country);
    } catch {
      Alert.alert(t('common.error'), t('reports.shareFailed'));
    } finally {
      setBusy(null);
    }
  };

  const download = async () => {
    if (!summary) return;
    setBusy('download');
    try {
      const result = await downloadAccountantPackage(summary, locale, country);
      if (result === 'saved') {
        Alert.alert(t('reports.downloadPdf'), t('reports.downloadOk'));
      }
    } catch {
      Alert.alert(t('common.error'), t('reports.downloadFailed'));
    } finally {
      setBusy(null);
    }
  };

  return {
    sharing: busy === 'share',
    downloading: busy === 'download',
    share,
    download,
  };
}

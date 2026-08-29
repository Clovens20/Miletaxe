import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { PRODUCT } from '@/lib/constants';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { useAuth } from '@/features/auth/AuthProvider';
import { useVehicles } from '@/features/vehicles/hooks';
import { useDistanceSegments, useOdometerReadings } from '@/features/mileage/hooks';
import { useExpenses } from '@/features/expenses/hooks';
import { useIncome } from '@/features/income/hooks';
import { useIntegrityFindings } from '@/features/integrity/engine';
import {
  currentTaxYear,
  useExpenseCategories,
  useReportSections,
  useTaxYears,
} from '@/features/tax-config/hooks';
import { buildAccountantPackage, type AccountantPackageSummary } from '@/features/reports/package';
import {
  preferredPeriodInput,
  profileReportingCadence,
  resolveReportPeriod,
  type ReportPeriod,
} from '@/features/reports/period';
import type { TableRow } from '@/types/database';
import type { ReportPeriodKind } from '@/types/domain';

export type TaxReport = TableRow<'tax_reports'>;

export type GenerateReportInput = {
  kind: ReportPeriodKind;
  half?: 1 | 2;
  month?: string;
};

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
  const taxYear = currentTaxYear(years.data);
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
  const findings = useIntegrityFindings();
  const taxYear = currentTaxYear(years.data);
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input?: GenerateReportInput) => {
      if (!user || !taxYear) throw new Error('missing_context');
      const cadence = profileReportingCadence(profile?.reporting_cadence);
      const period = resolveReportPeriod(taxYear, input ?? preferredPeriodInput(cadence, taxYear));
      const summary = buildAccountantPackage({
        period,
        profile,
        sections: sections.data ?? [],
        vehicles: vehicles.data ?? [],
        readings: readings.data ?? [],
        segments: segments.data ?? [],
        expenses: expenses.data ?? [],
        income: income.data ?? [],
        expenseCategories: expenseCategories.data ?? [],
        findings: findings.data ?? [],
      });

      const row = {
        user_id: user.id,
        tax_year_id: taxYear.id,
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

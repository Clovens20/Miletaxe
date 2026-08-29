import { startOfMonthIso, todayIso } from '@/lib/format';
import { useAuth } from '@/features/auth/AuthProvider';
import { useExpenses, useReceipts } from '@/features/expenses/hooks';
import { useIncome } from '@/features/income/hooks';
import { useIntegrityFindings } from '@/features/integrity/engine';
import { groupDailyMileage } from '@/features/mileage/engine';
import { useMileageDashboard, useOdometerReadings } from '@/features/mileage/hooks';
import { currentTaxYear, useTaxYears } from '@/features/tax-config/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import type { CurrencyCode, DistanceUnit } from '@/types/domain';
import { completenessScore, completenessTone, dateOfTimestamp, inDateRange } from './engine';

export function useHomeDashboard() {
  const { profile } = useAuth();
  const years = useTaxYears(profile?.country_code);
  const taxYear = currentTaxYear(years.data);
  const unit = (profile?.default_distance_unit ?? 'km') as DistanceUnit;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const today = todayIso();
  const monthStart = startOfMonthIso(today);
  const vehicles = useVehicles();
  const readings = useOdometerReadings();
  const expenses = useExpenses();
  const income = useIncome();
  const receipts = useReceipts();
  const findings = useIntegrityFindings();
  const mileage = useMileageDashboard();

  const yearStart = taxYear?.starts_on;
  const yearEnd = taxYear?.ends_on;

  const vehiclesToday = (vehicles.data ?? []).map((vehicle) => {
    const days = groupDailyMileage(readings.data ?? [], vehicle.id, vehicle.distance_unit ?? unit);
    const todayDay = days.find((row) => row.date === today);
    return {
      vehicle_id: vehicle.id,
      nickname: vehicle.nickname,
      unit: (vehicle.distance_unit ?? unit) as DistanceUnit,
      start: todayDay?.start?.reading ?? null,
      end: todayDay?.end?.reading ?? null,
      distance: todayDay?.distance != null && todayDay.distance > 0 ? todayDay.distance : null,
      missingStart: !todayDay?.start,
      missingEnd: Boolean(todayDay?.start && !todayDay.end),
    };
  });

  const todayDistance = vehiclesToday.reduce((sum, row) => sum + (row.distance ?? 0), 0);

  const yearExpenses = (expenses.data ?? [])
    .filter((row) => row.status === 'complete' && inDateRange(row.incurred_on, yearStart, yearEnd))
    .reduce((sum, row) => sum + Number(row.amount), 0);
  const yearIncome = (income.data ?? [])
    .filter((row) => inDateRange(row.received_on, yearStart, yearEnd))
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const keptReceipts = (receipts.data ?? []).filter((row) => row.review_status !== 'discarded');
  const receiptCount = keptReceipts.filter((row) => inDateRange(dateOfTimestamp(row.captured_at), yearStart, yearEnd)).length;

  const todayExpenseCount = (expenses.data ?? []).filter((row) => row.incurred_on === today).length;
  const todayIncomeCount = (income.data ?? []).filter((row) => row.received_on === today).length;
  const todayReceiptCount = keptReceipts.filter((row) => dateOfTimestamp(row.captured_at) === today).length;

  const completeness = completenessScore(findings.data ?? []);

  return {
    isLoading:
      vehicles.isLoading ||
      readings.isLoading ||
      expenses.isLoading ||
      income.isLoading ||
      receipts.isLoading ||
      findings.isLoading,
    taxYear,
    unit,
    currency,
    today,
    monthStart,
    todayDistance,
    monthDistance: mileage.month,
    yearExpenses,
    yearIncome,
    receiptCount,
    todayExpenseCount,
    todayIncomeCount,
    todayReceiptCount,
    vehiclesToday,
    findings: findings.data ?? [],
    completeness,
    tone: completenessTone(completeness.score, completeness.blocking),
    hasVehicles: Boolean(vehicles.data?.length),
  };
}

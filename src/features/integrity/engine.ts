import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { consecutiveValidReadings } from '@/features/mileage/engine';
import { useOdometerReadings } from '@/features/mileage/hooks';
import { useExpenses, useReceipts } from '@/features/expenses/hooks';
import { useIncome } from '@/features/income/hooks';
import { useExpenseCategories, useIntegrityRules } from '@/features/tax-config/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { addDays, convertDistance, todayIso } from '@/lib/format';
import type { IntegritySeverity, LocalizedString } from '@/types/domain';

export type IntegrityFinding = {
  id: string;
  rule_code: string;
  severity: IntegritySeverity;
  title_i18n: LocalizedString;
  description_i18n: LocalizedString;
  entity_type: string;
  entity_id?: string;
};

export function useIntegrityFindings() {
  const { user, profile } = useAuth();
  const rules = useIntegrityRules();
  const vehicles = useVehicles();
  const readings = useOdometerReadings();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const income = useIncome();
  const categories = useExpenseCategories(profile?.country_code);

  return useQuery({
    queryKey: [
      'integrity',
      user?.id,
      rules.data,
      vehicles.data,
      readings.data,
      expenses.data,
      receipts.data,
      income.data,
      categories.data,
    ],
    enabled: Boolean(user?.id && rules.data),
    queryFn: () => {
      const findings: IntegrityFinding[] = [];
      const ruleMap = Object.fromEntries((rules.data ?? []).map((rule) => [rule.code, rule]));
      const today = todayIso();
      const weekAgo = addDays(today, -7);

      const push = (code: string, entityType: string, entityId?: string) => {
        const rule = ruleMap[code];
        if (!rule) return;
        findings.push({
          id: `${code}:${entityId ?? 'global'}`,
          rule_code: code,
          severity: rule.severity,
          title_i18n: rule.title_i18n,
          description_i18n: rule.description_i18n,
          entity_type: entityType,
          entity_id: entityId,
        });
      };

      if (!(vehicles.data ?? []).length) {
        push('missing_vehicle', 'vehicle');
      }

      for (const vehicle of vehicles.data ?? []) {
        const vehicleReadings = (readings.data ?? []).filter((row) => row.vehicle_id === vehicle.id);
        const accepted = consecutiveValidReadings(vehicleReadings);
        if (!accepted.length) {
          push('missing_opening_odometer', 'odometer', vehicle.id);
        }
        const todayRows = vehicleReadings.filter((row) => row.recorded_on === today);
        const startedToday = todayRows.some((row) => row.kind === 'start_of_day' && row.is_valid);
        const endedToday = todayRows.some((row) => row.kind === 'end_of_day' && row.is_valid);
        const recentHabit = vehicleReadings.some(
          (row) => row.recorded_on >= weekAgo && row.recorded_on < today && row.is_valid,
        );
        if (!startedToday && (endedToday || recentHabit)) {
          push('missing_start_of_day', 'odometer', vehicle.id);
        }
        if (startedToday && !endedToday) {
          push('missing_end_of_day', 'odometer', vehicle.id);
        }
        for (const row of vehicleReadings) {
          if (!row.is_valid || row.validation_status === 'invalid') {
            push('invalid_odometer_reading', 'odometer', row.id);
          }
        }
        for (let index = 1; index < accepted.length; index += 1) {
          const prev = accepted[index - 1];
          const curr = accepted[index];
          if (!prev || !curr) continue;
          const prevKm = convertDistance(Number(prev.reading), prev.unit, 'km');
          const currKm = convertDistance(Number(curr.reading), curr.unit, 'km');
          if (currKm < prevKm) {
            push('odometer_not_monotonic', 'odometer', curr.id);
          }
        }
      }

      const categoryById = Object.fromEntries((categories.data ?? []).map((row) => [row.id, row]));
      for (const expense of expenses.data ?? []) {
        if (!expense.category_id) push('expense_missing_category', 'expense', expense.id);
        const category = expense.category_id ? categoryById[expense.category_id] : undefined;
        if (category?.requires_receipt && !expense.receipt_id) {
          push('expense_missing_receipt', 'expense', expense.id);
        }
        if (expense.status === 'needs_review') {
          push('expense_needs_review', 'expense', expense.id);
        }
        if (!expense.vendor_name?.trim() || expense.status === 'draft') {
          push('expense_incomplete', 'expense', expense.id);
        }
      }

      for (const receipt of receipts.data ?? []) {
        if (receipt.review_status === 'pending') {
          push('receipt_pending_review', 'expense', receipt.id);
        }
      }

      for (const entry of income.data ?? []) {
        if (!entry.source_name?.trim()) push('income_missing_source', 'income', entry.id);
      }

      const hasHistory =
        Boolean((readings.data ?? []).length) ||
        Boolean((expenses.data ?? []).length) ||
        Boolean((income.data ?? []).length);
      const recentActivity =
        (readings.data ?? []).some((row) => row.recorded_on >= weekAgo) ||
        (expenses.data ?? []).some((row) => row.incurred_on >= weekAgo) ||
        (income.data ?? []).some((row) => row.received_on >= weekAgo);
      if ((vehicles.data ?? []).length && hasHistory && !recentActivity) {
        push('missing_activity', 'record');
      }

      const rank = { blocking: 0, warning: 1, info: 2 };
      return findings.sort((a, b) => rank[a.severity] - rank[b.severity]);
    },
  });
}

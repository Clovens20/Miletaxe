import { addMonths, startOfMonthIso, todayIso } from '@/lib/format';
import type { RecurringChargeDraft, RecurringPlan } from './types';

export function recurringChargeRef(planId: string, month: string): string {
  return `recurring:internet:${planId}:${month}`;
}

export function isRecurringChargeRef(value: string | null | undefined): boolean {
  return Boolean(value?.startsWith('recurring:internet:'));
}

export function planIsActive(plan: RecurringPlan, today = todayIso()): boolean {
  return !plan.ended_on || plan.ended_on >= today;
}

export function monthsCoveredByPlan(plan: RecurringPlan, today = todayIso()): string[] {
  const first = startOfMonthIso(plan.started_on).slice(0, 7);
  const lastDay = plan.ended_on && plan.ended_on < today ? plan.ended_on : today;
  const last = lastDay.slice(0, 7);
  if (first > last) return [];
  const months: string[] = [];
  let cursor = first;
  while (cursor <= last) {
    months.push(cursor);
    cursor = addMonths(cursor, 1);
    if (months.length > 120) break;
  }
  return months;
}

export function missingInternetCharges(
  plans: RecurringPlan[],
  expenses: Array<{ reference_number?: string | null }>,
  today = todayIso(),
): RecurringChargeDraft[] {
  const seen = new Set(
    expenses.map((row) => row.reference_number).filter((value): value is string => Boolean(value)),
  );
  const drafts: RecurringChargeDraft[] = [];
  for (const plan of plans) {
    if (plan.kind !== 'internet') continue;
    for (const month of monthsCoveredByPlan(plan, today)) {
      const reference_number = recurringChargeRef(plan.id, month);
      if (seen.has(reference_number)) continue;
      drafts.push({
        plan_id: plan.id,
        vendor_name: plan.vendor_name,
        amount: Number(plan.amount),
        currency: plan.currency,
        incurred_on: `${month}-01`,
        month,
        reference_number,
        notes: plan.notes,
      });
    }
  }
  return drafts;
}

export function activeInternetPlan(plans: RecurringPlan[], today = todayIso()): RecurringPlan | undefined {
  return plans
    .filter((row) => row.kind === 'internet' && planIsActive(row, today))
    .sort((a, b) => b.started_on.localeCompare(a.started_on))[0];
}

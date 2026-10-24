export const RECURRING_KINDS = ['internet', 'insurance'] as const;
export type RecurringKind = (typeof RECURRING_KINDS)[number];

export type RecurringPlan = {
  id: string;
  user_id: string;
  kind: RecurringKind;
  vendor_name: string;
  amount: number;
  currency: string;
  started_on: string;
  ended_on: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RecurringChargeDraft = {
  plan_id: string;
  kind: RecurringKind;
  vendor_name: string;
  amount: number;
  currency: string;
  incurred_on: string;
  month: string;
  reference_number: string;
  notes: string | null;
};

export function isRecurringKind(value: string): value is RecurringKind {
  return (RECURRING_KINDS as readonly string[]).includes(value);
}

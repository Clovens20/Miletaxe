import type { PaymentMethod } from './types';

type Translate = (key: string) => string;

export const paymentMethodOptions = (t: Translate): { value: PaymentMethod; label: string }[] => [
  { value: 'cash', label: t('expenses.payCash') },
  { value: 'credit', label: t('expenses.payCredit') },
  { value: 'debit', label: t('expenses.payDebit') },
  { value: 'platform', label: t('expenses.payPlatform') },
  { value: 'other', label: t('expenses.payOther') },
];

export function paymentMethodLabel(value: string | null | undefined, t: Translate): string {
  const match = paymentMethodOptions(t).find((row) => row.value === value);
  return match?.label ?? value ?? '';
}

export function expenseStatusLabel(status: string, t: Translate): string {
  if (status === 'draft') return t('expenses.statusDraft');
  if (status === 'needs_review') return t('expenses.statusReview');
  return t('expenses.statusComplete');
}

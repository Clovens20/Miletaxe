import type { PaymentMethod, ReceiptRecord } from './types';

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

function isOpaqueToken(value: string): boolean {
  const base = value.trim().replace(/\.[A-Za-z0-9]{2,5}$/, '');
  return (
    /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i.test(base) ||
    /^[0-9a-f]{16,}$/i.test(base)
  );
}

function isTechnicalLabel(value: string): boolean {
  const trimmed = value.trim();
  if (isOpaqueToken(trimmed)) return true;
  return /\.(jpe?g|png|heic|webp|pdf)$/i.test(trimmed) && !/\s/.test(trimmed);
}

function isoDay(value: string | null | undefined): string | null {
  if (!value) return null;
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : null;
}

/** Montant affiché seulement s’il a été lu comme total, sans inventer de chiffre. */
export function reliableReceiptTotal(
  receipt: Pick<ReceiptRecord, 'ocr_payload'>,
): { amount: number; currency: string | null } | null {
  const extraction = receipt.ocr_payload;
  const total = extraction?.total;
  if (total == null || !Number.isFinite(total) || total <= 0) return null;
  const field = extraction?.field_confidence?.total ?? extraction?.field_confidence?.amount;
  if (field != null && field < 0.6) return null;
  const currency = extraction?.currency?.trim().toUpperCase();
  return { amount: total, currency: currency && /^[A-Z]{3}$/.test(currency) ? currency : null };
}

export type PendingReceiptListCopy = {
  title: string;
  subtitle: string;
};

/** Présentation de liste. Le nom de fichier d’origine n’est pas modifié. */
export function pendingReceiptListCopy(
  receipt: Pick<ReceiptRecord, 'ocr_payload'>,
  labels: { unknown: string; review: string; checkDetails: string },
  formatWhen: (isoDate: string) => string,
  formatAmount: (amount: number, currency: string | null) => string,
): PendingReceiptListCopy {
  const merchant = receipt.ocr_payload?.merchant_name?.trim();
  const knownMerchant = Boolean(merchant && !isTechnicalLabel(merchant));
  const day = isoDay(receipt.ocr_payload?.incurred_on);
  const total = reliableReceiptTotal(receipt);
  const meta = [day ? formatWhen(day) : null, total ? formatAmount(total.amount, total.currency) : null]
    .filter(Boolean)
    .join(' · ');
  const status = knownMerchant ? labels.review : labels.checkDetails;
  return {
    title: knownMerchant && merchant ? merchant : labels.unknown,
    subtitle: meta ? `${meta}\n${status}` : status,
  };
}

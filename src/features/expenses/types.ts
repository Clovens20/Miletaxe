import type { ExpenseStatus, OcrStatus, RevisionSource } from '@/types/domain';
import type { ReceiptExtraction } from './ocr/provider';

export const CANONICAL_EXPENSE_CODES = [
  'fuel',
  'maintenance',
  'repairs',
  'parking',
  'tolls',
  'insurance',
  'vehicle',
  'office',
  'phone',
  'other',
] as const;

export type CanonicalExpenseCode = (typeof CANONICAL_EXPENSE_CODES)[number];

export type PaymentMethod = 'cash' | 'credit' | 'debit' | 'platform' | 'other';

export type ReceiptReviewStatus = 'pending' | 'reviewed' | 'discarded';

export type ReceiptRecord = {
  id: string;
  user_id: string;
  storage_path: string;
  original_filename: string | null;
  mime_type: string | null;
  captured_at: string;
  ocr_status: OcrStatus;
  ocr_payload: ReceiptExtraction | null;
  ocr_provider: string | null;
  review_status: ReceiptReviewStatus;
  reviewed_at: string | null;
};

export type ExpenseRecord = {
  id: string;
  user_id: string;
  vehicle_id: string | null;
  receipt_id: string | null;
  category_id: string | null;
  vendor_name: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  amount: number;
  currency: string;
  incurred_on: string;
  incurred_time: string | null;
  fuel_quantity: number | null;
  price_per_unit: number | null;
  payment_method: string | null;
  reference_number: string | null;
  notes: string | null;
  status: ExpenseStatus;
  finalized_at: string | null;
  extracted_payload: ReceiptExtraction | null;
  created_at: string;
  updated_at: string;
};

export type ExpenseRevision = {
  id: string;
  expense_id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  reason: string;
  source: RevisionSource;
  created_at: string;
};

export type ExpenseFilters = {
  query?: string;
  categoryId?: string;
  month?: string;
  status?: ExpenseStatus | 'all';
};

export type CategoryTotal = {
  category_id: string | null;
  code?: string;
  total: number;
  count: number;
};

export type MonthlyExpenseSummary = {
  month: string;
  total: number;
  tax_total: number;
  count: number;
  by_category: CategoryTotal[];
};

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import type { ExpenseStatus, OcrStatus, RevisionSource } from '@/types/domain';
import { extractionDiffs } from './engine';
import {
  EdgeFunctionReceiptOcrProvider,
  UnconfiguredReceiptOcrProvider,
  mergeReceiptExtractions,
  emptyReceiptExtraction,
  normalizeReceiptExtraction,
  type ReceiptExtraction,
} from './ocr/provider';
import { isOwnedReceiptPath, uploadReceiptOriginal } from './storage';
import type { ExpenseRecord, ExpenseRevision, ReceiptRecord } from './types';

export type Expense = ExpenseRecord;
export type Receipt = ReceiptRecord;

function asNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asString(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

function hydrateReceipt(row: Record<string, unknown>): ReceiptRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    storage_path: String(row.storage_path),
    original_filename: asString(row.original_filename),
    mime_type: asString(row.mime_type),
    captured_at: String(row.captured_at ?? new Date().toISOString()),
    ocr_status: (row.ocr_status as OcrStatus) ?? 'pending',
    ocr_payload: row.ocr_payload ? normalizeReceiptExtraction(row.ocr_payload) : null,
    ocr_provider: asString(row.ocr_provider),
    review_status: (row.review_status as ReceiptRecord['review_status']) ?? 'pending',
    reviewed_at: asString(row.reviewed_at),
  };
}

function hydrateExpense(row: Record<string, unknown>): ExpenseRecord {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    vehicle_id: asString(row.vehicle_id),
    receipt_id: asString(row.receipt_id),
    category_id: asString(row.category_id),
    vendor_name: asString(row.vendor_name),
    subtotal: asNumber(row.subtotal),
    tax_amount: asNumber(row.tax_amount),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'CAD'),
    incurred_on: String(row.incurred_on),
    incurred_time: asString(row.incurred_time),
    fuel_quantity: asNumber(row.fuel_quantity),
    price_per_unit: asNumber(row.price_per_unit),
    payment_method: asString(row.payment_method),
    reference_number: asString(row.reference_number),
    notes: asString(row.notes),
    status: (row.status as ExpenseStatus) ?? 'complete',
    finalized_at: asString(row.finalized_at),
    extracted_payload: row.extracted_payload ? normalizeReceiptExtraction(row.extracted_payload) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

export function useExpenses() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['expenses', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.expenses as Record<string, unknown>[])
          .map(hydrateExpense)
          .sort((a, b) => `${b.incurred_on}${b.incurred_time ?? ''}`.localeCompare(`${a.incurred_on}${a.incurred_time ?? ''}`));
      }
      const { data, error } = await getSupabase()
        .from('expenses')
        .select('*')
        .eq('user_id', user!.id)
        .order('incurred_on', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(hydrateExpense);
    },
  });
}

export function useExpense(id?: string) {
  const expenses = useExpenses();
  return { ...expenses, data: expenses.data?.find((row) => row.id === id) };
}

export function useReceipts() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['receipts', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.receipts as Record<string, unknown>[])
          .map(hydrateReceipt)
          .filter((row) => row.user_id === user!.id)
          .sort((a, b) => b.captured_at.localeCompare(a.captured_at));
      }
      const { data, error } = await getSupabase()
        .from('receipts')
        .select('*')
        .eq('user_id', user!.id)
        .order('captured_at', { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(hydrateReceipt);
    },
  });
}

export function useReceipt(id?: string | null) {
  const receipts = useReceipts();
  return { ...receipts, data: id ? receipts.data?.find((row) => row.id === id) : undefined };
}

export function useExpenseTotal(yearStart?: string, yearEnd?: string) {
  const expenses = useExpenses();
  const total = (expenses.data ?? [])
    .filter((row) => {
      if (row.status !== 'complete') return false;
      if (!yearStart || !yearEnd) return true;
      return row.incurred_on >= yearStart && row.incurred_on <= yearEnd;
    })
    .reduce((sum, row) => sum + Number(row.amount), 0);
  return { ...expenses, total };
}

async function insertExpenseRevisions(rows: Omit<ExpenseRevision, 'id' | 'created_at'>[]) {
  if (!rows.length) return;
  const saved: ExpenseRevision[] = [];
  for (const row of rows) {
    saved.push({
      ...row,
      id: await newId(),
      created_at: new Date().toISOString(),
    });
  }
  if (isLocalMode()) {
    await updateLocal((state) => ({
      ...state,
      expense_revisions: [...saved, ...state.expense_revisions],
    }));
    return;
  }
  const { error } = await getSupabase().from('expense_revisions').insert(
    saved.map(({ id: _id, created_at: _created, ...row }) => row),
  );
  if (error) throw error;
}

export function useExpenseRevisions(expenseId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['expense-revisions', user?.id, expenseId],
    enabled: Boolean(user?.id && expenseId),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.expense_revisions as ExpenseRevision[])
          .filter((row) => row.expense_id === expenseId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
      const { data, error } = await getSupabase()
        .from('expense_revisions')
        .select('*')
        .eq('user_id', user!.id)
        .eq('expense_id', expenseId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ExpenseRevision[];
    },
  });
}

export function useCreateReceipt() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { localUri: string; filename?: string }) => {
      if (!user) throw new Error('unauthenticated');
      const uploaded = await uploadReceiptOriginal(user.id, input.localUri);
      const now = new Date().toISOString();
      const row: ReceiptRecord = {
        id: await newId(),
        user_id: user.id,
        storage_path: uploaded.path,
        original_filename: input.filename ?? null,
        mime_type: uploaded.mimeType,
        captured_at: now,
        ocr_status: 'pending',
        ocr_payload: null,
        ocr_provider: null,
        review_status: 'pending',
        reviewed_at: null,
      };
      if (isLocalMode()) {
        await updateLocal((state) => ({ ...state, receipts: [row, ...state.receipts] }));
        return row;
      }
      const { id: _id, ...insertable } = row;
      const { data, error } = await getSupabase().from('receipts').insert(insertable).select('*').single();
      if (error) throw error;
      return hydrateReceipt(data as Record<string, unknown>);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

export function useReceiptOcr() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      imageUri: string;
      storagePath?: string;
      receiptId?: string;
      seedExtraction?: ReceiptExtraction;
    }) => {
      if (user && input.storagePath && !isOwnedReceiptPath(user.id, input.storagePath)) {
        throw new Error('receipt_path_not_owned');
      }
      const name =
        process.env.EXPO_PUBLIC_RECEIPT_OCR_FUNCTION_NAME ??
        process.env.EXPO_PUBLIC_OCR_FUNCTION_NAME ??
        'extract-receipt';
      let extraction: ReceiptExtraction = input.seedExtraction ?? emptyReceiptExtraction('none');
      if (!isLocalMode() && (input.storagePath || input.receiptId)) {
        const provider = new EdgeFunctionReceiptOcrProvider(async ({ storagePath, receiptId }) => {
          const { data, error } = await getSupabase().functions.invoke(name, {
            body: { storage_path: storagePath, receipt_id: receiptId },
          });
          if (error || !data?.extraction) {
            return { ...emptyReceiptExtraction('edge-failed'), raw: { error: String(error) } };
          }
          return normalizeReceiptExtraction(data.extraction, 'edge');
        });
        const edge = await provider.extract(input);
        extraction = mergeReceiptExtractions(edge, extraction);
      } else if (!input.seedExtraction) {
        extraction = await new UnconfiguredReceiptOcrProvider().extract(input);
      }

      if (input.receiptId) {
        const ocr_status: OcrStatus = extraction.confidence > 0 ? 'complete' : 'skipped';
        if (isLocalMode()) {
          await updateLocal((state) => ({
            ...state,
            receipts: state.receipts.map((row) =>
              (row as { id: string }).id === input.receiptId
                ? { ...row, ocr_status, ocr_payload: extraction, ocr_provider: extraction.provider }
                : row,
            ),
          }));
        } else if (user) {
          await getSupabase()
            .from('receipts')
            .update({ ocr_status, ocr_payload: extraction, ocr_provider: extraction.provider })
            .eq('id', input.receiptId)
            .eq('user_id', user.id);
        }
      }
      return extraction;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

export type FinalizeExpenseInput = {
  receipt_id: string;
  vendor_name: string;
  amount: number;
  subtotal?: number | null;
  tax_amount?: number | null;
  category_id: string;
  category_code?: string;
  incurred_on: string;
  incurred_time?: string | null;
  currency: string;
  vehicle_id?: string | null;
  fuel_quantity?: number | null;
  price_per_unit?: number | null;
  payment_method?: string | null;
  reference_number?: string | null;
  notes?: string | null;
  extracted?: ReceiptExtraction | null;
};

export function useFinalizeExpense() {
  const { user, profile } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: FinalizeExpenseInput) => {
      if (!user) throw new Error('unauthenticated');
      const now = new Date().toISOString();
      const row: ExpenseRecord = {
        id: await newId(),
        user_id: user.id,
        vehicle_id: input.vehicle_id || null,
        receipt_id: input.receipt_id,
        category_id: input.category_id,
        vendor_name: input.vendor_name,
        subtotal: input.subtotal ?? null,
        tax_amount: input.tax_amount ?? null,
        amount: input.amount,
        currency: input.currency || profile?.default_currency || 'CAD',
        incurred_on: input.incurred_on,
        incurred_time: input.incurred_time || null,
        fuel_quantity: input.fuel_quantity ?? null,
        price_per_unit: input.price_per_unit ?? null,
        payment_method: input.payment_method || null,
        reference_number: input.reference_number || null,
        notes: input.notes || null,
        status: 'complete',
        finalized_at: now,
        extracted_payload: input.extracted ?? null,
        created_at: now,
        updated_at: now,
      };

      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          expenses: [row, ...state.expenses],
          receipts: state.receipts.map((item) =>
            (item as { id: string }).id === input.receipt_id
              ? { ...item, review_status: 'reviewed', reviewed_at: now }
              : item,
          ),
        }));
      } else {
        const { id: _id, ...insertable } = row;
        const { data, error } = await getSupabase().from('expenses').insert(insertable).select('*').single();
        if (error) throw error;
        row.id = (data as { id: string }).id;
        const { error: receiptError } = await getSupabase()
          .from('receipts')
          .update({ review_status: 'reviewed', reviewed_at: now })
          .eq('id', input.receipt_id)
          .eq('user_id', user.id);
        if (receiptError) throw receiptError;
      }

      const diffs = extractionDiffs(input.extracted, {
        vendor_name: row.vendor_name,
        incurred_on: row.incurred_on,
        incurred_time: row.incurred_time,
        subtotal: row.subtotal,
        tax_amount: row.tax_amount,
        amount: row.amount,
        currency: row.currency,
        category_code: input.category_code,
        fuel_quantity: row.fuel_quantity,
        price_per_unit: row.price_per_unit,
        payment_method: row.payment_method,
        reference_number: row.reference_number,
      });
      await insertExpenseRevisions(
        diffs.map((diff) => ({
          expense_id: row.id,
          user_id: user.id,
          field_name: diff.field,
          old_value: diff.extracted,
          new_value: diff.confirmed,
          reason: 'ocr_corrected_before_save',
          source: 'ocr_confirm' as RevisionSource,
        })),
      );
      return row;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['expenses'] });
      client.invalidateQueries({ queryKey: ['receipts'] });
      client.invalidateQueries({ queryKey: ['expense-revisions'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
    },
  });
}

export function useUpdateExpense() {
  const { user } = useAuth();
  const client = useQueryClient();
  const expenses = useExpenses();
  return useMutation({
    mutationFn: async (input: Partial<FinalizeExpenseInput> & { id: string; reason?: string; source?: RevisionSource }) => {
      if (!user) throw new Error('unauthenticated');
      const current = expenses.data?.find((row) => row.id === input.id);
      if (!current) throw new Error('not_found');
      const patch: Partial<ExpenseRecord> = {
        vendor_name: input.vendor_name ?? current.vendor_name,
        amount: input.amount ?? current.amount,
        subtotal: input.subtotal === undefined ? current.subtotal : input.subtotal,
        tax_amount: input.tax_amount === undefined ? current.tax_amount : input.tax_amount,
        category_id: input.category_id ?? current.category_id,
        incurred_on: input.incurred_on ?? current.incurred_on,
        incurred_time: input.incurred_time === undefined ? current.incurred_time : input.incurred_time,
        currency: input.currency ?? current.currency,
        vehicle_id: input.vehicle_id === undefined ? current.vehicle_id : input.vehicle_id,
        fuel_quantity: input.fuel_quantity === undefined ? current.fuel_quantity : input.fuel_quantity,
        price_per_unit: input.price_per_unit === undefined ? current.price_per_unit : input.price_per_unit,
        payment_method: input.payment_method === undefined ? current.payment_method : input.payment_method,
        reference_number: input.reference_number === undefined ? current.reference_number : input.reference_number,
        notes: input.notes === undefined ? current.notes : input.notes,
        updated_at: new Date().toISOString(),
      };
      const diffs: Array<{ field: string; old_value: string; new_value: string }> = [];
      const keys: Array<keyof ExpenseRecord> = [
        'vendor_name',
        'amount',
        'subtotal',
        'tax_amount',
        'category_id',
        'incurred_on',
        'incurred_time',
        'currency',
        'vehicle_id',
        'fuel_quantity',
        'price_per_unit',
        'payment_method',
        'reference_number',
        'notes',
      ];
      for (const key of keys) {
        if (String(current[key] ?? '') !== String(patch[key] ?? '')) {
          diffs.push({
            field: key,
            old_value: String(current[key] ?? ''),
            new_value: String(patch[key] ?? ''),
          });
        }
      }
      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          expenses: state.expenses.map((row) =>
            (row as { id: string }).id === current.id ? { ...row, ...patch } : row,
          ),
        }));
      } else {
        const { error } = await getSupabase()
          .from('expenses')
          .update(patch)
          .eq('id', current.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
      await insertExpenseRevisions(
        diffs.map((diff) => ({
          expense_id: current.id,
          user_id: user.id,
          field_name: diff.field,
          old_value: diff.old_value,
          new_value: diff.new_value,
          reason: input.reason ?? 'user_correction',
          source: input.source ?? ('user' as RevisionSource),
        })),
      );
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['expenses'] });
      client.invalidateQueries({ queryKey: ['expense-revisions'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
    },
  });
}

export function useDiscardReceipt() {
  const { user } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (receiptId: string) => {
      if (!user) throw new Error('unauthenticated');
      const now = new Date().toISOString();
      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          receipts: state.receipts.map((row) =>
            (row as { id: string }).id === receiptId
              ? { ...row, review_status: 'discarded', reviewed_at: now }
              : row,
          ),
        }));
        return;
      }
      const { error } = await getSupabase()
        .from('receipts')
        .update({ review_status: 'discarded', reviewed_at: now })
        .eq('id', receiptId)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['receipts'] });
    },
  });
}

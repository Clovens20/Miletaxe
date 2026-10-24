import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import type { ExpenseRecord } from '@/features/expenses/types';
import { useExpenseCategories } from '@/features/tax-config/hooks';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { todayIso } from '@/lib/format';
import {
  activePlanOf,
  categoryCodeForRecurringKind,
  missingRecurringCharges,
} from './engine';
import type { RecurringKind, RecurringPlan } from './types';

function hydratePlan(row: Record<string, unknown>): RecurringPlan {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    kind: (row.kind as RecurringKind) || 'internet',
    vendor_name: String(row.vendor_name ?? ''),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'CAD'),
    started_on: String(row.started_on),
    ended_on: row.ended_on ? String(row.ended_on) : null,
    notes: row.notes ? String(row.notes) : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

function defaultNote(kind: RecurringKind, locale?: string | null): string {
  const en = locale === 'en';
  if (kind === 'insurance') return en ? 'Monthly insurance' : 'Assurance mensuelle';
  return en ? 'Monthly internet plan' : 'Forfait internet mensuel';
}

export function useRecurringPlans() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['recurring-plans', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return ((local.recurring_plans ?? []) as Record<string, unknown>[])
          .map(hydratePlan)
          .sort((a, b) => b.started_on.localeCompare(a.started_on));
      }
      const { data, error } = await getSupabase()
        .from('recurring_plans')
        .select('*')
        .eq('user_id', user!.id)
        .order('started_on', { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(hydratePlan);
    },
  });
}

export function useSaveRecurringPlan() {
  const { user, profile } = useAuth();
  const plans = useRecurringPlans();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      kind: RecurringKind;
      vendor_name: string;
      amount: number;
      started_on: string;
      notes?: string | null;
    }) => {
      if (!user) throw new Error('unauthenticated');
      const today = todayIso();
      if (activePlanOf(plans.data ?? [], input.kind, today)) {
        throw new Error('active_plan_exists');
      }
      const now = new Date().toISOString();
      const row: RecurringPlan = {
        id: await newId(),
        user_id: user.id,
        kind: input.kind,
        vendor_name: input.vendor_name.trim(),
        amount: input.amount,
        currency: profile?.default_currency ?? 'CAD',
        started_on: input.started_on,
        ended_on: null,
        notes: input.notes?.trim() || null,
        created_at: now,
        updated_at: now,
      };
      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          recurring_plans: [row, ...(state.recurring_plans ?? [])],
        }));
        return row;
      }
      const { id: _id, ...insertable } = row;
      const { data, error } = await getSupabase().from('recurring_plans').insert(insertable).select('*').single();
      if (error) throw error;
      return hydratePlan(data as Record<string, unknown>);
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['recurring-plans'] });
    },
  });
}

/** @deprecated Prefer useSaveRecurringPlan */
export function useSaveInternetPlan() {
  const save = useSaveRecurringPlan();
  return {
    ...save,
    mutateAsync: (input: { vendor_name: string; amount: number; started_on: string; notes?: string | null }) =>
      save.mutateAsync({ ...input, kind: 'internet' }),
  };
}

export function useUpdateRecurringPlan() {
  const { user } = useAuth();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; vendor_name: string; amount: number }) => {
      if (!user) throw new Error('unauthenticated');
      const now = new Date().toISOString();
      const patch = {
        vendor_name: input.vendor_name.trim(),
        amount: input.amount,
        updated_at: now,
      };
      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          recurring_plans: (state.recurring_plans ?? []).map((row) =>
            (row as { id: string }).id === input.id ? { ...row, ...patch } : row,
          ),
        }));
        return;
      }
      const { error } = await getSupabase()
        .from('recurring_plans')
        .update(patch)
        .eq('id', input.id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['recurring-plans'] });
      client.invalidateQueries({ queryKey: ['expenses'] });
    },
  });
}

export function useEndRecurringPlan() {
  const { user } = useAuth();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; ended_on: string }) => {
      if (!user) throw new Error('unauthenticated');
      const now = new Date().toISOString();
      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          recurring_plans: (state.recurring_plans ?? []).map((row) =>
            (row as { id: string }).id === input.id
              ? { ...row, ended_on: input.ended_on, updated_at: now }
              : row,
          ),
        }));
        return;
      }
      const { error } = await getSupabase()
        .from('recurring_plans')
        .update({ ended_on: input.ended_on, updated_at: now })
        .eq('id', input.id)
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['recurring-plans'] });
    },
  });
}

/** @deprecated Prefer useEndRecurringPlan */
export function useEndInternetPlan() {
  return useEndRecurringPlan();
}

export function useEnsureRecurringCharges() {
  const { user, profile } = useAuth();
  const plans = useRecurringPlans();
  const categories = useExpenseCategories(profile?.country_code);
  const client = useQueryClient();
  const running = useRef(false);

  useEffect(() => {
    if (!user || !plans.data?.length || running.current) return;
    if (profile?.country_code && categories.isLoading) return;
    const currency = profile?.default_currency ?? 'CAD';

    const run = async () => {
      running.current = true;
      try {
        let expenses: Array<{ reference_number?: string | null }> = [];
        if (isLocalMode()) {
          const local = await loadLocal();
          expenses = local.expenses as Array<{ reference_number?: string | null }>;
        } else {
          const { data, error } = await getSupabase()
            .from('expenses')
            .select('reference_number')
            .eq('user_id', user.id)
            .like('reference_number', 'recurring:%');
          if (error) return;
          expenses = (data ?? []) as Array<{ reference_number?: string | null }>;
        }

        const missing = missingRecurringCharges(plans.data ?? [], expenses);
        if (!missing.length) return;
        const now = new Date().toISOString();
        const rows: ExpenseRecord[] = [];
        for (const draft of missing) {
          const categoryCode = categoryCodeForRecurringKind(draft.kind);
          const categoryId = (categories.data ?? []).find((row) => row.code === categoryCode)?.id ?? null;
          rows.push({
            id: await newId(),
            user_id: user.id,
            vehicle_id: null,
            receipt_id: null,
            category_id: categoryId,
            vendor_name: draft.vendor_name,
            subtotal: draft.amount,
            tax_amount: null,
            amount: draft.amount,
            currency: draft.currency || currency,
            incurred_on: draft.incurred_on,
            incurred_time: null,
            fuel_quantity: null,
            price_per_unit: null,
            payment_method: null,
            reference_number: draft.reference_number,
            notes: draft.notes || defaultNote(draft.kind, profile?.preferred_locale),
            status: 'complete',
            finalized_at: now,
            extracted_payload: null,
            created_at: now,
            updated_at: now,
          });
        }

        if (isLocalMode()) {
          await updateLocal((state) => ({ ...state, expenses: [...rows, ...state.expenses] }));
        } else {
          const insertable = rows.map(({ id: _id, ...row }) => row);
          const { error } = await getSupabase().from('expenses').insert(insertable);
          if (error && !/duplicate|unique/i.test(error.message ?? '')) return;
        }
        client.invalidateQueries({ queryKey: ['expenses'] });
      } finally {
        running.current = false;
      }
    };

    void run();
  }, [
    categories.data,
    categories.isLoading,
    client,
    plans.data,
    profile?.country_code,
    profile?.default_currency,
    profile?.preferred_locale,
    user,
  ]);
}

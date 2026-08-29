import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { useAuth } from '@/features/auth/AuthProvider';
import type { TableRow } from '@/types/database';
import type { IncomeSourceKind } from '@/types/domain';

export type IncomeEntry = TableRow<'income_entries'>;

export function useIncome() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['income', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.income as IncomeEntry[]).sort((a, b) => b.received_on.localeCompare(a.received_on));
      }
      const { data, error } = await getSupabase()
        .from('income_entries')
        .select('*')
        .eq('user_id', user!.id)
        .order('received_on', { ascending: false });
      if (error) throw error;
      return data as IncomeEntry[];
    },
  });
}

export function useIncomeTotal(yearStart?: string, yearEnd?: string) {
  const income = useIncome();
  const total = (income.data ?? [])
    .filter((row) => {
      if (!yearStart || !yearEnd) return true;
      return row.received_on >= yearStart && row.received_on <= yearEnd;
    })
    .reduce((sum, row) => sum + Number(row.amount), 0);
  return { ...income, total };
}

export function useCreateIncome() {
  const { user, profile } = useAuth();
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      source_name: string;
      amount: number;
      received_on: string;
      source_kind: IncomeSourceKind;
      category_id?: string;
      reference_number?: string;
      notes?: string;
    }) => {
      if (!user) throw new Error('unauthenticated');
      const row = {
        user_id: user.id,
        currency: profile?.default_currency ?? 'CAD',
        ...input,
        category_id: input.category_id ?? null,
        reference_number: input.reference_number ?? null,
        notes: input.notes ?? null,
      };
      if (isLocalMode()) {
        const saved = {
          id: await newId(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          document_path: null,
          ...row,
        };
        await updateLocal((state) => ({ ...state, income: [saved, ...state.income] }));
        return saved as IncomeEntry;
      }
      const { data, error } = await getSupabase().from('income_entries').insert(row).select('*').single();
      if (error) throw error;
      return data as IncomeEntry;
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['income'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
    },
  });
}

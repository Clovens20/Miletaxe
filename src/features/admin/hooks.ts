import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import type { Json } from '@/types/domain';

import type { AdminStats, AdminUserRow } from './types';

const DELETE_FN = process.env.EXPO_PUBLIC_ADMIN_DELETE_FUNCTION_NAME ?? 'admin-delete-user';

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    enabled: !isLocalMode(),
    queryFn: async (): Promise<AdminStats> => {
      const { data, error } = await getSupabase().rpc('admin_project_stats');
      if (error) throw error;
      const row = data as AdminStats | null;
      return {
        users: Number(row?.users ?? 0),
        vehicles: Number(row?.vehicles ?? 0),
        receipts: Number(row?.receipts ?? 0),
        expenses: Number(row?.expenses ?? 0),
        income: Number(row?.income ?? 0),
      };
    },
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    enabled: !isLocalMode(),
    queryFn: async (): Promise<AdminUserRow[]> => {
      const { data, error } = await getSupabase().rpc('admin_list_users');
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
  });
}

export function useAdminDeleteUser() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await getSupabase().functions.invoke(DELETE_FN, {
        body: { userId },
      });
      if (error) throw error;
      if (!data || typeof data !== 'object' || !('ok' in data) || !(data as { ok: unknown }).ok) {
        const code = data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : 'delete_failed';
        throw new Error(code);
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin'] });
    },
  });
}

export function useAdminCatalog<T>(table: string, order: string) {
  return useQuery({
    queryKey: ['admin', 'catalog', table],
    enabled: !isLocalMode(),
    queryFn: async (): Promise<T[]> => {
      const { data, error } = await getSupabase().from(table as never).select('*').order(order as never);
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

async function invalidateCatalog(client: ReturnType<typeof useQueryClient>, table?: string) {
  if (table) await client.invalidateQueries({ queryKey: ['admin', 'catalog', table] });
  else await client.invalidateQueries({ queryKey: ['admin', 'catalog'] });
  await client.invalidateQueries({ queryKey: ['catalog'] });
}

export function useAdminCatalogUpdate(table: string, idColumn: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await getSupabase()
        .from(table as never)
        .update(patch as never)
        .eq(idColumn as never, id as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateCatalog(client, table);
    },
  });
}

export function useAdminCatalogInsert(table: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (row: Record<string, unknown>) => {
      const { error } = await getSupabase().from(table as never).insert(row as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateCatalog(client, table);
    },
  });
}

export function useAdminCatalogDelete(table: string, idColumn: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await getSupabase()
        .from(table as never)
        .delete()
        .eq(idColumn as never, id as never);
      if (error) throw error;
    },
    onSuccess: async () => {
      await invalidateCatalog(client, table);
    },
  });
}

export type LocalizedPatch = { fr?: string; en?: string };

export function mergeLocalized(current: Json | null | undefined, next: LocalizedPatch): { fr: string; en: string } {
  const base = current && typeof current === 'object' && !Array.isArray(current) ? (current as Record<string, unknown>) : {};
  return {
    fr: next.fr ?? (typeof base.fr === 'string' ? base.fr : ''),
    en: next.en ?? (typeof base.en === 'string' ? base.en : ''),
  };
}

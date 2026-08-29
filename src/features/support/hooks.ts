import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase, isLocalMode, isSupabaseConfigured } from '@/lib/supabase/client';

import type { SupportAgentRow, SupportInboxRow, SupportMessage, SupportThread, SupportTopic } from './types';

const HIRE_FN = process.env.EXPO_PUBLIC_ADMIN_HIRE_FUNCTION_NAME ?? 'admin-hire-agent';

export function useSupportTopics() {
  return useQuery({
    queryKey: ['support', 'topics'],
    enabled: !isLocalMode(),
    queryFn: async (): Promise<SupportTopic[]> => {
      const { data, error } = await getSupabase().from('support_topics').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []) as SupportTopic[];
    },
  });
}

export function useSupportInbox() {
  return useQuery({
    queryKey: ['support', 'inbox'],
    enabled: !isLocalMode(),
    queryFn: async (): Promise<SupportInboxRow[]> => {
      const { data, error } = await getSupabase().rpc('support_inbox');
      if (error) throw error;
      return (data ?? []) as SupportInboxRow[];
    },
  });
}

export function useMySupportThreads() {
  return useQuery({
    queryKey: ['support', 'mine'],
    enabled: !isLocalMode(),
    queryFn: async (): Promise<SupportThread[]> => {
      const { data, error } = await getSupabase()
        .from('support_threads')
        .select('*')
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportThread[];
    },
  });
}

export function useSupportMessages(threadId?: string) {
  return useQuery({
    queryKey: ['support', 'messages', threadId],
    enabled: !isLocalMode() && Boolean(threadId),
    queryFn: async (): Promise<SupportMessage[]> => {
      const { data, error } = await getSupabase()
        .from('support_messages')
        .select('*')
        .eq('thread_id', threadId as string)
        .order('created_at');
      if (error) throw error;
      return (data ?? []) as SupportMessage[];
    },
  });
}

export function useSupportThread(threadId?: string) {
  return useQuery({
    queryKey: ['support', 'thread', threadId],
    enabled: !isLocalMode() && Boolean(threadId),
    queryFn: async (): Promise<SupportThread | null> => {
      const { data, error } = await getSupabase()
        .from('support_threads')
        .select('*')
        .eq('id', threadId as string)
        .maybeSingle();
      if (error) throw error;
      return (data as SupportThread | null) ?? null;
    },
  });
}

export function useStartSupportThread() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (body: string) => {
      const { data: userData } = await getSupabase().auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('unauthenticated');
      const { data: thread, error: threadError } = await getSupabase()
        .from('support_threads')
        .insert({ user_id: userId, status: 'open' })
        .select('*')
        .single();
      if (threadError || !thread) throw threadError ?? new Error('thread_failed');
      const { error: messageError } = await getSupabase().from('support_messages').insert({
        thread_id: (thread as SupportThread).id,
        author_id: userId,
        author_role: 'user',
        body,
      });
      if (messageError) throw messageError;
      await getSupabase()
        .from('support_threads')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', (thread as SupportThread).id);
      return thread as SupportThread;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['support'] });
    },
  });
}

export function useSendSupportMessage(role: 'user' | 'agent' | 'admin') {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ threadId, body }: { threadId: string; body: string }) => {
      const { data: userData } = await getSupabase().auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error('unauthenticated');
      const { error } = await getSupabase().from('support_messages').insert({
        thread_id: threadId,
        author_id: userId,
        author_role: role,
        body,
      });
      if (error) throw error;
      await getSupabase().from('support_threads').update({ last_message_at: new Date().toISOString() }).eq('id', threadId);
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['support'] });
    },
  });
}

export function useUpdateSupportThread() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
      const { error } = await getSupabase().from('support_threads').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['support'] });
    },
  });
}

export function useAdminAgents() {
  return useQuery({
    queryKey: ['admin', 'agents'],
    enabled: !isLocalMode(),
    queryFn: async (): Promise<SupportAgentRow[]> => {
      const { data, error } = await getSupabase().rpc('admin_list_agents');
      if (error) throw error;
      return (data ?? []) as SupportAgentRow[];
    },
  });
}

export type HireAgentResult = {
  emailed?: boolean;
  temporaryPassword?: string;
};

export function useHireAgent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      fullName?: string;
      phone?: string;
      action?: 'hire' | 'revoke';
    }): Promise<HireAgentResult> => {
      const { data, error } = await getSupabase().functions.invoke(HIRE_FN, { body: payload });
      if (error) throw error;
      if (!data || typeof data !== 'object' || !('ok' in data) || !(data as { ok: unknown }).ok) {
        const code =
          data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : 'hire_failed';
        throw new Error(code);
      }
      const result = data as { emailed?: unknown; temporaryPassword?: unknown };
      return {
        emailed: result.emailed === true,
        temporaryPassword: typeof result.temporaryPassword === 'string' ? result.temporaryPassword : undefined,
      };
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['admin', 'agents'] });
    },
  });
}

export function useSupportTopicWrite() {
  const client = useQueryClient();
  return {
    insert: useMutation({
      mutationFn: async (row: Record<string, unknown>) => {
        const { error } = await getSupabase().from('support_topics').insert(row);
        if (error) throw error;
      },
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: ['support', 'topics'] });
      },
    }),
    update: useMutation({
      mutationFn: async ({ id, patch }: { id: string; patch: Record<string, unknown> }) => {
        const { error } = await getSupabase().from('support_topics').update(patch).eq('id', id);
        if (error) throw error;
      },
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: ['support', 'topics'] });
      },
    }),
    remove: useMutation({
      mutationFn: async (id: string) => {
        const { error } = await getSupabase().from('support_topics').delete().eq('id', id);
        if (error) throw error;
      },
      onSuccess: async () => {
        await client.invalidateQueries({ queryKey: ['support', 'topics'] });
      },
    }),
  };
}

export function SupportRealtime({ enabled = true }: { enabled?: boolean }) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || isLocalMode()) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const bump = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        void client.invalidateQueries({ queryKey: ['support'] });
      }, 200);
    };
    const supabase = getSupabase();
    const channel = supabase
      .channel('support-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_threads' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_topics' }, bump)
      .subscribe();
    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [client, enabled]);
  return null;
}

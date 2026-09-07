import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { getSupabase, isLocalMode, isSupabaseConfigured } from '@/lib/supabase/client';

import type {
  SupportAgentRow,
  SupportAuthorRole,
  SupportInboxRow,
  SupportMessage,
  SupportThread,
  SupportTopic,
} from './types';

const HIRE_FN = process.env.EXPO_PUBLIC_ADMIN_HIRE_FUNCTION_NAME ?? 'admin-hire-agent';

export function useSupportTopics(enabled = true) {
  return useQuery({
    queryKey: ['support', 'topics'],
    enabled: enabled && !isLocalMode(),
    queryFn: async (): Promise<SupportTopic[]> => {
      const { data, error } = await getSupabase().from('support_topics').select('*').order('sort_order');
      if (error) throw error;
      return (data ?? []) as SupportTopic[];
    },
  });
}

export function useSupportInbox(enabled = true) {
  return useQuery({
    queryKey: ['support', 'inbox'],
    enabled: enabled && !isLocalMode(),
    refetchInterval: enabled ? 15_000 : false,
    queryFn: async (): Promise<SupportInboxRow[]> => {
      const { data, error } = await getSupabase().rpc('support_inbox');
      if (error) throw error;
      return (data ?? []) as SupportInboxRow[];
    },
  });
}

export function staffRepliedLast(thread: SupportThread) {
  return thread.last_author_role === 'agent' || thread.last_author_role === 'admin';
}

export function useUnreadSupportReplies() {
  const threads = useMySupportThreads();
  const count = (threads.data ?? []).filter(staffRepliedLast).length;
  return { ...threads, count };
}

export function useMySupportThreads() {
  return useQuery({
    queryKey: ['support', 'mine'],
    enabled: !isLocalMode(),
    refetchInterval: 15_000,
    queryFn: async (): Promise<SupportThread[]> => {
      const client = getSupabase();
      const nested = await client
        .from('support_threads')
        .select('*, support_messages(body, author_role, created_at)')
        .order('last_message_at', { ascending: false });
      let rows = nested.data ?? [];
      if (nested.error) {
        const fallback = await client.from('support_threads').select('*').order('last_message_at', { ascending: false });
        if (fallback.error) throw fallback.error;
        rows = fallback.data ?? [];
      }
      return rows.map((row) => {
        const raw = row as SupportThread & {
          support_messages?: { body: string; author_role: SupportAuthorRole; created_at: string }[];
        };
        const last = [...(raw.support_messages ?? [])].sort((a, b) => (a.created_at < b.created_at ? 1 : -1))[0];
        return {
          id: raw.id,
          user_id: raw.user_id,
          status: raw.status,
          assigned_agent_id: raw.assigned_agent_id,
          topic_id: raw.topic_id,
          last_message_at: raw.last_message_at,
          last_message: last?.body ?? null,
          last_author_role: last?.author_role ?? null,
        };
      });
    },
  });
}

export function useSupportMessages(threadId?: string) {
  return useQuery({
    queryKey: ['support', 'messages', threadId],
    enabled: !isLocalMode() && Boolean(threadId),
    refetchInterval: 8_000,
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
    refetchInterval: 8_000,
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
      if (role === 'agent' || role === 'admin') {
        void getSupabase().functions.invoke('support-notify-user', { body: { threadId, body } });
      }
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
      const client = getSupabase();
      const listed = await client.functions.invoke(HIRE_FN, { body: { action: 'list' } });
      if (!listed.error && listed.data && typeof listed.data === 'object' && 'ok' in listed.data) {
        const agents = (listed.data as { agents?: unknown }).agents;
        if (Array.isArray(agents)) return agents as SupportAgentRow[];
      }
      const { data, error } = await client.rpc('admin_list_agents');
      if (error) throw new Error(error.message || error.code || 'admin_list_agents');
      return (data ?? []) as SupportAgentRow[];
    },
  });
}

export type HireAgentAction = 'hire' | 'revoke' | 'suspend' | 'unsuspend' | 'reset_password';

export type HireAgentResult = {
  emailed?: boolean;
  temporaryPassword?: string;
  recoveryLink?: string;
};

export function useHireAgent() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      email: string;
      fullName?: string;
      phone?: string;
      action?: HireAgentAction;
    }): Promise<HireAgentResult> => {
      const { data, error } = await getSupabase().functions.invoke(HIRE_FN, { body: payload });
      if (error) throw error;
      if (!data || typeof data !== 'object' || !('ok' in data) || !(data as { ok: unknown }).ok) {
        const code =
          data && typeof data === 'object' && 'error' in data ? String((data as { error: unknown }).error) : 'hire_failed';
        throw new Error(code);
      }
      const result = data as { emailed?: unknown; temporaryPassword?: unknown; recoveryLink?: unknown };
      return {
        emailed: result.emailed === true,
        temporaryPassword: typeof result.temporaryPassword === 'string' ? result.temporaryPassword : undefined,
        recoveryLink: typeof result.recoveryLink === 'string' ? result.recoveryLink : undefined,
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

let supportLiveHolders = 0;
let supportLiveChannel: ReturnType<ReturnType<typeof getSupabase>['channel']> | null = null;
let supportLiveTimer: ReturnType<typeof setTimeout> | undefined;

function ensureSupportLive(invalidate: () => void) {
  if (supportLiveChannel || !isSupabaseConfigured || isLocalMode()) return;
  const supabase = getSupabase();
  const bump = () => {
    clearTimeout(supportLiveTimer);
    supportLiveTimer = setTimeout(invalidate, 200);
  };
  try {
    supportLiveChannel = supabase
      .channel('support-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_threads' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_messages' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'support_topics' }, bump)
      .subscribe();
  } catch {
    supportLiveChannel = null;
  }
}

function releaseSupportLive() {
  supportLiveHolders = Math.max(0, supportLiveHolders - 1);
  if (supportLiveHolders > 0 || !supportLiveChannel) return;
  const supabase = getSupabase();
  const channel = supportLiveChannel;
  supportLiveChannel = null;
  clearTimeout(supportLiveTimer);
  void supabase.removeChannel(channel);
}

export function SupportRealtime({ enabled = true }: { enabled?: boolean }) {
  const client = useQueryClient();
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured || isLocalMode()) return;
    supportLiveHolders += 1;
    ensureSupportLive(() => {
      void client.invalidateQueries({ queryKey: ['support'] });
    });
    return () => releaseSupportLive();
  }, [client, enabled]);
  return null;
}

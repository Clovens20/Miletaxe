import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/AuthProvider';
import { useExpenses, useReceipts, useUpdateExpense } from '@/features/expenses/hooks';
import { useIncome } from '@/features/income/hooks';
import { useOdometerReadings } from '@/features/mileage/hooks';
import { useExpenseCategories, useAssistantChecks } from '@/features/tax-config/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { todayIso } from '@/lib/format';
import { loadLocal, newId, updateLocal } from '@/lib/local/store';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import type {
  AssistantConfidence,
  AssistantRecommendationStatus,
  AssistantSignalSource,
  LocalizedString,
  RevisionSource,
} from '@/types/domain';
import { analyzeRecords } from './engine';
import { EdgeFunctionAssistantProvider, UnconfiguredAssistantProvider } from './provider';
import type {
  AssistantRecommendation,
  AssistantReviewEvent,
  AssistantRun,
  AssistantSignal,
  ProposedPatch,
} from './types';

function asString(value: unknown): string | null {
  if (value == null || value === '') return null;
  return String(value);
}

function hydrateRecommendation(row: Record<string, unknown>): AssistantRecommendation {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    run_id: asString(row.run_id),
    check_id: asString(row.check_id),
    check_code: String(row.check_code),
    fingerprint: String(row.fingerprint),
    entity_type: String(row.entity_type),
    entity_id: asString(row.entity_id),
    related_entity_id: asString(row.related_entity_id),
    confidence: (row.confidence as AssistantConfidence) ?? 'needs_review',
    source: (row.source as AssistantSignalSource) ?? 'deterministic',
    status: (row.status as AssistantRecommendationStatus) ?? 'open',
    title_i18n: (row.title_i18n as LocalizedString) ?? { fr: '' },
    body_i18n: (row.body_i18n as LocalizedString) ?? { fr: '' },
    evidence: (row.evidence as Record<string, unknown>) ?? {},
    proposed_patch: (row.proposed_patch as ProposedPatch | null) ?? null,
    requires_review: true,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  };
}

function hydrateEvent(row: Record<string, unknown>): AssistantReviewEvent {
  return {
    id: String(row.id),
    recommendation_id: String(row.recommendation_id),
    user_id: String(row.user_id),
    action: row.action as AssistantReviewEvent['action'],
    note: asString(row.note),
    patch_applied: (row.patch_applied as Record<string, unknown> | null) ?? null,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

function fromSignal(
  signal: AssistantSignal,
  userId: string,
  runId: string,
  checkId: string | null,
  id: string,
): AssistantRecommendation {
  const now = new Date().toISOString();
  return {
    id,
    user_id: userId,
    run_id: runId,
    check_id: checkId,
    check_code: signal.check_code,
    fingerprint: signal.fingerprint,
    entity_type: signal.entity_type,
    entity_id: signal.entity_id,
    related_entity_id: signal.related_entity_id,
    confidence: signal.confidence,
    source: signal.source,
    status: 'open',
    title_i18n: signal.title_i18n,
    body_i18n: signal.body_i18n,
    evidence: signal.evidence,
    proposed_patch: signal.proposed_patch,
    requires_review: true,
    created_at: now,
    updated_at: now,
  };
}

export function useAssistantRecommendations() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['assistant-recommendations', user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.assistant_recommendations as Record<string, unknown>[]).map(hydrateRecommendation);
      }
      const { data, error } = await getSupabase()
        .from('assistant_recommendations')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(hydrateRecommendation);
    },
  });
}

export function useAssistantRecommendation(id?: string) {
  const rows = useAssistantRecommendations();
  return { ...rows, data: rows.data?.find((row) => row.id === id) };
}

export function useOpenAssistantCount() {
  const rows = useAssistantRecommendations();
  return {
    ...rows,
    count: (rows.data ?? []).filter((row) => row.status === 'open').length,
  };
}

export function useAssistantReviewEvents(recommendationId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['assistant-events', user?.id, recommendationId],
    enabled: Boolean(user?.id && recommendationId),
    queryFn: async () => {
      if (isLocalMode()) {
        const local = await loadLocal();
        return (local.assistant_review_events as Record<string, unknown>[])
          .map(hydrateEvent)
          .filter((row) => row.recommendation_id === recommendationId)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
      }
      const { data, error } = await getSupabase()
        .from('assistant_review_events')
        .select('*')
        .eq('user_id', user!.id)
        .eq('recommendation_id', recommendationId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data as Record<string, unknown>[]).map(hydrateEvent);
    },
  });
}

async function insertEvent(row: Omit<AssistantReviewEvent, 'id' | 'created_at'> & { id?: string }) {
  const saved: AssistantReviewEvent = {
    id: row.id ?? (await newId()),
    created_at: new Date().toISOString(),
    recommendation_id: row.recommendation_id,
    user_id: row.user_id,
    action: row.action,
    note: row.note,
    patch_applied: row.patch_applied,
  };
  if (isLocalMode()) {
    await updateLocal((state) => ({
      ...state,
      assistant_review_events: [saved, ...state.assistant_review_events],
    }));
    return saved;
  }
  const { error } = await getSupabase().from('assistant_review_events').insert({
    recommendation_id: saved.recommendation_id,
    user_id: saved.user_id,
    action: saved.action,
    note: saved.note,
    patch_applied: saved.patch_applied,
  });
  if (error) throw error;
  return saved;
}

export function useRunAssistant() {
  const { user, profile } = useAuth();
  const client = useQueryClient();
  const vehicles = useVehicles();
  const readings = useOdometerReadings();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const income = useIncome();
  const categories = useExpenseCategories(profile?.country_code);
  const checks = useAssistantChecks();
  const isReady =
    Boolean(user) &&
    vehicles.isSuccess &&
    readings.isSuccess &&
    expenses.isSuccess &&
    receipts.isSuccess &&
    income.isSuccess &&
    checks.isSuccess &&
    (!profile?.country_code || categories.isSuccess);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('unauthenticated');
      const signals = analyzeRecords({
        today: todayIso(),
        vehicles: vehicles.data ?? [],
        readings: readings.data ?? [],
        expenses: (expenses.data ?? []).map((row) => ({
          id: row.id,
          category_id: row.category_id,
          vendor_name: row.vendor_name,
          amount: Number(row.amount),
          incurred_on: row.incurred_on,
          receipt_id: row.receipt_id,
          reference_number: row.reference_number,
          status: row.status,
          notes: row.notes,
          extracted_payload: row.extracted_payload,
        })),
        receipts: receipts.data ?? [],
        income: income.data ?? [],
        categories: categories.data ?? [],
        checks: checks.data ?? [],
      });

      let aiSignals: AssistantSignal[] = [];
      const name = process.env.EXPO_PUBLIC_ASSISTANT_FUNCTION_NAME ?? 'review-records';
      if (!isLocalMode()) {
        const provider = new EdgeFunctionAssistantProvider(async () => {
          const { data, error } = await getSupabase().functions.invoke(name, {
            body: { locale: profile?.preferred_locale ?? 'fr' },
          });
          if (error) return { signals: [] };
          return data as { signals?: unknown };
        });
        try {
          aiSignals = await provider.review({ locale: profile?.preferred_locale ?? 'fr' });
        } catch {
          aiSignals = [];
        }
      } else {
        aiSignals = await new UnconfiguredAssistantProvider().review({ locale: 'fr' });
      }

      const merged = [...signals, ...aiSignals];
      const run: AssistantRun = {
        id: await newId(),
        user_id: user.id,
        provider: aiSignals.length ? 'deterministic+ai' : 'deterministic',
        status: 'complete',
        signal_count: merged.length,
        created_at: new Date().toISOString(),
      };

      const existing = !isLocalMode()
        ? await getSupabase()
            .from('assistant_recommendations')
            .select('*')
            .eq('user_id', user.id)
            .then(({ data, error }) => {
              if (error) throw error;
              return (data as Record<string, unknown>[]).map(hydrateRecommendation);
            })
        : ((await loadLocal()).assistant_recommendations as Record<string, unknown>[]).map(hydrateRecommendation);

      const byFp = new Map(existing.map((row) => [row.fingerprint, row]));
      const incoming = new Set(merged.map((row) => row.fingerprint));
      const checkByCode = Object.fromEntries((checks.data ?? []).map((row) => [row.code, row.id]));

      if (isLocalMode()) {
        await updateLocal((state) => ({ ...state, assistant_runs: [run, ...state.assistant_runs] }));
      } else {
        const { id: _id, ...insertable } = run;
        const { data, error } = await getSupabase().from('assistant_runs').insert(insertable).select('id').single();
        if (error) throw error;
        run.id = (data as { id: string }).id;
      }

      const locked = new Set(['dismissed', 'applied', 'confirmed']);
      for (const item of merged) {
        const previous = byFp.get(item.fingerprint);
        if (previous && locked.has(previous.status)) continue;
        const checkIdRaw = checkByCode[item.check_code];
        const checkId = checkIdRaw && /^[0-9a-f-]{36}$/i.test(checkIdRaw) ? checkIdRaw : null;
        if (!previous) {
          const row = fromSignal(item, user.id, run.id, checkId, await newId());
          if (isLocalMode()) {
            await updateLocal((state) => ({
              ...state,
              assistant_recommendations: [row, ...state.assistant_recommendations],
            }));
          } else {
            const { id: _id, ...insertable } = row;
            const { error } = await getSupabase().from('assistant_recommendations').insert(insertable);
            if (error) throw error;
          }
          continue;
        }
        const patch = {
          run_id: run.id,
          confidence: item.confidence,
          source: item.source,
          title_i18n: item.title_i18n,
          body_i18n: item.body_i18n,
          evidence: item.evidence,
          proposed_patch: item.proposed_patch,
          status: 'open' as const,
          updated_at: new Date().toISOString(),
        };
        if (isLocalMode()) {
          await updateLocal((state) => ({
            ...state,
            assistant_recommendations: state.assistant_recommendations.map((row) =>
              (row as { id: string }).id === previous.id ? { ...row, ...patch } : row,
            ),
          }));
        } else {
          const { error } = await getSupabase()
            .from('assistant_recommendations')
            .update(patch)
            .eq('id', previous.id)
            .eq('user_id', user.id);
          if (error) throw error;
        }
      }

      for (const previous of existing) {
        if (previous.status !== 'open' || incoming.has(previous.fingerprint)) continue;
        await insertEvent({
          recommendation_id: previous.id,
          user_id: user.id,
          action: 'obsolete',
          note: 'signal_gone',
          patch_applied: null,
        });
        if (isLocalMode()) {
          await updateLocal((state) => ({
            ...state,
            assistant_recommendations: state.assistant_recommendations.map((row) =>
              (row as { id: string }).id === previous.id ? { ...row, status: 'obsolete' } : row,
            ),
          }));
        } else {
          const { error } = await getSupabase()
            .from('assistant_recommendations')
            .update({ status: 'obsolete' })
            .eq('id', previous.id)
            .eq('user_id', user.id);
          if (error) throw error;
        }
      }

      return { run, count: merged.length };
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['assistant-recommendations'] });
      client.invalidateQueries({ queryKey: ['assistant-events'] });
    },
  });

  return { ...mutation, isReady };
}

export function useReviewAssistantRecommendation() {
  const { user } = useAuth();
  const client = useQueryClient();
  const updateExpense = useUpdateExpense();
  const rows = useAssistantRecommendations();

  return useMutation({
    mutationFn: async (input: {
      id: string;
      action: 'dismissed' | 'confirmed' | 'applied';
      note?: string;
    }) => {
      if (!user) throw new Error('unauthenticated');
      const current = rows.data?.find((row) => row.id === input.id);
      if (!current) throw new Error('not_found');
      if (!current.requires_review) throw new Error('not_reviewable');

      let patchApplied: Record<string, unknown> | null = null;
      if (input.action === 'applied') {
        const patch = current.proposed_patch;
        if (!patch) throw new Error('no_patch');
        if (patch.table === 'expenses' && patch.fields.amount != null) {
          await updateExpense.mutateAsync({
            id: patch.id,
            amount: patch.fields.amount,
            reason: 'assistant_confirmed_suggestion',
            source: 'assistant_confirm' as RevisionSource,
          });
          patchApplied = { table: patch.table, id: patch.id, fields: patch.fields };
        } else {
          throw new Error('unsupported_patch');
        }
      }

      await insertEvent({
        recommendation_id: current.id,
        user_id: user.id,
        action: input.action,
        note: input.note ?? null,
        patch_applied: patchApplied,
      });

      if (isLocalMode()) {
        await updateLocal((state) => ({
          ...state,
          assistant_recommendations: state.assistant_recommendations.map((row) =>
            (row as { id: string }).id === current.id ? { ...row, status: input.action } : row,
          ),
        }));
      } else {
        const { error } = await getSupabase()
          .from('assistant_recommendations')
          .update({ status: input.action })
          .eq('id', current.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['assistant-recommendations'] });
      client.invalidateQueries({ queryKey: ['assistant-events'] });
      client.invalidateQueries({ queryKey: ['expenses'] });
      client.invalidateQueries({ queryKey: ['integrity'] });
    },
  });
}

export function useLogAssistantOpened() {
  const { user } = useAuth();
  const client = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; alreadyOpened: boolean }) => {
      if (!user || input.alreadyOpened) return;
      await insertEvent({
        recommendation_id: input.id,
        user_id: user.id,
        action: 'opened',
        note: null,
        patch_applied: null,
      });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ['assistant-events'] });
    },
  });
}

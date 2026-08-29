import { EncodingType, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import { PRODUCT, STORAGE_BUCKETS } from '@/lib/constants';
import { loadLocal } from '@/lib/local/store';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';

export type AccountExportPayload = {
  exported_at: string;
  product: string;
  disclaimer: string;
  profile: unknown;
  vehicles: unknown[];
  odometer_readings: unknown[];
  distance_segments: unknown[];
  receipts: unknown[];
  expenses: unknown[];
  expense_revisions: unknown[];
  odometer_reading_revisions: unknown[];
  income_entries: unknown[];
  tax_reports: unknown[];
  integrity_findings: unknown[];
  assistant_runs: unknown[];
  assistant_recommendations: unknown[];
  assistant_review_events: unknown[];
};

async function ownedRows(table: string, userId: string): Promise<unknown[]> {
  const { data, error } = await getSupabase().from(table as never).select('*').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []) as unknown[];
}

/** Export JSON du compte connecté (RLS). */
export async function buildAccountExport(userId: string): Promise<AccountExportPayload> {
  const exported_at = new Date().toISOString();
  const disclaimer = PRODUCT.positioning;

  if (isLocalMode()) {
    const local = await loadLocal();
    return {
      exported_at,
      product: PRODUCT.name,
      disclaimer,
      profile: local.profile,
      vehicles: local.vehicles,
      odometer_readings: local.readings,
      distance_segments: local.segments,
      receipts: local.receipts,
      expenses: local.expenses,
      expense_revisions: local.expense_revisions,
      odometer_reading_revisions: local.revisions,
      income_entries: local.income,
      tax_reports: local.reports,
      integrity_findings: [],
      assistant_runs: local.assistant_runs,
      assistant_recommendations: local.assistant_recommendations,
      assistant_review_events: local.assistant_review_events,
    };
  }

  const { data: profile, error: profileError } = await getSupabase()
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) throw profileError;

  const [
    vehicles,
    odometer_readings,
    distance_segments,
    receipts,
    expenses,
    expense_revisions,
    odometer_reading_revisions,
    income_entries,
    tax_reports,
    integrity_findings,
    assistant_runs,
    assistant_recommendations,
    assistant_review_events,
  ] = await Promise.all([
    ownedRows('vehicles', userId),
    ownedRows('odometer_readings', userId),
    ownedRows('distance_segments', userId),
    ownedRows('receipts', userId),
    ownedRows('expenses', userId),
    ownedRows('expense_revisions', userId),
    ownedRows('odometer_reading_revisions', userId),
    ownedRows('income_entries', userId),
    ownedRows('tax_reports', userId),
    ownedRows('integrity_findings', userId),
    ownedRows('assistant_runs', userId),
    ownedRows('assistant_recommendations', userId),
    ownedRows('assistant_review_events', userId),
  ]);

  return {
    exported_at,
    product: PRODUCT.name,
    disclaimer,
    profile,
    vehicles,
    odometer_readings,
    distance_segments,
    receipts,
    expenses,
    expense_revisions,
    odometer_reading_revisions,
    income_entries,
    tax_reports,
    integrity_findings,
    assistant_runs,
    assistant_recommendations,
    assistant_review_events,
  };
}

export function accountExportFilename(exportedAt: string): string {
  return `miletax-donnees-${exportedAt.slice(0, 10)}.json`;
}

export async function shareAccountExport(payload: AccountExportPayload): Promise<void> {
  const filename = accountExportFilename(payload.exported_at);
  const body = JSON.stringify(payload, null, 2);

  if (Platform.OS === 'web') {
    const blob = new Blob([body], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
    return;
  }

  const dest = new File(Paths.cache, filename);
  if (dest.exists) dest.delete();
  dest.write(body, { encoding: EncodingType.UTF8 });

  const available = await Sharing.isAvailableAsync();
  if (!available) return;
  await Sharing.shareAsync(dest.uri, {
    mimeType: 'application/json',
    dialogTitle: filename,
    UTI: 'public.json',
  });
}

export const ACCOUNT_STORAGE_BUCKETS = STORAGE_BUCKETS;

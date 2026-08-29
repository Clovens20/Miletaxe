import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { clearLocal } from '@/lib/local/store';

const FUNCTION_NAME = process.env.EXPO_PUBLIC_DELETE_ACCOUNT_FUNCTION_NAME ?? 'delete-account';

export async function deleteCurrentAccount(): Promise<void> {
  if (isLocalMode()) {
    await clearLocal();
    return;
  }
  const { data, error } = await getSupabase().functions.invoke(FUNCTION_NAME, { body: {} });
  if (error) throw error;
  if (!isDeleted(data)) {
    throw new Error(errorMessage(data));
  }
}

function isDeleted(data: unknown): data is { ok: true } {
  return Boolean(data && typeof data === 'object' && 'ok' in data && (data as { ok: unknown }).ok === true);
}

function errorMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'error' in data && typeof data.error === 'string') {
    return data.error;
  }
  return 'delete_failed';
}

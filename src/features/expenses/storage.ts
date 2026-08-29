import { STORAGE_BUCKETS } from '@/lib/constants';
import { newId } from '@/lib/local/store';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';

export function isLocalPhotoPath(path: string): boolean {
  return (
    path.startsWith('file:') ||
    path.startsWith('content:') ||
    path.startsWith('http') ||
    path.startsWith('ph://') ||
    path.startsWith('data:')
  );
}

export function isOwnedReceiptPath(userId: string, path: string): boolean {
  if (!userId || !path) return false;
  if (isLocalPhotoPath(path)) return true;
  return path.startsWith(`${userId}/`);
}

export async function uploadReceiptOriginal(userId: string, localUri: string): Promise<{ path: string; mimeType: string }> {
  if (isLocalMode()) {
    return { path: localUri, mimeType: 'image/jpeg' };
  }
  const response = await fetch(localUri);
  const blob = await response.blob();
  const mimeType = blob.type || 'image/jpeg';
  const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
  const path = `${userId}/original/${Date.now()}-${await newId()}.${extension}`;
  if (!isOwnedReceiptPath(userId, path)) {
    throw new Error('receipt_path_not_owned');
  }
  const { error } = await getSupabase().storage.from(STORAGE_BUCKETS.receipts).upload(path, blob, {
    contentType: mimeType,
    upsert: false,
  });
  if (error) throw error;
  return { path, mimeType };
}

export async function getReceiptPhotoUrl(path: string, userId?: string): Promise<string | null> {
  if (!path) return null;
  if (userId && !isOwnedReceiptPath(userId, path)) return null;
  if (isLocalPhotoPath(path) || isLocalMode()) return path;
  const { data, error } = await getSupabase().storage.from(STORAGE_BUCKETS.receipts).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

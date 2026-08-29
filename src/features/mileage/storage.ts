import { STORAGE_BUCKETS } from '@/lib/constants';
import { getSupabase, isLocalMode } from '@/lib/supabase/client';
import { newId } from '@/lib/local/store';

export function isLocalPhotoPath(path: string): boolean {
  return (
    path.startsWith('file:') ||
    path.startsWith('content:') ||
    path.startsWith('http') ||
    path.startsWith('ph://') ||
    path.startsWith('data:')
  );
}

export async function uploadOdometerPhoto(userId: string, localUri: string, vehicleId: string): Promise<string> {
  if (isLocalMode()) {
    return localUri;
  }
  const path = `${userId}/${vehicleId}/${Date.now()}-${await newId()}.jpg`;
  const response = await fetch(localUri);
  const blob = await response.blob();
  const { error } = await getSupabase().storage.from(STORAGE_BUCKETS.odometer).upload(path, blob, {
    contentType: blob.type || 'image/jpeg',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function getOdometerPhotoUrl(path: string): Promise<string | null> {
  if (!path) return null;
  if (isLocalPhotoPath(path) || isLocalMode()) return path;
  const { data, error } = await getSupabase().storage.from(STORAGE_BUCKETS.odometer).createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

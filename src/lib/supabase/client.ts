import 'react-native-url-polyfill/auto';

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const CHUNK_SIZE = 1800;

async function getChunked(key: string): Promise<string | null> {
  const chunksRaw = await SecureStore.getItemAsync(`${key}_chunks`);
  if (!chunksRaw) {
    return SecureStore.getItemAsync(key);
  }
  const chunks = Number(chunksRaw);
  const parts: string[] = [];
  for (let index = 0; index < chunks; index += 1) {
    const part = await SecureStore.getItemAsync(`${key}_${index}`);
    if (part) parts.push(part);
  }
  return parts.join('') || null;
}

async function setChunked(key: string, value: string): Promise<void> {
  const chunks = Math.ceil(value.length / CHUNK_SIZE) || 1;
  await SecureStore.setItemAsync(`${key}_chunks`, String(chunks));
  for (let index = 0; index < chunks; index += 1) {
    await SecureStore.setItemAsync(
      `${key}_${index}`,
      value.slice(index * CHUNK_SIZE, (index + 1) * CHUNK_SIZE),
    );
  }
}

async function removeChunked(key: string): Promise<void> {
  const chunksRaw = await SecureStore.getItemAsync(`${key}_chunks`);
  const chunks = chunksRaw ? Number(chunksRaw) : 1;
  await SecureStore.deleteItemAsync(`${key}_chunks`);
  await SecureStore.deleteItemAsync(key);
  for (let index = 0; index < chunks; index += 1) {
    await SecureStore.deleteItemAsync(`${key}_${index}`);
  }
}

const nativeAuthStorage = {
  getItem: getChunked,
  setItem: setChunked,
  removeItem: removeChunked,
};

const webAuthStorage = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

export const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

function isPlaceholderSupabase(url: string, key: string) {
  if (!url || !key) return true;
  if (url.includes('your-project.supabase.co')) return true;
  if (key === 'your-anon-key' || key.startsWith('your-')) return true;
  return false;
}

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey && !isPlaceholderSupabase(supabaseUrl, supabaseAnonKey));
/** Connexion réelle via Supabase. Pas de compte démo hors-ligne. */
export const isUiPreview = false;

let localModeOverride = false;

export function setLocalModeOverride(value: boolean) {
  localModeOverride = value;
}

/** Données locales (sans backend). */
export function isLocalMode() {
  return !isSupabaseConfigured || localModeOverride;
}

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase is not configured');
  }
  if (!client) {
    client = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: Platform.OS === 'web' ? webAuthStorage : nativeAuthStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

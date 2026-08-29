import * as Crypto from 'expo-crypto';
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'miletax.local.v1';

export type LocalState = {
  profile: {
    id: string;
    full_name: string | null;
    preferred_locale: string;
    country_code: string | null;
    jurisdiction_id: string | null;
    occupancy: string | null;
    default_distance_unit: 'km' | 'mi' | null;
    default_currency: string | null;
    accountant_name: string | null;
    accountant_email: string | null;
    reporting_cadence: 'annual' | 'semiannual' | null;
    onboarding_completed_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  vehicles: Record<string, unknown>[];
  readings: Record<string, unknown>[];
  segments: Record<string, unknown>[];
  receipts: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
  income: Record<string, unknown>[];
  reports: Record<string, unknown>[];
  revisions: Record<string, unknown>[];
  expense_revisions: Record<string, unknown>[];
  assistant_runs: Record<string, unknown>[];
  assistant_recommendations: Record<string, unknown>[];
  assistant_review_events: Record<string, unknown>[];
  preview_seed_version?: number;
};

const empty = (): LocalState => ({
  profile: null,
  vehicles: [],
  readings: [],
  segments: [],
  receipts: [],
  expenses: [],
  income: [],
  reports: [],
  revisions: [],
  expense_revisions: [],
  assistant_runs: [],
  assistant_recommendations: [],
  assistant_review_events: [],
});

let memory: LocalState | null = null;

export async function loadLocal(): Promise<LocalState> {
  if (memory) return memory;
  const raw = await AsyncStorage.getItem(KEY);
  memory = raw ? (JSON.parse(raw) as LocalState) : empty();
  if (!memory.revisions) memory.revisions = [];
  if (!memory.expense_revisions) memory.expense_revisions = [];
  if (!memory.assistant_runs) memory.assistant_runs = [];
  if (!memory.assistant_recommendations) memory.assistant_recommendations = [];
  if (!memory.assistant_review_events) memory.assistant_review_events = [];
  return memory;
}

export async function saveLocal(next: LocalState): Promise<void> {
  memory = next;
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function updateLocal(patch: (state: LocalState) => LocalState): Promise<LocalState> {
  const current = await loadLocal();
  const next = patch(current);
  await saveLocal(next);
  return next;
}

/** Vide le stockage local de l'appareil. */
export async function clearLocal(): Promise<void> {
  memory = empty();
  await AsyncStorage.removeItem(KEY);
}

export async function newId(): Promise<string> {
  return Crypto.randomUUID();
}

export function resetLocalMemory() {
  memory = null;
}

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';

import { isStaffUser } from '@/features/admin/staff';
import { getSupabase, isLocalMode, isSupabaseConfigured, isUiPreview, setLocalModeOverride } from '@/lib/supabase/client';
import { setAppLocale } from '@/lib/i18n';
import { queryClient } from '@/lib/query/client';
import { clearLocal, loadLocal, updateLocal } from '@/lib/local/store';
import type { TableRow } from '@/types/database';
import type { SupportedLocale } from '@/types/domain';

export type Profile = TableRow<'profiles'>;

type AuthState = {
  isLoading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  configured: boolean;
  preview: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = async (userId: string) => {
    if (isLocalMode()) {
      const local = await loadLocal();
      setProfile(local.profile as Profile | null);
      if (local.profile?.preferred_locale === 'en' || local.profile?.preferred_locale === 'fr') {
        setAppLocale(local.profile.preferred_locale as SupportedLocale);
      }
      return;
    }
    const { data } = await getSupabase().from('profiles').select('*').eq('id', userId).maybeSingle();
    setProfile((data as Profile | null) ?? null);
    const locale = (data as Profile | null)?.preferred_locale;
    if (locale === 'en' || locale === 'fr') setAppLocale(locale);
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const start = async () => {
      const local = await loadLocal();
      if (local.preview_seed_version || local.profile?.id === '00000000-0000-4000-8000-000000000001') {
        await clearLocal();
      }
      setLocalModeOverride(false);

      if (!isSupabaseConfigured) {
        setIsLoading(false);
        return;
      }

      const client = getSupabase();
      const { data } = await client.auth.getSession();
      setSession(data.session);
      if (data.session?.user.id) await loadProfile(data.session.user.id);
      const { data: listener } = client.auth.onAuthStateChange(async (_event, nextSession) => {
        if (isLocalMode()) return;
        setSession(nextSession);
        if (nextSession?.user.id) await loadProfile(nextSession.user.id);
        else setProfile(null);
      });
      unsubscribe = () => listener.subscription.unsubscribe();
      setIsLoading(false);
    };

    void start();
    return () => unsubscribe?.();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      isLoading,
      session,
      user: session?.user ?? null,
      profile,
      configured: isSupabaseConfigured,
      preview: isUiPreview,
      isStaff: isStaffUser(session?.user),
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) throw new Error('not_configured');
        setLocalModeOverride(false);
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signUp: async (email, password) => {
        if (!isSupabaseConfigured) throw new Error('not_configured');
        setLocalModeOverride(false);
        const { data, error } = await getSupabase().auth.signUp({
          email,
          password,
          options: { data: { preferred_locale: 'fr' } },
        });
        if (error) throw error;
        return { needsEmailConfirmation: !data.session };
      },
      signOut: async () => {
        queryClient.clear();
        setLocalModeOverride(false);
        if (isSupabaseConfigured) await getSupabase().auth.signOut();
        setSession(null);
        setProfile(null);
      },
      resetPassword: async (email) => {
        if (!isSupabaseConfigured) throw new Error('not_configured');
        const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: Linking.createURL('/(auth)/login'),
        });
        if (error) throw error;
      },
      changePassword: async (currentPassword, newPassword) => {
        if (!isSupabaseConfigured) throw new Error('not_configured');
        const email = session?.user?.email;
        if (!email) throw new Error('unauthenticated');
        const client = getSupabase();
        const { error: reauthError } = await client.auth.signInWithPassword({ email, password: currentPassword });
        if (reauthError) throw reauthError;
        const { error } = await client.auth.updateUser({ password: newPassword });
        if (error) throw error;
      },
      refreshProfile: async () => {
        if (session?.user.id) await loadProfile(session.user.id);
      },
      updateProfile: async (patch) => {
        if (!session?.user.id) return;
        if (isLocalMode()) {
          const next = await updateLocal((state) => ({
            ...state,
            profile: state.profile ? { ...state.profile, ...patch, updated_at: new Date().toISOString() } : state.profile,
          }));
          setProfile(next.profile as Profile | null);
          return;
        }
        const { data, error } = await getSupabase()
          .from('profiles')
          .update(patch)
          .eq('id', session.user.id)
          .select('*')
          .single();
        if (error) throw error;
        setProfile(data as Profile);
        if (patch.preferred_locale === 'en' || patch.preferred_locale === 'fr') {
          setAppLocale(patch.preferred_locale);
        }
      },
    }),
    [isLoading, session, profile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

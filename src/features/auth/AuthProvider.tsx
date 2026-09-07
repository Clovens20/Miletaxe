import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { isAgentUser, isStaffUser, mustChangePassword } from '@/features/admin/staff';
import { getSupabase, isLocalMode, isSupabaseConfigured, isUiPreview, setLocalModeOverride } from '@/lib/supabase/client';
import { PRODUCT } from '@/lib/constants';
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
  isAgent: boolean;
  mustChangePassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<{ needsEmailConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  changePassword: (newPassword: string, currentPassword?: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const PASSWORD_CLEARED_KEY = 'miletax.password_changed.';
const profileInsertTried = new Set<string>();

function hasLocalPasswordClear(userId: string): boolean {
  try {
    return globalThis.localStorage?.getItem(`${PASSWORD_CLEARED_KEY}${userId}`) === '1';
  } catch {
    return false;
  }
}

function rememberLocalPasswordClear(userId: string) {
  try {
    globalThis.localStorage?.setItem(`${PASSWORD_CLEARED_KEY}${userId}`, '1');
  } catch {
    /* web storage can be unavailable */
  }
}

async function syncMustChangePasswordFlag() {
  const client = getSupabase();
  try {
    const { error: rpcError } = await client.rpc('clear_own_must_change_password');
    if (rpcError) {
      const clearFn = process.env.EXPO_PUBLIC_CLEAR_PASSWORD_FLAG_FUNCTION_NAME ?? 'clear-must-change-password';
      await client.functions.invoke(clearFn);
    }
  } catch {
    /* le bureau s’ouvre quand même ; le JWT se mettra à jour au prochain login si le SQL est appliqué */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [passwordGateClearedFor, setPasswordGateClearedFor] = useState<string | null>(null);

  const loadProfile = async (userId: string) => {
    if (isLocalMode()) {
      const local = await loadLocal();
      setProfile(local.profile as Profile | null);
      if (local.profile?.preferred_locale === 'en' || local.profile?.preferred_locale === 'fr') {
        setAppLocale(local.profile.preferred_locale as SupportedLocale);
      }
      return;
    }
    const client = getSupabase();
    const { data } = await client.from('profiles').select('*').eq('id', userId).maybeSingle();
    let row = data as Profile | null;
    if (!row && !profileInsertTried.has(userId)) {
      profileInsertTried.add(userId);
      const { data: created } = await client
        .from('profiles')
        .insert({ id: userId, full_name: '', preferred_locale: 'fr' })
        .select('*')
        .maybeSingle();
      row = (created as Profile | null) ?? null;
    }
    setProfile(row);
    const locale = row?.preferred_locale;
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
      if (data.session?.user.id) {
        if (hasLocalPasswordClear(data.session.user.id)) {
          setPasswordGateClearedFor(data.session.user.id);
          void syncMustChangePasswordFlag();
        }
        await loadProfile(data.session.user.id);
      }
      const { data: listener } = client.auth.onAuthStateChange(async (event, nextSession) => {
        if (isLocalMode()) return;
        if (event === 'TOKEN_REFRESHED') {
          setSession(nextSession);
          return;
        }
        setSession(nextSession);
        if (nextSession?.user.id) {
          if (hasLocalPasswordClear(nextSession.user.id)) {
            setPasswordGateClearedFor(nextSession.user.id);
          }
          await loadProfile(nextSession.user.id);
        } else setProfile(null);
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
      isAgent: isAgentUser(session?.user),
      mustChangePassword:
        mustChangePassword(session?.user) && session?.user.id !== passwordGateClearedFor,
      signIn: async (email, password) => {
        if (!isSupabaseConfigured) throw new Error('not_configured');
        setLocalModeOverride(false);
        const { data, error } = await getSupabase().auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.session) {
          const userId = data.session.user.id;
          if (hasLocalPasswordClear(userId)) {
            setPasswordGateClearedFor(userId);
            void syncMustChangePasswordFlag();
          }
          setSession(data.session);
        }
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
        setPasswordGateClearedFor(null);
        if (isSupabaseConfigured) await getSupabase().auth.signOut();
        setSession(null);
        setProfile(null);
      },
      resetPassword: async (email) => {
        if (!isSupabaseConfigured) throw new Error('not_configured');
        const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
          redirectTo: `${PRODUCT.siteOrigin}/auth/reset`,
        });
        if (error) throw error;
      },
      changePassword: async (newPassword, currentPassword) => {
        if (!isSupabaseConfigured) throw new Error('not_configured');
        const email = session?.user?.email;
        if (!email) throw new Error('unauthenticated');
        const client = getSupabase();
        if (currentPassword) {
          const { error: reauthError } = await client.auth.signInWithPassword({ email, password: currentPassword });
          if (reauthError) throw reauthError;
        }
        const { error } = await client.auth.updateUser({ password: newPassword });
        const alreadySet = Boolean(error && /same|identical|different/i.test(error.message ?? ''));
        if (error && !alreadySet) throw error;
        const userId = session?.user.id;
        if (!userId) throw new Error('unauthenticated');
        rememberLocalPasswordClear(userId);
        setPasswordGateClearedFor(userId);
        await syncMustChangePasswordFlag();
        const { data } = await client.auth.refreshSession();
        if (data.session) {
          setSession({
            ...data.session,
            user: {
              ...data.session.user,
              app_metadata: { ...data.session.user.app_metadata, must_change_password: false },
            },
          });
        }
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
    [isLoading, session, profile, passwordGateClearedFor],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

import { Platform } from 'react-native';
import type { EmailOtpType } from '@supabase/supabase-js';

import { getSupabase } from '@/lib/supabase/client';

const OTP_TYPES = new Set<EmailOtpType>(['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']);

/** Ouvre le lien reçu par courriel (confirmation ou mot de passe). */
export async function openEmailLink(): Promise<'session' | 'invalid' | 'none'> {
  const client = getSupabase();
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const tokenHash = params.get('token_hash');
    const type = params.get('type');
    const code = params.get('code');
    if (tokenHash && type && OTP_TYPES.has(type as EmailOtpType)) {
      const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: type as EmailOtpType });
      return error ? 'invalid' : 'session';
    }
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      return error ? 'invalid' : 'session';
    }
  }
  const { data } = await client.auth.getSession();
  return data.session ? 'session' : 'none';
}

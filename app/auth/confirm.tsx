import { useEffect, useState } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { openEmailLink } from '@/features/auth/emailLink';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { colors, type } from '@/theme';

export default function ConfirmEmailScreen() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInvalid(true);
      setReady(true);
      return;
    }
    let settled = false;
    const finish = (ok: boolean) => {
      if (settled) return;
      settled = true;
      setInvalid(!ok);
      setReady(true);
    };
    const client = getSupabase();
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (session && (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'USER_UPDATED')) {
        finish(true);
      }
    });
    void openEmailLink().then(async (result) => {
      if (result === 'invalid') finish(false);
      else if (result === 'session') finish(true);
      else {
        await new Promise((resolve) => setTimeout(resolve, 1200));
        const { data } = await client.auth.getSession();
        finish(Boolean(data.session));
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (ready && !invalid) void getSupabase().auth.signOut();
  }, [invalid, ready]);

  if (!ready) {
    return (
      <Screen title={t('auth.confirmTitle')} scroll home={false} back={false}>
        <Text style={styles.body}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (invalid) {
    return (
      <Screen title={t('auth.confirmTitle')} scroll home={false} back={false}>
        <Text style={styles.body}>{t('auth.confirmInvalid')}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.confirmTitle')} scroll home={false} back={false}>
      <Text style={styles.ok}>{t('auth.confirmBody')}</Text>
      <Button label={t('auth.openAppAfterReset')} onPress={() => void Linking.openURL('miletax://')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  ok: {
    ...type.body,
    color: colors.success,
  },
});

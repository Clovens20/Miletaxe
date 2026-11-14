import { useEffect, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { openEmailLink } from '@/features/auth/emailLink';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase/client';
import { recoveryPasswordSchema, type RecoveryPasswordValues } from '@/lib/validation/schemas';
import { colors, type } from '@/theme';

export default function AuthResetScreen() {
  const { t } = useTranslation();
  const [ready, setReady] = useState(false);
  const [invalid, setInvalid] = useState(false);
  const [done, setDone] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<RecoveryPasswordValues>({
    resolver: zodResolver(recoveryPasswordSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setInvalid(true);
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
      if (session && (event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION')) {
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

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const { error } = await getSupabase().auth.updateUser({ password: values.newPassword });
      if (error) throw error;
      setDone(true);
    } catch {
      setFormError(t('auth.changePasswordFailed'));
    }
  });

  if (!ready && !invalid) {
    return (
      <Screen title={t('auth.resetTitle')} scroll home={false} back={false}>
        <Text style={styles.body}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (invalid && !done) {
    return (
      <Screen title={t('auth.resetTitle')} scroll home={false} back={false}>
        <Text style={styles.body}>{t('auth.resetInvalid')}</Text>
      </Screen>
    );
  }

  if (done) {
    return (
      <Screen title={t('auth.resetTitle')} scroll home={false} back={false}>
        <Text style={styles.ok}>{t('auth.resetDone')}</Text>
        <Button label={t('auth.openAppAfterReset')} onPress={() => void Linking.openURL('miletax://')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('auth.resetTitle')} subtitle={t('auth.resetHint')} scroll home={false} back={false}>
      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('auth.newPassword')}
            password
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="confirmPassword"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('auth.confirmPassword')}
            password
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label={t('auth.resetSave')} loading={formState.isSubmitting} onPress={onSubmit} />
      {Platform.OS === 'web' ? (
        <Pressable onPress={() => void Linking.openURL('miletax://')}>
          <Text style={styles.link}>{t('auth.openAppAfterReset')}</Text>
        </Pressable>
      ) : null}
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
  error: {
    ...type.caption,
    color: colors.danger,
  },
  link: {
    ...type.bodyMedium,
    color: colors.primary,
    textAlign: 'center',
  },
});

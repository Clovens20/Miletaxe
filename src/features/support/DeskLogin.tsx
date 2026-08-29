import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { isAgentUser, isStaffUser } from '@/features/admin/staff';
import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase/client';
import { loginSchema, type LoginValues } from '@/lib/validation/schemas';
import { colors, type } from '@/theme';

export function DeskLogin({
  title,
  subtitle,
  allowAdmin,
  allowAgent,
}: {
  title: string;
  subtitle: string;
  allowAdmin?: boolean;
  allowAgent?: boolean;
}) {
  const { t } = useTranslation();
  const { signIn, signOut } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
      const { data } = await getSupabase().auth.getSession();
      const user = data.session?.user;
      const ok = (allowAdmin && isStaffUser(user)) || (allowAgent && isAgentUser(user));
      if (!ok) {
        await signOut();
        setFormError(t('support.notDesk'));
      }
    } catch {
      setFormError(t('auth.invalidCredentials'));
    }
  });

  return (
    <Screen title={title} subtitle={subtitle} scroll home={false} back={false}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('auth.password')}
            password
            textContentType="password"
            autoComplete="password"
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label={t('auth.login')} loading={formState.isSubmitting} onPress={onSubmit} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...type.caption,
    color: colors.danger,
  },
});

import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { forgotPasswordSchema, type ForgotPasswordValues } from '@/lib/validation/schemas';
import { colors, type } from '@/theme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const { resetPassword } = useAuth();
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const { control, handleSubmit, formState } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await resetPassword(values.email);
    } finally {
      setSent(true);
    }
  });

  return (
    <Screen title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} scroll home={false}>
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
      {sent ? <Text style={styles.ok}>{t('auth.resetSent')}</Text> : null}
      <Button label={t('auth.sendReset')} loading={formState.isSubmitting} onPress={onSubmit} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  ok: {
    ...type.body,
    color: colors.success,
  },
});

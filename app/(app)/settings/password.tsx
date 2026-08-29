import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { changePasswordSchema, type ChangePasswordValues } from '@/lib/validation/schemas';
import { colors, type } from '@/theme';

function isWrongPassword(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? String(error.code) : '';
  const message = 'message' in error ? String(error.message) : '';
  return code === 'invalid_credentials' || /invalid login|invalid credentials/i.test(message);
}

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { changePassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState, reset } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      reset();
      Alert.alert(t('auth.passwordChangedTitle'), t('auth.passwordChangedBody'), [
        { text: t('common.done'), onPress: () => router.back() },
      ]);
    } catch (error) {
      setFormError(isWrongPassword(error) ? t('auth.currentPasswordWrong') : t('auth.changePasswordFailed'));
    }
  });

  return (
    <Screen title={t('auth.changePasswordTitle')} scroll>
      <Text style={styles.subtitle}>{t('auth.changePasswordSubtitle')}</Text>
      <Controller
        control={control}
        name="currentPassword"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('auth.currentPassword')}
            password
            textContentType="password"
            autoComplete="password"
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="newPassword"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('auth.newPassword')}
            hint={t('auth.passwordHint')}
            password
            textContentType="newPassword"
            autoComplete="new-password"
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
            textContentType="newPassword"
            autoComplete="new-password"
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label={t('auth.changePasswordAction')} loading={formState.isSubmitting} onPress={onSubmit} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
});

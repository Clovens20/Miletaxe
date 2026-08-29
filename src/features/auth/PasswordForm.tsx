import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
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

export function PasswordForm({ onDone, forced }: { onDone?: () => void; forced?: boolean }) {
  const { t } = useTranslation();
  const { changePassword } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const { control, handleSubmit, formState, reset } = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    setOk(false);
    try {
      await changePassword(values.currentPassword, values.newPassword);
      reset();
      setOk(true);
      onDone?.();
    } catch (error) {
      setFormError(isWrongPassword(error) ? t('auth.currentPasswordWrong') : t('auth.changePasswordFailed'));
    }
  });

  return (
    <>
      <Text style={styles.subtitle}>{forced ? t('auth.mustChangePasswordHint') : t('auth.changePasswordSubtitle')}</Text>
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
      {ok ? <Text style={styles.ok}>{t('auth.passwordChangedBody')}</Text> : null}
      <Button label={t('auth.changePasswordAction')} loading={formState.isSubmitting} onPress={onSubmit} />
    </>
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
  ok: {
    ...type.caption,
    color: colors.success,
  },
});

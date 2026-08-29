import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/BrandMark';
import { BackToSite } from '@/features/marketing/BackToSite';
import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { authErrorKey } from '@/features/auth/authErrors';
import { useAuth } from '@/features/auth/AuthProvider';
import { registerSchema, type RegisterValues } from '@/lib/validation/schemas';
import { colors, radius, space, type } from '@/theme';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const { signUp } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);
  const { control, handleSubmit, formState } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', acceptTerms: false },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const result = await signUp(values.email, values.password);
      if (result.needsEmailConfirmation) setCheckEmail(true);
    } catch (error) {
      setFormError(t(authErrorKey(error, 'register')));
    }
  });

  return (
    <Screen scroll home={false} back={false}>
      <BackToSite />
      <BrandMark />
      <Text style={styles.title}>{t('auth.registerTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.registerSubtitle')}</Text>
      {checkEmail ? <Text style={styles.ok}>{t('auth.checkEmail')}</Text> : null}
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
      <Controller
        control={control}
        name="acceptTerms"
        render={({ field: { onChange, value }, fieldState }) => (
          <View>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: value }}
              onPress={() => onChange(!value)}
              style={styles.checkRow}
            >
              <View style={[styles.box, value && styles.boxOn]} />
              <Text style={styles.checkLabel}>{t('auth.acceptTerms')}</Text>
            </Pressable>
            {fieldState.error ? (
              <Text style={styles.error}>{t(fieldState.error.message ?? 'auth.acceptTermsError')}</Text>
            ) : null}
            <View style={styles.wrapRow}>
              <Link href="/legal/privacy" asChild>
                <Pressable style={styles.linkHit}>
                  <Text style={styles.link}>{t('settings.privacy')}</Text>
                </Pressable>
              </Link>
              <Text style={styles.muted}>·</Text>
              <Link href="/legal/terms" asChild>
                <Pressable style={styles.linkHit}>
                  <Text style={styles.link}>{t('settings.terms')}</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        )}
      />
      {formError ? <Text style={styles.error}>{formError}</Text> : null}
      <Button label={t('auth.register')} loading={formState.isSubmitting} onPress={onSubmit} />
      <View style={styles.wrapRow}>
        <Text style={styles.muted}>{t('auth.hasAccount')}</Text>
        <Link href="/(auth)/login" asChild>
          <Pressable style={styles.linkHit}>
            <Text style={styles.link}>{t('auth.login')}</Text>
          </Pressable>
        </Link>
      </View>
      <DisclaimerBanner />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.title,
    color: colors.text,
    marginTop: space.sm,
  },
  subtitle: {
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
    flexShrink: 1,
  },
  muted: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
    flexShrink: 1,
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    width: '100%',
    columnGap: 6,
    rowGap: 4,
  },
  linkHit: {
    flexShrink: 1,
    maxWidth: '100%',
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    marginTop: 2,
  },
  boxOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkLabel: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
});

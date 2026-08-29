import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { loginSchema, type LoginValues } from '@/lib/validation/schemas';
import { colors, space, type } from '@/theme';

export default function LoginScreen() {
  const { t } = useTranslation();
  const { signIn } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await signIn(values.email, values.password);
    } catch {
      setFormError(t('auth.invalidCredentials'));
    }
  });

  return (
    <Screen scroll home={false} back={false}>
      <BrandMark />
      <Text style={styles.title}>{t('auth.loginTitle')}</Text>
      <Text style={styles.subtitle}>{t('auth.loginSubtitle')}</Text>
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
      <Link href="/(auth)/forgot-password" asChild>
        <Pressable>
          <Text style={styles.link}>{t('auth.forgotLink')}</Text>
        </Pressable>
      </Link>
      <View style={styles.wrapRow}>
        <Text style={styles.muted}>{t('auth.noAccount')}</Text>
        <Link href="/(auth)/register" asChild>
          <Pressable style={styles.linkHit}>
            <Text style={styles.link}>{t('auth.register')}</Text>
          </Pressable>
        </Link>
      </View>
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
});

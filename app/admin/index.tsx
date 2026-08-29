import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAdminStats } from '@/features/admin/hooks';
import { isStaffUser } from '@/features/admin/staff';
import { useAuth } from '@/features/auth/AuthProvider';
import { getSupabase } from '@/lib/supabase/client';
import { loginSchema, type LoginValues } from '@/lib/validation/schemas';
import { colors, space, type } from '@/theme';

export default function AdminHomeScreen() {
  const { t } = useTranslation();
  const { session, isStaff, isLoading, signIn, signOut } = useAuth();

  if (isLoading) {
    return (
      <Screen title={t('admin.title')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (session && !isStaff) {
    return (
      <Screen title={t('admin.title')} scroll home={false} back={false}>
        <Text style={styles.error}>{t('admin.notStaff')}</Text>
        <Button label={t('admin.signOut')} variant="danger" onPress={() => void signOut()} />
      </Screen>
    );
  }

  if (!session) {
    return <AdminLogin onSignIn={signIn} onReject={() => void signOut()} />;
  }

  return <AdminDashboard />;
}

function AdminLogin({
  onSignIn,
  onReject,
}: {
  onSignIn: (email: string, password: string) => Promise<void>;
  onReject: () => void;
}) {
  const { t } = useTranslation();
  const [formError, setFormError] = useState<string | null>(null);
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSignIn(values.email, values.password);
      const { data } = await getSupabase().auth.getSession();
      if (!isStaffUser(data.session?.user)) {
        onReject();
        setFormError(t('admin.notStaff'));
      }
    } catch {
      setFormError(t('auth.invalidCredentials'));
    }
  });

  return (
    <Screen title={t('admin.loginTitle')} subtitle={t('admin.loginSubtitle')} scroll home={false} back={false}>
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

function AdminDashboard() {
  const { t } = useTranslation();
  const stats = useAdminStats();

  return (
    <Screen title={t('admin.dashboard')} subtitle={t('admin.statsHint')} scroll home={false} back={false}>
      {stats.isError ? <Text style={styles.error}>{t('admin.loadFailed')}</Text> : null}
      <View style={styles.grid}>
        <StatCard label={t('admin.usersCount')} value={stats.data?.users} />
        <StatCard label={t('admin.vehiclesCount')} value={stats.data?.vehicles} />
        <StatCard label={t('admin.receiptsCount')} value={stats.data?.receipts} />
        <StatCard label={t('admin.expensesCount')} value={stats.data?.expenses} />
        <StatCard label={t('admin.incomeCount')} value={stats.data?.income} />
      </View>
    </Screen>
  );
}

function StatCard({ label, value }: { label: string; value?: number }) {
  return (
    <Card style={styles.stat}>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  stat: {
    minWidth: 140,
    flexGrow: 1,
  },
  statValue: {
    ...type.metric,
    color: colors.text,
  },
  statLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

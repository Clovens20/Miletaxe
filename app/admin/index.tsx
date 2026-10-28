import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { DeskAuthShell } from '@/components/desk/DeskAuthShell';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAdminMovements, useAdminStats } from '@/features/admin/hooks';
import { isStaffUser } from '@/features/admin/staff';
import type { AdminMovementRow } from '@/features/admin/types';
import { useAuth } from '@/features/auth/AuthProvider';
import { formatDateTime } from '@/lib/format';
import { getSupabase } from '@/lib/supabase/client';
import { loginSchema, type LoginValues } from '@/lib/validation/schemas';
import type { SupportedLocale } from '@/types/domain';
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
    <DeskAuthShell title={t('admin.loginTitle')} subtitle={t('admin.loginSubtitle')}>
      <Controller
        control={control}
        name="email"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('auth.email')}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
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
    </DeskAuthShell>
  );
}

function AdminDashboard() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const stats = useAdminStats();
  const movements = useAdminMovements(80);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const data = stats.data;
  const users = data?.users;
  const movementRows: AdminMovementRow[] = movements.data ?? [];

  return (
    <Screen title={t('admin.dashboard')} subtitle={t('admin.statsHint')} scroll home={false} back={false}>
      {stats.isError ? <Text style={styles.error}>{t('admin.loadFailed')}</Text> : null}
      <Text style={styles.live}>{t('admin.liveRefresh')}</Text>

      <View style={styles.actions}>
        <Button
          label={t('support.adminInbox')}
          variant="secondary"
          onPress={() => router.push('/admin/inbox' as Href)}
        />
        <Button
          label={t('admin.viewUsers', { count: users ?? '—' })}
          loading={stats.isLoading}
          onPress={() => router.push('/admin/users' as Href)}
        />
        <Button
          label={t('admin.employees')}
          variant="secondary"
          onPress={() => router.push('/admin/team' as Href)}
        />
      </View>

      <Text style={styles.section}>{t('admin.sectionUsers')}</Text>
      <View style={styles.grid}>
        <StatCard label={t('admin.usersCount')} value={data?.users} />
        <StatCard label={t('admin.usersOnboarded')} value={data?.users_onboarded} />
        <StatCard label={t('admin.activeUsers7d')} value={data?.active_users_7d} accent />
        <StatCard label={t('admin.usersSendingData7d')} value={data?.users_sending_data_7d} accent />
        <StatCard label={t('admin.signups7d')} value={data?.signups_7d} />
      </View>

      <Text style={styles.section}>{t('admin.sectionActivity24h')}</Text>
      <View style={styles.grid}>
        <StatCard label={t('admin.readings24h')} value={data?.readings_24h} />
        <StatCard label={t('admin.receipts24h')} value={data?.receipts_24h} />
        <StatCard label={t('admin.expenses24h')} value={data?.expenses_24h} />
        <StatCard label={t('admin.income24h')} value={data?.income_24h} />
        <StatCard label={t('admin.support24h')} value={data?.support_24h} />
      </View>

      <Text style={styles.section}>{t('admin.sectionTotals')}</Text>
      <View style={styles.grid}>
        <StatCard label={t('admin.vehiclesCount')} value={data?.vehicles} />
        <StatCard label={t('admin.readingsCount')} value={data?.readings} />
        <StatCard label={t('admin.receiptsCount')} value={data?.receipts} />
        <StatCard label={t('admin.expensesCount')} value={data?.expenses} />
        <StatCard label={t('admin.incomeCount')} value={data?.income} />
      </View>

      <Text style={styles.section}>{t('admin.sectionSupport')}</Text>
      <View style={styles.grid}>
        <StatCard label={t('admin.supportOpen')} value={data?.support_open} />
        <StatCard label={t('admin.supportClaimed')} value={data?.support_claimed} />
        <StatCard label={t('admin.supportEscalated')} value={data?.support_escalated} />
      </View>

      <Text style={styles.section}>{t('admin.sectionMovements')}</Text>
      <Text style={styles.hint}>{t('admin.movementsHint')}</Text>
      {movements.isError ? <Text style={styles.error}>{t('admin.loadFailed')}</Text> : null}
      {movements.isLoading && !movementRows.length ? (
        <Text style={styles.muted}>{t('common.loading')}</Text>
      ) : null}
      {!movements.isLoading && !movementRows.length ? (
        <Text style={styles.muted}>{t('admin.movementsEmpty')}</Text>
      ) : null}
      {movementRows.map((row, index) => (
        <Card key={`${row.kind}-${row.occurred_at}-${row.user_email ?? index}`} style={styles.movement}>
          <View style={styles.movementHead}>
            <Text style={styles.movementName}>{row.user_name || row.user_email || t('support.user')}</Text>
            <Badge label={movementLabel(row.kind, t)} tone={movementTone(row.kind)} />
          </View>
          {row.user_email ? <Text style={styles.meta}>{row.user_email}</Text> : null}
          <Text style={styles.meta}>{formatDateTime(row.occurred_at, locale)}</Text>
        </Card>
      ))}
    </Screen>
  );
}

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value?: number;
  accent?: boolean;
}) {
  return (
    <Card style={[styles.stat, accent ? styles.statAccent : null]}>
      <Text style={styles.statValue}>{value ?? '—'}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Card>
  );
}

function movementLabel(kind: string, t: (key: string) => string) {
  const key = `admin.movement.${kind}` as const;
  const label = t(key);
  return label === key ? kind : label;
}

function movementTone(kind: string): 'warning' | 'info' | 'danger' | 'success' {
  if (kind === 'signup') return 'success';
  if (kind === 'support') return 'danger';
  if (kind === 'reading' || kind === 'receipt') return 'info';
  return 'warning';
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
  live: {
    ...type.caption,
    color: colors.primary,
    marginBottom: space.xs,
  },
  actions: {
    gap: space.xs,
    marginBottom: space.sm,
  },
  section: {
    ...type.section,
    color: colors.text,
    marginTop: space.md,
    marginBottom: space.xs,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
    marginBottom: space.sm,
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
  statAccent: {
    borderColor: colors.primary,
  },
  statValue: {
    ...type.metric,
    color: colors.text,
  },
  statLabel: {
    ...type.caption,
    color: colors.textSecondary,
  },
  movement: {
    gap: 4,
    marginBottom: space.xs,
  },
  movementHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  movementName: {
    ...type.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

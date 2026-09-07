import { useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { type HireAgentAction, useAdminAgents, useHireAgent } from '@/features/support/hooks';
import type { SupportAgentRow } from '@/features/support/types';
import { colors, space, type } from '@/theme';

function isSuspended(row: SupportAgentRow) {
  if (!row.banned_until) return false;
  return new Date(row.banned_until).getTime() > Date.now();
}

export default function AdminTeamScreen() {
  const { t } = useTranslation();
  const { isStaff } = useAuth();
  const agents = useAdminAgents();
  const hire = useHireAgent();
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [recoveryLink, setRecoveryLink] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);

  if (!isStaff) {
    return (
      <Screen title={t('admin.employees')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  const run = (payload: { email: string; fullName?: string; phone?: string; action: HireAgentAction }, confirmKey?: string) => {
    if (confirmKey && Platform.OS === 'web' && !window.confirm(t(confirmKey, { email: payload.email }))) return;
    setMessage(null);
    setTempPassword(null);
    setRecoveryLink(null);
    setBusyEmail(payload.email);
    void hire
      .mutateAsync(payload)
      .then((result) => {
        if (payload.action === 'hire') {
          setEmail('');
          setFullName('');
          setPhone('');
          setMessage(result.emailed ? t('admin.hired') : t('admin.hiredNoEmail'));
          if (result.temporaryPassword) setTempPassword(result.temporaryPassword);
        } else if (payload.action === 'reset_password') {
          setMessage(result.emailed ? t('admin.resetSent') : t('admin.resetNoEmail'));
          if (result.recoveryLink) setRecoveryLink(result.recoveryLink);
        } else if (payload.action === 'suspend') {
          setMessage(t('admin.suspended'));
        } else if (payload.action === 'unsuspend') {
          setMessage(t('admin.unsuspended'));
        } else {
          setMessage(t('admin.revoked'));
        }
      })
      .catch(() => setMessage(t('admin.hireFailed')))
      .finally(() => setBusyEmail(null));
  };

  const rows = agents.data ?? [];

  return (
    <Screen title={t('admin.employees')} subtitle={t('admin.employeesHint')} scroll home={false} back={false}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.hireAgent')}</Text>
        <TextField label={t('admin.fullName')} value={fullName} onChangeText={setFullName} />
        <TextField
          label={t('auth.email')}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        <TextField
          label={t('admin.phone')}
          hint={t('common.optional')}
          keyboardType="phone-pad"
          value={phone}
          onChangeText={setPhone}
        />
        <Button
          label={t('admin.hireAgent')}
          loading={hire.isPending && busyEmail === email}
          onPress={() => run({ email, fullName, phone, action: 'hire' })}
        />
      </Card>

      {message ? <Text style={styles.ok}>{message}</Text> : null}
      {tempPassword ? (
        <Text style={styles.temp}>
          {t('admin.tempPassword')}: {tempPassword}
        </Text>
      ) : null}
      {recoveryLink ? (
        <Text style={styles.temp} selectable>
          {t('admin.recoveryLink')}: {recoveryLink}
        </Text>
      ) : null}

      <Text style={styles.section}>{t('admin.employeesList', { count: rows.length })}</Text>
      {agents.isLoading ? <Text style={styles.muted}>{t('common.loading')}</Text> : null}
      {agents.isError ? (
        <Text style={styles.error}>
          {t('admin.loadFailed')}
          {agents.error instanceof Error && agents.error.message ? `\n${agents.error.message}` : ''}
        </Text>
      ) : null}
      {!agents.isLoading && !agents.isError && !rows.length ? <Text style={styles.muted}>{t('admin.noAgents')}</Text> : null}

      {rows.map((row) => {
        const suspended = isSuspended(row);
        const agentEmail = row.email ?? '';
        return (
          <Card key={row.id} style={styles.card}>
            <View style={styles.head}>
              <Text style={styles.title}>{row.full_name || row.email}</Text>
              <Badge
                label={
                  suspended
                    ? t('admin.statusSuspended')
                    : row.must_change_password
                      ? t('admin.statusMustChange')
                      : t('admin.statusActive')
                }
                tone={suspended ? 'danger' : row.must_change_password ? 'warning' : 'success'}
              />
            </View>
            <Text style={styles.meta}>{row.email}</Text>
            {row.phone ? <Text style={styles.meta}>{row.phone}</Text> : null}
            <Text style={styles.meta}>
              {t('admin.created')}: {row.created_at.slice(0, 10)}
              {row.last_sign_in_at ? ` · ${t('admin.lastSignIn')}: ${row.last_sign_in_at.slice(0, 10)}` : ''}
            </Text>
            <View style={styles.actions}>
              {suspended ? (
                <Button
                  label={t('admin.unsuspendAgent')}
                  variant="secondary"
                  loading={hire.isPending && busyEmail === agentEmail}
                  onPress={() => run({ email: agentEmail, action: 'unsuspend' }, 'admin.unsuspendConfirm')}
                />
              ) : (
                <Button
                  label={t('admin.suspendAgent')}
                  variant="secondary"
                  loading={hire.isPending && busyEmail === agentEmail}
                  onPress={() => run({ email: agentEmail, action: 'suspend' }, 'admin.suspendConfirm')}
                />
              )}
              <Button
                label={t('admin.resetAgentPassword')}
                variant="secondary"
                loading={hire.isPending && busyEmail === agentEmail}
                onPress={() => run({ email: agentEmail, action: 'reset_password' }, 'admin.resetConfirm')}
              />
              <Button
                label={t('admin.revokeAgent')}
                variant="danger"
                loading={hire.isPending && busyEmail === agentEmail}
                onPress={() => run({ email: agentEmail, action: 'revoke' }, 'admin.revokeConfirm')}
              />
            </View>
          </Card>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  section: {
    ...type.section,
    color: colors.text,
    marginTop: space.sm,
  },
  title: {
    ...type.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  muted: {
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
  temp: {
    ...type.callout,
    color: colors.text,
  },
  actions: {
    gap: space.xs,
  },
});

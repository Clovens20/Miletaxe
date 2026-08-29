import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAdminAgents, useHireAgent } from '@/features/support/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, space, type } from '@/theme';

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

  if (!isStaff) {
    return (
      <Screen title={t('admin.team')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('admin.team')} subtitle={t('admin.teamHint')} scroll home={false} back={false}>
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
        {message ? <Text style={styles.ok}>{message}</Text> : null}
        {tempPassword ? (
          <Text style={styles.temp}>
            {t('admin.tempPassword')}: {tempPassword}
          </Text>
        ) : null}
        <Button
          label={t('admin.hireAgent')}
          loading={hire.isPending}
          onPress={() => {
            setMessage(null);
            setTempPassword(null);
            void hire
              .mutateAsync({ email, fullName, phone, action: 'hire' })
              .then((result) => {
                setEmail('');
                setFullName('');
                setPhone('');
                setMessage(result.emailed ? t('admin.hired') : t('admin.hiredNoEmail'));
                if (result.temporaryPassword) setTempPassword(result.temporaryPassword);
              })
              .catch(() => setMessage(t('admin.hireFailed')));
          }}
        />
      </Card>
      {(agents.data ?? []).map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={styles.title}>{row.full_name || row.email}</Text>
          <Text style={styles.meta}>{row.email}</Text>
          {row.phone ? <Text style={styles.meta}>{row.phone}</Text> : null}
          <Button
            label={t('admin.revokeAgent')}
            variant="danger"
            loading={hire.isPending}
            onPress={() => void hire.mutateAsync({ email: row.email ?? '', action: 'revoke' })}
          />
        </Card>
      ))}
      {!agents.data?.length ? <Text style={styles.muted}>{t('admin.noAgents')}</Text> : null}
      <View />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
  },
  title: {
    ...type.bodyMedium,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
  ok: {
    ...type.caption,
    color: colors.success,
  },
  temp: {
    ...type.callout,
    color: colors.text,
  },
});

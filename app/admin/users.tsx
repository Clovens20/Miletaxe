import { Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useAdminDeleteUser, useAdminUsers } from '@/features/admin/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, space, type } from '@/theme';

export default function AdminUsersScreen() {
  const { t } = useTranslation();
  const { user, isStaff } = useAuth();
  const list = useAdminUsers();
  const remove = useAdminDeleteUser();

  if (!isStaff) {
    return (
      <Screen title={t('admin.users')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  const confirmDelete = (id: string, email: string | null) => {
    const label = email || id;
    const ok =
      Platform.OS === 'web'
        ? window.confirm(t('admin.deleteUserConfirm', { email: label }))
        : false;
    if (!ok) return;
    remove.mutate(id, {
      onError: (error) => {
        const code = error instanceof Error ? error.message : '';
        if (code === 'cannot_delete_self') {
          window.alert(t('admin.cannotDeleteSelf'));
          return;
        }
        window.alert(t('admin.deleteUserFailed'));
      },
    });
  };

  return (
    <Screen title={t('admin.users')} scroll home={false} back={false}>
      {list.isError ? <Text style={styles.error}>{t('admin.loadFailed')}</Text> : null}
      {!list.data?.length && !list.isLoading ? <Text style={styles.muted}>{t('admin.emptyUsers')}</Text> : null}
      {list.data?.map((row) => (
        <Card key={row.id} style={styles.card}>
          <Text style={styles.name}>{row.full_name || t('admin.name')}</Text>
          <Text style={styles.meta}>{row.email ?? '—'}</Text>
          <Text style={styles.meta}>
            {t('admin.country')}: {row.country_code ?? '—'}
            {' · '}
            {row.onboarding_completed_at ? t('admin.onboardingDone') : t('admin.onboardingPending')}
          </Text>
          <Text style={styles.meta}>
            {t('admin.created')}: {row.created_at.slice(0, 10)}
          </Text>
          {row.id === user?.id ? (
            <Text style={styles.hint}>{t('admin.cannotDeleteSelf')}</Text>
          ) : (
            <View style={styles.actions}>
              <Button
                label={t('admin.deleteUser')}
                variant="danger"
                loading={remove.isPending && remove.variables === row.id}
                onPress={() => confirmDelete(row.id, row.email)}
              />
            </View>
          )}
        </Card>
      ))}
    </Screen>
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
  card: {
    gap: 4,
  },
  name: {
    ...type.bodyMedium,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  hint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: space.xs,
  },
  actions: {
    marginTop: space.sm,
    maxWidth: 280,
  },
});

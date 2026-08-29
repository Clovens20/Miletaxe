import { StyleSheet, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { DeskLogin } from '@/features/support/DeskLogin';
import { InboxList } from '@/features/support/InboxList';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, type } from '@/theme';

export default function EmployesHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { session, isAgent, isStaff, isLoading, signOut } = useAuth();

  if (isLoading) {
    return (
      <Screen title={t('support.deskTitle')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('common.loading')}</Text>
      </Screen>
    );
  }

  if (session && isStaff && !isAgent) {
    return (
      <Screen title={t('support.deskTitle')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('support.adminUseTech')}</Text>
      </Screen>
    );
  }

  if (session && !isAgent) {
    return (
      <Screen title={t('support.deskTitle')} scroll home={false} back={false}>
        <Text style={styles.error}>{t('support.notDesk')}</Text>
        <Button label={t('admin.signOut')} variant="danger" onPress={() => void signOut()} />
      </Screen>
    );
  }

  if (!session) {
    return (
      <DeskLogin title={t('support.deskLogin')} subtitle={t('support.deskLoginHint')} allowAgent />
    );
  }

  return (
    <Screen title={t('support.inbox')} subtitle={t('support.inboxHint')} scroll home={false} back={false}>
      <InboxList
        filter={(row) => row.status === 'open' || row.status === 'claimed'}
        onOpen={(id) => router.push(`/employes/thread/${id}` as Href)}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { ...type.body, color: colors.textSecondary },
  error: { ...type.caption, color: colors.danger },
});

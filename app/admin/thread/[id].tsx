import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { ConversationPanel } from '@/features/support/ConversationPanel';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AdminThreadScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isStaff } = useAuth();
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  return (
    <Screen title={t('support.conversation')} scroll home={false}>
      {isStaff && id ? (
        <ConversationPanel threadId={id} role="admin" locale={locale} agentId={user?.id} showDeskActions />
      ) : null}
    </Screen>
  );
}

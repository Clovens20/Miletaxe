import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { ConversationPanel } from '@/features/support/ConversationPanel';
import { useAuth } from '@/features/auth/AuthProvider';

export default function EmployesThreadScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, isAgent } = useAuth();
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  return (
    <Screen title={t('support.conversation')} scroll home={false}>
      {isAgent && id ? (
        <ConversationPanel threadId={id} role="agent" locale={locale} agentId={user?.id} showDeskActions />
      ) : null}
    </Screen>
  );
}

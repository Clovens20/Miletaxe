import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { ConversationPanel } from '@/features/support/ConversationPanel';
import { SupportRealtime } from '@/features/support/hooks';

export default function SupportThreadScreen() {
  const { t, i18n } = useTranslation();
  const { id } = useLocalSearchParams<{ id: string }>();
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  return (
    <Screen title={t('support.conversation')} scroll>
      <SupportRealtime />
      {id ? <ConversationPanel threadId={id} role="user" locale={locale} /> : null}
    </Screen>
  );
}

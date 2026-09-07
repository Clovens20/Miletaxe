import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { UserConversation } from '@/features/support/UserConversation';

export default function SupportThreadScreen() {
  const { t, i18n } = useTranslation();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  return (
    <Screen title={t('support.conversation')} scroll>
      {id ? <UserConversation threadId={id} locale={locale} /> : null}
    </Screen>
  );
}

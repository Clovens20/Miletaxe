import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { InboxList } from '@/features/support/InboxList';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AdminInboxScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { isStaff } = useAuth();

  return (
    <Screen title={t('support.adminInbox')} subtitle={t('support.adminInboxHint')} scroll home={false} back={false}>
      {isStaff ? (
        <InboxList
          variant="admin"
          defaultAdminTab="tech"
          onOpen={(id) => router.push(`/admin/thread/${id}` as Href)}
        />
      ) : null}
    </Screen>
  );
}

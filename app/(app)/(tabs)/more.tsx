import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useOpenAssistantCount } from '@/features/assistant/hooks';
import { useIntegrityFindings } from '@/features/integrity/engine';
import { useUnreadSupportReplies } from '@/features/support/hooks';

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const findings = useIntegrityFindings();
  const assistant = useOpenAssistantCount();
  const supportReplies = useUnreadSupportReplies();
  const count = findings.data?.length ?? 0;

  return (
    <Screen title={t('more.title')} scroll back={false}>
      <Card>
        <ListRow
          icon="eye-outline"
          title={t('home.verifyExpenses')}
          subtitle={t('home.verifyExpensesHint')}
          onPress={() => router.push('/(app)/expenses/check' as Href)}
        />
        <ListRow
          icon="time-outline"
          title={t('home.addPastExpenses')}
          subtitle={t('home.addPastExpensesHint')}
          onPress={() => router.push('/(app)/expenses/past' as Href)}
        />
        <ListRow
          icon="document-text-outline"
          title={t('home.generatePackage')}
          subtitle={t('home.generatePackageHint')}
          onPress={() => router.push('/(app)/reports')}
        />
      </Card>
      <Card>
        <ListRow
          icon="car-outline"
          title={t('more.vehicles')}
          onPress={() => router.push('/(app)/vehicles')}
        />
        <ListRow
          icon="sparkles-outline"
          title={t('more.assistant')}
          right={assistant.count ? String(assistant.count) : undefined}
          onPress={() => router.push('/(app)/assistant' as Href)}
        />
        <ListRow
          icon="alert-circle-outline"
          title={t('more.completeness')}
          right={count ? String(count) : undefined}
          onPress={() => router.push('/(app)/completeness')}
        />
        <ListRow
          icon="wifi-outline"
          title={t('more.internet')}
          subtitle={t('more.internetHint')}
          onPress={() => router.push('/(app)/settings/internet')}
        />
        <ListRow
          icon="briefcase-outline"
          title={t('more.accountant')}
          onPress={() => router.push('/(app)/settings/accountant')}
        />
        <ListRow
          icon="chatbubble-ellipses-outline"
          title={t('more.support')}
          right={supportReplies.count ? String(supportReplies.count) : undefined}
          onPress={() => router.push('/(app)/support' as Href)}
        />
        <ListRow
          icon="settings-outline"
          title={t('more.settings')}
          onPress={() => router.push('/(app)/settings')}
        />
        <ListRow
          icon="information-circle-outline"
          title={t('more.about')}
          onPress={() => router.push('/(app)/about')}
        />
      </Card>
      <DisclaimerBanner />
    </Screen>
  );
}

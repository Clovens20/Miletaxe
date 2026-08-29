import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useOpenAssistantCount } from '@/features/assistant/hooks';
import { useIntegrityFindings } from '@/features/integrity/engine';

export default function MoreScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const findings = useIntegrityFindings();
  const assistant = useOpenAssistantCount();
  const count = findings.data?.length ?? 0;

  return (
    <Screen title={t('more.title')} scroll back={false}>
      <Card>
        <ListRow
          icon="car-outline"
          title={t('more.vehicles')}
          onPress={() => router.push('/(app)/vehicles')}
        />
        <ListRow
          icon="document-text-outline"
          title={t('more.reports')}
          onPress={() => router.push('/(app)/reports')}
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
          icon="briefcase-outline"
          title={t('more.accountant')}
          onPress={() => router.push('/(app)/settings/accountant')}
        />
        <ListRow
          icon="chatbubble-ellipses-outline"
          title={t('more.support')}
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

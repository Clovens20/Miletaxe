import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { WarningBanner } from '@/components/ui/WarningBanner';

export default function PastExpensesScreen() {
  const { added } = useLocalSearchParams<{ added?: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const justSaved = added === '1';

  return (
    <Screen title={t('expenses.pastTitle')} subtitle={t('expenses.pastSubtitle')} scroll>
      {justSaved ? (
        <WarningBanner tone="info" title={t('expenses.pastSaved')} />
      ) : (
        <WarningBanner tone="info" title={t('expenses.pastLead')} />
      )}
      <Button
        label={t('expenses.pastScan')}
        onPress={() => router.push('/(app)/expenses/scan?mode=past' as Href)}
      />
      <Button
        label={t('expenses.pastManual')}
        variant="secondary"
        onPress={() => router.push('/(app)/expenses/manual?mode=past' as Href)}
      />
      <Button
        label={justSaved ? t('expenses.pastDone') : t('common.back')}
        variant="ghost"
        onPress={() => router.replace('/(app)/(tabs)/expenses')}
      />
    </Screen>
  );
}

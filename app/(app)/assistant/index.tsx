import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { FilterChips } from '@/features/expenses/FilterChips';
import { useAssistantRecommendations, useRunAssistant } from '@/features/assistant/hooks';
import { confidenceLabel } from '@/features/assistant/labels';
import { localize } from '@/lib/i18n/localize';
import type { AssistantConfidence, SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function AssistantInboxScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const rows = useAssistantRecommendations();
  const run = useRunAssistant();
  const didRun = useRef(false);
  const [filter, setFilter] = useState<'open' | 'all' | AssistantConfidence>('open');

  useEffect(() => {
    if (didRun.current || !run.isReady) return;
    didRun.current = true;
    void run.mutateAsync();
  }, [run.isReady, run.mutateAsync]);

  const visible = useMemo(() => {
    const list = rows.data ?? [];
    if (filter === 'all') return list.filter((row) => row.status !== 'obsolete');
    if (filter === 'open') return list.filter((row) => row.status === 'open');
    return list.filter((row) => row.status === 'open' && row.confidence === filter);
  }, [filter, rows.data]);

  return (
    <Screen title={t('assistant.title')} subtitle={t('assistant.subtitle')} scroll>
      <Card>
        <Text style={styles.intro}>{t('assistant.foundSomething')}</Text>
        <Text style={styles.body}>{t('assistant.notTaxAdvice')}</Text>
      </Card>
      <FilterChips
        value={filter}
        onChange={(value) => setFilter(value as typeof filter)}
        options={[
          { value: 'open', label: t('assistant.filterOpen') },
          { value: 'high', label: t('assistant.confidenceHigh') },
          { value: 'medium', label: t('assistant.confidenceMedium') },
          { value: 'needs_review', label: t('assistant.confidenceReview') },
          { value: 'all', label: t('common.all') },
        ]}
      />
      {!visible.length ? (
        <EmptyState icon="sparkles-outline" title={t('assistant.empty')} body={t('assistant.emptyBody')} />
      ) : (
        visible.map((row) => (
          <ListRow
            key={row.id}
            icon="search-outline"
            title={localize(row.title_i18n, locale)}
            subtitle={confidenceLabel(row.confidence, t)}
            right={row.status === 'open' ? t('assistant.toReview') : undefined}
            onPress={() => router.push(`/(app)/assistant/${row.id}` as Href)}
          />
        ))
      )}
      <Button label={t('assistant.analyze')} loading={run.isPending} onPress={() => void run.mutateAsync()} />
      <DisclaimerBanner text={`${t('disclaimer.short')} ${t('assistant.reviewAccountant')}`} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...type.section,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: space.xs,
  },
});

import { useEffect, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import {
  useAssistantRecommendation,
  useAssistantReviewEvents,
  useLogAssistantOpened,
  useReviewAssistantRecommendation,
} from '@/features/assistant/hooks';
import { confidenceLabel, confidenceTone } from '@/features/assistant/labels';
import { recommendationHref } from '@/features/assistant/routes';
import { formatDateTime } from '@/lib/format';
import { localize } from '@/lib/i18n/localize';
import type { SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function AssistantRecommendationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const row = useAssistantRecommendation(id);
  const events = useAssistantReviewEvents(id);
  const review = useReviewAssistantRecommendation();
  const logOpened = useLogAssistantOpened();
  const alreadyOpened = Boolean(events.data?.some((event) => event.action === 'opened'));
  const didLogOpen = useRef(false);

  useEffect(() => {
    if (!id || !row.data || events.isLoading || alreadyOpened || didLogOpen.current) return;
    didLogOpen.current = true;
    void logOpened.mutateAsync({ id, alreadyOpened: false });
  }, [alreadyOpened, events.isLoading, id, logOpened.mutateAsync, row.data]);

  if (!row.data) {
    return (
      <Screen title={t('assistant.detailTitle')}>
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const item = row.data;
  const open = item.status === 'open';
  const evidence = Object.entries(item.evidence).filter(([, value]) => value != null && value !== '');

  return (
    <Screen title={t('assistant.detailTitle')} subtitle={t('assistant.foundSomething')} scroll>
      <Badge label={confidenceLabel(item.confidence, t)} tone={confidenceTone(item.confidence)} />
      <Text style={styles.title}>{localize(item.title_i18n, locale)}</Text>
      <Text style={styles.body}>{localize(item.body_i18n, locale)}</Text>
      <Card>
        <Text style={styles.kicker}>{t('assistant.evidence')}</Text>
        {evidence.length ? (
          evidence.map(([key, value]) => (
            <Text key={key} style={styles.evidence}>
              {key}: {String(value)}
            </Text>
          ))
        ) : (
          <Text style={styles.evidence}>{t('assistant.noEvidence')}</Text>
        )}
        {item.proposed_patch ? (
          <Text style={styles.hint}>{t('assistant.patchHint')}</Text>
        ) : (
          <Text style={styles.hint}>{t('assistant.noSilentChange')}</Text>
        )}
      </Card>
      <Button label={t('assistant.openRecord')} variant="secondary" onPress={() => router.push(recommendationHref(item))} />
      {open && item.proposed_patch ? (
        <Button
          label={t('assistant.applySuggestion')}
          loading={review.isPending}
          onPress={() => void review.mutateAsync({ id: item.id, action: 'applied' })}
        />
      ) : null}
      {open ? (
        <Button
          label={t('assistant.confirmReviewed')}
          variant={item.proposed_patch ? 'secondary' : 'primary'}
          loading={review.isPending}
          onPress={async () => {
            await review.mutateAsync({ id: item.id, action: 'confirmed' });
            router.back();
          }}
        />
      ) : null}
      {open ? (
        <Button
          label={t('assistant.dismiss')}
          variant="ghost"
          loading={review.isPending}
          onPress={async () => {
            await review.mutateAsync({ id: item.id, action: 'dismissed' });
            router.back();
          }}
        />
      ) : (
        <Text style={styles.hint}>{t('assistant.alreadyReviewed')}</Text>
      )}
      <Text style={styles.section}>{t('assistant.auditTitle')}</Text>
      {!events.data?.length ? (
        <Text style={styles.hint}>{t('assistant.auditEmpty')}</Text>
      ) : (
        events.data.map((event) => (
          <ListRow
            key={event.id}
            title={t(`assistant.action.${event.action}`)}
            subtitle={formatDateTime(event.created_at, locale)}
          />
        ))
      )}
      <DisclaimerBanner text={`${t('assistant.notTaxAdvice')} ${t('assistant.reviewAccountant')}`} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    ...type.section,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  kicker: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  evidence: {
    ...type.caption,
    color: colors.text,
    marginTop: 4,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: space.xs,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
});

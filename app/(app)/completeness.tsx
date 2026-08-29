import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { findingHref } from '@/features/dashboard/routes';
import { useIntegrityFindings } from '@/features/integrity/engine';
import { localize } from '@/lib/i18n/localize';
import type { SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function CompletenessScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const findings = useIntegrityFindings();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;

  return (
    <Screen title={t('completeness.title')} subtitle={t('completeness.subtitle')} scroll>
      <Text style={styles.note}>{t('home.reviewAccountant')}</Text>
      {!findings.data?.length ? (
        <EmptyState icon="checkmark-circle-outline" title={t('completeness.empty')} />
      ) : (
        findings.data.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(findingHref(item))}>
            <Card style={styles.card}>
              <View style={styles.head}>
                <Badge
                  label={t(`completeness.${item.severity}`)}
                  tone={item.severity === 'blocking' ? 'danger' : item.severity === 'warning' ? 'warning' : 'info'}
                />
              </View>
              <Text style={styles.title}>{localize(item.title_i18n, locale)}</Text>
              <Text style={styles.body}>{localize(item.description_i18n, locale)}</Text>
            </Card>
          </Pressable>
        ))
      )}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: {
    ...type.caption,
    color: colors.textSecondary,
  },
  card: {
    gap: space.xs,
  },
  head: {
    flexDirection: 'row',
  },
  title: {
    ...type.section,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
});

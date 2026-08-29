import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { useSupportTopics } from '@/features/support/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { localize } from '@/lib/i18n/localize';
import { colors, space, type } from '@/theme';

export default function EmployesTopicsScreen() {
  const { t, i18n } = useTranslation();
  const { isAgent } = useAuth();
  const topics = useSupportTopics();
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  return (
    <Screen title={t('support.topics')} subtitle={t('support.topicsHint')} scroll home={false} back={false}>
      {isAgent
        ? (topics.data ?? []).map((topic) => (
            <Card key={topic.id} style={styles.card}>
              <Text style={styles.cat}>{topic.category}</Text>
              <Text style={styles.title}>{localize(topic.title_i18n, locale)}</Text>
              <Text style={styles.body}>{localize(topic.body_i18n, locale)}</Text>
            </Card>
          ))
        : null}
      <View />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  cat: { ...type.captionMedium, color: colors.primary },
  title: { ...type.bodyMedium, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
});

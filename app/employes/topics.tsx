import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useSupportTopics } from '@/features/support/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { localize } from '@/lib/i18n/localize';
import { colors, space, type } from '@/theme';

export default function EmployesTopicsScreen() {
  const { t, i18n } = useTranslation();
  const { isAgent } = useAuth();
  const topics = useSupportTopics();
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  const [query, setQuery] = useState('');

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = (topics.data ?? []).filter((topic) => {
      if (!needle) return true;
      const title = localize(topic.title_i18n, locale).toLowerCase();
      const body = localize(topic.body_i18n, locale).toLowerCase();
      return `${topic.category} ${title} ${body}`.includes(needle);
    });
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const list = map.get(row.category) ?? [];
      list.push(row);
      map.set(row.category, list);
    }
    return [...map.entries()];
  }, [locale, query, topics.data]);

  return (
    <Screen title={t('support.topics')} subtitle={t('support.topicsHint')} scroll home={false} back={false}>
      {isAgent ? (
        <>
          <TextField
            label={t('common.search')}
            value={query}
            onChangeText={setQuery}
            placeholder={t('support.searchTopics')}
          />
          {topics.isLoading ? <Text style={styles.meta}>{t('common.loading')}</Text> : null}
          {topics.isError ? <Text style={styles.error}>{t('support.loadFailed')}</Text> : null}
          {!topics.isLoading && !groups.length ? (
            <EmptyState icon="book-outline" title={t('support.emptyTopics')} />
          ) : null}
          {groups.map(([category, rows]) => (
            <View key={category} style={styles.group}>
              <Text style={styles.cat}>{t(`support.topicCategory.${category}`, { defaultValue: category })}</Text>
              {rows.map((topic) => (
                <Card key={topic.id} style={styles.card}>
                  <Text style={styles.title}>{localize(topic.title_i18n, locale)}</Text>
                  <Text style={styles.body}>{localize(topic.body_i18n, locale)}</Text>
                </Card>
              ))}
            </View>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  group: { gap: space.sm },
  cat: { ...type.captionMedium, color: colors.primary, textTransform: 'uppercase' },
  card: { gap: 6 },
  title: { ...type.bodyMedium, color: colors.text },
  body: { ...type.body, color: colors.textSecondary },
  meta: { ...type.body, color: colors.textSecondary },
  error: { ...type.caption, color: colors.danger },
});

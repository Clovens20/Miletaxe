import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { colors, space, type } from '@/theme';

import { useSupportInbox } from './hooks';
import type { SupportInboxRow, SupportStatus } from './types';

export function InboxList({
  filter,
  onOpen,
}: {
  filter?: (row: SupportInboxRow) => boolean;
  onOpen: (id: string) => void;
}) {
  const { t } = useTranslation();
  const inbox = useSupportInbox();
  const rows = (inbox.data ?? []).filter((row) => (filter ? filter(row) : true));

  if (inbox.isError) return <Text style={styles.error}>{t('support.loadFailed')}</Text>;
  if (!rows.length) return <Text style={styles.muted}>{t('support.emptyInbox')}</Text>;

  return (
    <View style={styles.list}>
      {rows.map((row) => (
        <Pressable key={row.id} onPress={() => onOpen(row.id)}>
          <Card>
            <Text style={styles.name}>{row.user_name || row.user_email || t('support.user')}</Text>
            <Text style={styles.meta}>{row.user_email}</Text>
            <Text style={styles.meta}>
              {t(`support.status.${row.status as SupportStatus}`)} · {row.last_message_at.slice(0, 16).replace('T', ' ')}
            </Text>
          </Card>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  name: {
    ...type.bodyMedium,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
});

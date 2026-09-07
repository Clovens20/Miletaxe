import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { formatDateTime } from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

import { useSupportInbox } from './hooks';
import type { SupportInboxRow, SupportStatus } from './types';

type AgentTab = 'queue' | 'mine' | 'done';

function statusTone(status: SupportStatus): 'warning' | 'info' | 'danger' | 'success' {
  if (status === 'open') return 'warning';
  if (status === 'claimed') return 'info';
  if (status === 'escalated') return 'danger';
  return 'success';
}

export function InboxList({
  filter,
  onOpen,
  variant = 'simple',
  agentId,
}: {
  filter?: (row: SupportInboxRow) => boolean;
  onOpen: (id: string) => void;
  variant?: 'simple' | 'agent';
  agentId?: string;
}) {
  const { t, i18n } = useTranslation();
  const inbox = useSupportInbox();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const [tab, setTab] = useState<AgentTab>('queue');
  const [query, setQuery] = useState('');

  const all = inbox.data ?? [];
  const queue = all.filter((row) => row.status === 'open');
  const mine = all.filter((row) => row.status === 'claimed' && row.assigned_agent_id === agentId);
  const done = all.filter((row) => row.status === 'resolved');

  const rows = useMemo(() => {
    const source =
      variant === 'agent'
        ? tab === 'queue'
          ? queue
          : tab === 'mine'
            ? mine
            : done
        : all.filter((row) => (filter ? filter(row) : true));
    const needle = query.trim().toLowerCase();
    if (!needle) return source;
    return source.filter((row) => {
      const hay = `${row.user_name ?? ''} ${row.user_email ?? ''} ${row.last_message ?? ''}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [all, done, filter, mine, query, queue, tab, variant]);

  if (inbox.isLoading) return <Text style={styles.muted}>{t('common.loading')}</Text>;
  if (inbox.isError) return <Text style={styles.error}>{t('support.loadFailed')}</Text>;

  return (
    <View style={styles.list}>
      {variant === 'agent' ? (
        <SegmentedControl
          value={tab}
          onChange={(value) => setTab(value as AgentTab)}
          options={[
            { value: 'queue', label: `${t('support.tabQueue')} (${queue.length})` },
            { value: 'mine', label: `${t('support.tabMine')} (${mine.length})` },
            { value: 'done', label: `${t('support.tabDone')} (${done.length})` },
          ]}
        />
      ) : null}
      <TextField
        label={t('common.search')}
        value={query}
        onChangeText={setQuery}
        placeholder={t('support.searchInbox')}
      />
      {!rows.length ? (
        <EmptyState icon="chatbubble-ellipses-outline" title={t('support.emptyInbox')} body={t('support.emptyInboxHint')} />
      ) : (
        rows.map((row) => (
          <Pressable key={row.id} onPress={() => onOpen(row.id)}>
            <Card style={styles.card}>
              <View style={styles.head}>
                <Text style={styles.name}>{row.user_name || row.user_email || t('support.user')}</Text>
                <Badge label={t(`support.status.${row.status as SupportStatus}`)} tone={statusTone(row.status)} />
              </View>
              {row.user_email ? <Text style={styles.meta}>{row.user_email}</Text> : null}
              {row.last_message ? (
                <Text style={styles.preview} numberOfLines={2}>
                  {row.last_message}
                </Text>
              ) : null}
              <Text style={styles.meta}>{formatDateTime(row.last_message_at, locale)}</Text>
            </Card>
          </Pressable>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: space.sm,
  },
  card: {
    gap: 6,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  name: {
    ...type.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  preview: {
    ...type.body,
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

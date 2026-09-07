import { useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { formatDateTime } from '@/lib/format';
import { localize } from '@/lib/i18n/localize';
import type { SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

import { useSendSupportMessage, useSupportInbox, useSupportMessages, useSupportThread, useSupportTopics, useUpdateSupportThread } from './hooks';
import type { SupportAuthorRole, SupportStatus } from './types';

function statusTone(status: SupportStatus): 'warning' | 'info' | 'danger' | 'success' {
  if (status === 'open') return 'warning';
  if (status === 'claimed') return 'info';
  if (status === 'escalated') return 'danger';
  return 'success';
}

export function ConversationPanel({
  threadId,
  role,
  locale,
  agentId,
  showDeskActions,
}: {
  threadId: string;
  role: SupportAuthorRole;
  locale: SupportedLocale;
  agentId?: string;
  showDeskActions?: boolean;
}) {
  const { t } = useTranslation();
  const router = useRouter();
  const thread = useSupportThread(threadId);
  const messages = useSupportMessages(threadId);
  const inbox = useSupportInbox(Boolean(showDeskActions));
  const topics = useSupportTopics(Boolean(showDeskActions));
  const send = useSendSupportMessage(role);
  const update = useUpdateSupportThread();
  const [draft, setDraft] = useState('');
  const [topicQuery, setTopicQuery] = useState('');
  const status = thread.data?.status;
  const lastMessage = (messages.data ?? []).at(-1);
  const lastFromStaff = Boolean(lastMessage && lastMessage.author_role !== 'user');
  const header = inbox.data?.find((row) => row.id === threadId);
  const mine = Boolean(agentId && thread.data?.assigned_agent_id === agentId);
  const canAct = status === 'open' || mine || role === 'admin';
  const canReply =
    role === 'user'
      ? true
      : role === 'admin'
        ? status !== 'resolved'
        : Boolean(canAct && (status === 'open' || status === 'claimed'));
  const deskOpen = Boolean(showDeskActions && canAct && (status === 'open' || status === 'claimed'));
  const transferred = status === 'escalated' && role === 'agent';

  const visibleTopics = useMemo(() => {
    const needle = topicQuery.trim().toLowerCase();
    return (topics.data ?? []).filter((topic) => {
      if (!needle) return true;
      const title = localize(topic.title_i18n, locale).toLowerCase();
      const body = localize(topic.body_i18n, locale).toLowerCase();
      const category = typeof topic.category === 'string' ? topic.category : '';
      return `${category} ${title} ${body}`.includes(needle);
    });
  }, [locale, topicQuery, topics.data]);

  const topicGroups = useMemo(() => {
    const map = new Map<string, typeof visibleTopics>();
    for (const topic of visibleTopics) {
      const list = map.get(topic.category) ?? [];
      list.push(topic);
      map.set(topic.category, list);
    }
    return [...map.entries()];
  }, [visibleTopics]);

  const transferToAdmin = async () => {
    if (role !== 'agent') return;
    if (Platform.OS === 'web' && !window.confirm(t('support.transferConfirm'))) return;
    await update.mutateAsync({
      id: threadId,
      patch: { status: 'escalated', assigned_agent_id: null, escalated_by: agentId ?? null },
    });
    router.replace('/employes' as Href);
  };

  const claimIfNeeded = async () => {
    if (role === 'agent' && status === 'open' && agentId) {
      await update.mutateAsync({
        id: threadId,
        patch: { status: 'claimed', assigned_agent_id: agentId },
      });
    }
  };

  const post = async (body: string) => {
    const text = body.trim();
    if (!text || !canReply) return;
    await send.mutateAsync({ threadId, body: text });
    await claimIfNeeded();
    setDraft('');
  };

  if (!threadId || thread.isLoading || thread.isPending || messages.isLoading || messages.isPending) {
    return <Text style={styles.meta}>{t('common.loading')}</Text>;
  }
  if (thread.isError || !thread.data) {
    if (role === 'agent') return <Text style={styles.meta}>{t('support.escalatedGone')}</Text>;
    return <Text style={styles.error}>{t('support.conversationLoadFailed')}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {showDeskActions ? (
        <Card style={styles.header}>
          <Text style={styles.name}>{header?.user_name || header?.user_email || t('support.user')}</Text>
          {header?.user_email ? <Text style={styles.meta}>{header.user_email}</Text> : null}
          {status ? <Badge label={t(`support.status.${status}`)} tone={statusTone(status)} /> : null}
        </Card>
      ) : status ? (
        <Badge label={t(`support.status.${status}`)} tone={statusTone(status)} />
      ) : null}

      {transferred ? <Text style={styles.meta}>{t('support.escalatedGone')}</Text> : null}

      {deskOpen ? (
        <Card style={styles.tools}>
          <Text style={styles.section}>{t('support.topicPicker')}</Text>
          <Text style={styles.meta}>{t('support.topicPickerHint')}</Text>
          <TextField
            label={t('common.search')}
            value={topicQuery}
            onChangeText={setTopicQuery}
            placeholder={t('support.searchTopics')}
          />
          {topicGroups.map(([category, rows]) => (
            <View key={category} style={styles.topicGroup}>
              <Text style={styles.cat}>{t(`support.topicCategory.${category}`, { defaultValue: category })}</Text>
              {rows.map((topic) => (
                <Card key={topic.id} style={styles.topicCard}>
                  <Text style={styles.topicTitle}>{localize(topic.title_i18n, locale)}</Text>
                  <Text style={styles.topicBody}>{localize(topic.body_i18n, locale)}</Text>
                  <Button
                    variant="secondary"
                    label={t('support.sendSolution')}
                    loading={send.isPending || update.isPending}
                    onPress={() =>
                      void (async () => {
                        await post(localize(topic.body_i18n, locale));
                        await update.mutateAsync({ id: threadId, patch: { topic_id: topic.id } });
                      })()
                    }
                  />
                </Card>
              ))}
            </View>
          ))}
          <Button
            label={t('support.escalate')}
            variant="danger"
            loading={update.isPending}
            onPress={() => void transferToAdmin()}
          />
        </Card>
      ) : null}

      {role === 'user' && lastFromStaff ? (
        <Text style={styles.continue}>{t('support.continueHint')}</Text>
      ) : null}

      {transferred
        ? null
        : (messages.data ?? []).map((row) => (
            <Card key={row.id} style={[styles.bubble, row.author_role !== 'user' ? styles.staffBubble : null]}>
              <Text style={styles.meta}>
                {t(`support.role.${row.author_role}`)} · {formatDateTime(row.created_at, locale)}
              </Text>
              <Text style={styles.body}>{row.body}</Text>
            </Card>
          ))}

      {canReply ? (
        <>
          <TextField
            label={role === 'user' ? t('support.yourReply') : t('support.message')}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Button
            label={t('support.send')}
            loading={send.isPending || update.isPending}
            onPress={() => void post(draft)}
          />
        </>
      ) : null}

      {showDeskActions && status === 'claimed' && !mine && role !== 'admin' ? (
        <Text style={styles.meta}>{t('support.claimedByOther')}</Text>
      ) : null}
      {showDeskActions && status === 'escalated' ? (
        <Text style={styles.meta}>{t('support.escalatedHint')}</Text>
      ) : null}

      {showDeskActions && status === 'resolved' ? (
        <Button
          label={t('support.reopen')}
          variant="secondary"
          loading={update.isPending}
          onPress={() =>
            void update.mutateAsync({
              id: threadId,
              patch: { status: 'claimed', assigned_agent_id: agentId ?? null },
            })
          }
        />
      ) : null}

      {showDeskActions && canAct && status && status !== 'resolved' && (status !== 'escalated' || role === 'admin') ? (
        <View style={styles.actions}>
          {status === 'open' ? (
            <Button
              label={t('support.claim')}
              loading={update.isPending}
              onPress={() =>
                void update.mutateAsync({
                  id: threadId,
                  patch: { status: 'claimed', assigned_agent_id: agentId ?? null },
                })
              }
            />
          ) : null}
          {status === 'claimed' && mine ? (
            <Button
              label={t('support.release')}
              variant="secondary"
              loading={update.isPending}
              onPress={() =>
                void update.mutateAsync({
                  id: threadId,
                  patch: { status: 'open', assigned_agent_id: null },
                })
              }
            />
          ) : null}
          <Button
            label={t('support.resolve')}
            variant="secondary"
            loading={update.isPending}
            onPress={() => void update.mutateAsync({ id: threadId, patch: { status: 'resolved' } })}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  header: {
    gap: 6,
  },
  name: {
    ...type.section,
    color: colors.text,
  },
  bubble: {
    gap: 4,
  },
  staffBubble: {
    backgroundColor: colors.infoSoft,
    borderColor: colors.info,
  },
  continue: {
    ...type.bodyMedium,
    color: colors.primary,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  body: {
    ...type.body,
    color: colors.text,
  },
  section: {
    ...type.bodyMedium,
    color: colors.text,
    marginTop: space.sm,
  },
  actions: {
    gap: space.xs,
  },
  tools: {
    gap: space.sm,
  },
  topicGroup: {
    gap: space.xs,
  },
  cat: {
    ...type.caption,
    color: colors.primary,
    textTransform: 'uppercase',
  },
  topicCard: {
    gap: 6,
  },
  topicTitle: {
    ...type.bodyMedium,
    color: colors.text,
  },
  topicBody: {
    ...type.caption,
    color: colors.textSecondary,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
});

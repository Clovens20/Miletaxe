import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { localize } from '@/lib/i18n/localize';
import type { SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

import { useSendSupportMessage, useSupportMessages, useSupportThread, useSupportTopics, useUpdateSupportThread } from './hooks';
import type { SupportAuthorRole, SupportStatus } from './types';

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
  const thread = useSupportThread(threadId);
  const messages = useSupportMessages(threadId);
  const topics = useSupportTopics();
  const send = useSendSupportMessage(role);
  const update = useUpdateSupportThread();
  const [draft, setDraft] = useState('');
  const status = thread.data?.status;

  const post = () => {
    const body = draft.trim();
    if (!body) return;
    void send.mutateAsync({ threadId, body }).then(() => setDraft(''));
  };

  return (
    <View style={styles.wrap}>
      {status ? <Text style={styles.status}>{t(`support.status.${status}`)}</Text> : null}
      {(messages.data ?? []).map((row) => (
        <Card key={row.id} style={styles.bubble}>
          <Text style={styles.meta}>{t(`support.role.${row.author_role}`)}</Text>
          <Text style={styles.body}>{row.body}</Text>
        </Card>
      ))}
      {status !== 'resolved' ? (
        <>
          <TextField label={t('support.message')} value={draft} onChangeText={setDraft} multiline />
          <Button label={t('support.send')} loading={send.isPending} onPress={post} />
        </>
      ) : null}
      {showDeskActions && status && status !== 'resolved' ? (
        <View style={styles.actions}>
          {status === 'open' || (status === 'escalated' && role === 'admin') ? (
            <Button
              label={t('support.claim')}
              onPress={() =>
                void update.mutateAsync({
                  id: threadId,
                  patch: { status: 'claimed', assigned_agent_id: agentId ?? null },
                })
              }
            />
          ) : null}
          <Text style={styles.meta}>{t('support.applyTopic')}</Text>
          {(topics.data ?? []).map((topic) => (
            <Button
              key={topic.id}
              variant="secondary"
              label={localize(topic.title_i18n, locale)}
              onPress={() =>
                void update.mutateAsync({
                  id: threadId,
                  patch: { topic_id: topic.id, status: 'resolved' as SupportStatus },
                })
              }
            />
          ))}
          {role === 'agent' && status !== 'escalated' ? (
            <Button
              label={t('support.escalate')}
              variant="danger"
              onPress={() =>
                void update.mutateAsync({
                  id: threadId,
                  patch: { status: 'escalated', assigned_agent_id: null, escalated_by: agentId ?? null },
                })
              }
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  status: {
    ...type.captionMedium,
    color: colors.primary,
  },
  bubble: {
    gap: 4,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
  body: {
    ...type.body,
    color: colors.text,
  },
  actions: {
    gap: space.xs,
  },
});

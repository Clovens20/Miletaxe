import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { formatDateTime } from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

import { useSendSupportMessage, useSupportMessages, useSupportThread } from './hooks';
import type { SupportStatus } from './types';

function statusTone(status: SupportStatus): 'warning' | 'info' | 'danger' | 'success' {
  if (status === 'open') return 'warning';
  if (status === 'claimed') return 'info';
  if (status === 'escalated') return 'danger';
  return 'success';
}

export function UserConversation({ threadId, locale }: { threadId: string; locale: SupportedLocale }) {
  const { t } = useTranslation();
  const thread = useSupportThread(threadId);
  const messages = useSupportMessages(threadId);
  const send = useSendSupportMessage('user');
  const [draft, setDraft] = useState('');
  const status = thread.data?.status;
  const last = (messages.data ?? []).at(-1);
  const lastFromStaff = Boolean(last && last.author_role !== 'user');

  const onSend = async () => {
    const text = draft.trim();
    if (!text) return;
    await send.mutateAsync({ threadId, body: text });
    setDraft('');
  };

  if (!threadId || thread.isLoading || thread.isPending || messages.isLoading || messages.isPending) {
    return <Text style={styles.meta}>{t('common.loading')}</Text>;
  }
  if (thread.isError || !thread.data) {
    return <Text style={styles.error}>{t('support.conversationLoadFailed')}</Text>;
  }

  return (
    <View style={styles.wrap}>
      {status ? (
        <Badge
          label={t(`support.status.${status}`, { defaultValue: status })}
          tone={statusTone(status)}
        />
      ) : null}
      {lastFromStaff ? <Text style={styles.continue}>{t('support.continueHint')}</Text> : null}
      {(messages.data ?? []).map((row) => (
        <Card key={row.id} style={[styles.bubble, row.author_role !== 'user' ? styles.staffBubble : null]}>
          <Text style={styles.meta}>
            {t(`support.role.${row.author_role}`, { defaultValue: row.author_role })}
            {row.created_at ? ` · ${formatDateTime(row.created_at, locale)}` : ''}
          </Text>
          <Text style={styles.body}>{typeof row.body === 'string' ? row.body : ''}</Text>
        </Card>
      ))}
      <TextField label={t('support.yourReply')} value={draft} onChangeText={setDraft} multiline />
      <Button label={t('support.send')} loading={send.isPending} onPress={() => void onSend()} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
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
  error: {
    ...type.caption,
    color: colors.danger,
  },
});

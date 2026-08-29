import { useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { SupportRealtime, useMySupportThreads, useStartSupportThread } from '@/features/support/hooks';
import { colors, space, type } from '@/theme';

export default function SupportHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const threads = useMySupportThreads();
  const start = useStartSupportThread();
  const [body, setBody] = useState('');

  return (
    <Screen title={t('support.helpTitle')} subtitle={t('support.helpHint')} scroll>
      <SupportRealtime />
      <TextField label={t('support.message')} value={body} onChangeText={setBody} multiline />
      <Button
        label={t('support.start')}
        loading={start.isPending}
        onPress={() => {
          const text = body.trim();
          if (!text) return;
          void start.mutateAsync(text).then((thread) => {
            setBody('');
            router.push(`/(app)/support/${thread.id}` as Href);
          });
        }}
      />
      {(threads.data ?? []).map((row) => (
        <Pressable key={row.id} onPress={() => router.push(`/(app)/support/${row.id}` as Href)}>
          <Card>
            <Text style={styles.title}>{t(`support.status.${row.status}`)}</Text>
            <Text style={styles.meta}>{row.last_message_at.slice(0, 16).replace('T', ' ')}</Text>
          </Card>
        </Pressable>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.bodyMedium, color: colors.text },
  meta: { ...type.caption, color: colors.textSecondary, marginTop: space.xxs },
});

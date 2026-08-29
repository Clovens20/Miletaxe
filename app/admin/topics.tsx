import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useSupportTopics, useSupportTopicWrite } from '@/features/support/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { localize } from '@/lib/i18n/localize';
import { colors, space, type } from '@/theme';

export default function AdminTopicsScreen() {
  const { t, i18n } = useTranslation();
  const { isStaff } = useAuth();
  const topics = useSupportTopics();
  const write = useSupportTopicWrite();
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('app');
  const [fr, setFr] = useState('');
  const [en, setEn] = useState('');
  const [bodyFr, setBodyFr] = useState('');
  const [bodyEn, setBodyEn] = useState('');

  if (!isStaff) {
    return (
      <Screen title={t('support.topics')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('support.topics')} subtitle={t('admin.topicsHint')} scroll home={false} back={false}>
      <Card style={styles.card}>
        <Text style={styles.title}>{t('admin.add')}</Text>
        <TextField label={t('admin.code')} value={code} onChangeText={setCode} />
        <TextField label={t('support.category')} value={category} onChangeText={setCategory} />
        <TextField label={t('admin.labelFr')} value={fr} onChangeText={setFr} />
        <TextField label={t('admin.labelEn')} value={en} onChangeText={setEn} />
        <TextField label={t('support.solutionFr')} value={bodyFr} onChangeText={setBodyFr} multiline />
        <TextField label={t('support.solutionEn')} value={bodyEn} onChangeText={setBodyEn} multiline />
        <Button
          label={t('admin.add')}
          loading={write.insert.isPending}
          onPress={() =>
            void write.insert.mutateAsync({
              code: code.trim(),
              category: category.trim(),
              title_i18n: { fr, en },
              body_i18n: { fr: bodyFr, en: bodyEn },
              sort_order: 100,
              is_active: true,
            }).then(() => {
              setCode('');
              setFr('');
              setEn('');
              setBodyFr('');
              setBodyEn('');
            })
          }
        />
      </Card>
      {(topics.data ?? []).map((topic) => (
        <Card key={topic.id} style={styles.card}>
          <Text style={styles.title}>{localize(topic.title_i18n, locale)}</Text>
          <Text style={styles.meta}>{topic.category}</Text>
          <Button
            label={t('common.delete')}
            variant="danger"
            onPress={() => void write.remove.mutateAsync(topic.id)}
          />
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: space.sm },
  title: { ...type.bodyMedium, color: colors.text },
  meta: { ...type.caption, color: colors.textSecondary },
  muted: { ...type.body, color: colors.textSecondary },
});

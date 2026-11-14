import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { defaultLandingContent } from '@/features/marketing/defaultContent';
import { useLandingContent, useSaveLanding } from '@/features/marketing/hooks';
import type { LandingContent, LandingLocale } from '@/features/marketing/types';
import { safeHttpUrl } from '@/lib/links';
import { colors, space, type } from '@/theme';

function withPlayUrl(content: LandingContent, locale: LandingLocale, href: string): LandingContent {
  const fallback = defaultLandingContent(locale).downloads;
  const downloads = content.downloads ?? fallback;
  return {
    ...content,
    downloads: {
      ...downloads,
      playUrl: href,
      playLabel: downloads.playLabel.trim() || fallback.playLabel,
    },
  };
}

/** Lien Play du site public, éditable depuis le tableau de bord. */
export function PlayDownloadCard() {
  const { t } = useTranslation();
  const french = useLandingContent('fr');
  const english = useLandingContent('en');
  const save = useSaveLanding();
  const [url, setUrl] = useState('');
  const [filled, setFilled] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (filled || !french.data) return;
    setUrl(french.data.downloads?.playUrl ?? '');
    setFilled(true);
  }, [filled, french.data]);

  const published = french.data?.downloads?.playUrl?.trim() ?? '';
  const englishUrl = english.data?.downloads?.playUrl?.trim() ?? '';
  const loading = french.isLoading || english.isLoading;

  const publish = async () => {
    setMessage(null);
    setError(null);
    const href = safeHttpUrl(url);
    if (!href || !french.data || !english.data) {
      setError(t('admin.playDownloadInvalid'));
      return;
    }
    try {
      await save.mutateAsync({ locale: 'fr', content: withPlayUrl(french.data, 'fr', href) });
      await save.mutateAsync({ locale: 'en', content: withPlayUrl(english.data, 'en', href) });
      setUrl(href);
      setMessage(t('admin.playDownloadSaved'));
    } catch {
      setError(t('admin.landingSaveFailed'));
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>{t('admin.playDownloadTitle')}</Text>
      <Text style={styles.hint}>{t('admin.playDownloadHint')}</Text>
      {published ? (
        <Text style={styles.current}>
          {t('admin.playDownloadCurrent')}
          {'\n'}
          {published}
          {englishUrl && englishUrl !== published ? `\nEN : ${englishUrl}` : ''}
        </Text>
      ) : null}
      <TextField
        label={t('admin.playDownloadLabel')}
        hint={t('admin.landingStoreUrlHint')}
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        editable={!loading && !save.isPending}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {message ? <Text style={styles.ok}>{message}</Text> : null}
      <Button
        label={t('admin.playDownloadSave')}
        loading={save.isPending || loading}
        onPress={() => void publish()}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.sm,
    marginBottom: space.sm,
  },
  title: {
    ...type.section,
    color: colors.text,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
  current: {
    ...type.caption,
    color: colors.text,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
  ok: {
    ...type.caption,
    color: colors.primary,
  },
});

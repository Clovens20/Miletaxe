import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';

import { FormattedText } from '@/components/ui/FormattedText';
import { Screen } from '@/components/ui/Screen';
import { useLegalPage } from '@/features/account/legalHooks';
import { SiteFooter, SiteHeader } from '@/features/marketing/SiteChrome';
import { htmlToPlain } from '@/lib/html/sanitize';
import { LEGAL_URLS, PRODUCT } from '@/lib/constants';
import { colors, space, type } from '@/theme';

export function LegalDocument({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t } = useTranslation();
  const page = useLegalPage(kind);
  const title = page.data?.title ?? t(kind === 'privacy' ? 'legal.privacyTitle' : 'legal.termsTitle');
  const plainTitle = htmlToPlain(title) || title;
  const sections = page.data?.sections ?? [];
  const updatedOn = page.data?.updatedOn ?? PRODUCT.legalUpdatedOn;
  const canonical = kind === 'privacy' ? LEGAL_URLS.privacy : LEGAL_URLS.terms;
  const body = (
    <>
      <Text style={styles.meta}>{t('legal.updated', { date: updatedOn })}</Text>
      {sections.map((section) => (
        <View key={section.id} style={styles.block}>
          <FormattedText value={section.heading} style={styles.heading} />
          <FormattedText value={section.body} style={styles.body} />
        </View>
      ))}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRoot}>
        <Head>
          <title>{`${plainTitle} — ${PRODUCT.name}`}</title>
          <meta name="description" content={t('landing.metaDescription')} />
          <link rel="canonical" href={canonical} />
        </Head>
        <ScrollView contentContainerStyle={styles.webScroll}>
          <SiteHeader />
          <View style={styles.article}>
            <FormattedText value={title} style={styles.webTitle} />
            {body}
          </View>
          <SiteFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <Screen title={plainTitle} scroll home={false}>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    ...type.caption,
    color: colors.textMuted,
  },
  block: {
    gap: space.sm,
  },
  heading: {
    ...type.section,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  webRoot: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  webScroll: {
    flexGrow: 1,
  },
  article: {
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
    gap: space.lg,
  },
  webTitle: {
    ...type.display,
    color: colors.text,
  },
});

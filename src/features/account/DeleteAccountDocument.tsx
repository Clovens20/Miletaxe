import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { SiteFooter, SiteHeader } from '@/features/marketing/SiteChrome';
import { LEGAL_URLS, PRODUCT } from '@/lib/constants';
import { colors, space, type } from '@/theme';

export function DeleteAccountDocument() {
  const { t } = useTranslation();
  const title = t('legal.deleteAccountTitle');
  const sections = [
    { heading: t('legal.deleteAccountInAppHeading'), body: t('legal.deleteAccountInAppBody') },
    {
      heading: t('legal.deleteAccountWebHeading'),
      body: t('legal.deleteAccountWebBody', { email: PRODUCT.supportEmail }),
    },
    { heading: t('legal.deleteAccountWhatHeading'), body: t('legal.deleteAccountWhatBody') },
    { heading: t('legal.deleteAccountWhenHeading'), body: t('legal.deleteAccountWhenBody') },
  ];
  const body = (
    <>
      <Text style={styles.meta}>{t('legal.updated', { date: PRODUCT.legalUpdatedOn })}</Text>
      <Text style={styles.lead}>{t('legal.deleteAccountLead')}</Text>
      {sections.map((section) => (
        <View key={section.heading} style={styles.block}>
          <Text style={styles.heading}>{section.heading}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </View>
      ))}
    </>
  );

  if (Platform.OS === 'web') {
    return (
      <View style={styles.webRoot}>
        <Head>
          <title>{`${title} — ${PRODUCT.name}`}</title>
          <meta name="description" content={t('legal.deleteAccountLead')} />
          <link rel="canonical" href={LEGAL_URLS.deleteAccount} />
        </Head>
        <ScrollView contentContainerStyle={styles.webScroll}>
          <SiteHeader />
          <View style={styles.article}>
            <Text style={styles.webTitle}>{title}</Text>
            {body}
          </View>
          <SiteFooter />
        </ScrollView>
      </View>
    );
  }

  return (
    <Screen title={title} scroll home={false}>
      {body}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    ...type.caption,
    color: colors.textMuted,
  },
  lead: {
    ...type.body,
    color: colors.textSecondary,
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

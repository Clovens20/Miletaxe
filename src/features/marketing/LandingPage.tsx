import { Image, Platform, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Head from 'expo-router/head';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';

import { Button } from '@/components/ui/Button';
import { FormattedText } from '@/components/ui/FormattedText';
import { defaultLandingContent } from '@/features/marketing/defaultContent';
import { landingLocale, useLandingContent } from '@/features/marketing/hooks';
import { SiteFooter, SiteHeader } from '@/features/marketing/SiteChrome';
import { StoreButtons } from '@/features/marketing/StoreButtons';
import type { LandingContent, LandingSection } from '@/features/marketing/types';
import { PRODUCT } from '@/lib/constants';
import { colors, radius, space, type } from '@/theme';

const logo = require('../../../assets/logo.png');
const shotHome = require('../../../store/play/screenshots/play-01-accueil-1080x1920.jpg');
const shotReceipt = require('../../../store/play/screenshots/play-02-scanner-recu-1080x1920.jpg');
const shotOdo = require('../../../store/play/screenshots/play-06-odometre-1080x1920.jpg');
const shotPack = require('../../../store/play/screenshots/play-04-dossier-comptable-1080x1920.jpg');

const FEATURE_ICONS = ['speedometer-outline', 'receipt-outline', 'wallet-outline', 'document-text-outline', 'shield-checkmark-outline', 'cloud-download-outline'] as const;

export function LandingPage() {
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const wide = width >= 880;
  const landing = useLandingContent();
  const locale = landingLocale(i18n.language);
  const content = landing.data ?? defaultLandingContent(locale);
  const downloads = content.downloads ?? defaultLandingContent(locale).downloads;

  return (
    <View key="landing-with-stores" style={styles.root}>
      {Platform.OS === 'web' ? (
        <Head>
          <title>{content.metaTitle}</title>
          <meta name="description" content={content.metaDescription} />
          <link rel="canonical" href={`${PRODUCT.siteOrigin}/`} />
        </Head>
      ) : null}
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.heroBand}>
          <SiteHeader tone="dark" jumps />
          <View style={[styles.hero, wide && styles.heroWide]}>
            <View style={styles.heroCopy}>
              <FormattedText value={content.hero.eyebrow} tone="dark" style={styles.eyebrow} />
              <FormattedText value={content.hero.title} tone="dark" style={styles.heroTitle} />
              <FormattedText value={content.hero.body} tone="dark" style={styles.heroBody} />
              <View style={styles.heroActions}>
                <StoreButtons downloads={downloads} tone="dark" />
              </View>
              <FormattedText value={content.hero.note} tone="dark" style={styles.heroNote} />
            </View>
            <View style={styles.heroArt}>
              <Image source={logo} style={styles.heroLogo} resizeMode="contain" />
            </View>
          </View>
        </View>
        {content.sections.filter((item) => item.visible).map((item) => (
          <LandingSectionView key={item.id} section={item} wide={wide} downloads={downloads} />
        ))}
        <SiteFooter />
      </ScrollView>
    </View>
  );
}

function LandingSectionView({
  section,
  wide,
  downloads,
}: {
  section: LandingSection;
  wide: boolean;
  downloads: LandingContent['downloads'];
}) {
  if (section.kind === 'screens') {
    return (
      <View nativeID={section.id} style={styles.shotsBand}>
        <FormattedText value={section.title} style={styles.shotsTitle} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shotsRow}>
          {[shotHome, shotOdo, shotReceipt, shotPack].map((source, index) => (
            <Image key={index} source={source} style={styles.shot} resizeMode="cover" />
          ))}
        </ScrollView>
      </View>
    );
  }

  if (section.kind === 'cta') {
    return (
      <View nativeID={section.id} style={styles.final}>
        <FormattedText value={section.title} style={styles.finalTitle} align="center" />
        <FormattedText value={section.body} style={styles.finalBody} align="center" />
        <View style={styles.finalActions}>
          <StoreButtons downloads={downloads} align="center" />
          {section.playSoon ? <FormattedText value={section.playSoon} style={styles.playSoon} align="center" /> : null}
        </View>
      </View>
    );
  }

  const trust = section.variant === 'trust';
  const steps = section.variant === 'steps';

  return (
    <View nativeID={section.navId || section.id} style={[styles.section, trust && styles.trustBand]}>
      <FormattedText value={section.title} style={styles.sectionTitle} />
      {section.body ? <FormattedText value={section.body} style={styles.sectionLead} /> : null}
      <View style={[styles.grid, wide && (trust ? styles.grid2 : styles.grid3)]}>
        {section.cards.map((card, index) =>
          steps ? (
            <View key={card.id} style={styles.step}>
              <Text style={styles.stepNum}>{String(index + 1).padStart(2, '0')}</Text>
              <FormattedText value={card.title} style={styles.cardTitle} />
              <FormattedText value={card.body} style={styles.cardBody} />
            </View>
          ) : (
            <View key={card.id} style={styles.card}>
              {section.showIcons ? (
                <View style={styles.iconWrap}>
                  <Ionicons name={FEATURE_ICONS[index] ?? 'checkmark-circle-outline'} size={22} color={colors.primary} />
                </View>
              ) : null}
              <FormattedText value={card.title} style={styles.cardTitle} />
              <FormattedText value={card.body} style={styles.cardBody} />
            </View>
          ),
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  scroll: {
    flexGrow: 1,
  },
  heroBand: {
    backgroundColor: colors.ink,
  },
  hero: {
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    paddingBottom: 56,
    gap: space.xl,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  heroWide: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroCopy: {
    flex: 1,
    gap: space.md,
  },
  eyebrow: {
    ...type.captionMedium,
    color: colors.primaryMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: type.display.fontFamily,
    fontSize: 40,
    lineHeight: 46,
    color: colors.textInverse,
  },
  heroBody: {
    ...type.body,
    color: 'rgba(247, 255, 248, 0.78)',
    maxWidth: 540,
  },
  heroActions: {
    gap: space.sm,
    maxWidth: 480,
  },
  heroNote: {
    ...type.caption,
    color: 'rgba(247, 255, 248, 0.55)',
  },
  heroArt: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 0.7,
  },
  heroLogo: {
    width: 220,
    height: 260,
  },
  section: {
    paddingHorizontal: space.xl,
    paddingVertical: 56,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
    gap: space.lg,
  },
  sectionTitle: {
    ...type.title,
    color: colors.text,
  },
  sectionLead: {
    ...type.body,
    color: colors.textSecondary,
    maxWidth: 640,
  },
  grid: {
    gap: space.md,
  },
  grid2: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  grid3: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.sm,
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 240,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...type.section,
    color: colors.text,
  },
  cardBody: {
    ...type.body,
    color: colors.textSecondary,
  },
  shotsBand: {
    backgroundColor: colors.surfaceMuted,
    paddingVertical: 48,
    gap: space.lg,
  },
  shotsTitle: {
    ...type.title,
    color: colors.text,
    paddingHorizontal: space.xl,
    maxWidth: 1100,
    width: '100%',
    alignSelf: 'center',
  },
  shotsRow: {
    paddingHorizontal: space.xl,
    gap: space.md,
  },
  shot: {
    width: 180,
    height: 320,
    borderRadius: 28,
    borderWidth: 4,
    borderColor: colors.ink,
  },
  step: {
    flexGrow: 1,
    flexBasis: 260,
    minWidth: 240,
    gap: space.sm,
  },
  stepNum: {
    ...type.metric,
    color: colors.accent,
  },
  trustBand: {
    backgroundColor: colors.surface,
    maxWidth: '100%',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  final: {
    paddingHorizontal: space.xl,
    paddingVertical: 64,
    maxWidth: 720,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
    gap: space.md,
  },
  finalTitle: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
  },
  finalBody: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  finalActions: {
    width: '100%',
    maxWidth: 360,
    gap: space.sm,
  },
  playSoon: {
    ...type.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
});

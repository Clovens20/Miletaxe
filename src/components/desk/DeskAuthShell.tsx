import type { ReactNode } from 'react';
import { Image, Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeskLangToggle } from '@/components/desk/DeskLangToggle';
import { PRODUCT } from '@/lib/constants';
import { colors, radius, space, type } from '@/theme';

const logo = require('../../../assets/logo.png');

type Props = {
  title: string;
  subtitle: string;
  children: ReactNode;
};

/** Coquille web pour connexion admin / employés : marque à gauche, formulaire borné. */
export function DeskAuthShell({ title, subtitle, children }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = Platform.OS === 'web' && width >= 880;

  return (
    <View style={[styles.root, wide && styles.rootWide]}>
      <View style={[styles.brandPane, wide && styles.brandPaneWide]}>
        <Image source={logo} style={styles.logo} resizeMode="contain" accessibilityLabel={PRODUCT.name} />
        <Text style={styles.brandName}>{PRODUCT.name}</Text>
        <Text style={styles.brandTag}>{t('admin.deskBrandTag')}</Text>
        {wide ? (
          <Text style={styles.brandFoot}>
            {PRODUCT.siteOrigin.replace('https://', '')} · {PRODUCT.supportEmail}
          </Text>
        ) : null}
      </View>

      <View style={[styles.formPane, wide && styles.formPaneWide]}>
        <View style={styles.formCard}>
          <Text style={styles.kicker}>{t('admin.deskStaffOnly')}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <View style={styles.fields}>{children}</View>
          <DeskLangToggle />
          <Text
            style={styles.backLink}
            onPress={() => router.push('/' as Href)}
            accessibilityRole="link"
          >
            {t('admin.backToSite')}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: Platform.OS === 'web' ? ('100vh' as unknown as number) : undefined,
    backgroundColor: colors.bg,
  },
  rootWide: {
    flexDirection: 'row',
  },
  brandPane: {
    backgroundColor: colors.ink,
    paddingHorizontal: space.xl,
    paddingTop: space.xxl,
    paddingBottom: space.xl,
    alignItems: 'center',
    gap: space.sm,
  },
  brandPaneWide: {
    flex: 1,
    maxWidth: 440,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: 56,
    gap: space.md,
  },
  logo: {
    width: 72,
    height: 86,
  },
  brandName: {
    ...type.display,
    color: colors.textInverse,
  },
  brandTag: {
    ...type.body,
    color: 'rgba(247, 255, 248, 0.72)',
    maxWidth: 320,
  },
  brandFoot: {
    ...type.caption,
    color: 'rgba(247, 255, 248, 0.45)',
    marginTop: space.xl,
  },
  formPane: {
    flex: 1,
    paddingHorizontal: space.lg,
    paddingVertical: space.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formPaneWide: {
    paddingHorizontal: 56,
  },
  formCard: {
    width: '100%',
    maxWidth: 400,
    gap: space.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.xl,
  },
  kicker: {
    ...type.captionMedium,
    color: colors.primary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
  },
  fields: {
    gap: space.md,
    marginTop: space.sm,
  },
  backLink: {
    ...type.captionMedium,
    color: colors.primary,
    marginTop: space.sm,
  },
});

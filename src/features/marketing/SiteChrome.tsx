import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { FormattedText } from '@/components/ui/FormattedText';
import { useAuth } from '@/features/auth/AuthProvider';
import { defaultLandingContent } from '@/features/marketing/defaultContent';
import { landingLocale, useLandingContent } from '@/features/marketing/hooks';
import { storeLinks } from '@/features/marketing/StoreButtons';
import type { LandingDownloads } from '@/features/marketing/types';
import { setAppLocale } from '@/lib/i18n';
import { openHttpUrl } from '@/lib/links';
import { PRODUCT } from '@/lib/constants';
import { colors, space, type } from '@/theme';

const mark = require('../../../assets/logo-mark.png');

function jump(id: string) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

export function SiteHeader({
  tone = 'light',
  jumps = false,
}: {
  tone?: 'light' | 'dark';
  jumps?: boolean;
}) {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { session } = useAuth();
  const landing = useLandingContent();
  const content = landing.data ?? defaultLandingContent(landingLocale(i18n.language));
  const navLinks = content.sections.flatMap((item) => {
    if (!item.visible || item.kind !== 'cards' || !item.navId) return [];
    return [{ id: item.navId, label: item.navLabel || item.title }];
  });
  const dark = tone === 'dark';
  const locale = i18n.language === 'en' ? 'en' : 'fr';

  return (
    <View style={[styles.header, dark ? styles.headerDark : styles.headerLight]}>
      <Pressable
        accessibilityRole="link"
        onPress={() => router.push('/' as Href)}
        style={({ pressed }) => [styles.brand, pressed && styles.pressed]}
      >
        <Image source={mark} style={styles.mark} resizeMode="contain" />
        <Text style={[styles.brandName, dark && styles.inverse]}>{PRODUCT.name}</Text>
      </Pressable>
      {jumps ? (
        <View style={styles.jumps}>
          {navLinks.map((link) => (
            <HeaderLink key={link.id} dark={dark} label={link.label} onPress={() => jump(link.id)} />
          ))}
        </View>
      ) : null}
      <View style={styles.actions}>
        <Pressable onPress={() => setAppLocale(locale === 'fr' ? 'en' : 'fr')} style={({ pressed }) => pressed && styles.pressed}>
          <Text style={[styles.lang, dark && styles.inverseMuted]}>{locale === 'fr' ? t('landing.langEn') : t('landing.langFr')}</Text>
        </Pressable>
        {session ? (
          <Pressable onPress={() => router.push('/(app)/(tabs)' as Href)} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={[styles.textLink, dark && styles.inverse]}>{t('landing.workspace')}</Text>
          </Pressable>
        ) : (
          <>
            <Pressable onPress={() => router.push('/(auth)/login' as Href)} style={({ pressed }) => pressed && styles.pressed}>
              <Text style={[styles.textLink, dark && styles.inverse]}>{content.login}</Text>
            </Pressable>
            <Pressable
              onPress={() => router.push('/(auth)/register' as Href)}
              style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
            >
              <Text style={styles.ctaLabel}>{content.register}</Text>
            </Pressable>
          </>
        )}
        <HeaderStoreLinks downloads={content.downloads ?? defaultLandingContent(landingLocale(i18n.language)).downloads} dark={dark} />
      </View>
    </View>
  );
}

function HeaderStoreLinks({ downloads, dark }: { downloads: LandingDownloads; dark: boolean }) {
  const links = storeLinks(downloads);
  if (!links.length) return null;
  return (
    <>
      {links.map((store) => (
        <Pressable
          key={store.key}
          accessibilityRole="link"
          accessibilityLabel={store.label}
          onPress={() => openHttpUrl(store.url)}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={[styles.textLink, dark && styles.inverse]}>{store.key === 'play' ? 'Google Play' : 'App Store'}</Text>
        </Pressable>
      ))}
    </>
  );
}

function HeaderLink({ dark, label, onPress }: { dark: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      <Text style={[styles.jump, dark && styles.inverseMuted]}>{label}</Text>
    </Pressable>
  );
}

export function SiteFooter() {
  const { i18n, t } = useTranslation();
  const router = useRouter();
  const landing = useLandingContent();
  const content = landing.data ?? defaultLandingContent(landingLocale(i18n.language));
  const year = new Date().getFullYear();

  return (
    <View style={styles.footer}>
      <Text style={styles.footerBrand}>{PRODUCT.name}</Text>
      <FormattedText
        value={content.footer.rights.replace('{{year}}', String(year))}
        tone="dark"
        style={styles.footerMeta}
        align="center"
      />
      <View style={styles.footerLinks}>
        <Pressable onPress={() => router.push('/legal/privacy' as Href)}>
          <Text style={styles.footerLink}>{content.footer.privacy}</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Pressable onPress={() => router.push('/legal/terms' as Href)}>
          <Text style={styles.footerLink}>{content.footer.terms}</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Pressable onPress={() => router.push('/legal/delete-account' as Href)}>
          <Text style={styles.footerLink}>{t('legal.deleteAccountTitle')}</Text>
        </Pressable>
        <Text style={styles.dot}>·</Text>
        <Text style={styles.footerLink}>{PRODUCT.supportEmail}</Text>
      </View>
      <Text style={styles.footerMeta}>{PRODUCT.siteOrigin.replace('https://', '')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    flexWrap: 'wrap',
    ...(Platform.OS === 'web' ? ({ position: 'sticky', top: 0, zIndex: 20 } as object) : null),
  },
  headerLight: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerDark: {
    backgroundColor: colors.ink,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  mark: {
    width: 36,
    height: 36,
  },
  brandName: {
    ...type.section,
    color: colors.text,
  },
  jumps: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    flex: 1,
  },
  jump: {
    ...type.callout,
    color: colors.textSecondary,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    marginLeft: 'auto',
  },
  lang: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  textLink: {
    ...type.callout,
    color: colors.text,
  },
  cta: {
    backgroundColor: colors.primary,
    paddingHorizontal: space.md,
    paddingVertical: 10,
    borderRadius: 10,
  },
  ctaLabel: {
    ...type.callout,
    color: colors.textInverse,
  },
  inverse: {
    color: colors.textInverse,
  },
  inverseMuted: {
    color: 'rgba(247, 255, 248, 0.72)',
  },
  pressed: {
    opacity: 0.75,
  },
  footer: {
    backgroundColor: colors.ink,
    paddingHorizontal: space.xl,
    paddingVertical: space.xxxl,
    gap: space.sm,
    alignItems: 'center',
  },
  footerBrand: {
    ...type.subtitle,
    color: colors.textInverse,
  },
  footerMeta: {
    ...type.caption,
    color: 'rgba(247, 255, 248, 0.62)',
    textAlign: 'center',
  },
  footerLinks: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: space.sm,
  },
  footerLink: {
    ...type.callout,
    color: colors.primaryMuted,
  },
  dot: {
    color: 'rgba(247, 255, 248, 0.4)',
  },
});

import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type ViewProps,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HOME_HREF } from '@/lib/navigation';
import { colors, radius, space, type } from '@/theme';

type Props = ViewProps & {
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  footer?: ReactNode;
  home?: boolean;
  back?: boolean;
};

export function Screen({
  title,
  subtitle,
  scroll,
  footer,
  home = true,
  back = true,
  children,
  style,
}: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const canGoBack = router.canGoBack();
  const showBack = back && canGoBack;
  const showChrome = Boolean(title || showBack || home);

  const content = (
    <View style={[styles.body, scroll ? styles.bodyScroll : styles.bodyFill, style]}>
      {showChrome ? (
        <View style={styles.chrome}>
          {showBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('common.back')}
              onPress={() => router.back()}
              style={({ pressed }) => [styles.chromeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="chevron-back" size={22} color={colors.text} />
              <Text style={styles.chromeBtnLabel}>{t('common.back')}</Text>
            </Pressable>
          ) : (
            <View style={styles.chromeSpacer} />
          )}
          <View style={styles.chromeCenter}>
            {title ? (
              <Text style={styles.chromeTitle} numberOfLines={1}>
                {title}
              </Text>
            ) : null}
          </View>
          {home ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('tabs.home')}
              onPress={() => router.replace(HOME_HREF)}
              style={({ pressed }) => [styles.chromeBtn, styles.homeBtn, pressed && styles.pressed]}
            >
              <Ionicons name="home" size={18} color={colors.primary} />
              <Text style={styles.homeLabel}>{t('tabs.home')}</Text>
            </Pressable>
          ) : (
            <View style={styles.chromeSpacer} />
          )}
        </View>
      ) : null}
      {subtitle && showChrome ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {!showChrome && title ? <Text style={styles.title}>{title}</Text> : null}
      {!showChrome && subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
            {content}
          </ScrollView>
        ) : (
          content
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  body: {
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    gap: space.md,
    width: '100%',
    maxWidth: '100%',
  },
  bodyFill: {
    flex: 1,
  },
  bodyScroll: {
    flexGrow: 1,
  },
  scroll: {
    paddingBottom: 40,
    flexGrow: 1,
    width: '100%',
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    gap: space.xs,
  },
  chromeBtn: {
    minWidth: 72,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  homeBtn: {
    justifyContent: 'flex-end',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.full,
    paddingHorizontal: space.sm,
    minWidth: 0,
  },
  chromeBtnLabel: {
    ...type.captionMedium,
    color: colors.text,
  },
  homeLabel: {
    ...type.captionMedium,
    color: colors.primary,
  },
  chromeCenter: {
    flex: 1,
    alignItems: 'center',
  },
  chromeTitle: {
    ...type.section,
    color: colors.text,
    textAlign: 'center',
  },
  chromeSpacer: {
    minWidth: 72,
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  subtitle: {
    ...type.body,
    color: colors.textSecondary,
    marginTop: -4,
  },
  footer: {
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    paddingTop: space.sm,
  },
  pressed: {
    opacity: 0.7,
  },
});

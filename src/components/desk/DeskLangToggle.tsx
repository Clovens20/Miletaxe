import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import { setAppLocale } from '@/lib/i18n';
import type { SupportedLocale } from '@/types/domain';
import { colors, radius, type } from '@/theme';

export function DeskLangToggle() {
  const { i18n } = useTranslation();
  const { session, profile, updateProfile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;

  const setLocale = (next: SupportedLocale) => {
    setAppLocale(next);
    if (session && profile) void updateProfile({ preferred_locale: next });
  };

  return (
    <View style={styles.row}>
      {(['fr', 'en'] as const).map((code) => (
        <Pressable
          key={code}
          onPress={() => setLocale(code)}
          style={[styles.chip, locale === code && styles.chipOn]}
        >
          <Text style={[styles.label, locale === code && styles.labelOn]}>{code.toUpperCase()}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    ...type.captionMedium,
    color: colors.textMuted,
  },
  labelOn: {
    color: colors.primary,
  },
});

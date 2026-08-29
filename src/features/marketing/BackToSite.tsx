import { Platform, Pressable, StyleSheet, Text } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { colors, type } from '@/theme';

export function BackToSite() {
  const { t } = useTranslation();
  const router = useRouter();
  if (Platform.OS !== 'web') return null;
  return (
    <Pressable onPress={() => router.push('/' as Href)} style={({ pressed }) => pressed && styles.pressed}>
      <Text style={styles.link}>{t('landing.backToSite')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  link: {
    ...type.callout,
    color: colors.primary,
  },
  pressed: {
    opacity: 0.7,
  },
});

import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { colors, radius, space, type } from '@/theme';

export function DisclaimerBanner({ text }: { text?: string }) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
      <Text style={styles.text}>{text ?? t('disclaimer.short')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: space.xs,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'flex-start',
  },
  text: {
    ...type.caption,
    color: colors.textSecondary,
    flex: 1,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

type Props = {
  label: string;
  subtitle?: string;
  loading?: boolean;
  onPress: () => void;
};

export function HeroButton({ label, subtitle, loading, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [styles.base, pressed && styles.pressed, loading && styles.disabled]}
    >
      <View style={styles.icon}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name="document-text-outline" size={28} color={colors.primary} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={styles.label}>{label}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.md,
  },
  pressed: {
    opacity: 0.88,
  },
  disabled: {
    opacity: 0.7,
  },
  icon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.textInverse,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    ...type.section,
    color: colors.textInverse,
  },
  subtitle: {
    ...type.caption,
    color: colors.primarySoft,
  },
});

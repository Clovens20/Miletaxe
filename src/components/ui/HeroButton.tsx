import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

type Variant = 'primary' | 'secondary';

type Props = {
  label: string;
  subtitle?: string;
  loading?: boolean;
  onPress: () => void;
  variant?: Variant;
  icon?: keyof typeof Ionicons.glyphMap;
};

export function HeroButton({
  label,
  subtitle,
  loading,
  onPress,
  variant = 'primary',
  icon = 'document-text-outline',
}: Props) {
  const palette = variant === 'secondary' ? secondary : primary;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        loading && styles.disabled,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: palette.iconBg }]}>
        {loading ? (
          <ActivityIndicator color={colors.primary} />
        ) : (
          <Ionicons name={icon} size={28} color={palette.iconFg} />
        )}
      </View>
      <View style={styles.copy}>
        <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
        {subtitle ? <Text style={[styles.subtitle, { color: palette.muted }]}>{subtitle}</Text> : null}
      </View>
    </Pressable>
  );
}

const primary = {
  bg: colors.primary,
  border: colors.primary,
  fg: colors.textInverse,
  muted: colors.primarySoft,
  iconBg: colors.textInverse,
  iconFg: colors.primary,
};

const secondary = {
  bg: colors.surface,
  border: colors.primaryMuted,
  fg: colors.text,
  muted: colors.textSecondary,
  iconBg: colors.primarySoft,
  iconFg: colors.primary,
};

const styles = StyleSheet.create({
  base: {
    minHeight: 92,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    borderRadius: radius.lg,
    borderWidth: 1,
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  label: {
    ...type.section,
  },
  subtitle: {
    ...type.caption,
  },
});

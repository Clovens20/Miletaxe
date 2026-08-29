import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import { colors, space, type } from '@/theme';

export type DeskNavLink = {
  href: string;
  label: string;
  active: boolean;
};

export function DeskNav({
  brand,
  links,
  leaveLabel,
  onLeave,
}: {
  brand: string;
  links: DeskNavLink[];
  leaveLabel: string;
  onLeave: () => void;
}) {
  const router = useRouter();

  return (
    <View style={styles.side}>
      <Text style={styles.brand}>{brand}</Text>
      <View style={styles.links}>
        {links.map((link) => (
          <Pressable
            key={String(link.href)}
            onPress={() => router.push(link.href as Href)}
            style={({ pressed }) => [styles.link, link.active && styles.linkOn, pressed && styles.pressed]}
          >
            <Text style={[styles.linkText, link.active && styles.linkTextOn]}>{link.label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onLeave} style={({ pressed }) => pressed && styles.pressed}>
        <Text style={styles.leave}>{leaveLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  side: {
    width: 240,
    paddingHorizontal: space.md,
    paddingVertical: space.lg,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    backgroundColor: colors.surface,
    gap: space.md,
  },
  brand: {
    ...type.bodyMedium,
    color: colors.text,
    paddingHorizontal: space.sm,
  },
  links: {
    flex: 1,
    gap: space.xs,
    overflow: 'scroll',
  },
  link: {
    paddingHorizontal: space.sm,
    paddingVertical: 10,
    borderRadius: 8,
  },
  linkOn: {
    backgroundColor: colors.primarySoft,
  },
  linkText: {
    ...type.callout,
    color: colors.textSecondary,
  },
  linkTextOn: {
    color: colors.primary,
  },
  leave: {
    ...type.callout,
    color: colors.danger,
    paddingHorizontal: space.sm,
    paddingVertical: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});

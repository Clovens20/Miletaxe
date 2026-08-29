import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { openHttpUrl, safeHttpUrl } from '@/lib/links';
import { colors, radius, space, type } from '@/theme';

import type { LandingDownloads } from './types';

type Store = {
  key: 'play' | 'ios';
  label: string;
  url: string;
  icon: keyof typeof Ionicons.glyphMap;
};

export function storeLinks(downloads?: LandingDownloads | null): Store[] {
  if (!downloads) return [];
  const rows: Store[] = [
    { key: 'play', label: downloads.playLabel, url: downloads.playUrl, icon: 'logo-google-playstore' },
    { key: 'ios', label: downloads.iosLabel, url: downloads.iosUrl, icon: 'logo-apple' },
  ];
  return rows.filter((row) => row.label.trim() && safeHttpUrl(row.url));
}

export function StoreButtons({
  downloads,
  align = 'start',
  tone = 'light',
}: {
  downloads?: LandingDownloads | null;
  align?: 'start' | 'center';
  tone?: 'light' | 'dark';
}) {
  const links = storeLinks(downloads);
  if (!links.length) return null;
  const dark = tone === 'dark';

  return (
    <View style={[styles.row, align === 'center' && styles.center]}>
      {links.map((store) => (
        <Pressable
          key={store.key}
          accessibilityRole="link"
          accessibilityLabel={store.label}
          onPress={() => openHttpUrl(store.url)}
          style={({ pressed }) => [styles.btn, dark && styles.btnDark, pressed && styles.pressed]}
        >
          <Ionicons name={store.icon} size={20} color={dark ? colors.ink : colors.textInverse} />
          <Text style={[styles.label, dark && styles.labelDark]}>{store.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  center: {
    justifyContent: 'center',
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    borderWidth: 1,
    borderColor: 'rgba(247, 255, 248, 0.18)',
    paddingHorizontal: space.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    minWidth: 200,
  },
  btnDark: {
    backgroundColor: colors.textInverse,
    borderColor: colors.textInverse,
  },
  pressed: {
    opacity: 0.82,
  },
  label: {
    ...type.callout,
    color: colors.textInverse,
    flexShrink: 1,
  },
  labelDark: {
    color: colors.ink,
  },
});

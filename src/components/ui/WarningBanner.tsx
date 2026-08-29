import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, space, type } from '@/theme';

type Tone = 'warning' | 'danger' | 'info';

const tones: Record<Tone, { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  warning: { bg: colors.warningSoft, fg: colors.warning, icon: 'warning-outline' },
  danger: { bg: colors.dangerSoft, fg: colors.danger, icon: 'alert-circle-outline' },
  info: { bg: colors.infoSoft, fg: colors.info, icon: 'information-circle-outline' },
};

export function WarningBanner({
  title,
  body,
  tone = 'warning',
}: {
  title: string;
  body?: string;
  tone?: Tone;
}) {
  const palette = tones[tone];
  return (
    <View style={[styles.wrap, { backgroundColor: palette.bg }]}>
      <Ionicons name={palette.icon} size={20} color={palette.fg} />
      <View style={styles.copy}>
        <Text style={[styles.title, { color: palette.fg }]}>{title}</Text>
        {body ? <Text style={styles.body}>{body}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: space.sm,
    borderRadius: radius.md,
    padding: space.sm,
    alignItems: 'flex-start',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  title: {
    ...type.callout,
  },
  body: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

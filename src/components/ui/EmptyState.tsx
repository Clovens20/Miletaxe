import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, radius, space, type } from '@/theme';

type Props = {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  body?: string;
};

export function EmptyState({ icon = 'folder-open-outline', title, body }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        <Ionicons name={icon} size={28} color={colors.primary} />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: space.xxl,
    paddingHorizontal: space.lg,
    gap: space.sm,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...type.section,
    color: colors.text,
    textAlign: 'center',
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

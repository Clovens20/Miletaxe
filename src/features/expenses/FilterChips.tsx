import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { colors, radius, space, type } from '@/theme';

type Option = { value: string; label: string };

export function FilterChips({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row} nestedScrollEnabled>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.chip, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: space.xs,
    paddingVertical: 2,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    justifyContent: 'center',
  },
  active: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  label: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  activeLabel: {
    color: colors.primary,
  },
});

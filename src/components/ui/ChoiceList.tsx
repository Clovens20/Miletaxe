import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, radius, space, type } from '@/theme';

type Option = { value: string; label: string };

export function ChoiceList({
  options,
  value,
  onChange,
}: {
  options: Option[];
  value?: string;
  onChange: (value: string) => void;
}) {
  return (
    <ScrollView style={styles.list} contentContainerStyle={styles.content} nestedScrollEnabled>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.item, active && styles.active]}
          >
            <Text style={[styles.label, active && styles.activeLabel]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 280,
  },
  content: {
    gap: 8,
  },
  item: {
    minHeight: 48,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: space.md,
    justifyContent: 'center',
  },
  active: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  label: {
    ...type.body,
    color: colors.text,
  },
  activeLabel: {
    color: colors.primary,
    fontFamily: type.bodyMedium.fontFamily,
  },
});

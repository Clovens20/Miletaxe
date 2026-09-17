import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { FilterChips } from '@/features/expenses/FilterChips';
import { RECORD_PERIODS } from '@/features/records/useRecordPeriod';
import type { SpendingPeriodKind } from '@/features/expenses/engine';
import { colors, radius, space, type } from '@/theme';

export function PeriodSwitcher({
  kind,
  onKindChange,
  periodLabel,
  canGoPrev,
  canGoNext,
  onPrev,
  onNext,
}: {
  kind: SpendingPeriodKind;
  onKindChange: (value: SpendingPeriodKind) => void;
  periodLabel: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <FilterChips
        value={kind}
        onChange={(value) => onKindChange(value as SpendingPeriodKind)}
        options={RECORD_PERIODS.map((value) => ({ value, label: t(`expenses.checkPeriod.${value}`) }))}
      />
      {kind !== 'year' ? (
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('expenses.checkPrev')}
            disabled={!canGoPrev}
            onPress={onPrev}
            style={({ pressed }) => [styles.navBtn, !canGoPrev && styles.navDisabled, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={canGoPrev ? colors.text : colors.textMuted} />
          </Pressable>
          <Text style={styles.navLabel}>{periodLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('expenses.checkNext')}
            disabled={!canGoNext}
            onPress={onNext}
            style={({ pressed }) => [styles.navBtn, !canGoNext && styles.navDisabled, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-forward" size={22} color={canGoNext ? colors.text : colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Text style={styles.yearLabel}>{periodLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: space.sm,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.45,
  },
  navLabel: {
    ...type.bodyMedium,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  yearLabel: {
    ...type.bodyMedium,
    color: colors.text,
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.84,
  },
});

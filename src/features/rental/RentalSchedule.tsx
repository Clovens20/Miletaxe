import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import {
  formatDayOfMonth,
  formatMoney,
  formatWeekdayShort,
  formatWeekRange,
  parseDecimal,
} from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

import {
  DAY_COUNT_PRESETS,
  datesForDayCount,
  previewRental,
  sameDates,
  type RentalRateMode,
} from './engine';

export function WeekNav({
  week,
  locale,
  countryCode,
  canGoNext,
  onPrev,
  onNext,
}: {
  week: string[];
  locale: SupportedLocale;
  countryCode?: string | null;
  canGoNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();
  const start = week[0];
  const end = week[6];
  if (!start || !end) return null;
  return (
    <View style={styles.weekNav}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rental.prevWeek')}
        onPress={onPrev}
        style={({ pressed }) => [styles.weekBtn, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-back" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.weekLabel}>{t('rental.weekOf', { range: formatWeekRange(start, end, locale, countryCode) })}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('rental.nextWeek')}
        disabled={!canGoNext}
        onPress={onNext}
        style={({ pressed }) => [styles.weekBtn, !canGoNext && styles.weekBtnDisabled, pressed && styles.pressed]}
      >
        <Ionicons name="chevron-forward" size={22} color={canGoNext ? colors.text : colors.textMuted} />
      </Pressable>
    </View>
  );
}

export function DayCountPresets({
  week,
  today,
  selected,
  onSelect,
}: {
  week: string[];
  today: string;
  selected: string[];
  onSelect: (dates: string[]) => void;
}) {
  const { t } = useTranslation();
  const todayDates = datesForDayCount(week, 1, today);
  const showToday = week.includes(today);
  return (
    <View style={styles.presets}>
      {showToday ? (
        <Chip
          label={t('rental.presetToday')}
          active={sameDates(selected, todayDates)}
          onPress={() => onSelect(todayDates)}
        />
      ) : null}
      {DAY_COUNT_PRESETS.map((count) => {
        const dates = datesForDayCount(week, count, today);
        return (
          <Chip
            key={count}
            label={t('rental.presetDays', { count })}
            active={sameDates(selected, dates)}
            onPress={() => onSelect(dates)}
          />
        );
      })}
    </View>
  );
}

export function WeekDayPicker({
  week,
  today,
  selected,
  logged,
  locale,
  countryCode,
  onToggle,
}: {
  week: string[];
  today: string;
  selected: string[];
  logged: Set<string>;
  locale: SupportedLocale;
  countryCode?: string | null;
  onToggle: (date: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.days}>
      {week.map((date) => {
        const active = selected.includes(date);
        const isToday = date === today;
        const already = logged.has(date);
        const willRemove = already && !active;
        return (
          <Pressable
            key={date}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={`${formatWeekdayShort(date, locale, countryCode)} ${formatDayOfMonth(date)}${already ? `, ${t('rental.alreadyLogged')}` : ''}${willRemove ? `, ${t('rental.willRemove')}` : ''}`}
            onPress={() => onToggle(date)}
            style={({ pressed }) => [
              styles.day,
              active && styles.dayOn,
              willRemove && styles.dayRemove,
              isToday && !active && !willRemove && styles.dayToday,
              pressed && styles.pressed,
            ]}
          >
            {already ? <View style={styles.loggedDot} /> : null}
            <Text style={[styles.dayWeek, active && styles.dayOnText]}>
              {formatWeekdayShort(date, locale, countryCode)}
            </Text>
            <Text style={[styles.dayNum, active && styles.dayOnText]}>{formatDayOfMonth(date)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SetupDayCountPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (count: number) => void;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.block}>
      <Text style={styles.sectionLabel}>{t('rental.daysPerWeek')}</Text>
      <Text style={styles.hint}>{t('rental.daysPerWeekHint')}</Text>
      <View style={styles.presets}>
        {DAY_COUNT_PRESETS.map((count) => (
          <Chip
            key={count}
            label={t('rental.presetDays', { count })}
            active={value === count}
            onPress={() => onChange(count)}
          />
        ))}
      </View>
    </View>
  );
}

export function RentalRateEditor({
  rateMode,
  onRateModeChange,
  amount,
  onAmountChange,
  days,
  amountError,
  locale,
  currency,
  countryCode,
}: {
  rateMode: RentalRateMode;
  onRateModeChange: (mode: RentalRateMode) => void;
  amount: string;
  onAmountChange: (value: string) => void;
  days: number;
  amountError?: string;
  locale: SupportedLocale;
  currency: CurrencyCode;
  countryCode?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <View style={styles.block}>
      <Text style={styles.sectionLabel}>{t('rental.rateType')}</Text>
      <SegmentedControl
        value={rateMode}
        onChange={(value) => onRateModeChange(value as RentalRateMode)}
        options={[
          { value: 'daily', label: t('rental.rateDaily') },
          { value: 'weekly', label: t('rental.rateWeekly') },
        ]}
      />
      <TextField
        label={rateMode === 'weekly' ? t('rental.weeklyRate') : t('rental.dailyRate')}
        hint={rateMode === 'weekly' ? t('rental.weeklyRateHint') : t('rental.dailyRateHint')}
        keyboardType="decimal-pad"
        value={amount}
        onChangeText={onAmountChange}
        error={amountError}
      />
      <RatePreview
        days={days}
        amount={amount}
        rateMode={rateMode}
        locale={locale}
        currency={currency}
        countryCode={countryCode}
      />
    </View>
  );
}

export function RatePreview({
  days,
  amount,
  rateMode,
  locale,
  currency,
  countryCode,
}: {
  days: number;
  amount: string;
  rateMode: RentalRateMode;
  locale: SupportedLocale;
  currency: CurrencyCode;
  countryCode?: string | null;
}) {
  const { t } = useTranslation();
  const parsed = parseDecimal(amount);
  const preview = previewRental(days, parsed ?? -1, rateMode);
  if (!days || preview.total <= 0) return null;
  return (
    <Card style={styles.preview}>
      <Text style={styles.previewKicker}>{t('rental.previewTitle')}</Text>
      <Text style={styles.previewTotal}>
        {formatMoney(preview.total, currency, locale, countryCode)}
      </Text>
      <Text style={styles.previewLine}>
        {t('rental.previewCount', { count: preview.count })}
        {' · '}
        {t('rental.previewPerDay', {
          amount: formatMoney(preview.perDay, currency, locale, countryCode),
        })}
      </Text>
    </Card>
  );
}

function Chip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, active && styles.chipOn, pressed && styles.pressed]}
    >
      <Text style={[styles.chipLabel, active && styles.chipLabelOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.sm,
  },
  sectionLabel: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  hint: {
    ...type.caption,
    color: colors.textMuted,
    marginTop: -4,
  },
  weekNav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  weekBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekBtnDisabled: {
    opacity: 0.45,
  },
  weekLabel: {
    ...type.bodyMedium,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
  },
  chip: {
    minHeight: 40,
    paddingHorizontal: space.sm,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipLabel: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  chipLabelOn: {
    color: colors.primary,
  },
  days: {
    flexDirection: 'row',
    gap: 6,
  },
  day: {
    flex: 1,
    minHeight: 72,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.xs,
    gap: 2,
  },
  dayOn: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  dayToday: {
    borderColor: colors.accent,
  },
  dayRemove: {
    borderColor: colors.danger,
    backgroundColor: colors.dangerSoft,
  },
  dayWeek: {
    ...type.caption,
    color: colors.textMuted,
    textTransform: 'capitalize',
  },
  dayNum: {
    ...type.bodyMedium,
    color: colors.text,
  },
  dayOnText: {
    color: colors.primary,
  },
  loggedDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  preview: {
    gap: 2,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primaryMuted,
  },
  previewKicker: {
    ...type.captionMedium,
    color: colors.primary,
  },
  previewTotal: {
    ...type.metric,
    color: colors.text,
  },
  previewLine: {
    ...type.caption,
    color: colors.textSecondary,
  },
  pressed: {
    opacity: 0.84,
  },
});

import { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, View } from 'react-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  DayCountPresets,
  RentalRateEditor,
  WeekDayPicker,
  WeekNav,
} from '@/features/rental/RentalSchedule';
import {
  buildRentalEntries,
  convertRateAmount,
  inferSelectedDates,
  previewRental,
  shiftWeek,
  toggleDate,
  weekDates,
  type RentalRateMode,
} from '@/features/rental/engine';
import { parseRentalAmount, useDeleteRentalDays, useLogRentalDays, useRentalDays } from '@/features/rental/hooks';
import { rentalVehiclesOf, useVehicles } from '@/features/vehicles/hooks';
import { addDays, formatDate, formatMoney, startOfWeekIso, todayIso } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function RentalDailyScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ days?: string; date?: string }>();
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const days = useRentalDays();
  const logDays = useLogRentalDays();
  const deleteDays = useDeleteRentalDays();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const country = profile?.country_code;
  const rental = rentalVehiclesOf(vehicles.data)[0];
  const today = todayIso();
  const focusedDate = params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : today;
  const preferredCount = Number(params.days);
  const preferred = Number.isInteger(preferredCount) && preferredCount >= 1 && preferredCount <= 7
    ? preferredCount
    : undefined;

  const [weekStart, setWeekStart] = useState(() => startOfWeekIso(focusedDate));
  const [selectedOverride, setSelectedOverride] = useState<string[] | null>(null);
  const [rateMode, setRateMode] = useState<RentalRateMode>('daily');
  const [amountText, setAmountText] = useState('');
  const [nickname, setNickname] = useState('');
  const [vendor, setVendor] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [rateHydrated, setRateHydrated] = useState(false);
  const [saved, setSaved] = useState<{ count: number; total: number; removed?: number } | null>(null);

  const week = useMemo(() => weekDates(weekStart), [weekStart]);
  const inferred = useMemo(
    () => inferSelectedDates(days.data, week, today, preferred),
    [days.data, week, today, preferred],
  );
  const selectedDates = selectedOverride ?? inferred;
  const logged = useMemo(
    () => new Set((days.data ?? []).filter((row) => week.includes(row.work_date)).map((row) => row.work_date)),
    [days.data, week],
  );
  const removedDates = useMemo(
    () => [...logged].filter((date) => !selectedDates.includes(date)),
    [logged, selectedDates],
  );
  const todayInWeek = week.includes(today);
  const canSkipToday = todayInWeek && (selectedDates.includes(today) || logged.has(today));
  const minWeek = startOfWeekIso(addDays(today, -84));
  const maxWeek = startOfWeekIso(addDays(today, 7));

  useEffect(() => {
    setSelectedOverride(null);
  }, [weekStart]);

  useEffect(() => {
    if (rateHydrated) return;
    if (rental?.daily_rental_rate != null) {
      setAmountText(String(rental.daily_rental_rate));
      setRateHydrated(true);
      return;
    }
    const latest = days.data?.[0];
    if (latest) {
      setAmountText(String(latest.rental_amount));
      setRateHydrated(true);
      return;
    }
    if (vehicles.isFetched && days.isFetched) setRateHydrated(true);
  }, [rateHydrated, rental?.daily_rental_rate, days.data, vehicles.isFetched, days.isFetched]);

  useEffect(() => {
    if (rental?.nickname) setNickname((value) => value || rental.nickname);
    if (rental?.rental_vendor) setVendor((value) => value || rental.rental_vendor || '');
  }, [rental?.nickname, rental?.rental_vendor]);

  const parsedAmount = parseRentalAmount(amountText);
  const preview = previewRental(selectedDates.length, parsedAmount ?? -1, rateMode);

  const changeRateMode = (next: RentalRateMode) => {
    if (parsedAmount != null && selectedDates.length) {
      setAmountText(String(convertRateAmount(parsedAmount, rateMode, next, selectedDates.length)));
    }
    setRateMode(next);
  };

  const onSave = async () => {
    if (!selectedDates.length && !removedDates.length) {
      setError('rental.selectDays');
      return;
    }
    if (selectedDates.length && parsedAmount == null) {
      setError('validation.positive');
      return;
    }
    setError(null);
    const entries = selectedDates.length && parsedAmount != null
      ? buildRentalEntries(selectedDates, parsedAmount, rateMode)
      : [];
    await logDays.mutateAsync({
      entries,
      removeDates: removedDates,
      notes: notes.trim() || null,
      nickname,
      rental_vendor: vendor.trim() || null,
      daily_rental_rate: preview.perDay || rental?.daily_rental_rate || undefined,
    });
    setSaved({
      count: entries.length,
      total: preview.total,
      removed: removedDates.length,
    });
  };

  const skipToday = () => {
    const apply = async () => {
      setSelectedOverride(selectedDates.filter((date) => date !== today));
      if (logged.has(today)) {
        await deleteDays.mutateAsync({ dates: [today], vehicleId: rental?.id });
      }
    };
    const message = t('rental.skipTodayConfirm', { date: formatDate(today, locale, country) });
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) void apply();
      return;
    }
    Alert.alert(t('rental.skipToday'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('rental.skipToday'), onPress: () => void apply() },
    ]);
  };

  return (
    <Screen title={t('rental.title')} subtitle={t('rental.scheduleHint')} scroll>
      {saved ? (
        <Card style={styles.saved}>
          <Text style={styles.savedTitle}>{t('rental.saved')}</Text>
          <Text style={styles.savedBody}>
            {saved.count
              ? t('rental.savedCount', {
                  count: saved.count,
                  amount: formatMoney(saved.total, currency, locale, country),
                })
              : t('rental.removedCount', { count: saved.removed ?? 0 })}
          </Text>
          {saved.count && saved.removed ? (
            <Text style={styles.savedBody}>{t('rental.removedCount', { count: saved.removed })}</Text>
          ) : null}
          <Text style={styles.savedBody}>{t('rental.savedHint')}</Text>
          <Button label={t('rental.addFuel')} onPress={() => router.push('/(app)/expenses/scan' as Href)} />
          <Button
            label={t('rental.addOther')}
            variant="secondary"
            onPress={() => router.push('/(app)/expenses/scan' as Href)}
          />
          <Button label={t('common.done')} variant="ghost" onPress={() => router.back()} />
        </Card>
      ) : (
        <>
          {!rental ? (
            <>
              <TextField
                label={t('vehicles.nickname')}
                hint={t('rental.nicknameHint')}
                value={nickname}
                onChangeText={setNickname}
              />
              <TextField
                label={`${t('rental.vendor')} (${t('common.optional')})`}
                hint={t('rental.vendorHint')}
                value={vendor}
                onChangeText={setVendor}
              />
            </>
          ) : (
            <Text style={styles.meta}>
              {rental.nickname}
              {rental.rental_vendor ? ` · ${rental.rental_vendor}` : ''}
            </Text>
          )}

          <View style={styles.block}>
            <Text style={styles.section}>{t('rental.daysWorked')}</Text>
            <Text style={styles.hint}>{t('rental.daysHint')}</Text>
            <WeekNav
              week={week}
              locale={locale}
              countryCode={country}
              canGoNext={weekStart < maxWeek}
              onPrev={() => weekStart > minWeek && setWeekStart(shiftWeek(weekStart, -1))}
              onNext={() => weekStart < maxWeek && setWeekStart(shiftWeek(weekStart, 1))}
            />
            <DayCountPresets
              week={week}
              today={today}
              selected={selectedDates}
              onSelect={setSelectedOverride}
            />
            <WeekDayPicker
              week={week}
              today={today}
              selected={selectedDates}
              logged={logged}
              locale={locale}
              countryCode={country}
              onToggle={(date) => setSelectedOverride(toggleDate(selectedDates, date))}
            />
            {canSkipToday ? (
              <Button
                label={t('rental.skipToday')}
                variant="secondary"
                loading={deleteDays.isPending}
                onPress={skipToday}
              />
            ) : null}
          </View>

          <RentalRateEditor
            rateMode={rateMode}
            onRateModeChange={changeRateMode}
            amount={amountText}
            onAmountChange={(value) => {
              setAmountText(value);
              if (error === 'validation.positive') setError(null);
            }}
            days={selectedDates.length}
            amountError={error === 'validation.positive' ? t('validation.positive') : undefined}
            locale={locale}
            currency={currency}
            countryCode={country}
          />

          <TextField
            label={`${t('rental.notes')} (${t('common.optional')})`}
            value={notes}
            onChangeText={setNotes}
          />
          {error === 'rental.selectDays' ? <Text style={styles.error}>{t('rental.selectDays')}</Text> : null}
          <Button
            label={
              selectedDates.length
                ? t('rental.logDays', { count: selectedDates.length })
                : removedDates.length
                  ? t('rental.removeDays', { count: removedDates.length })
                  : t('rental.selectDays')
            }
            loading={logDays.isPending}
            disabled={!selectedDates.length && !removedDates.length}
            onPress={() => void onSave()}
          />
        </>
      )}
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  saved: { gap: space.sm },
  savedTitle: { ...type.bodyMedium, color: colors.text },
  savedBody: { ...type.body, color: colors.textSecondary },
  meta: { ...type.caption, color: colors.textSecondary },
  block: { gap: space.sm },
  section: { ...type.captionMedium, color: colors.textSecondary },
  hint: { ...type.caption, color: colors.textMuted, marginTop: -4 },
  error: { ...type.caption, color: colors.danger },
});

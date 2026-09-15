import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { MetricCard } from '@/components/ui/MetricCard';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { useMileageDashboard } from '@/features/mileage/hooks';
import { readingKindLabel } from '@/features/mileage/labels';
import { rentalTotals, useRentalDays } from '@/features/rental/hooks';
import { odometerVehiclesOf, rentalVehiclesOf, useVehicles } from '@/features/vehicles/hooks';
import { formatDateTime, formatDistance, formatMoney } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

export default function MileageDashboardScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const rentalDays = useRentalDays();
  const rentalList = rentalVehiclesOf(vehicles.data);
  const odometerList = odometerVehiclesOf(vehicles.data);
  const [vehicleId, setVehicleId] = useState<string>('all');
  const selected = vehicleId === 'all' ? undefined : vehicleId;
  const dashboard = useMileageDashboard(selected);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const unit = dashboard.unit;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const rental = rentalTotals(rentalDays.data);

  const vehicleOptions = useMemo(
    () => [
      { value: 'all', label: t('common.all') },
      ...odometerList.map((row) => ({ value: row.id, label: row.nickname })),
    ],
    [t, odometerList],
  );

  return (
    <Screen title={t('mileage.dashboard')} subtitle={t('mileage.subtitle')} scroll back={false}>
      {rentalList.length ? (
        <>
          <View style={styles.metrics}>
            <MetricCard
              label={t('rental.today')}
              value={formatMoney(rental.todayAmount, currency, locale, profile?.country_code)}
            />
            <MetricCard
              label={t('rental.month')}
              value={formatMoney(rental.monthAmount, currency, locale, profile?.country_code)}
            />
          </View>
          <Button label={t('rental.logDay')} onPress={() => router.push('/(app)/rental/daily')} />
        </>
      ) : null}

      {odometerList.length ? (
        <SegmentedControl
          options={vehicleOptions.slice(0, 3)}
          value={vehicleOptions.some((row) => row.value === vehicleId) ? vehicleId : 'all'}
          onChange={setVehicleId}
        />
      ) : !vehicles.data?.length ? (
        <EmptyState icon="car-outline" title={t('mileage.noVehicle')} body={t('rental.emptyChoice')} />
      ) : null}

      {odometerList.length ? (
        <>
          {dashboard.invalidCount ? (
            <WarningBanner
              tone="danger"
              title={t('mileage.monotonicTitle')}
              body={`${dashboard.invalidCount} · ${t('mileage.excluded')}`}
            />
          ) : null}
          {dashboard.missingEndToday ? (
            <WarningBanner tone="warning" title={t('mileage.incompleteDay')} body={t('mileage.missingEnd')} />
          ) : null}

          <View style={styles.metrics}>
            <MetricCard
              label={t('mileage.today')}
              value={formatDistance(dashboard.today, unit, locale, profile?.country_code)}
            />
            <MetricCard
              label={t('mileage.week')}
              value={formatDistance(dashboard.week, unit, locale, profile?.country_code)}
            />
          </View>
          <MetricCard
            label={t('mileage.currentOdometer')}
            value={
              dashboard.currentOdometer != null
                ? formatDistance(dashboard.currentOdometer, unit, locale, profile?.country_code)
                : t('mileage.noReading')
            }
            hint={
              dashboard.latest
                ? `${readingKindLabel(dashboard.latest.kind, t)} · ${formatDateTime(dashboard.latest.recorded_at, locale, profile?.country_code)}`
                : undefined
            }
          />

          <View style={styles.actions}>
            <QuickAction
              icon="sunny-outline"
              label={t('mileage.kindStart')}
              onPress={() => router.push('/(app)/odometer/capture?kind=start_of_day')}
            />
            <QuickAction
              icon="moon-outline"
              label={t('mileage.kindEnd')}
              onPress={() => router.push('/(app)/odometer/capture?kind=end_of_day')}
            />
            <QuickAction
              icon="camera-outline"
              label={t('mileage.takePhoto')}
              onPress={() => router.push('/(app)/odometer/capture')}
            />
          </View>

          <Button label={t('mileage.daily')} variant="secondary" onPress={() => router.push('/(app)/mileage/daily')} />
          <Button label={t('mileage.history')} variant="secondary" onPress={() => router.push('/(app)/mileage/history')} />
          <Button label={t('mileage.newReading')} onPress={() => router.push('/(app)/odometer/capture')} />
        </>
      ) : null}

      <Button label={t('vehicles.manage')} variant="ghost" onPress={() => router.push('/(app)/vehicles')} />
      {!vehicles.data?.length ? (
        <>
          <Button label={t('rental.logDay')} onPress={() => router.push('/(app)/rental/daily')} />
          <Button label={t('mileage.addVehicle')} variant="secondary" onPress={() => router.push('/(app)/vehicles/new')} />
        </>
      ) : null}
    </Screen>
  );
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.action}>
      <Ionicons name={icon} size={20} color={colors.primary} />
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  metrics: {
    flexDirection: 'row',
    gap: space.sm,
  },
  actions: {
    gap: space.sm,
  },
  action: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.md,
    minHeight: 52,
  },
  actionLabel: {
    ...type.bodyMedium,
    color: colors.text,
  },
});

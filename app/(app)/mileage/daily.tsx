import { useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { useDailyMileage } from '@/features/mileage/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { formatDate, formatDistance } from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function DailyMileageScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const [vehicleId, setVehicleId] = useState(vehicles.data?.[0]?.id ?? '');
  const daily = useDailyMileage(vehicleId || undefined);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;

  const options = useMemo(
    () => (vehicles.data ?? []).map((row) => ({ value: row.id, label: row.nickname })),
    [vehicles.data],
  );

  return (
    <Screen title={t('mileage.dailyTitle')} scroll>
      {options.length ? (
        <SegmentedControl
          options={options.slice(0, 3)}
          value={options.some((row) => row.value === vehicleId) ? vehicleId : options[0]?.value ?? ''}
          onChange={setVehicleId}
        />
      ) : null}
      {!daily.data.length ? <EmptyState icon="calendar-outline" title={t('mileage.dailyEmpty')} /> : null}
      {daily.data.map((day) => (
        <Card key={day.date} style={styles.card}>
          <Text style={styles.date}>{formatDate(day.date, locale, profile?.country_code)}</Text>
          <Text style={styles.metric}>
            {day.distance != null
              ? formatDistance(day.distance, day.unit, locale, profile?.country_code)
              : t('mileage.incompleteDay')}
          </Text>
          <Text style={styles.meta}>
            {day.start ? `${t('mileage.kindStart')} ${day.start.reading}` : '—'}
            {' → '}
            {day.end ? `${t('mileage.kindEnd')} ${day.end.reading}` : '—'}
          </Text>
          {day.warnings.includes('missing_end') ? (
            <WarningBanner tone="warning" title={t('mileage.incompleteDay')} body={t('mileage.missingEnd')} />
          ) : null}
        </Card>
      ))}
      <Button
        label={t('mileage.newReading')}
        onPress={() => router.push(`/(app)/odometer/capture?vehicleId=${vehicleId}`)}
      />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: space.xs,
  },
  date: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  metric: {
    ...type.metric,
    color: colors.text,
  },
  meta: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

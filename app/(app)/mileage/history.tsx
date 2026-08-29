import { useMemo, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/AuthProvider';
import { evaluateProposedReading, previousValidReading, sortReadings } from '@/features/mileage/engine';
import { useOdometerReadings } from '@/features/mileage/hooks';
import { readingKindLabel } from '@/features/mileage/labels';
import { useVehicles } from '@/features/vehicles/hooks';
import { formatDateTime, formatDistance } from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';

export default function MileageHistoryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const [vehicleId, setVehicleId] = useState(vehicles.data?.[0]?.id ?? '');
  const readings = useOdometerReadings(vehicleId || undefined);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const ordered = useMemo(() => sortReadings(readings.data ?? []).reverse(), [readings.data]);

  const options = useMemo(
    () => (vehicles.data ?? []).map((row) => ({ value: row.id, label: row.nickname })),
    [vehicles.data],
  );

  return (
    <Screen title={t('mileage.historyTitle')} scroll>
      {options.length ? (
        <SegmentedControl
          options={options.slice(0, 3)}
          value={options.some((row) => row.value === vehicleId) ? vehicleId : options[0]?.value ?? ''}
          onChange={setVehicleId}
        />
      ) : null}
      {!ordered.length ? <EmptyState icon="time-outline" title={t('mileage.historyEmpty')} /> : null}
      {ordered.map((row, index) => {
        const older = previousValidReading(ordered.slice(index + 1).reverse(), row.recorded_at);
        const evaluation = evaluateProposedReading(older, {
          reading: row.reading,
          unit: row.unit,
          recorded_on: row.recorded_on,
          recorded_at: row.recorded_at,
        });
        const flags = [
          !row.is_valid ? t('mileage.excluded') : null,
          row.extracted_reading != null && row.extracted_reading !== row.reading ? t('mileage.corrected') : null,
        ]
          .filter(Boolean)
          .join(' · ');
        return (
          <ListRow
            key={row.id}
            icon="speedometer-outline"
            title={formatDistance(row.reading, row.unit, locale, profile?.country_code)}
            subtitle={`${readingKindLabel(row.kind, t)} · ${formatDateTime(row.recorded_at, locale, profile?.country_code)}${flags ? ` · ${flags}` : ''}`}
            right={
              evaluation.is_valid && evaluation.distance != null
                ? formatDistance(evaluation.distance, row.unit, locale, profile?.country_code)
                : undefined
            }
            onPress={() => router.push(`/(app)/odometer/${row.id}` as Href)}
          />
        );
      })}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

import { useMemo } from 'react';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useVehicles } from '@/features/vehicles/hooks';
import { formatDistance } from '@/lib/format';
import type { SupportedLocale } from '@/types/domain';
import { useAuth } from '@/features/auth/AuthProvider';

export default function VehiclesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;

  const rows = useMemo(() => vehicles.data ?? [], [vehicles.data]);

  return (
    <Screen title={t('vehicles.title')} subtitle={t('vehicles.subtitle')} scroll>
      {!rows.length ? (
        <EmptyState icon="car-outline" title={t('vehicles.empty')} />
      ) : (
        rows.map((row) => (
          <ListRow
            key={row.id}
            icon="car-outline"
            title={row.nickname}
            subtitle={[row.year, row.make, row.model].filter(Boolean).join(' ')}
            right={
              row.current_odometer != null
                ? formatDistance(Number(row.current_odometer), row.distance_unit ?? 'km', locale, profile?.country_code)
                : undefined
            }
            onPress={() => router.push(`/(app)/vehicles/${row.id}` as Href)}
          />
        ))
      )}
      <Button label={t('vehicles.add')} onPress={() => router.push('/(app)/vehicles/new')} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

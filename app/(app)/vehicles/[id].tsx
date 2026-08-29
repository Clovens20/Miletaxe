import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { useVehicle, useUpdateVehicle } from '@/features/vehicles/hooks';
import { formatDistance } from '@/lib/format';
import type { DistanceUnit, SupportedLocale } from '@/types/domain';
import { StyleSheet, Text } from 'react-native';
import { colors, type } from '@/theme';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const vehicle = useVehicle(id);
  const update = useUpdateVehicle();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const { control, handleSubmit, reset, watch, setValue, formState } = useForm({
    defaultValues: {
      nickname: '',
      make: '',
      model: '',
      year: '',
      plate: '',
      distance_unit: 'km' as DistanceUnit,
      notes: '',
    },
  });

  useEffect(() => {
    if (!vehicle.data) return;
    reset({
      nickname: vehicle.data.nickname,
      make: vehicle.data.make ?? '',
      model: vehicle.data.model ?? '',
      year: vehicle.data.year ? String(vehicle.data.year) : '',
      plate: vehicle.data.plate ?? '',
      distance_unit: vehicle.data.distance_unit ?? 'km',
      notes: vehicle.data.notes ?? '',
    });
  }, [reset, vehicle.data]);

  const onSubmit = handleSubmit(async (values) => {
    if (!id) return;
    await update.mutateAsync({
      id,
      nickname: values.nickname,
      make: values.make,
      model: values.model,
      year: Number(values.year),
      plate: values.plate || null,
      distance_unit: values.distance_unit,
      notes: values.notes || null,
    });
    router.back();
  });

  return (
    <Screen title={t('vehicles.edit')} scroll>
      <Card>
        <Text style={styles.label}>{t('vehicles.currentOdometer')}</Text>
        <ListRow
          title={
            vehicle.data?.current_odometer != null
              ? formatDistance(
                  Number(vehicle.data.current_odometer),
                  vehicle.data.distance_unit ?? 'km',
                  locale,
                  profile?.country_code,
                )
              : t('mileage.noReading')
          }
          subtitle={t('mileage.history')}
          onPress={() => router.push('/(app)/mileage/history')}
        />
      </Card>
      <Controller
        control={control}
        name="nickname"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('vehicles.nickname')} value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="make"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('vehicles.make')} value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="model"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('vehicles.model')} value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="year"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('vehicles.year')} keyboardType="number-pad" value={value} onChangeText={onChange} />
        )}
      />
      <SegmentedControl
        value={watch('distance_unit')}
        onChange={(value) => setValue('distance_unit', value as DistanceUnit)}
        options={[
          { value: 'km', label: t('onboarding.km') },
          { value: 'mi', label: t('onboarding.mi') },
        ]}
      />
      <Controller
        control={control}
        name="plate"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('vehicles.plate')} autoCapitalize="characters" value={value} onChangeText={onChange} />
        )}
      />
      <Button
        label={t('mileage.newReading')}
        variant="secondary"
        onPress={() => router.push(`/(app)/odometer/capture?vehicleId=${id}`)}
      />
      <Button label={t('common.save')} loading={formState.isSubmitting || update.isPending} onPress={onSubmit} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
});

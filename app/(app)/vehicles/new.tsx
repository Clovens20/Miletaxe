import { Controller, useForm } from 'react-hook-form';
import { useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { useCreateVehicle } from '@/features/vehicles/hooks';
import { parseDecimal } from '@/lib/format';
import { vehicleSchema, type VehicleValues } from '@/lib/validation/schemas';
import type { DistanceUnit } from '@/types/domain';

export default function NewVehicleScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const create = useCreateVehicle();
  const { control, handleSubmit, formState, watch, setValue } = useForm<VehicleValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      nickname: '',
      make: '',
      model: '',
      year: '',
      current_odometer: '',
      distance_unit: (profile?.default_distance_unit ?? 'km') as DistanceUnit,
      plate: '',
      notes: '',
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    const odometer = parseDecimal(values.current_odometer);
    if (odometer == null) return;
    await create.mutateAsync({
      nickname: values.nickname,
      make: values.make,
      model: values.model,
      year: Number(values.year),
      distance_unit: values.distance_unit,
      current_odometer: odometer,
      plate: values.plate || null,
      notes: values.notes || null,
    });
    router.replace('/(app)/vehicles');
  });

  return (
    <Screen title={t('vehicles.add')} scroll>
      <Controller
        control={control}
        name="nickname"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('vehicles.nickname')}
            hint={t('vehicles.nicknameHint')}
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="make"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('vehicles.make')}
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="model"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('vehicles.model')}
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="year"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={t('vehicles.year')}
            keyboardType="number-pad"
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
          />
        )}
      />
      <Controller
        control={control}
        name="current_odometer"
        render={({ field: { onChange, value }, fieldState }) => (
          <TextField
            label={`${t('vehicles.currentOdometer')} (${watch('distance_unit')})`}
            hint={t('vehicles.currentOdometerHint')}
            keyboardType="decimal-pad"
            value={value}
            onChangeText={onChange}
            error={fieldState.error ? t(fieldState.error.message ?? 'validation.odometer') : undefined}
          />
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
      <Button label={t('common.save')} loading={formState.isSubmitting || create.isPending} onPress={onSubmit} />
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

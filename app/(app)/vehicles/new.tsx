import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { type Href, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { RentalRateEditor, SetupDayCountPicker } from '@/features/rental/RentalSchedule';
import { convertRateAmount, resolveStoredDailyRate, type RentalRateMode } from '@/features/rental/engine';
import { parseRentalAmount } from '@/features/rental/hooks';
import { useCreateVehicle } from '@/features/vehicles/hooks';
import { parseDecimal } from '@/lib/format';
import { rentalVehicleSchema, vehicleSchema, type RentalVehicleValues, type VehicleValues } from '@/lib/validation/schemas';
import type { CurrencyCode, DistanceUnit, SupportedLocale } from '@/types/domain';

export default function NewVehicleScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const create = useCreateVehicle();
  const [mode, setMode] = useState<'odometer' | 'rental_daily'>('odometer');
  const [rateMode, setRateMode] = useState<RentalRateMode>('daily');
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const owned = useForm<VehicleValues>({
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
  const rental = useForm<RentalVehicleValues>({
    resolver: zodResolver(rentalVehicleSchema),
    defaultValues: {
      nickname: '',
      daily_rental_rate: '',
      rental_vendor: '',
      notes: '',
    },
  });

  const onSubmitOwned = owned.handleSubmit(async (values) => {
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
      tracking_mode: 'odometer',
    });
    router.replace('/(app)/vehicles');
  });

  const onSubmitRental = rental.handleSubmit(async (values) => {
    const amount = parseRentalAmount(values.daily_rental_rate);
    if (amount == null) return;
    await create.mutateAsync({
      nickname: values.nickname,
      distance_unit: (profile?.default_distance_unit ?? 'km') as DistanceUnit,
      tracking_mode: 'rental_daily',
      ownership_type: 'rented',
      daily_rental_rate: resolveStoredDailyRate(amount, rateMode, daysPerWeek),
      rental_vendor: values.rental_vendor || null,
      notes: values.notes || null,
    });
    router.replace(`/(app)/rental/daily?days=${daysPerWeek}` as Href);
  });

  const changeRateMode = (next: RentalRateMode) => {
    const parsed = parseRentalAmount(rental.getValues('daily_rental_rate'));
    if (parsed != null) {
      rental.setValue('daily_rental_rate', String(convertRateAmount(parsed, rateMode, next, daysPerWeek)));
    }
    setRateMode(next);
  };

  return (
    <Screen title={t('vehicles.add')} scroll>
      <SegmentedControl
        value={mode}
        onChange={(value) => setMode(value as 'odometer' | 'rental_daily')}
        options={[
          { value: 'odometer', label: t('rental.modeOwned') },
          { value: 'rental_daily', label: t('rental.modeRented') },
        ]}
      />
      {mode === 'rental_daily' ? (
        <>
          <Controller
            control={rental.control}
            name="nickname"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={t('vehicles.nickname')}
                hint={t('rental.nicknameHint')}
                value={value}
                onChangeText={onChange}
                error={fieldState.error ? t(fieldState.error.message ?? 'validation.required') : undefined}
              />
            )}
          />
          <Controller
            control={rental.control}
            name="rental_vendor"
            render={({ field: { onChange, value } }) => (
              <TextField
                label={`${t('rental.vendor')} (${t('common.optional')})`}
                hint={t('rental.vendorHint')}
                value={value ?? ''}
                onChangeText={onChange}
              />
            )}
          />
          <SetupDayCountPicker value={daysPerWeek} onChange={setDaysPerWeek} />
          <RentalRateEditor
            rateMode={rateMode}
            onRateModeChange={changeRateMode}
            amount={rental.watch('daily_rental_rate')}
            onAmountChange={(value) => rental.setValue('daily_rental_rate', value, { shouldValidate: true })}
            days={daysPerWeek}
            amountError={
              rental.formState.errors.daily_rental_rate
                ? t(rental.formState.errors.daily_rental_rate.message ?? 'validation.positive')
                : undefined
            }
            locale={locale}
            currency={currency}
            countryCode={profile?.country_code}
          />
          <Button
            label={t('common.save')}
            loading={rental.formState.isSubmitting || create.isPending}
            onPress={onSubmitRental}
          />
        </>
      ) : (
        <>
          <Controller
            control={owned.control}
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
            control={owned.control}
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
            control={owned.control}
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
            control={owned.control}
            name="year"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={t('vehicles.year')}
                keyboardType="number-pad"
                value={value}
                onChangeText={onChange}
                error={fieldState.error ? t(fieldState.error.message ?? 'validation.year') : undefined}
              />
            )}
          />
          <Controller
            control={owned.control}
            name="current_odometer"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={`${t('vehicles.currentOdometer')} (${owned.watch('distance_unit')})`}
                hint={t('vehicles.currentOdometerHint')}
                keyboardType="decimal-pad"
                value={value}
                onChangeText={onChange}
                error={fieldState.error ? t(fieldState.error.message ?? 'validation.odometer') : undefined}
              />
            )}
          />
          <SegmentedControl
            value={owned.watch('distance_unit')}
            onChange={(value) => owned.setValue('distance_unit', value as DistanceUnit)}
            options={[
              { value: 'km', label: t('onboarding.km') },
              { value: 'mi', label: t('onboarding.mi') },
            ]}
          />
          <Controller
            control={owned.control}
            name="plate"
            render={({ field: { onChange, value } }) => (
              <TextField label={t('vehicles.plate')} autoCapitalize="characters" value={value} onChangeText={onChange} />
            )}
          />
          <Button
            label={t('common.save')}
            loading={owned.formState.isSubmitting || create.isPending}
            onPress={onSubmitOwned}
          />
        </>
      )}
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

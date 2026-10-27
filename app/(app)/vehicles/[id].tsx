import { useEffect, useState } from 'react';
import { Alert, Platform, StyleSheet, Text } from 'react-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { RentalRateEditor, SetupDayCountPicker } from '@/features/rental/RentalSchedule';
import { convertRateAmount, resolveStoredDailyRate, type RentalRateMode } from '@/features/rental/engine';
import { parseRentalAmount } from '@/features/rental/hooks';
import { distanceUnitLabel, resolveDistanceUnit } from '@/features/tax-config/units';
import { isRentalVehicle, useDeleteVehicle, useUpdateVehicle, useVehicle } from '@/features/vehicles/hooks';
import { formatDistance } from '@/lib/format';
import type { CurrencyCode, DistanceUnit, SupportedLocale } from '@/types/domain';
import { colors, type } from '@/theme';

export default function VehicleDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const vehicle = useVehicle(id);
  const update = useUpdateVehicle();
  const removeVehicle = useDeleteVehicle();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const [rateMode, setRateMode] = useState<RentalRateMode>('daily');
  const [daysPerWeek, setDaysPerWeek] = useState(5);
  const { control, handleSubmit, reset, watch, setValue, formState } = useForm({
    defaultValues: {
      nickname: '',
      make: '',
      model: '',
      year: '',
      plate: '',
      distance_unit: 'km' as DistanceUnit,
      notes: '',
      daily_rental_rate: '',
      rental_vendor: '',
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
      daily_rental_rate: vehicle.data.daily_rental_rate != null ? String(vehicle.data.daily_rental_rate) : '',
      rental_vendor: vehicle.data.rental_vendor ?? '',
    });
  }, [reset, vehicle.data]);

  const onSubmit = handleSubmit(async (values) => {
    if (!id) return;
    const rental = isRentalVehicle(vehicle.data ?? {});
    const parsedRate = parseRentalAmount(values.daily_rental_rate);
    await update.mutateAsync({
      id,
      nickname: values.nickname,
      make: rental ? vehicle.data?.make : values.make,
      model: rental ? vehicle.data?.model : values.model,
      year: rental ? vehicle.data?.year : Number(values.year),
      plate: values.plate || null,
      distance_unit: resolveDistanceUnit(profile?.country_code, values.distance_unit),
      notes: values.notes || null,
      daily_rental_rate:
        rental && parsedRate != null ? resolveStoredDailyRate(parsedRate, rateMode, daysPerWeek) : undefined,
      rental_vendor: rental ? values.rental_vendor || null : undefined,
    });
    router.back();
  });

  const rental = isRentalVehicle(vehicle.data ?? {});
  const distanceUnit = resolveDistanceUnit(profile?.country_code, vehicle.data?.distance_unit);

  return (
    <Screen title={t('vehicles.edit')} scroll>
      <Controller
        control={control}
        name="nickname"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('vehicles.nickname')} value={value} onChangeText={onChange} />
        )}
      />
      {rental ? (
        <>
          <Controller
            control={control}
            name="rental_vendor"
            render={({ field: { onChange, value } }) => (
              <TextField label={t('rental.vendor')} hint={t('rental.vendorHint')} value={value} onChangeText={onChange} />
            )}
          />
          <SetupDayCountPicker value={daysPerWeek} onChange={setDaysPerWeek} />
          <RentalRateEditor
            rateMode={rateMode}
            onRateModeChange={(next) => {
              const parsed = parseRentalAmount(watch('daily_rental_rate'));
              if (parsed != null) {
                setValue('daily_rental_rate', String(convertRateAmount(parsed, rateMode, next, daysPerWeek)));
              }
              setRateMode(next);
            }}
            amount={watch('daily_rental_rate')}
            onAmountChange={(value) => setValue('daily_rental_rate', value)}
            days={daysPerWeek}
            locale={locale}
            currency={currency}
            countryCode={profile?.country_code}
          />
          <Button
            label={t('rental.logDay')}
            variant="secondary"
            onPress={() => router.push('/(app)/rental/daily')}
          />
        </>
      ) : (
        <>
          <Card>
            <Text style={styles.label}>{t('vehicles.currentOdometer')}</Text>
            <ListRow
              title={
                vehicle.data?.current_odometer != null
                  ? formatDistance(
                      Number(vehicle.data.current_odometer),
                      distanceUnit,
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
          <Text style={styles.unitHint}>
            {t('vehicles.unitLockedHint', { unit: distanceUnitLabel(distanceUnit, t) })}
          </Text>
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
        </>
      )}
      <Button label={t('common.save')} loading={formState.isSubmitting || update.isPending} onPress={onSubmit} />
      {rental && id ? (
        <Button
          label={t('rental.deleteRental')}
          variant="danger"
          loading={removeVehicle.isPending}
          onPress={() => {
            const message = t('rental.deleteRentalConfirm', { name: vehicle.data?.nickname ?? '' });
            const go = () => {
              void removeVehicle
                .mutateAsync(id)
                .then(() => router.replace('/(app)/vehicles' as Href))
                .catch(() => Alert.alert(t('common.error')));
            };
            if (Platform.OS === 'web') {
              if (globalThis.confirm?.(message)) go();
              return;
            }
            Alert.alert(t('rental.deleteRental'), message, [
              { text: t('common.cancel'), style: 'cancel' },
              { text: t('rental.deleteRental'), style: 'destructive', onPress: go },
            ]);
          }}
        />
      ) : null}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  unitHint: {
    ...type.caption,
    color: colors.textSecondary,
    marginBottom: 8,
  },
});

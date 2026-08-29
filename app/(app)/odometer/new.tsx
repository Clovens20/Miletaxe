import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceList } from '@/components/ui/ChoiceList';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { evaluateProposedReading, previousValidReading } from '@/features/mileage/engine';
import { useCreateOdometerReading, useOdometerReadings, vehicleUnit } from '@/features/mileage/hooks';
import { readingKindOptions } from '@/features/mileage/labels';
import { useVehicles } from '@/features/vehicles/hooks';
import { useAuth } from '@/features/auth/AuthProvider';
import { combineDateAndTime, formatDistance, nowTimeHm, parseDecimal, todayIso } from '@/lib/format';
import { odometerSchema, type OdometerValues } from '@/lib/validation/schemas';
import type { DistanceUnit, OdometerReadingKind } from '@/types/domain';
import { colors, type } from '@/theme';

export default function NewOdometerScreen() {
  const { vehicleId: queryVehicleId, kind: queryKind } = useLocalSearchParams<{
    vehicleId?: string;
    kind?: OdometerReadingKind;
  }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const vehicles = useVehicles();
  const create = useCreateOdometerReading();
  const [forceInvalid, setForceInvalid] = useState(false);

  const defaultVehicle = queryVehicleId ?? vehicles.data?.[0]?.id ?? '';
  const { control, handleSubmit, watch, setValue, formState } = useForm<OdometerValues>({
    resolver: zodResolver(odometerSchema),
    defaultValues: {
      vehicle_id: defaultVehicle,
      reading: '',
      recorded_on: todayIso(),
      recorded_time: nowTimeHm(),
      kind: queryKind ?? 'manual',
      unit: (profile?.default_distance_unit ?? 'km') as DistanceUnit,
      notes: '',
    },
  });

  const vehicleId = watch('vehicle_id');
  const vehicle = vehicles.data?.find((row) => row.id === vehicleId);
  const unit = vehicleUnit(vehicle, (profile?.default_distance_unit ?? 'km') as DistanceUnit);
  const readings = useOdometerReadings(vehicleId || undefined);

  useEffect(() => {
    if (vehicle?.distance_unit) setValue('unit', vehicle.distance_unit);
  }, [setValue, vehicle?.distance_unit]);

  useEffect(() => {
    if (!watch('vehicle_id') && vehicles.data?.[0]?.id) {
      setValue('vehicle_id', vehicles.data[0].id);
    }
  }, [setValue, vehicles.data, watch]);

  const parsed = parseDecimal(watch('reading'));
  const recordedAt = combineDateAndTime(watch('recorded_on'), watch('recorded_time'));
  const evaluation = useMemo(() => {
    if (parsed == null) return undefined;
    const previous = previousValidReading(readings.data ?? [], recordedAt);
    return evaluateProposedReading(previous, {
      reading: parsed,
      unit,
      recorded_on: watch('recorded_on'),
      recorded_at: recordedAt,
    });
  }, [parsed, readings.data, recordedAt, unit, watch]);

  const locale = i18n.language === 'en' ? 'en' : 'fr';

  const persist = async (values: OdometerValues, saveDespiteInvalid: boolean) => {
    const reading = parseDecimal(values.reading);
    if (reading == null) return;
    await create.mutateAsync({
      vehicle_id: values.vehicle_id,
      reading,
      unit: values.unit,
      kind: values.kind,
      recorded_on: values.recorded_on,
      recorded_at: combineDateAndTime(values.recorded_on, values.recorded_time),
      notes: values.notes,
      source: 'typed',
      saveDespiteInvalid,
    });
    router.back();
  };

  const onSubmit = handleSubmit(async (values) => {
    if (evaluation && !evaluation.is_valid && !forceInvalid) {
      setForceInvalid(true);
      return;
    }
    await persist(values, Boolean(evaluation && !evaluation.is_valid));
  });

  return (
    <Screen title={t('mileage.newReading')} scroll>
      {!vehicles.data?.length ? (
        <>
          <Text style={styles.warn}>{t('mileage.noVehicle')}</Text>
          <Button label={t('mileage.addVehicle')} onPress={() => router.replace('/(app)/vehicles/new')} />
        </>
      ) : (
        <>
          <Text style={styles.label}>{t('mileage.vehicle')}</Text>
          <ChoiceList
            value={vehicleId}
            onChange={(value) => setValue('vehicle_id', value)}
            options={(vehicles.data ?? []).map((row) => ({ value: row.id, label: row.nickname }))}
          />
          <Button
            label={t('mileage.photoFirst')}
            onPress={() =>
              router.replace(
                `/(app)/odometer/capture?vehicleId=${vehicleId}&kind=${watch('kind')}`,
              )
            }
          />
          <Text style={styles.hint}>{t('mileage.manualFallbackHint')}</Text>
          <Controller
            control={control}
            name="kind"
            render={({ field: { value, onChange } }) => (
              <SegmentedControl value={value} onChange={(next) => onChange(next)} options={readingKindOptions(t)} />
            )}
          />
          <Controller
            control={control}
            name="reading"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={`${t('mileage.reading')} (${unit})`}
                keyboardType="decimal-pad"
                value={value}
                onChangeText={(next) => {
                  setForceInvalid(false);
                  onChange(next);
                }}
                error={fieldState.error ? t(fieldState.error.message ?? 'validation.odometer') : undefined}
              />
            )}
          />
          {evaluation && !evaluation.is_valid ? (
            <WarningBanner
              tone="danger"
              title={t('mileage.monotonicTitle')}
              body={t('mileage.monotonicWarning', {
                previous: evaluation.previous
                  ? formatDistance(evaluation.previous.reading, evaluation.previous.unit, locale, profile?.country_code)
                  : '',
              })}
            />
          ) : null}
          {evaluation?.is_valid && evaluation.distance != null ? (
            <Text style={styles.hint}>
              {t('mileage.distanceSince', {
                distance: formatDistance(evaluation.distance, unit, locale, profile?.country_code),
              })}
            </Text>
          ) : null}
          <Controller
            control={control}
            name="recorded_on"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={t('mileage.date')}
                value={value}
                onChangeText={onChange}
                error={fieldState.error ? t(fieldState.error.message ?? 'validation.date') : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="recorded_time"
            render={({ field: { onChange, value }, fieldState }) => (
              <TextField
                label={t('mileage.time')}
                value={value}
                onChangeText={onChange}
                error={fieldState.error ? t(fieldState.error.message ?? 'validation.time') : undefined}
              />
            )}
          />
          <Controller
            control={control}
            name="notes"
            render={({ field: { onChange, value } }) => (
              <TextField label={t('mileage.notes')} value={value} onChangeText={onChange} />
            )}
          />
          <Button
            label={forceInvalid && evaluation && !evaluation.is_valid ? t('mileage.monotonicSave') : t('common.save')}
            loading={formState.isSubmitting || create.isPending}
            onPress={onSubmit}
          />
        </>
      )}
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.text,
  },
  warn: {
    ...type.caption,
    color: colors.warning,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { TextField } from '@/components/ui/TextField';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { clearOdometerDraft, getOdometerDraft } from '@/features/mileage/draft';
import { evaluateProposedReading, previousValidReading } from '@/features/mileage/engine';
import { useCreateOdometerReading, useOdometerReadings, vehicleUnit } from '@/features/mileage/hooks';
import { readingKindOptions } from '@/features/mileage/labels';
import { useVehicles } from '@/features/vehicles/hooks';
import { combineDateAndTime, formatDistance, nowTimeHm, parseDecimal, todayIso } from '@/lib/format';
import { odometerSchema, type OdometerValues } from '@/lib/validation/schemas';
import { colors, radius, space, type } from '@/theme';

export default function ConfirmOdometerScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const draft = getOdometerDraft();
  const vehicles = useVehicles();
  const create = useCreateOdometerReading();
  const [forceInvalid, setForceInvalid] = useState(false);
  const vehicle = vehicles.data?.find((row) => row.id === draft?.vehicle_id);
  const unit = vehicleUnit(vehicle, draft?.extraction.unit ?? 'km');
  const readings = useOdometerReadings(draft?.vehicle_id);
  const extracted = draft?.extraction.reading;
  const candidates = useMemo(() => {
    const raw = draft?.extraction.candidates ?? [];
    const long = raw.filter((value) => String(value).length >= 4);
    return [...(long.length ? long : raw)].sort((a, b) => b - a);
  }, [draft?.extraction.candidates]);
  const locale = i18n.language === 'en' ? 'en' : 'fr';
  const [editReading, setEditReading] = useState(extracted == null);

  const { control, handleSubmit, watch, setValue, formState } = useForm<OdometerValues>({
    resolver: zodResolver(odometerSchema),
    defaultValues: {
      vehicle_id: draft?.vehicle_id ?? '',
      reading: extracted != null ? String(extracted) : '',
      recorded_on: draft?.extraction.recorded_on ?? todayIso(),
      recorded_time: draft?.extraction.recorded_time ?? nowTimeHm(),
      kind: draft?.kind ?? 'start_of_day',
      unit,
      notes: '',
    },
  });

  const parsed = parseDecimal(watch('reading'));
  const recordedAt = combineDateAndTime(watch('recorded_on'), watch('recorded_time'));
  const evaluation = useMemo(() => {
    if (parsed == null) return undefined;
    return evaluateProposedReading(previousValidReading(readings.data ?? [], recordedAt), {
      reading: parsed,
      unit,
      recorded_on: watch('recorded_on'),
      recorded_at: recordedAt,
    });
  }, [parsed, readings.data, recordedAt, unit, watch]);

  const changedExtracted = extracted != null && parsed != null && extracted !== parsed;

  const save = handleSubmit(async (values) => {
    const reading = parseDecimal(values.reading);
    if (reading == null || !draft) return;
    if (evaluation && !evaluation.is_valid && !forceInvalid) {
      setForceInvalid(true);
      return;
    }
    await create.mutateAsync({
      vehicle_id: values.vehicle_id,
      reading,
      unit: values.unit,
      kind: values.kind,
      recorded_on: values.recorded_on,
      recorded_at: combineDateAndTime(values.recorded_on, values.recorded_time),
      notes: values.notes,
      photoUri: draft.photoUri,
      photoPath: draft.photoPath,
      extracted_reading: extracted ?? (candidates.includes(reading) ? reading : null),
      ocr_status: extracted != null || candidates.includes(reading) ? 'complete' : 'failed',
      ocr_payload: (draft.extraction.raw as Record<string, unknown> | undefined) ?? {
        confidence: draft.extraction.confidence,
      },
      ocr_provider: draft.extraction.provider,
      source: extracted != null || candidates.includes(reading) ? 'ocr' : 'typed',
      saveDespiteInvalid: Boolean(evaluation && !evaluation.is_valid),
    });
    clearOdometerDraft();
    router.replace('/(app)/(tabs)/mileage');
  });

  if (!draft) {
    return (
      <Screen title={t('mileage.confirmTitle')}>
        <Button label={t('mileage.takePhoto')} onPress={() => router.replace('/(app)/odometer/capture')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('mileage.confirmTitle')} subtitle={t('mileage.confirmSubtitle')} scroll>
      <Image source={{ uri: draft.photoUri }} style={styles.photo} />
      <Card>
        <Text style={styles.kicker}>{t('mileage.extracted')}</Text>
        <Text style={styles.extracted}>
          {extracted != null
            ? formatDistance(extracted, draft.extraction.unit ?? unit, locale, profile?.country_code)
            : candidates.length
              ? t('mileage.extractedUnsure')
              : t('mileage.extractedNone')}
        </Text>
        {extracted != null && draft.extraction.confidence > 0 ? (
          <Text style={styles.hint}>{t('mileage.confidence', { value: Math.round(draft.extraction.confidence * 100) })}</Text>
        ) : null}
        {extracted == null ? <Text style={styles.hint}>{t('mileage.ocrUncertain')}</Text> : null}
      </Card>
      {candidates.length ? (
        <View style={styles.chipsBlock}>
          <Text style={styles.hint}>{t('mileage.pickFromPhoto')}</Text>
          <View style={styles.chips}>
            {candidates.map((value) => {
              const selected = parsed === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setForceInvalid(false);
                    setEditReading(true);
                    setValue('reading', String(value), { shouldValidate: true });
                  }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipLabel, selected && styles.chipLabelSelected]}>
                    {formatDistance(value, unit, locale, profile?.country_code)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
      {changedExtracted ? <WarningBanner tone="info" title={t('mileage.extractedChanged')} /> : null}
      <Controller
        control={control}
        name="kind"
        render={({ field: { value, onChange } }) => (
          <SegmentedControl value={value} onChange={onChange} options={readingKindOptions(t)} />
        )}
      />
      {editReading || extracted == null ? (
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
      ) : (
        <Button label={t('mileage.correctReading')} variant="ghost" onPress={() => setEditReading(true)} />
      )}
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
      <Controller
        control={control}
        name="recorded_on"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('mileage.date')} value={value} onChangeText={onChange} />
        )}
      />
      <Controller
        control={control}
        name="recorded_time"
        render={({ field: { onChange, value } }) => (
          <TextField label={t('mileage.time')} value={value} onChangeText={onChange} />
        )}
      />
      <Button
        label={forceInvalid && evaluation && !evaluation.is_valid ? t('mileage.monotonicSave') : t('mileage.confirmSave')}
        loading={formState.isSubmitting || create.isPending}
        onPress={save}
      />
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
  },
  kicker: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  extracted: {
    ...type.metric,
    color: colors.text,
  },
  chipsBlock: {
    gap: space.xs,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipLabel: {
    ...type.bodyMedium,
    color: colors.text,
  },
  chipLabelSelected: {
    color: colors.primary,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

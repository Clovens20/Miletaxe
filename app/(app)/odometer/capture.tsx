import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Platform, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceList } from '@/components/ui/ChoiceList';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { setOdometerDraft } from '@/features/mileage/draft';
import { findOpenIncompleteDay } from '@/features/mileage/engine';
import {
  useDeleteOdometerReading,
  useMileageDashboard,
  useOdometerOcr,
  useOdometerReadings,
  vehicleUnit,
} from '@/features/mileage/hooks';
import { readingKindOptions } from '@/features/mileage/labels';
import { useOnDeviceOdometerOcr } from '@/features/mileage/ocr/OnDeviceOcrBridge';
import { prepareOdometerImage } from '@/features/mileage/ocr/prepareImage';
import { MIN_ACCEPT_CONFIDENCE } from '@/features/mileage/ocr/parse';
import {
  emptyExtraction,
  extractionFromOcrText,
  mergeOdometerExtractions,
} from '@/features/mileage/ocr/provider';
import { uploadOdometerPhoto } from '@/features/mileage/storage';
import { useVehicles } from '@/features/vehicles/hooks';
import { formatDate } from '@/lib/format';
import { captureOdometerImage, pickOdometerImage } from '@/lib/media/pickImage';
import { isLocalMode } from '@/lib/supabase/client';
import type { OdometerReadingKind, SupportedLocale } from '@/types/domain';
import { colors, radius, type } from '@/theme';

export default function CaptureOdometerScreen() {
  const { vehicleId: queryVehicleId, kind: queryKind } = useLocalSearchParams<{
    vehicleId?: string;
    kind?: OdometerReadingKind;
  }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const vehicles = useVehicles();
  const ocr = useOdometerOcr();
  const removeReading = useDeleteOdometerReading();
  const { recognize, host } = useOnDeviceOdometerOcr();
  const [vehicleId, setVehicleId] = useState(queryVehicleId ?? vehicles.data?.[0]?.id ?? '');
  const dashboard = useMileageDashboard(vehicleId || undefined);
  const readings = useOdometerReadings(vehicleId || undefined);
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;

  const openDay = useMemo(() => {
    if (!vehicleId) return null;
    return findOpenIncompleteDay(readings.data ?? [], vehicleId, dashboard.unit);
  }, [dashboard.unit, readings.data, vehicleId]);

  const mustCloseOpenDay = Boolean(openDay);
  const forcedDate = mustCloseOpenDay ? openDay!.date : undefined;
  const lockedKind = mustCloseOpenDay;

  const initialKind: OdometerReadingKind = lockedKind
    ? 'end_of_day'
    : queryKind === 'end_of_day' || queryKind === 'manual'
      ? queryKind
      : 'start_of_day';
  const [kind, setKind] = useState<OdometerReadingKind>(initialKind);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ocrBusy' | 'ocrFailed'>('idle');

  const vehicle = vehicles.data?.find((row) => row.id === vehicleId);
  const hintReading = vehicle?.current_odometer ?? dashboard.currentOdometer ?? undefined;

  useEffect(() => {
    if (!vehicleId && vehicles.data?.[0]?.id) setVehicleId(vehicles.data[0].id);
  }, [vehicleId, vehicles.data]);

  useEffect(() => {
    if (lockedKind) setKind('end_of_day');
  }, [lockedKind, openDay?.date]);

  const analyze = async (uri: string) => {
    if (!user || !vehicleId) return;
    const nextKind = lockedKind ? 'end_of_day' : kind;
    setBusy(true);
    setStatus('ocrBusy');
    try {
      const prepared = await prepareOdometerImage(uri);
      setPhoto(prepared.uri);

      let photoPath: string | null = null;
      const recognizeFrame = async (base64: string | null) => {
        if (!base64) return emptyExtraction('on-device');
        try {
          const result = await recognize(base64);
          return extractionFromOcrText(result.text, {
            hint: hintReading ?? undefined,
            provider: 'on-device',
            engineConfidence: result.confidence,
          });
        } catch {
          return emptyExtraction('on-device');
        }
      };

      // Passe rapide : une seule lecture on-device. Crop + edge seulement si besoin.
      let onDevice = await recognizeFrame(prepared.base64);
      if (
        (onDevice.reading == null || onDevice.confidence < MIN_ACCEPT_CONFIDENCE) &&
        prepared.clusterBase64
      ) {
        const cluster = await recognizeFrame(prepared.clusterBase64);
        onDevice = mergeOdometerExtractions(cluster, onDevice);
      }

      let extraction = onDevice;
      const needsEdge = onDevice.reading == null || onDevice.confidence < MIN_ACCEPT_CONFIDENCE;
      if (!isLocalMode()) {
        try {
          photoPath = await uploadOdometerPhoto(user.id, prepared.uri, vehicleId);
        } catch {
          photoPath = null;
        }
      }
      if (needsEdge && !isLocalMode() && photoPath) {
        try {
          const edge = await ocr.mutateAsync({
            imageUri: prepared.uri,
            storagePath: photoPath,
            hintReading: hintReading ?? undefined,
          });
          extraction = mergeOdometerExtractions(edge, onDevice);
        } catch {
          extraction = onDevice;
        }
      }

      setOdometerDraft({
        vehicle_id: vehicleId,
        kind: nextKind,
        photoUri: prepared.uri,
        photoPath,
        force_recorded_on: forcedDate,
        lock_kind: lockedKind,
        extraction: {
          ...extraction,
          // Toujours l’unité du véhicule — évite mi/km mélangés.
          unit: vehicleUnit(vehicle, 'km', profile?.country_code),
          recorded_on: forcedDate ?? extraction.recorded_on,
          requires_confirmation: true,
        },
      });
      router.replace('/(app)/odometer/confirm');
    } catch {
      setStatus('ocrFailed');
    } finally {
      setBusy(false);
    }
  };

  const takePhoto = async () => {
    const uri = await captureOdometerImage();
    if (!uri) return;
    setPhoto(uri);
    await analyze(uri);
  };

  const choosePhoto = async () => {
    const uri = await pickOdometerImage();
    if (!uri) return;
    setPhoto(uri);
    await analyze(uri);
  };

  const manualHref = lockedKind
    ? `/(app)/odometer/new?vehicleId=${vehicleId}&kind=end_of_day&date=${forcedDate}`
    : `/(app)/odometer/new?vehicleId=${vehicleId}&kind=${kind}`;

  const discardIncompleteDay = () => {
    if (!openDay || !vehicleId) return;
    const dateLabel = formatDate(openDay.date, locale, profile?.country_code);
    const message = t('mileage.discardIncompleteDayConfirm', { date: dateLabel });
    const go = () => {
      void removeReading
        .mutateAsync({ vehicleId, recordedOn: openDay.date })
        .then(() => router.replace('/(app)/(tabs)/mileage' as Href))
        .catch(() => Alert.alert(t('common.error')));
    };
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.(message)) go();
      return;
    }
    Alert.alert(t('mileage.discardIncompleteDay'), message, [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.confirm'), style: 'destructive', onPress: go },
    ]);
  };

  return (
    <Screen title={t('mileage.captureTitle')} subtitle={t('mileage.captureSubtitle')} scroll>
      {host}
      {!vehicles.data?.length ? (
        <Button label={t('mileage.addVehicle')} onPress={() => router.replace('/(app)/vehicles/new')} />
      ) : (
        <>
          {lockedKind && forcedDate ? (
            <WarningBanner
              tone="warning"
              title={t('mileage.mustCloseDayTitle')}
              body={t('mileage.mustCloseDayBody', {
                date: formatDate(forcedDate, locale, profile?.country_code),
              })}
            />
          ) : null}
          <Text style={styles.label}>{t('mileage.vehicle')}</Text>
          <ChoiceList
            value={vehicleId}
            onChange={setVehicleId}
            options={(vehicles.data ?? []).map((row) => ({ value: row.id, label: row.nickname }))}
          />
          {lockedKind ? (
            <Text style={styles.lockedKind}>{t('mileage.kindEnd')}</Text>
          ) : (
            <SegmentedControl
              value={kind}
              onChange={(value) => setKind(value as OdometerReadingKind)}
              options={readingKindOptions(t)}
            />
          )}
          <Text style={styles.hint}>{t('mileage.cropHint')}</Text>
          {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
          {status === 'ocrBusy' ? <Text style={styles.status}>{t('mileage.ocrBusy')}</Text> : null}
          {status === 'ocrFailed' ? <Text style={styles.warn}>{t('mileage.ocrFailed')}</Text> : null}
          <Button
            label={photo ? t('mileage.retakePhoto') : t('mileage.takePhoto')}
            loading={busy}
            disabled={!vehicleId}
            onPress={() => void takePhoto()}
          />
          <Button
            label={t('mileage.choosePhoto')}
            variant="secondary"
            loading={busy}
            disabled={!vehicleId}
            onPress={() => void choosePhoto()}
          />
          {photo && status === 'ocrFailed' ? (
            <Button
              label={t('mileage.analyze')}
              variant="secondary"
              loading={busy}
              onPress={() => void analyze(photo)}
            />
          ) : null}
          <Button
            label={t('mileage.typeManually')}
            variant="ghost"
            disabled={busy}
            onPress={() => router.push(manualHref as Href)}
          />
          {lockedKind && forcedDate ? (
            <Button
              label={t('mileage.discardIncompleteDay')}
              variant="danger"
              loading={removeReading.isPending}
              disabled={busy}
              onPress={discardIncompleteDay}
            />
          ) : null}
        </>
      )}
      <Button label={t('common.cancel')} variant="ghost" disabled={busy} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.text,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
  lockedKind: {
    ...type.bodyMedium,
    color: colors.warning,
  },
  status: {
    ...type.bodyMedium,
    color: colors.info,
  },
  warn: {
    ...type.caption,
    color: colors.warning,
  },
  photo: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
});

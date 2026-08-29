import { useEffect, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { ChoiceList } from '@/components/ui/ChoiceList';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useAuth } from '@/features/auth/AuthProvider';
import { setOdometerDraft } from '@/features/mileage/draft';
import { useMileageDashboard, useOdometerOcr, vehicleUnit } from '@/features/mileage/hooks';
import { readingKindOptions } from '@/features/mileage/labels';
import { useOnDeviceOdometerOcr } from '@/features/mileage/ocr/OnDeviceOcrBridge';
import { prepareOdometerImage } from '@/features/mileage/ocr/prepareImage';
import {
  emptyExtraction,
  extractionFromOcrText,
  mergeOdometerExtractions,
} from '@/features/mileage/ocr/provider';
import { uploadOdometerPhoto } from '@/features/mileage/storage';
import { useVehicles } from '@/features/vehicles/hooks';
import { captureOdometerImage, pickOdometerImage } from '@/lib/media/pickImage';
import { isLocalMode } from '@/lib/supabase/client';
import type { OdometerReadingKind } from '@/types/domain';
import { colors, radius, type } from '@/theme';

export default function CaptureOdometerScreen() {
  const { vehicleId: queryVehicleId, kind: queryKind } = useLocalSearchParams<{
    vehicleId?: string;
    kind?: OdometerReadingKind;
  }>();
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const vehicles = useVehicles();
  const ocr = useOdometerOcr();
  const { recognize, host } = useOnDeviceOdometerOcr();
  const [vehicleId, setVehicleId] = useState(queryVehicleId ?? vehicles.data?.[0]?.id ?? '');
  const dashboard = useMileageDashboard(vehicleId || undefined);
  const initialKind: OdometerReadingKind =
    queryKind === 'end_of_day' || queryKind === 'manual' ? queryKind : 'start_of_day';
  const [kind, setKind] = useState<OdometerReadingKind>(initialKind);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ocrBusy' | 'ocrFailed'>('idle');

  const vehicle = vehicles.data?.find((row) => row.id === vehicleId);
  const hintReading = vehicle?.current_odometer ?? dashboard.currentOdometer ?? undefined;

  useEffect(() => {
    if (!vehicleId && vehicles.data?.[0]?.id) setVehicleId(vehicles.data[0].id);
  }, [vehicleId, vehicles.data]);

  const analyze = async (uri: string) => {
    if (!user || !vehicleId) return;
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

      const onDevicePromise = Promise.all([recognizeFrame(prepared.base64), recognizeFrame(prepared.clusterBase64)]).then(
        ([full, cluster]) => mergeOdometerExtractions(cluster, full),
      );

      const edgePromise = (async () => {
        if (isLocalMode()) return emptyExtraction('none');
        photoPath = await uploadOdometerPhoto(user.id, prepared.uri, vehicleId);
        return ocr.mutateAsync({
          imageUri: prepared.uri,
          storagePath: photoPath,
          hintReading: hintReading ?? undefined,
        });
      })().catch(() => emptyExtraction('edge-failed'));

      const [onDevice, edge] = await Promise.all([onDevicePromise, edgePromise]);
      const extraction = mergeOdometerExtractions(edge, onDevice);

      setOdometerDraft({
        vehicle_id: vehicleId,
        kind,
        photoUri: prepared.uri,
        photoPath,
        extraction: { ...extraction, unit: extraction.unit ?? vehicleUnit(vehicle), requires_confirmation: true },
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

  return (
    <Screen title={t('mileage.captureTitle')} subtitle={t('mileage.captureSubtitle')} scroll>
      {host}
      {!vehicles.data?.length ? (
        <Button label={t('mileage.addVehicle')} onPress={() => router.replace('/(app)/vehicles/new')} />
      ) : (
        <>
          <Text style={styles.label}>{t('mileage.vehicle')}</Text>
          <ChoiceList
            value={vehicleId}
            onChange={setVehicleId}
            options={(vehicles.data ?? []).map((row) => ({ value: row.id, label: row.nickname }))}
          />
          <SegmentedControl
            value={kind}
            onChange={(value) => setKind(value as OdometerReadingKind)}
            options={readingKindOptions(t)}
          />
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
            onPress={() => router.push(`/(app)/odometer/new?vehicleId=${vehicleId}&kind=${kind}`)}
          />
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

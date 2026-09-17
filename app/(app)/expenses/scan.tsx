import { useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { getReceiptDraft, setReceiptDraft } from '@/features/expenses/draft';
import { useCreateReceipt, useReceiptOcr } from '@/features/expenses/hooks';
import { ON_DEVICE_RECEIPT_OCR_HTML } from '@/features/expenses/ocr/onDeviceHtml';
import { prepareReceiptImage } from '@/features/expenses/ocr/prepareImage';
import {
  emptyReceiptExtraction,
  extractionFromReceiptText,
  mergeReceiptExtractions,
} from '@/features/expenses/ocr/provider';
import { useOnDeviceOcr } from '@/features/mileage/ocr/OnDeviceOcrBridge';
import { captureReceiptImage, pickReceiptImage } from '@/lib/media/pickImage';
import { colors, radius, type } from '@/theme';

export default function ScanReceiptScreen() {
  const { mode, added } = useLocalSearchParams<{ mode?: string; added?: string }>();
  const catchUp = mode === 'past';
  const justSaved = added === '1';
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const createReceipt = useCreateReceipt();
  const ocr = useReceiptOcr();
  const { recognize, host } = useOnDeviceOcr(ON_DEVICE_RECEIPT_OCR_HTML);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ocrBusy' | 'ocrFailed'>('idle');

  const goReview = () => {
    router.replace((catchUp ? '/(app)/expenses/review?mode=past' : '/(app)/expenses/review') as Href);
  };

  const analyze = async (uri: string) => {
    if (!user) return;
    setBusy(true);
    setStatus('ocrBusy');
    try {
      const prepared = await prepareReceiptImage(uri);
      setPhoto(prepared.uri);

      const onDevicePromise = (async () => {
        if (!prepared.base64) return emptyReceiptExtraction('on-device');
        try {
          const result = await recognize(prepared.base64);
          return extractionFromReceiptText(result.text, {
            provider: 'on-device',
            engineConfidence: result.confidence,
          });
        } catch {
          return emptyReceiptExtraction('on-device-failed');
        }
      })();

      const uploadPromise = createReceipt.mutateAsync({
        localUri: prepared.uri,
        filename: prepared.uri.split('/').pop(),
      });

      const [receipt, onDevice] = await Promise.all([uploadPromise, onDevicePromise]);
      setReceiptDraft({
        photoUri: prepared.uri,
        storagePath: receipt.storage_path,
        receiptId: receipt.id,
        extraction: { ...onDevice, requires_confirmation: true },
        catchUp,
        refining: true,
      });
      goReview();

      void ocr
        .mutateAsync({
          imageUri: prepared.uri,
          storagePath: receipt.storage_path,
          receiptId: receipt.id,
          seedExtraction: onDevice,
        })
        .then((edge) => {
          const current = getReceiptDraft();
          if (!current || current.receiptId !== receipt.id) return;
          setReceiptDraft({
            ...current,
            extraction: { ...mergeReceiptExtractions(edge, current.extraction), requires_confirmation: true },
            refining: false,
          });
        })
        .catch(() => {
          const current = getReceiptDraft();
          if (!current || current.receiptId !== receipt.id) return;
          setReceiptDraft({ ...current, refining: false });
        });
    } catch {
      setStatus('ocrFailed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={catchUp ? t('expenses.scanPastTitle') : t('expenses.scanTitle')}
      subtitle={catchUp ? t('expenses.scanPastSubtitle') : t('expenses.scanSubtitle')}
      scroll
    >
      {host}
      {justSaved ? <WarningBanner tone="info" title={t('expenses.savedNext')} /> : null}
      {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
      <Button
        label={catchUp ? t('expenses.uploadPhoto') : t('expenses.takePhoto')}
        loading={busy}
        onPress={async () => {
          const uri = catchUp ? await pickReceiptImage() : await captureReceiptImage();
          if (uri) {
            setPhoto(uri);
            await analyze(uri);
          }
        }}
      />
      <Button
        label={catchUp ? t('expenses.takePhoto') : t('expenses.uploadPhoto')}
        variant="secondary"
        loading={busy}
        onPress={async () => {
          const uri = catchUp ? await captureReceiptImage() : await pickReceiptImage();
          if (uri) {
            setPhoto(uri);
            await analyze(uri);
          }
        }}
      />
      <Button
        label={t('expenses.typeManually')}
        variant="secondary"
        disabled={busy}
        onPress={() => router.push((catchUp ? '/(app)/expenses/manual?mode=past' : '/(app)/expenses/manual') as Href)}
      />
      <Text style={styles.hint}>{t('expenses.originalKept')}</Text>
      {status === 'ocrBusy' ? <Text style={styles.status}>{t('expenses.ocrPending')}</Text> : null}
      {status === 'ocrFailed' ? <Text style={styles.warn}>{t('expenses.ocrFailed')}</Text> : null}
      {photo && status === 'ocrFailed' ? (
        <Button label={t('expenses.analyze')} loading={busy} onPress={() => void analyze(photo)} />
      ) : null}
      {justSaved ? (
        <Button
          label={t('expenses.pastDone')}
          variant="secondary"
          disabled={busy}
          onPress={() => router.replace('/(app)/(tabs)/expenses')}
        />
      ) : (
        <Button label={t('common.cancel')} variant="ghost" disabled={busy} onPress={() => router.back()} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 280,
    borderRadius: radius.md,
    resizeMode: 'contain',
    backgroundColor: colors.surfaceMuted,
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
});

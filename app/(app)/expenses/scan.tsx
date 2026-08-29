import { useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { setReceiptDraft } from '@/features/expenses/draft';
import { useCreateReceipt, useReceiptOcr } from '@/features/expenses/hooks';
import { ON_DEVICE_RECEIPT_OCR_HTML } from '@/features/expenses/ocr/onDeviceHtml';
import { prepareReceiptImage } from '@/features/expenses/ocr/prepareImage';
import { emptyReceiptExtraction, extractionFromReceiptText } from '@/features/expenses/ocr/provider';
import { useOnDeviceOcr } from '@/features/mileage/ocr/OnDeviceOcrBridge';
import { captureReceiptImage, pickReceiptImage } from '@/lib/media/pickImage';
import { colors, radius, type } from '@/theme';

export default function ScanReceiptScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user } = useAuth();
  const createReceipt = useCreateReceipt();
  const ocr = useReceiptOcr();
  const { recognize, host } = useOnDeviceOcr(ON_DEVICE_RECEIPT_OCR_HTML);
  const [photo, setPhoto] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<'idle' | 'ocrBusy' | 'ocrFailed'>('idle');

  const analyze = async (uri: string) => {
    if (!user) return;
    setBusy(true);
    setStatus('ocrBusy');
    try {
      const prepared = await prepareReceiptImage(uri);
      setPhoto(prepared.uri);
      const receipt = await createReceipt.mutateAsync({
        localUri: prepared.uri,
        filename: prepared.uri.split('/').pop(),
      });

      let onDevice = emptyReceiptExtraction('on-device');
      if (prepared.base64) {
        try {
          const result = await recognize(prepared.base64);
          onDevice = extractionFromReceiptText(result.text, {
            provider: 'on-device',
            engineConfidence: result.confidence,
          });
        } catch {
          onDevice = emptyReceiptExtraction('on-device-failed');
        }
      }

      const extraction = await ocr.mutateAsync({
        imageUri: prepared.uri,
        storagePath: receipt.storage_path,
        receiptId: receipt.id,
        seedExtraction: onDevice,
      });
      setReceiptDraft({
        photoUri: prepared.uri,
        storagePath: receipt.storage_path,
        receiptId: receipt.id,
        extraction: { ...extraction, requires_confirmation: true },
      });
      router.replace('/(app)/expenses/review');
    } catch {
      setStatus('ocrFailed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('expenses.scanTitle')} subtitle={t('expenses.scanSubtitle')} scroll>
      {host}
      {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
      <Button
        label={t('expenses.takePhoto')}
        loading={busy}
        onPress={async () => {
          const uri = await captureReceiptImage();
          if (uri) {
            setPhoto(uri);
            await analyze(uri);
          }
        }}
      />
      <Button
        label={t('expenses.uploadPhoto')}
        variant="secondary"
        loading={busy}
        onPress={async () => {
          const uri = await pickReceiptImage();
          if (uri) {
            setPhoto(uri);
            await analyze(uri);
          }
        }}
      />
      <Text style={styles.hint}>{t('expenses.originalKept')}</Text>
      {status === 'ocrBusy' ? <Text style={styles.status}>{t('expenses.ocrPending')}</Text> : null}
      {status === 'ocrFailed' ? <Text style={styles.warn}>{t('expenses.ocrFailed')}</Text> : null}
      {photo && status === 'ocrFailed' ? (
        <Button label={t('expenses.analyze')} loading={busy} onPress={() => void analyze(photo)} />
      ) : null}
      <Button label={t('common.cancel')} variant="ghost" disabled={busy} onPress={() => router.back()} />
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

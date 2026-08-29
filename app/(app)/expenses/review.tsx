import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Screen } from '@/components/ui/Screen';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { clearReceiptDraft, getReceiptDraft, setReceiptDraft } from '@/features/expenses/draft';
import { canonicalCategories, parseOptionalAmount, receiptFormDefaults } from '@/features/expenses/engine';
import { ReceiptFormFields } from '@/features/expenses/ReceiptForm';
import { useDiscardReceipt, useFinalizeExpense, useReceipt } from '@/features/expenses/hooks';
import { hasReceiptValues } from '@/features/expenses/ocr/parse';
import { getReceiptPhotoUrl } from '@/features/expenses/storage';
import { useExpenseCategories } from '@/features/tax-config/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { parseDecimal, todayIso, formatMoney, formatDate } from '@/lib/format';
import { receiptReviewSchema, type ReceiptReviewValues } from '@/lib/validation/schemas';
import type { SupportedLocale } from '@/types/domain';
import { colors, radius, type } from '@/theme';

export default function ReviewReceiptScreen() {
  const { receiptId: queryReceiptId } = useLocalSearchParams<{ receiptId?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const storedDraft = getReceiptDraft();
  const draft =
    queryReceiptId && storedDraft?.receiptId && storedDraft.receiptId !== queryReceiptId
      ? null
      : storedDraft;
  const receiptQuery = useReceipt(queryReceiptId ?? draft?.receiptId ?? undefined);
  const categories = useExpenseCategories(profile?.country_code);
  const vehicles = useVehicles();
  const finalize = useFinalizeExpense();
  const discard = useDiscardReceipt();
  const [photoUrl, setPhotoUrl] = useState<string | null>(draft?.photoUri ?? null);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const extraction = draft?.extraction ?? receiptQuery.data?.ocr_payload ?? null;
  const receiptId = draft?.receiptId ?? receiptQuery.data?.id ?? null;

  useEffect(() => {
    if (draft?.photoUri) {
      setPhotoUrl(draft.photoUri);
      return;
    }
    const path = receiptQuery.data?.storage_path;
    if (path && user) {
      void getReceiptPhotoUrl(path, user.id).then(setPhotoUrl);
    }
  }, [draft?.photoUri, receiptQuery.data?.storage_path, user]);

  useEffect(() => {
    if (draft || !receiptQuery.data) return;
    setReceiptDraft({
      photoUri: photoUrl ?? '',
      storagePath: receiptQuery.data.storage_path,
      receiptId: receiptQuery.data.id,
      extraction: receiptQuery.data.ocr_payload ?? { confidence: 0, provider: 'none', requires_confirmation: true },
    });
  }, [draft, photoUrl, receiptQuery.data]);

  const defaults = useMemo(
    () =>
      receiptFormDefaults({
        extraction,
        categories: canonical,
        currency: profile?.default_currency ?? 'CAD',
        today: todayIso(),
      }),
    [canonical, extraction, profile?.default_currency],
  );

  const { control, handleSubmit, watch, formState, reset } = useForm<ReceiptReviewValues>({
    resolver: zodResolver(receiptReviewSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    reset(defaults);
  }, [defaults, reset]);

  const categoryId = watch('category_id');
  const selected = canonical.find((row) => row.id === categoryId);
  const extractedSummary = useMemo(() => {
    if (!extraction || !hasReceiptValues(extraction)) return t('expenses.extractedNone');
    const parts: string[] = [];
    if (extraction.merchant_name) parts.push(extraction.merchant_name);
    if (extraction.total != null) {
      parts.push(formatMoney(extraction.total, extraction.currency ?? profile?.default_currency ?? 'CAD', locale, profile?.country_code));
    }
    if (extraction.incurred_on) parts.push(formatDate(extraction.incurred_on, locale, profile?.country_code));
    if (extraction.incurred_time) parts.push(extraction.incurred_time);
    return parts.join(' · ') || t('expenses.extractedNone');
  }, [extraction, locale, profile?.country_code, profile?.default_currency, t]);

  const extractedChanged = Boolean(
    (extraction?.merchant_name && watch('vendor_name') && extraction.merchant_name !== watch('vendor_name')) ||
      (extraction?.total != null && watch('amount') && String(extraction.total) !== watch('amount')),
  );

  const save = handleSubmit(async (values) => {
    const amount = parseDecimal(values.amount);
    if (amount == null || !receiptId) return;
    await finalize.mutateAsync({
      receipt_id: receiptId,
      vendor_name: values.vendor_name,
      amount,
      subtotal: parseOptionalAmount(values.subtotal),
      tax_amount: parseOptionalAmount(values.tax_amount),
      category_id: values.category_id,
      category_code: selected?.code,
      incurred_on: values.incurred_on,
      incurred_time: values.incurred_time || null,
      currency: values.currency,
      vehicle_id: values.vehicle_id || null,
      fuel_quantity: parseOptionalAmount(values.fuel_quantity),
      price_per_unit: parseOptionalAmount(values.price_per_unit),
      payment_method: values.payment_method || null,
      reference_number: values.reference_number || null,
      notes: values.notes || null,
      extracted: extraction,
    });
    clearReceiptDraft();
    router.replace('/(app)/(tabs)/expenses');
  });

  if (!draft && !receiptQuery.data) {
    return (
      <Screen title={t('expenses.reviewTitle')}>
        <Button label={t('expenses.takePhoto')} onPress={() => router.replace('/(app)/expenses/scan')} />
      </Screen>
    );
  }

  return (
    <Screen title={t('expenses.reviewTitle')} subtitle={t('expenses.reviewSubtitle')} scroll>
      {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : null}
      <Text style={styles.hint}>{t('expenses.originalKept')}</Text>
      <Card>
        <Text style={styles.kicker}>{t('expenses.extracted')}</Text>
        <Text style={styles.extracted}>{extractedSummary}</Text>
        {extraction && hasReceiptValues(extraction) ? (
          <Text style={styles.hint}>{t('expenses.confidence', { value: Math.round(extraction.confidence * 100) })}</Text>
        ) : (
          <Text style={styles.hint}>{t('expenses.ocrSkipped')}</Text>
        )}
      </Card>
      <WarningBanner tone="info" title={t('expenses.suggestionOnly')} body={t('expenses.suggestionBody')} />
      {extractedChanged ? <WarningBanner tone="info" title={t('expenses.extractedChanged')} /> : null}
      <ReceiptFormFields
        control={control}
        categories={canonical}
        vehicles={vehicles.data ?? []}
        locale={locale}
        compact
      />
      <Button
        label={t('expenses.confirmSave')}
        loading={formState.isSubmitting || finalize.isPending}
        onPress={save}
      />
      <Button
        label={t('expenses.discard')}
        variant="ghost"
        onPress={async () => {
          if (receiptId) await discard.mutateAsync(receiptId);
          clearReceiptDraft();
          router.replace('/(app)/(tabs)/expenses');
        }}
      />
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
  kicker: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  extracted: {
    ...type.section,
    color: colors.text,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

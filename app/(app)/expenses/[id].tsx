import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { canonicalCategories, parseOptionalAmount, receiptFormDefaults } from '@/features/expenses/engine';
import { useExpense, useExpenseRevisions, useReceipt, useUpdateExpense } from '@/features/expenses/hooks';
import { expenseStatusLabel, paymentMethodLabel } from '@/features/expenses/labels';
import { ReceiptFormFields } from '@/features/expenses/ReceiptForm';
import { getReceiptPhotoUrl } from '@/features/expenses/storage';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { formatDateTime, parseDecimal, todayIso } from '@/lib/format';
import { receiptReviewSchema, type ReceiptReviewValues } from '@/lib/validation/schemas';
import type { SupportedLocale } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

export default function ReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const expense = useExpense(id);
  const receipt = useReceipt(expense.data?.receipt_id);
  const revisions = useExpenseRevisions(id);
  const update = useUpdateExpense();
  const categories = useExpenseCategories(profile?.country_code);
  const vehicles = useVehicles();
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);

  useEffect(() => {
    if (receipt.data?.storage_path && user) {
      void getReceiptPhotoUrl(receipt.data.storage_path, user.id).then(setPhotoUrl);
    }
  }, [receipt.data?.storage_path, user]);

  const defaults = useMemo(
    () =>
      receiptFormDefaults({
        expense: expense.data,
        categories: canonical,
        currency: profile?.default_currency ?? 'CAD',
        today: todayIso(),
      }),
    [canonical, expense.data, profile?.default_currency],
  );

  const { control, handleSubmit, formState, reset } = useForm<ReceiptReviewValues>({
    resolver: zodResolver(receiptReviewSchema),
    defaultValues: defaults,
  });

  useEffect(() => {
    if (expense.data) reset(defaults);
  }, [defaults, expense.data, reset]);

  if (!expense.data) {
    return (
      <Screen title={t('expenses.detailTitle')}>
        <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
      </Screen>
    );
  }

  const row = expense.data;
  const category = canonical.find((item) => item.id === row.category_id) ?? categories.data?.find((item) => item.id === row.category_id);

  const save = handleSubmit(async (values) => {
    const amount = parseDecimal(values.amount);
    if (amount == null) return;
    await update.mutateAsync({
      id: row.id,
      vendor_name: values.vendor_name,
      amount,
      subtotal: parseOptionalAmount(values.subtotal),
      tax_amount: parseOptionalAmount(values.tax_amount),
      category_id: values.category_id,
      incurred_on: values.incurred_on,
      incurred_time: values.incurred_time || null,
      currency: values.currency,
      vehicle_id: values.vehicle_id || null,
      fuel_quantity: parseOptionalAmount(values.fuel_quantity),
      price_per_unit: parseOptionalAmount(values.price_per_unit),
      payment_method: values.payment_method || null,
      reference_number: values.reference_number || null,
      notes: values.notes || null,
    });
    router.back();
  });

  return (
    <Screen title={t('expenses.detailTitle')} scroll>
      {photoUrl ? <Image source={{ uri: photoUrl }} style={styles.photo} /> : null}
      <Text style={styles.hint}>{t('expenses.originalKept')}</Text>
      <Card>
        <Text style={styles.meta}>
          {category ? labelOf(category, locale) : t('expenses.noCategory')} · {row.incurred_on}
          {row.incurred_time ? ` ${row.incurred_time}` : ''}
        </Text>
        <Badge label={expenseStatusLabel(row.status, t)} tone={row.status === 'complete' ? 'success' : 'warning'} />
        {row.payment_method ? (
          <Text style={styles.hint}>{paymentMethodLabel(row.payment_method, t)}</Text>
        ) : null}
      </Card>
      {row.extracted_payload ? (
        <Text style={styles.hint}>
          {t('expenses.extracted')}: {row.extracted_payload.merchant_name || t('expenses.extractedNone')}
        </Text>
      ) : null}
      <ReceiptFormFields
        control={control}
        categories={canonical}
        vehicles={vehicles.data ?? []}
        locale={locale}
      />
      <Button label={t('common.save')} loading={formState.isSubmitting || update.isPending} onPress={save} />
      <Text style={styles.section}>{t('expenses.auditTitle')}</Text>
      {!revisions.data?.length ? (
        <Text style={styles.hint}>{t('expenses.auditEmpty')}</Text>
      ) : (
        revisions.data.map((item) => (
          <ListRow
            key={item.id}
            title={`${item.field_name}: ${item.old_value || '—'} → ${item.new_value || '—'}`}
            subtitle={`${item.reason} · ${formatDateTime(item.created_at, locale, profile?.country_code)}`}
          />
        ))
      )}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  photo: {
    width: '100%',
    height: 220,
    borderRadius: radius.md,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...type.bodyMedium,
    color: colors.text,
    marginBottom: space.xs,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
});

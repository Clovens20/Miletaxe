import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { canonicalCategories, parseOptionalAmount, receiptFormDefaults } from '@/features/expenses/engine';
import { ReceiptFormFields } from '@/features/expenses/ReceiptForm';
import { useFinalizeExpense } from '@/features/expenses/hooks';
import { useExpenseCategories } from '@/features/tax-config/hooks';
import { useVehicles } from '@/features/vehicles/hooks';
import { parseDecimal, todayIso } from '@/lib/format';
import { receiptReviewSchema, type ReceiptReviewValues } from '@/lib/validation/schemas';
import type { SupportedLocale } from '@/types/domain';

export default function ManualExpenseScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const catchUp = mode === 'past';
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const categories = useExpenseCategories(profile?.country_code);
  const vehicles = useVehicles();
  const finalize = useFinalizeExpense();
  const [dateError, setDateError] = useState<string | null>(null);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);

  const defaults = useMemo(
    () =>
      receiptFormDefaults({
        categories: canonical,
        currency: profile?.default_currency ?? 'CAD',
        today: todayIso(),
        emptyDate: catchUp,
      }),
    [canonical, catchUp, profile?.default_currency],
  );

  const { control, handleSubmit, watch, formState, reset } = useForm<ReceiptReviewValues>({
    resolver: zodResolver(receiptReviewSchema),
    defaultValues: defaults,
  });

  const categoryId = watch('category_id');
  const selected = canonical.find((row) => row.id === categoryId);

  const goNext = (addAnother: boolean) => {
    if (addAnother) {
      setDateError(null);
      reset({ ...defaults, incurred_on: '' });
      return;
    }
    router.replace((catchUp ? '/(app)/expenses/past?added=1' : '/(app)/(tabs)/expenses') as Href);
  };

  const save = (addAnother: boolean) =>
    handleSubmit(async (values) => {
      const amount = parseDecimal(values.amount);
      if (amount == null) return;
      if (values.incurred_on > todayIso()) {
        setDateError(t('validation.dateNotFuture'));
        return;
      }
      setDateError(null);
      await finalize.mutateAsync({
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
      });
      goNext(addAnother);
    })();

  return (
    <Screen
      title={catchUp ? t('expenses.manualTitle') : t('expenses.add')}
      subtitle={t('expenses.manualSubtitle')}
      scroll
    >
      {catchUp ? <WarningBanner tone="info" title={t('expenses.pastLead')} /> : null}
      {dateError ? <WarningBanner tone="danger" title={dateError} /> : null}
      <ReceiptFormFields
        control={control}
        categories={canonical}
        vehicles={vehicles.data ?? []}
        locale={locale}
        dateHint={catchUp ? t('expenses.pastDateHint') : t('expenses.manualDateHint')}
        notesHint={t('expenses.notesLostHint')}
        pastDate={catchUp}
      />
      <Button
        label={t('common.save')}
        loading={formState.isSubmitting || finalize.isPending}
        onPress={() => void save(false)}
      />
      {catchUp ? (
        <Button
          label={t('expenses.pastAddAnother')}
          variant="secondary"
          loading={formState.isSubmitting || finalize.isPending}
          onPress={() => void save(true)}
        />
      ) : null}
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { MetricCard } from '@/components/ui/MetricCard';
import { PeriodSwitcher } from '@/components/ui/PeriodSwitcher';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilterChips } from '@/features/expenses/FilterChips';
import {
  canonicalCategories,
  buildExpenseList,
  filterExpenseList,
  periodExpenseSnapshot,
  rentalCategoryOf,
} from '@/features/expenses/engine';
import { useExpenses, useReceipts } from '@/features/expenses/hooks';
import { useRecordPeriod } from '@/features/records/useRecordPeriod';
import { useRentalDays } from '@/features/rental/hooks';
import { rentalVehiclesOf, useVehicles } from '@/features/vehicles/hooks';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { formatDate, formatMoney } from '@/lib/format';
import type { CurrencyCode } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function ExpensesScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const expenses = useExpenses();
  const receipts = useReceipts();
  const rentalDays = useRentalDays();
  const vehicles = useVehicles();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const rentalCategory = rentalCategoryOf(canonical);
  const rentalVehicle = rentalVehiclesOf(vehicles.data)[0];
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const period = useRecordPeriod('month');
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const snapshot = useMemo(
    () =>
      periodExpenseSnapshot(
        expenses.data ?? [],
        rentalDays.data ?? [],
        period.range,
        canonical,
        rentalCategory?.id ?? null,
      ),
    [canonical, expenses.data, period.range, rentalCategory?.id, rentalDays.data],
  );
  const pending = (receipts.data ?? []).filter((row) => row.review_status === 'pending');
  const rentalFilter = Boolean(rentalCategory && categoryId === rentalCategory.id);
  const hasAny = Boolean((expenses.data ?? []).length || (rentalDays.data ?? []).length);
  const filtered = useMemo(
    () =>
      filterExpenseList(
        buildExpenseList(
          expenses.data ?? [],
          rentalDays.data ?? [],
          rentalCategory?.id ?? null,
          rentalVehicle?.rental_vendor || rentalVehicle?.nickname || t('expenses.checkRental'),
        ),
        {
          query,
          categoryId: categoryId === 'all' ? undefined : categoryId,
          from: period.range.start,
          to: period.range.end,
        },
        canonical,
      ).slice(0, 12),
    [
      canonical,
      categoryId,
      expenses.data,
      period.range.end,
      period.range.start,
      query,
      rentalCategory?.id,
      rentalDays.data,
      rentalVehicle,
      t,
    ],
  );

  return (
    <Screen title={t('expenses.title')} subtitle={t('expenses.subtitle')} scroll back={false}>
      <PeriodSwitcher
        kind={period.kind}
        onKindChange={period.setKind}
        periodLabel={period.periodLabel}
        canGoPrev={period.canGoPrev}
        canGoNext={period.canGoNext}
        onPrev={period.goPrev}
        onNext={period.goNext}
      />
      <MetricCard
        label={t('expenses.tabTotal')}
        value={formatMoney(snapshot.total, currency, period.locale, profile?.country_code)}
        hint={t('expenses.summaryCount', { count: snapshot.completeCount })}
      />
      <Button label={t('expenses.checkTitle')} onPress={() => router.push('/(app)/expenses/check' as Href)} />
      {pending.length ? (
        <View style={styles.pending}>
          <Text style={styles.section}>{t('expenses.pendingTitle')}</Text>
          {pending.slice(0, 3).map((row) => (
            <ListRow
              key={row.id}
              icon="scan-outline"
              title={row.original_filename || t('expenses.pendingItem')}
              subtitle={t('expenses.ocrComplete')}
              onPress={() => router.push(`/(app)/expenses/review?receiptId=${row.id}` as Href)}
            />
          ))}
        </View>
      ) : null}
      <TextField label={t('common.search')} value={query} onChangeText={setQuery} placeholder={t('expenses.searchPlaceholder')} />
      <FilterChips
        value={categoryId}
        onChange={setCategoryId}
        options={[
          { value: 'all', label: t('common.all') },
          ...canonical.map((row) => ({ value: row.id, label: labelOf(row, period.locale) })),
        ]}
      />
      {!filtered.length ? (
        <EmptyState
          icon={rentalFilter ? 'key-outline' : 'receipt-outline'}
          title={
            rentalFilter
              ? t('expenses.rentalEmpty')
              : hasAny
                ? t('expenses.checkEmpty')
                : t('expenses.empty')
          }
          body={rentalFilter || hasAny ? undefined : t('expenses.emptyBody')}
        />
      ) : null}
      {filtered.map((row) => {
        const category = canonical.find((item) => item.id === row.category_id);
        const categoryLabel =
          category ? labelOf(category, period.locale) : row.kind === 'rental' ? t('expenses.checkRental') : t('expenses.noCategory');
        return (
          <ListRow
            key={`${row.kind}-${row.id}`}
            icon={row.kind === 'rental' ? 'key-outline' : 'receipt-outline'}
            title={row.vendor_name || (row.kind === 'rental' ? t('expenses.checkRental') : t('expenses.merchant'))}
            subtitle={`${categoryLabel} · ${formatDate(row.incurred_on, period.locale, profile?.country_code)}`}
            right={formatMoney(Number(row.amount), row.currency || currency, period.locale, profile?.country_code)}
            onPress={() =>
              router.push(
                (row.kind === 'rental'
                  ? `/(app)/rental/daily?date=${row.incurred_on}`
                  : `/(app)/expenses/${row.id}`) as Href,
              )
            }
          />
        );
      })}
      {rentalFilter ? (
        <Button label={t('rental.logDay')} onPress={() => router.push('/(app)/rental/daily' as Href)} />
      ) : null}
      <Button label={t('expenses.capture')} onPress={() => router.push('/(app)/expenses/scan')} />
      <Button
        label={t('expenses.typeManually')}
        variant="secondary"
        onPress={() => router.push('/(app)/expenses/manual')}
      />
      <Button
        label={t('more.internet')}
        variant="secondary"
        onPress={() => router.push('/(app)/settings/internet')}
      />
      <Button
        label={t('expenses.pastTitle')}
        variant="secondary"
        onPress={() => router.push('/(app)/expenses/past')}
      />
      <Button label={t('expenses.history')} variant="secondary" onPress={() => router.push('/(app)/expenses/history')} />
      <Button label={t('expenses.categories')} variant="secondary" onPress={() => router.push('/(app)/expenses/categories')} />
      <Button label={t('expenses.summary')} variant="secondary" onPress={() => router.push('/(app)/expenses/summary')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  pending: {
    gap: space.xs,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
});

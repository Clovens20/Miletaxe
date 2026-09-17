import { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { MetricCard } from '@/components/ui/MetricCard';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilterChips } from '@/features/expenses/FilterChips';
import { canonicalCategories, buildExpenseList, filterExpenseList, monthlySummary, rentalCategoryOf } from '@/features/expenses/engine';
import { useExpenses, useReceipts } from '@/features/expenses/hooks';
import { useRentalDays } from '@/features/rental/hooks';
import { rentalVehiclesOf, useVehicles } from '@/features/vehicles/hooks';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { formatDate, formatMoney, formatYearMonth, yearMonthNow } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function ExpensesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const expenses = useExpenses();
  const receipts = useReceipts();
  const rentalDays = useRentalDays();
  const vehicles = useVehicles();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const rentalCategory = rentalCategoryOf(canonical);
  const rentalVehicle = rentalVehiclesOf(vehicles.data)[0];
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const month = yearMonthNow();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const summary = useMemo(
    () => monthlySummary(expenses.data ?? [], month, canonical, rentalDays.data ?? []),
    [canonical, expenses.data, month, rentalDays.data],
  );
  const pending = (receipts.data ?? []).filter((row) => row.review_status === 'pending');
  const rentalFilter = Boolean(rentalCategory && categoryId === rentalCategory.id);
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
          month,
        },
        canonical,
      ).slice(0, 12),
    [canonical, categoryId, expenses.data, month, query, rentalCategory?.id, rentalDays.data, rentalVehicle, t],
  );

  return (
    <Screen title={t('expenses.title')} subtitle={t('expenses.subtitle')} scroll back={false}>
      <MetricCard
        label={formatYearMonth(month, locale, profile?.country_code)}
        value={formatMoney(summary.total, currency, locale, profile?.country_code)}
        hint={t('expenses.summaryCount', { count: summary.count })}
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
          ...canonical.map((row) => ({ value: row.id, label: labelOf(row, locale) })),
        ]}
      />
      {!filtered.length ? (
        <EmptyState
          icon={rentalFilter ? 'key-outline' : 'receipt-outline'}
          title={rentalFilter ? t('expenses.rentalEmpty') : t('expenses.empty')}
          body={rentalFilter ? undefined : t('expenses.emptyBody')}
        />
      ) : null}
      {filtered.map((row) => {
        const category = canonical.find((item) => item.id === row.category_id);
        const categoryLabel =
          category ? labelOf(category, locale) : row.kind === 'rental' ? t('expenses.checkRental') : t('expenses.noCategory');
        return (
          <ListRow
            key={`${row.kind}-${row.id}`}
            icon={row.kind === 'rental' ? 'key-outline' : 'receipt-outline'}
            title={row.vendor_name || (row.kind === 'rental' ? t('expenses.checkRental') : t('expenses.merchant'))}
            subtitle={`${categoryLabel} · ${formatDate(row.incurred_on, locale, profile?.country_code)}`}
            right={formatMoney(Number(row.amount), row.currency || currency, locale, profile?.country_code)}
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

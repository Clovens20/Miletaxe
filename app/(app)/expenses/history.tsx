import { useMemo, useState } from 'react';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilterChips } from '@/features/expenses/FilterChips';
import { canonicalCategories, buildExpenseList, filterExpenseList, rentalCategoryOf, yearMonthOf } from '@/features/expenses/engine';
import { useExpenses } from '@/features/expenses/hooks';
import { useRentalDays } from '@/features/rental/hooks';
import { rentalVehiclesOf, useVehicles } from '@/features/vehicles/hooks';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { formatDate, formatMoney, formatYearMonth, yearMonthNow } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';

export default function ExpenseHistoryScreen() {
  const params = useLocalSearchParams<{ categoryId?: string; month?: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const expenses = useExpenses();
  const rentalDays = useRentalDays();
  const vehicles = useVehicles();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const rentalCategory = rentalCategoryOf(canonical);
  const rentalVehicle = rentalVehiclesOf(vehicles.data)[0];
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState(params.categoryId ?? 'all');
  const [month, setMonth] = useState(params.month ?? 'all');

  const months = useMemo(() => {
    const fromData = [
      ...new Set([
        ...(expenses.data ?? []).map((row) => yearMonthOf(row.incurred_on)),
        ...(rentalDays.data ?? []).map((row) => yearMonthOf(row.work_date)),
      ]),
    ].sort().reverse();
    const current = yearMonthNow();
    return fromData.includes(current) ? fromData : [current, ...fromData];
  }, [expenses.data, rentalDays.data]);

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
          month: month === 'all' ? undefined : month,
          status: 'all',
        },
        canonical,
      ),
    [canonical, categoryId, expenses.data, month, query, rentalCategory?.id, rentalDays.data, rentalVehicle, t],
  );

  return (
    <Screen title={t('expenses.historyTitle')} subtitle={t('expenses.historySubtitle')} scroll>
      <TextField label={t('common.search')} value={query} onChangeText={setQuery} placeholder={t('expenses.searchPlaceholder')} />
      <FilterChips
        value={month}
        onChange={setMonth}
        options={[
          { value: 'all', label: t('common.all') },
          ...months.slice(0, 8).map((value) => ({
            value,
            label: formatYearMonth(value, locale, profile?.country_code),
          })),
        ]}
      />
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
          title={rentalFilter ? t('expenses.rentalHistoryEmpty') : t('expenses.historyEmpty')}
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
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

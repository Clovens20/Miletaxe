import { useMemo, useState } from 'react';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { MetricCard } from '@/components/ui/MetricCard';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilterChips } from '@/features/expenses/FilterChips';
import { availableMonths, canonicalCategories, monthlySummary, rentalCategoryOf } from '@/features/expenses/engine';
import { useExpenses } from '@/features/expenses/hooks';
import { useRentalDays } from '@/features/rental/hooks';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { formatMoney, formatYearMonth, yearMonthNow } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';

export default function MonthlyExpenseSummaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const expenses = useExpenses();
  const rentalDays = useRentalDays();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const rentalCategory = rentalCategoryOf(canonical);
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const months = useMemo(() => {
    const values = availableMonths(expenses.data ?? [], rentalDays.data ?? []);
    const current = yearMonthNow();
    return values.includes(current) ? values : [current, ...values];
  }, [expenses.data, rentalDays.data]);
  const [month, setMonth] = useState(yearMonthNow());
  const summary = useMemo(
    () => monthlySummary(expenses.data ?? [], month, canonical, rentalDays.data ?? []),
    [canonical, expenses.data, month, rentalDays.data],
  );

  return (
    <Screen title={t('expenses.summaryTitle')} subtitle={t('expenses.summarySubtitle')} scroll>
      <FilterChips
        value={month}
        onChange={setMonth}
        options={months.slice(0, 12).map((value) => ({
          value,
          label: formatYearMonth(value, locale, profile?.country_code),
        }))}
      />
      <MetricCard
        label={formatYearMonth(month, locale, profile?.country_code)}
        value={formatMoney(summary.total, currency, locale, profile?.country_code)}
        hint={t('expenses.summaryCount', { count: summary.count })}
      />
      <MetricCard
        label={t('expenses.taxAmount')}
        value={formatMoney(summary.tax_total, currency, locale, profile?.country_code)}
        hint={t('expenses.taxAmountHint')}
      />
      {!summary.by_category.length ? <EmptyState icon="pie-chart-outline" title={t('expenses.summaryEmpty')} /> : null}
      {summary.by_category.map((row) => {
        const category = canonical.find((item) => item.id === row.category_id);
        const title =
          category ? labelOf(category, locale) : row.code === 'vehicle_rental' ? t('expenses.checkRental') : t('expenses.noCategory');
        const categoryId = row.category_id ?? rentalCategory?.id;
        return (
          <ListRow
            key={row.category_id ?? row.code ?? 'none'}
            icon={row.code === 'vehicle_rental' ? 'key-outline' : 'pricetag-outline'}
            title={title}
            subtitle={t('expenses.categoryCount', { count: row.count })}
            right={formatMoney(row.total, currency, locale, profile?.country_code)}
            onPress={() =>
              router.push(
                (`/(app)/expenses/history?month=${month}` +
                  (categoryId ? `&categoryId=${categoryId}` : '')) as Href,
              )
            }
          />
        );
      })}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

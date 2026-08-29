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
import { availableMonths, canonicalCategories, monthlySummary } from '@/features/expenses/engine';
import { useExpenses } from '@/features/expenses/hooks';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { formatMoney, formatYearMonth, yearMonthNow } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';

export default function MonthlyExpenseSummaryScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const expenses = useExpenses();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const months = useMemo(() => {
    const values = availableMonths(expenses.data ?? []);
    const current = yearMonthNow();
    return values.includes(current) ? values : [current, ...values];
  }, [expenses.data]);
  const [month, setMonth] = useState(yearMonthNow());
  const summary = useMemo(() => monthlySummary(expenses.data ?? [], month, canonical), [canonical, expenses.data, month]);

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
        return (
          <ListRow
            key={row.category_id ?? 'none'}
            icon="pricetag-outline"
            title={category ? labelOf(category, locale) : t('expenses.noCategory')}
            subtitle={t('expenses.categoryCount', { count: row.count })}
            right={formatMoney(row.total, currency, locale, profile?.country_code)}
            onPress={() =>
              router.push(
                (`/(app)/expenses/history?month=${month}` +
                  (row.category_id ? `&categoryId=${row.category_id}` : '')) as Href,
              )
            }
          />
        );
      })}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

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
import { canonicalCategories, filterExpenses, monthlySummary } from '@/features/expenses/engine';
import { useExpenses, useReceipts } from '@/features/expenses/hooks';
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
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const month = yearMonthNow();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState('all');
  const summary = useMemo(() => monthlySummary(expenses.data ?? [], month, canonical), [canonical, expenses.data, month]);
  const pending = (receipts.data ?? []).filter((row) => row.review_status === 'pending');
  const filtered = useMemo(
    () =>
      filterExpenses(expenses.data ?? [], {
        query,
        categoryId: categoryId === 'all' ? undefined : categoryId,
        month,
      }).slice(0, 12),
    [categoryId, expenses.data, month, query],
  );

  return (
    <Screen title={t('expenses.title')} subtitle={t('expenses.subtitle')} scroll back={false}>
      <MetricCard
        label={formatYearMonth(month, locale, profile?.country_code)}
        value={formatMoney(summary.total, currency, locale, profile?.country_code)}
        hint={t('expenses.summaryCount', { count: summary.count })}
      />
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
      {!filtered.length ? <EmptyState icon="receipt-outline" title={t('expenses.empty')} /> : null}
      {filtered.map((row) => {
        const category = canonical.find((item) => item.id === row.category_id);
        return (
          <ListRow
            key={row.id}
            icon="receipt-outline"
            title={row.vendor_name || t('expenses.merchant')}
            subtitle={`${category ? labelOf(category, locale) : t('expenses.noCategory')} · ${formatDate(row.incurred_on, locale, profile?.country_code)}`}
            right={formatMoney(Number(row.amount), row.currency || currency, locale, profile?.country_code)}
            onPress={() => router.push(`/(app)/expenses/${row.id}` as Href)}
          />
        );
      })}
      <Button label={t('expenses.capture')} onPress={() => router.push('/(app)/expenses/scan')} />
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

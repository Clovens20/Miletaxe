import { useMemo } from 'react';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { canonicalCategories } from '@/features/expenses/engine';
import { useExpenses } from '@/features/expenses/hooks';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { formatMoney } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';

export default function ExpenseCategoriesScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const expenses = useExpenses();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const totals = useMemo(() => {
    const map = new Map<string, { total: number; count: number }>();
    for (const row of expenses.data ?? []) {
      if (!row.category_id || row.status !== 'complete') continue;
      const current = map.get(row.category_id) ?? { total: 0, count: 0 };
      current.total += Number(row.amount);
      current.count += 1;
      map.set(row.category_id, current);
    }
    return map;
  }, [expenses.data]);

  return (
    <Screen title={t('expenses.categoriesTitle')} subtitle={t('expenses.categoriesSubtitle')} scroll>
      {!canonical.length ? <EmptyState icon="pricetag-outline" title={t('expenses.noCategory')} /> : null}
      {canonical.map((row) => {
        const stats = totals.get(row.id) ?? { total: 0, count: 0 };
        return (
          <ListRow
            key={row.id}
            icon="pricetag-outline"
            title={labelOf(row, locale)}
            subtitle={t('expenses.categoryCount', { count: stats.count })}
            right={formatMoney(stats.total, currency, locale, profile?.country_code)}
            onPress={() => router.push(`/(app)/expenses/history?categoryId=${row.id}` as Href)}
          />
        );
      })}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { MetricCard } from '@/components/ui/MetricCard';
import { PeriodSwitcher } from '@/components/ui/PeriodSwitcher';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { canonicalCategories, periodExpenseSnapshot } from '@/features/expenses/engine';
import { useExpenses, useReceipts } from '@/features/expenses/hooks';
import { useRecordPeriod } from '@/features/records/useRecordPeriod';
import { useRentalDays } from '@/features/rental/hooks';
import { labelOf, useExpenseCategories } from '@/features/tax-config/hooks';
import { formatDate, formatMoney } from '@/lib/format';
import type { CurrencyCode } from '@/types/domain';
import { colors, space, type } from '@/theme';

export default function ExpenseCheckScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const period = useRecordPeriod('today');
  const locale = period.locale;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const expenses = useExpenses();
  const receipts = useReceipts();
  const rentalDays = useRentalDays();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const rentalCategoryId = canonical.find((row) => row.code === 'vehicle_rental')?.id ?? null;
  const snapshot = useMemo(
    () =>
      periodExpenseSnapshot(
        expenses.data ?? [],
        rentalDays.data ?? [],
        period.range,
        canonical,
        rentalCategoryId,
      ),
    [canonical, expenses.data, period.range, rentalCategoryId, rentalDays.data],
  );
  const pending = (receipts.data ?? []).filter((row) => row.review_status === 'pending');

  const lines = [
    ...snapshot.complete.map((row) => {
      const category = canonical.find((item) => item.id === row.category_id);
      return {
        key: row.id,
        date: row.incurred_on,
        title: row.vendor_name || t('expenses.merchant'),
        subtitle: `${category ? labelOf(category, locale) : t('expenses.noCategory')} · ${formatDate(row.incurred_on, locale, profile?.country_code)}`,
        amount: Number(row.amount),
        currency: row.currency || currency,
        icon: 'receipt-outline' as const,
        href: `/(app)/expenses/${row.id}` as Href,
      };
    }),
    ...snapshot.rentals.map((row) => ({
      key: `rental-${row.id}`,
      date: row.work_date,
      title: t('expenses.checkRental'),
      subtitle: formatDate(row.work_date, locale, profile?.country_code),
      amount: Number(row.rental_amount),
      currency,
      icon: 'key-outline' as const,
      href: '/(app)/rental/daily' as Href,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Screen title={t('expenses.checkTitle')} subtitle={t('expenses.checkSubtitle')} scroll>
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
        label={t('expenses.checkTotal')}
        value={formatMoney(snapshot.total, currency, locale, profile?.country_code)}
        hint={t('expenses.checkCount', { count: snapshot.completeCount })}
      />

      {snapshot.incomplete.length || pending.length ? (
        <View style={styles.block}>
          <Text style={styles.section}>{t('expenses.checkIncomplete')}</Text>
          {pending.slice(0, 3).map((row) => (
            <ListRow
              key={row.id}
              icon="scan-outline"
              title={row.original_filename || t('expenses.pendingItem')}
              subtitle={t('expenses.ocrComplete')}
              onPress={() => router.push(`/(app)/expenses/review?receiptId=${row.id}` as Href)}
            />
          ))}
          {snapshot.incomplete.slice(0, 5).map((row) => (
            <ListRow
              key={row.id}
              icon="alert-circle-outline"
              title={row.vendor_name || t('expenses.merchant')}
              subtitle={`${t(`expenses.status${row.status === 'draft' ? 'Draft' : 'Review'}`)} · ${formatDate(row.incurred_on, locale, profile?.country_code)}`}
              right={formatMoney(Number(row.amount), row.currency || currency, locale, profile?.country_code)}
              onPress={() => router.push(`/(app)/expenses/${row.id}` as Href)}
            />
          ))}
        </View>
      ) : null}

      {snapshot.by_category.map((row) => {
        const category = canonical.find((item) => item.id === row.category_id);
        const title =
          category ? labelOf(category, locale) : row.code === 'vehicle_rental' ? t('expenses.checkRental') : t('expenses.noCategory');
        return (
          <ListRow
            key={`${row.category_id ?? row.code ?? 'none'}`}
            icon="pricetag-outline"
            title={title}
            subtitle={t('expenses.categoryCount', { count: row.count })}
            right={formatMoney(row.total, currency, locale, profile?.country_code)}
          />
        );
      })}

      <Text style={styles.section}>{t('expenses.checkLines')}</Text>
      {!lines.length ? <EmptyState icon="receipt-outline" title={t('expenses.checkEmpty')} /> : null}
      {lines.slice(0, 25).map((row) => (
        <ListRow
          key={row.key}
          icon={row.icon}
          title={row.title}
          subtitle={row.subtitle}
          right={formatMoney(row.amount, row.currency, locale, profile?.country_code)}
          onPress={() => router.push(row.href)}
        />
      ))}

      <Button label={t('expenses.capture')} onPress={() => router.push('/(app)/expenses/scan')} />
      <Button
        label={t('expenses.typeManually')}
        variant="secondary"
        onPress={() => router.push('/(app)/expenses/manual')}
      />
      <Button
        label={t('expenses.history')}
        variant="secondary"
        onPress={() => router.push('/(app)/expenses/history')}
      />
      <DisclaimerBanner text={t('expenses.checkDisclaimer')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: space.xs,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
});

import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { EmptyState } from '@/components/ui/EmptyState';
import { ListRow } from '@/components/ui/ListRow';
import { MetricCard } from '@/components/ui/MetricCard';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { FilterChips } from '@/features/expenses/FilterChips';
import {
  canonicalCategories,
  periodExpenseSnapshot,
  shiftSpendingAnchor,
  spendingWindow,
  type SpendingPeriodKind,
} from '@/features/expenses/engine';
import { useExpenses, useReceipts } from '@/features/expenses/hooks';
import { useRentalDays } from '@/features/rental/hooks';
import { currentTaxYear, labelOf, useExpenseCategories, useTaxYears } from '@/features/tax-config/hooks';
import {
  addDays,
  formatDate,
  formatMoney,
  formatWeekRange,
  formatYearMonth,
  startOfWeekIso,
  todayIso,
} from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

const PERIODS: SpendingPeriodKind[] = ['today', 'week', 'month', 'year'];

export default function ExpenseCheckScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const today = todayIso();
  const years = useTaxYears(profile?.country_code);
  const taxYear = currentTaxYear(years.data);
  const expenses = useExpenses();
  const receipts = useReceipts();
  const rentalDays = useRentalDays();
  const categories = useExpenseCategories(profile?.country_code);
  const canonical = useMemo(() => canonicalCategories(categories.data ?? []), [categories.data]);
  const rentalCategoryId = canonical.find((row) => row.code === 'vehicle_rental')?.id ?? null;

  const [kind, setKind] = useState<SpendingPeriodKind>('today');
  const [anchor, setAnchor] = useState(today);
  const minDate = taxYear?.starts_on ?? addDays(today, -730);

  const range = useMemo(
    () =>
      spendingWindow(
        kind,
        anchor,
        today,
        taxYear ? { start: taxYear.starts_on, end: taxYear.ends_on } : undefined,
      ),
    [anchor, kind, taxYear, today],
  );
  const snapshot = useMemo(
    () => periodExpenseSnapshot(expenses.data ?? [], rentalDays.data ?? [], range, canonical, rentalCategoryId),
    [canonical, expenses.data, range, rentalCategoryId, rentalDays.data],
  );
  const pending = (receipts.data ?? []).filter((row) => row.review_status === 'pending');
  const canGoNext = kind !== 'year' && shiftSpendingAnchor(kind, anchor, 1, today, minDate) !== anchor;
  const canGoPrev = kind !== 'year' && shiftSpendingAnchor(kind, anchor, -1, today, minDate) !== anchor;

  const periodLabel = (() => {
    if (kind === 'today') return formatDate(anchor, locale, profile?.country_code);
    if (kind === 'week') {
      const start = startOfWeekIso(anchor);
      return formatWeekRange(start, addDays(start, 6), locale, profile?.country_code);
    }
    if (kind === 'month') return formatYearMonth(anchor.slice(0, 7), locale, profile?.country_code);
    return t('home.taxYear', { year: taxYear?.year ?? Number(today.slice(0, 4)) });
  })();

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
      <FilterChips
        value={kind}
        onChange={(value) => {
          setKind(value as SpendingPeriodKind);
          setAnchor(today);
        }}
        options={PERIODS.map((value) => ({ value, label: t(`expenses.checkPeriod.${value}`) }))}
      />
      {kind !== 'year' ? (
        <View style={styles.nav}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('expenses.checkPrev')}
            disabled={!canGoPrev}
            onPress={() => setAnchor(shiftSpendingAnchor(kind, anchor, -1, today, minDate))}
            style={({ pressed }) => [styles.navBtn, !canGoPrev && styles.navDisabled, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-back" size={22} color={canGoPrev ? colors.text : colors.textMuted} />
          </Pressable>
          <Text style={styles.navLabel}>{periodLabel}</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('expenses.checkNext')}
            disabled={!canGoNext}
            onPress={() => setAnchor(shiftSpendingAnchor(kind, anchor, 1, today, minDate))}
            style={({ pressed }) => [styles.navBtn, !canGoNext && styles.navDisabled, pressed && styles.pressed]}
          >
            <Ionicons name="chevron-forward" size={22} color={canGoNext ? colors.text : colors.textMuted} />
          </Pressable>
        </View>
      ) : (
        <Text style={styles.yearLabel}>{periodLabel}</Text>
      )}

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
        label={t('expenses.history')}
        variant="secondary"
        onPress={() => router.push('/(app)/expenses/history')}
      />
      <DisclaimerBanner text={t('expenses.checkDisclaimer')} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  navBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navDisabled: {
    opacity: 0.45,
  },
  navLabel: {
    ...type.bodyMedium,
    color: colors.text,
    flex: 1,
    textAlign: 'center',
  },
  yearLabel: {
    ...type.bodyMedium,
    color: colors.text,
    textAlign: 'center',
  },
  block: {
    gap: space.xs,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
  pressed: {
    opacity: 0.84,
  },
});

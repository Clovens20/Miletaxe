import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import {
  completeExpenseLines,
  expensesWithoutReceipt,
  incompleteExpenseLines,
  incompleteMileageDays,
  isCompleteMileageDay,
  lineRef,
  monthlyBuckets,
} from '@/features/reports/explain';
import { reportSummary, useReports } from '@/features/reports/hooks';
import { downloadAccountantPackage, shareAccountantPackage } from '@/features/reports/share';
import { localize } from '@/lib/i18n/localize';
import { formatDate, formatDistance, formatMoney, formatYearMonth } from '@/lib/format';
import type { CurrencyCode, DistanceUnit, SupportedLocale } from '@/types/domain';
import { colors, type } from '@/theme';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const reports = useReports();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const report = reports.data?.find((row) => row.id === id);
  const summary = report ? reportSummary(report) : null;
  const unit = (summary?.totals.unit ?? profile?.default_distance_unit ?? 'km') as DistanceUnit;
  const currency = (summary?.totals.currency ?? profile?.default_currency ?? 'CAD') as CurrencyCode;
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const country = profile?.country_code;
  const prefixes = locale === 'en' ? { expense: 'E', income: 'I', mileage: 'M' } : { expense: 'D', income: 'R', mileage: 'K' };

  const derived = useMemo(() => {
    if (!summary) return null;
    return {
      complete: completeExpenseLines(summary),
      incomplete: incompleteExpenseLines(summary),
      noPhoto: expensesWithoutReceipt(summary),
      incompleteDays: incompleteMileageDays(summary),
      months: monthlyBuckets(summary),
    };
  }, [summary]);

  const send = async () => {
    if (!summary) return;
    setSharing(true);
    try {
      await shareAccountantPackage(summary, locale, country);
    } catch {
      Alert.alert(t('common.error'), t('reports.shareFailed'));
    } finally {
      setSharing(false);
    }
  };

  const download = async () => {
    if (!summary) return;
    setDownloading(true);
    try {
      const result = await downloadAccountantPackage(summary, locale, country);
      if (result === 'saved') {
        Alert.alert(t('reports.downloadPdf'), t('reports.downloadOk'));
      }
    } catch {
      Alert.alert(t('common.error'), t('reports.downloadFailed'));
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Screen title={t('reports.detailTitle')} scroll>
      <DisclaimerBanner text={t('disclaimer.report')} />
      {summary && derived ? (
        <>
          <Card>
            <Text style={styles.kicker}>{t('reports.period')}</Text>
            <Text style={styles.period}>{localize(summary.period.label_i18n, locale)}</Text>
            <Text style={styles.meta}>
              {t('reports.periodDates', {
                start: formatDate(summary.period.start, locale, country),
                end: formatDate(summary.period.end, locale, country),
              })}
            </Text>
            {summary.profile.full_name ? <Text style={styles.meta}>{summary.profile.full_name}</Text> : null}
          </Card>

          <Card>
            <Text style={styles.section}>{t('reports.howToTitle')}</Text>
            <Text style={styles.meta}>{t('reports.howTo1')}</Text>
            <Text style={styles.meta}>{t('reports.howTo2')}</Text>
            <Text style={styles.meta}>{t('reports.howTo3')}</Text>
          </Card>

          {derived.noPhoto.length || derived.incomplete.length || derived.incompleteDays.length || summary.findings.length ? (
            <>
              <Text style={styles.section}>{t('reports.reviewFirst')}</Text>
              {derived.noPhoto.length ? (
                <WarningBanner tone="warning" title={t('reports.missingReceipts', { count: derived.noPhoto.length })} />
              ) : null}
              {derived.incomplete.length ? (
                <WarningBanner tone="warning" title={t('reports.incompleteExpenses', { count: derived.incomplete.length })} />
              ) : null}
              {derived.incompleteDays.length ? (
                <WarningBanner tone="warning" title={t('reports.incompleteMileage', { count: derived.incompleteDays.length })} />
              ) : null}
              {summary.findings.map((item, index) => (
                <ListRow
                  key={`${item.severity}-${index}`}
                  title={localize(item.title_i18n, locale)}
                  subtitle={localize(item.description_i18n, locale)}
                />
              ))}
            </>
          ) : (
            <WarningBanner tone="info" title={t('reports.reviewFirst')} body={t('reports.reviewNone')} />
          )}

          <Card>
            <Text style={styles.section}>{t('reports.totals')}</Text>
            <Text style={styles.meta}>{t('reports.totalsHint')}</Text>
            <ListRow
              title={t('home.kmDriven')}
              right={formatDistance(summary.totals.recorded_distance, unit, locale, country)}
            />
            <ListRow
              title={`${t('home.expensesTotal')} (${summary.totals.expense_count})`}
              right={formatMoney(summary.totals.recorded_expenses, currency, locale, country)}
            />
            <ListRow
              title={`${t('home.incomeTotal')} (${summary.totals.income_count})`}
              right={formatMoney(summary.totals.recorded_income, currency, locale, country)}
            />
          </Card>

          {summary.expenses_by_category.length ? (
            <>
              <Text style={styles.section}>{t('reports.byCategory')}</Text>
              {summary.expenses_by_category.map((row, index) => (
                <ListRow
                  key={`${localize(row.category_i18n, locale, t('reports.uncategorized'))}-${index}`}
                  title={localize(row.category_i18n, locale, t('reports.uncategorized'))}
                  subtitle={`${row.count}`}
                  right={formatMoney(row.total, currency, locale, country)}
                />
              ))}
            </>
          ) : null}

          {summary.income_by_source.length ? (
            <>
              <Text style={styles.section}>{t('reports.bySource')}</Text>
              {summary.income_by_source.map((row) => (
                <ListRow
                  key={row.source_name}
                  title={row.source_name}
                  subtitle={`${row.count}`}
                  right={formatMoney(row.total, currency, locale, country)}
                />
              ))}
            </>
          ) : null}

          {summary.period.kind !== 'monthly' && derived.months.length > 1 ? (
            <>
              <Text style={styles.section}>{t('reports.byMonth')}</Text>
              {derived.months.map((row) => (
                <ListRow
                  key={row.month}
                  title={formatYearMonth(row.month, locale, country)}
                  subtitle={`${t('reports.expenseLines')} ${row.expenseCount} · ${t('reports.incomeLines')} ${row.incomeCount}`}
                  right={formatMoney(row.expenses, currency, locale, country)}
                />
              ))}
            </>
          ) : null}

          <Text style={styles.section}>{t('reports.expenseLines')}</Text>
          {derived.complete.length ? (
            derived.complete.map((row, index) => (
              <ListRow
                key={row.id}
                title={`${lineRef(prefixes.expense, index)} · ${row.vendor_name || t('reports.uncategorized')}`}
                subtitle={`${formatDate(row.incurred_on, locale, country)} · ${localize(row.category_i18n, locale, t('reports.uncategorized'))}${row.has_receipt ? ` · ${t('reports.withPhoto')}` : ` · ${t('reports.noReceipt')}`}`}
                right={formatMoney(row.amount, row.currency || currency, locale, country)}
              />
            ))
          ) : (
            <Text style={styles.note}>{t('reports.noExpenses')}</Text>
          )}
          {derived.incomplete.map((row, index) => (
            <ListRow
              key={row.id}
              title={`${lineRef(prefixes.expense, derived.complete.length + index)} · ${row.vendor_name || t('reports.uncategorized')}`}
              subtitle={`${formatDate(row.incurred_on, locale, country)} · ${t('reports.draftLine')}`}
              right={formatMoney(row.amount, row.currency || currency, locale, country)}
            />
          ))}

          <Text style={styles.section}>{t('reports.incomeLines')}</Text>
          {summary.income.length ? (
            summary.income.map((row, index) => (
              <ListRow
                key={row.id}
                title={`${lineRef(prefixes.income, index)} · ${row.source_name}`}
                subtitle={formatDate(row.received_on, locale, country)}
                right={formatMoney(row.amount, row.currency || currency, locale, country)}
              />
            ))
          ) : (
            <Text style={styles.note}>{t('reports.noIncome')}</Text>
          )}

          <Text style={styles.section}>{t('reports.mileageDays')}</Text>
          {summary.daily_mileage.length ? (
            summary.daily_mileage.map((row, index) => (
              <ListRow
                key={`${row.vehicle}-${row.date}-${index}`}
                title={`${lineRef(prefixes.mileage, index)} · ${row.vehicle}`}
                subtitle={`${formatDate(row.date, locale, country)}${isCompleteMileageDay(row) ? '' : ` · ${t('reports.mileageGap')}`}`}
                right={
                  row.distance == null ? '—' : formatDistance(row.distance, row.unit, locale, country)
                }
              />
            ))
          ) : (
            <Text style={styles.note}>{t('reports.noMileage')}</Text>
          )}

          <Text style={styles.note}>{t('reports.noRates')}</Text>
          <Button
            label={t('reports.downloadPdf')}
            loading={downloading}
            disabled={sharing}
            onPress={() => void download()}
          />
          <Button
            label={t('reports.sharePdf')}
            variant="secondary"
            loading={sharing}
            disabled={downloading}
            onPress={() => void send()}
          />
        </>
      ) : (
        <Text style={styles.note}>{t('reports.missing')}</Text>
      )}
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  period: {
    ...type.subtitle,
    color: colors.text,
  },
  meta: {
    ...type.body,
    color: colors.textSecondary,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
  note: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

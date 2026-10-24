import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { WarningBanner } from '@/components/ui/WarningBanner';
import { useAuth } from '@/features/auth/AuthProvider';
import { activePlanOf, monthsCoveredByPlan, planIsActive } from '@/features/recurring/engine';
import {
  useEndRecurringPlan,
  useEnsureRecurringCharges,
  useRecurringPlans,
  useSaveRecurringPlan,
  useUpdateRecurringPlan,
} from '@/features/recurring/hooks';
import { isRecurringKind, type RecurringKind, type RecurringPlan } from '@/features/recurring/types';
import { formatMoney, formatYearMonth, parseDecimal, startOfMonthIso, todayIso } from '@/lib/format';
import type { CurrencyCode, SupportedLocale } from '@/types/domain';
import { colors, space, type } from '@/theme';

const KINDS: RecurringKind[] = ['internet', 'insurance'];

export default function RecurringPlansScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string }>();
  const { profile } = useAuth();
  useEnsureRecurringCharges();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const currency = (profile?.default_currency ?? 'CAD') as CurrencyCode;
  const today = todayIso();
  const plans = useRecurringPlans();
  const focusKind = isRecurringKind(String(params.kind ?? '')) ? (params.kind as RecurringKind) : null;

  return (
    <Screen title={t('recurring.title')} subtitle={t('recurring.subtitle')} scroll>
      {plans.isError ? <WarningBanner tone="warning" title={t('recurring.loadFailed')} /> : null}
      <Text style={styles.intro}>{t('recurring.intro')}</Text>
      {KINDS.filter((kind) => !focusKind || kind === focusKind).map((kind) => (
        <KindSection
          key={kind}
          kind={kind}
          plans={plans.data ?? []}
          today={today}
          locale={locale}
          currency={currency}
          countryCode={profile?.country_code}
          loading={plans.isLoading}
        />
      ))}
      <DisclaimerBanner text={t('recurring.disclaimer')} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

function KindSection({
  kind,
  plans,
  today,
  locale,
  currency,
  countryCode,
  loading,
}: {
  kind: RecurringKind;
  plans: RecurringPlan[];
  today: string;
  locale: SupportedLocale;
  currency: CurrencyCode;
  countryCode?: string | null;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const save = useSaveRecurringPlan();
  const update = useUpdateRecurringPlan();
  const endPlan = useEndRecurringPlan();
  const active = activePlanOf(plans, kind, today);
  const past = useMemo(
    () => plans.filter((row) => row.kind === kind && !planIsActive(row, today)),
    [kind, plans, today],
  );

  const [vendor, setVendor] = useState('');
  const [amount, setAmount] = useState('');
  const [startedOn, setStartedOn] = useState(startOfMonthIso(today));
  const [endedOn, setEndedOn] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [savedOk, setSavedOk] = useState(false);

  useEffect(() => {
    if (active) {
      setVendor(active.vendor_name);
      setAmount(String(active.amount));
      setEndedOn(today);
    } else {
      setVendor('');
      setAmount('');
      setStartedOn(startOfMonthIso(today));
      setEndedOn(today);
    }
    setError(null);
    setSavedOk(false);
  }, [active, today]);

  const title = kind === 'internet' ? t('recurring.kindInternet') : t('recurring.kindInsurance');
  const hint = kind === 'internet' ? t('recurring.newHintInternet') : t('recurring.newHintInsurance');
  const vendorHint =
    kind === 'internet' ? t('recurring.vendorHintInternet') : t('recurring.vendorHintInsurance');

  const create = async () => {
    const value = parseDecimal(amount);
    if (!vendor.trim() || value == null || value < 0) {
      setError(t('validation.required'));
      return;
    }
    if (startedOn > today) {
      setError(t('validation.dateNotFuture'));
      return;
    }
    setError(null);
    try {
      await save.mutateAsync({
        kind,
        vendor_name: vendor.trim(),
        amount: value,
        started_on: startedOn,
      });
      setSavedOk(true);
    } catch (cause) {
      setError(
        cause instanceof Error && cause.message === 'active_plan_exists'
          ? t('recurring.activeExists')
          : t('common.error'),
      );
    }
  };

  const saveEdits = async () => {
    if (!active) return;
    const value = parseDecimal(amount);
    if (!vendor.trim() || value == null || value < 0) {
      setError(t('validation.required'));
      return;
    }
    setError(null);
    try {
      await update.mutateAsync({
        id: active.id,
        vendor_name: vendor.trim(),
        amount: value,
      });
      setSavedOk(true);
    } catch {
      setError(t('common.error'));
    }
  };

  const finish = async () => {
    if (!active) return;
    if (endedOn < active.started_on) {
      setError(t('recurring.endBeforeStart'));
      return;
    }
    setError(null);
    try {
      await endPlan.mutateAsync({ id: active.id, ended_on: endedOn });
    } catch {
      setError(t('common.error'));
    }
  };

  return (
    <Card style={styles.sectionCard}>
      <Text style={styles.kindTitle}>{title}</Text>
      <Text style={styles.hint}>{hint}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {savedOk ? <Text style={styles.ok}>{t('recurring.savedOk')}</Text> : null}

      {active ? (
        <>
          <Text style={styles.kicker}>{t('recurring.active')}</Text>
          <Text style={styles.meta}>
            {t('recurring.since', {
              month: formatYearMonth(active.started_on.slice(0, 7), locale, countryCode),
            })}
            {` · ${t('recurring.monthsLogged', { count: monthsCoveredByPlan(active, today).length })}`}
          </Text>
          <TextField
            label={t('recurring.vendor')}
            hint={vendorHint}
            value={vendor}
            onChangeText={(value) => {
              setVendor(value);
              setSavedOk(false);
            }}
          />
          <TextField
            label={t('recurring.amount')}
            hint={t('recurring.amountEditHint')}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={(value) => {
              setAmount(value);
              setSavedOk(false);
            }}
          />
          <Button
            label={t('recurring.saveChanges')}
            loading={update.isPending}
            onPress={() => void saveEdits()}
          />
          <View style={styles.endBlock}>
            <Text style={styles.kicker}>{t('recurring.endTitle')}</Text>
            <TextField
              label={t('recurring.endedOn')}
              hint={t('recurring.endedOnHint')}
              value={endedOn}
              onChangeText={setEndedOn}
              placeholder={t('expenses.datePlaceholder')}
            />
            <Button
              label={t('recurring.endContract')}
              variant="secondary"
              loading={endPlan.isPending}
              onPress={() => void finish()}
            />
          </View>
        </>
      ) : (
        <>
          {!loading ? <Text style={styles.kicker}>{t('recurring.newPlan')}</Text> : null}
          <TextField
            label={t('recurring.vendor')}
            hint={vendorHint}
            value={vendor}
            onChangeText={setVendor}
          />
          <TextField
            label={t('recurring.amount')}
            keyboardType="decimal-pad"
            value={amount}
            onChangeText={setAmount}
          />
          <TextField
            label={t('recurring.startedOn')}
            hint={t('recurring.startedOnHint')}
            value={startedOn}
            onChangeText={setStartedOn}
            placeholder={t('expenses.datePlaceholder')}
          />
          <Button
            label={t('recurring.save')}
            loading={save.isPending}
            onPress={() => void create()}
          />
        </>
      )}

      {past.length ? (
        <View style={styles.pastBlock}>
          <Text style={styles.kicker}>{t('recurring.pastTitle')}</Text>
          {past.map((row) => (
            <Text key={row.id} style={styles.meta}>
              {row.vendor_name}
              {' · '}
              {formatMoney(Number(row.amount), row.currency || currency, locale, countryCode)}
              {' · '}
              {formatYearMonth(row.started_on.slice(0, 7), locale, countryCode)}
              {' → '}
              {row.ended_on
                ? formatYearMonth(row.ended_on.slice(0, 7), locale, countryCode)
                : '—'}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  intro: {
    ...type.body,
    color: colors.textSecondary,
  },
  sectionCard: {
    gap: space.sm,
  },
  kindTitle: {
    ...type.section,
    color: colors.text,
  },
  kicker: {
    ...type.captionMedium,
    color: colors.accent,
    marginTop: space.xs,
  },
  hint: {
    ...type.caption,
    color: colors.textSecondary,
  },
  meta: {
    ...type.body,
    color: colors.textSecondary,
  },
  error: {
    ...type.caption,
    color: colors.danger,
  },
  ok: {
    ...type.caption,
    color: colors.success,
  },
  endBlock: {
    gap: space.sm,
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  pastBlock: {
    gap: space.xs,
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
});

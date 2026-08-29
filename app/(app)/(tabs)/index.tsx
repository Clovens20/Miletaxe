import { Pressable, StyleSheet, Text, View } from 'react-native';
import { type Href, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { Card } from '@/components/ui/Card';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useOpenAssistantCount } from '@/features/assistant/hooks';
import { useHomeDashboard } from '@/features/dashboard/hooks';
import { findingHref } from '@/features/dashboard/routes';
import { localize } from '@/lib/i18n/localize';
import { formatDistance, formatMoney, formatYearMonth } from '@/lib/format';
import { HeroButton } from '@/components/ui/HeroButton';
import { useGenerateReport, usePreferredReportPeriod } from '@/features/reports/hooks';
import type { DistanceUnit, SupportedLocale } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

const ALERT_PREVIEW = 3;

export default function HomeScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const dashboard = useHomeDashboard();
  const assistant = useOpenAssistantCount();
  const generate = useGenerateReport();
  const preferred = usePreferredReportPeriod();
  const firstName = profile?.full_name?.split(' ')[0];
  const monthLabel = formatYearMonth(dashboard.monthStart.slice(0, 7), locale, profile?.country_code);
  const dash = '—';
  const formatReading = (value: number | null, unit: DistanceUnit) =>
    value == null ? dash : formatDistance(value, unit, locale, profile?.country_code);

  const preview = dashboard.findings.slice(0, ALERT_PREVIEW);
  const extraAlerts = dashboard.findings.length - preview.length;
  const barColor =
    dashboard.tone === 'danger' ? colors.danger : dashboard.tone === 'warn' ? colors.warning : colors.success;
  const reviewCount = (assistant.count ?? 0) + dashboard.completeness.total;
  const vehicle = dashboard.vehiclesToday[0];

  return (
    <Screen scroll home={false} back={false}>
      <View>
        <Text style={styles.kicker}>{t('home.taxYear', { year: dashboard.taxYear?.year ?? 2026 })}</Text>
        <Text style={styles.title}>{t('home.greeting', { name: firstName ? ` ${firstName}` : '' })}</Text>
      </View>

      <View style={styles.actionRow}>
        <ActionTile
          icon="camera-outline"
          label={t('home.scanReceipt')}
          onPress={() => router.push('/(app)/expenses/scan')}
        />
        <ActionTile
          icon="speedometer-outline"
          label={t('home.logOdometer')}
          onPress={() => router.push('/(app)/odometer/capture')}
        />
        <ActionTile
          icon="cash-outline"
          label={t('home.addIncome')}
          onPress={() => router.push('/(app)/income/new')}
        />
      </View>

      <HeroButton
        label={t('home.generatePackage')}
        subtitle={preferred ? localize(preferred.label_i18n, locale) : t('home.generatePackageHint')}
        loading={generate.isPending}
        onPress={async () => {
          const report = await generate.mutateAsync();
          router.push(`/(app)/reports/${report.id}`);
        }}
      />

      <Card>
        <Text style={styles.cardKicker}>{t('home.todaySection')}</Text>
        {!dashboard.hasVehicles ? (
          <ListRow
            icon="car-outline"
            title={t('home.noVehicle')}
            subtitle={t('mileage.addVehicle')}
            onPress={() => router.push('/(app)/vehicles/new')}
          />
        ) : vehicle ? (
          <View style={styles.todayGrid}>
            <TodayStat label={t('home.startOdometer')} value={formatReading(vehicle.start, vehicle.unit)} muted={vehicle.missingStart} />
            <TodayStat label={t('home.endOdometer')} value={formatReading(vehicle.end, vehicle.unit)} muted={vehicle.missingEnd || vehicle.missingStart} />
            <TodayStat
              label={t('home.todayDriven')}
              value={formatDistance(dashboard.todayDistance, dashboard.unit, locale, profile?.country_code)}
            />
          </View>
        ) : null}
        <Text style={styles.todayMeta}>
          {t('home.todayReceiptsShort', { count: dashboard.todayReceiptCount })}
          {' · '}
          {t('home.todayIncomeShort', { count: dashboard.todayIncomeCount })}
        </Text>
      </Card>

      <Card style={styles.status}>
        <View style={styles.statusHead}>
          <Text style={styles.cardKicker}>{t('home.statusTitle')}</Text>
          <Text style={[styles.score, { color: barColor }]}>{dashboard.completeness.score} %</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${dashboard.completeness.score}%`, backgroundColor: barColor }]} />
        </View>
        <Text style={styles.statusCopy}>
          {reviewCount ? t('home.statusReview', { count: reviewCount }) : t('home.completenessOk')}
        </Text>
        <View style={styles.statusLinks}>
          <Pressable onPress={() => router.push('/(app)/completeness')}>
            <Text style={styles.link}>{t('home.completeness')}</Text>
          </Pressable>
          <Text style={styles.dot}>·</Text>
          <Pressable onPress={() => router.push('/(app)/assistant' as Href)}>
            <Text style={styles.link}>
              {t('home.assistant')}
              {assistant.count ? ` (${assistant.count})` : ''}
            </Text>
          </Pressable>
        </View>
      </Card>

      <View style={styles.metrics}>
        <MiniMetric
          label={t('home.monthMileage')}
          value={formatDistance(dashboard.monthDistance, dashboard.unit, locale, profile?.country_code)}
          hint={monthLabel}
        />
        <MiniMetric
          label={t('home.expensesTotal')}
          value={formatMoney(dashboard.yearExpenses, dashboard.currency, locale, profile?.country_code)}
          hint={t('home.taxYear', { year: dashboard.taxYear?.year ?? 2026 })}
        />
        <MiniMetric
          label={t('home.incomeTotal')}
          value={formatMoney(dashboard.yearIncome, dashboard.currency, locale, profile?.country_code)}
        />
      </View>

      {preview.length ? (
        <View style={styles.alerts}>
          <Text style={styles.section}>{t('home.alerts')}</Text>
          {preview.map((item) => (
            <Pressable key={item.id} onPress={() => router.push(findingHref(item))}>
              <Card style={styles.alertCard}>
                <Text style={styles.alertTitle}>{localize(item.title_i18n, locale)}</Text>
                <Text style={styles.alertBody} numberOfLines={2}>
                  {localize(item.description_i18n, locale)}
                </Text>
              </Card>
            </Pressable>
          ))}
          {extraAlerts > 0 ? (
            <ListRow title={t('home.alertsMore', { count: extraAlerts })} onPress={() => router.push('/(app)/completeness')} />
          ) : null}
        </View>
      ) : null}

      <ListRow
        icon="folder-open-outline"
        title={t('home.viewReports')}
        onPress={() => router.push('/(app)/reports')}
      />

      <DisclaimerBanner text={`${t('disclaimer.short')} ${t('home.reviewAccountant')}`} />
    </Screen>
  );
}

function TodayStat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <View style={styles.todayStat}>
      <Text style={styles.odoLabel}>{label}</Text>
      <Text style={[styles.odoValue, muted && styles.odoMuted]}>{value}</Text>
    </View>
  );
}

function MiniMetric({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <View style={styles.mini}>
      <Text style={styles.odoLabel}>{label}</Text>
      <Text style={styles.miniValue}>{value}</Text>
      {hint ? <Text style={styles.miniHint} numberOfLines={1}>{hint}</Text> : null}
    </View>
  );
}

function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
      <View style={styles.actionIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  kicker: {
    ...type.captionMedium,
    color: colors.accent,
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  action: {
    flex: 1,
    minHeight: 96,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.sm,
    gap: space.xs,
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.72,
  },
  actionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    ...type.captionMedium,
    color: colors.text,
  },
  cardKicker: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  todayGrid: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
  },
  todayStat: {
    flex: 1,
    gap: 2,
  },
  todayMeta: {
    ...type.caption,
    color: colors.textSecondary,
    marginTop: space.xs,
  },
  odoLabel: {
    ...type.caption,
    color: colors.textMuted,
  },
  odoValue: {
    ...type.bodyMedium,
    color: colors.text,
  },
  odoMuted: {
    color: colors.textMuted,
  },
  status: {
    gap: space.xs,
  },
  statusHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  score: {
    ...type.section,
  },
  track: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  fill: {
    height: 8,
    borderRadius: radius.full,
  },
  statusCopy: {
    ...type.bodyMedium,
    color: colors.text,
  },
  statusLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  link: {
    ...type.captionMedium,
    color: colors.primary,
  },
  dot: {
    color: colors.textMuted,
  },
  metrics: {
    flexDirection: 'row',
    gap: space.sm,
  },
  mini: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: space.sm,
    gap: 2,
  },
  miniValue: {
    ...type.callout,
    color: colors.text,
  },
  miniHint: {
    ...type.caption,
    color: colors.textMuted,
  },
  section: {
    ...type.section,
    color: colors.text,
  },
  alerts: {
    gap: space.sm,
  },
  alertCard: {
    gap: 4,
  },
  alertTitle: {
    ...type.bodyMedium,
    color: colors.text,
  },
  alertBody: {
    ...type.caption,
    color: colors.textSecondary,
  },
});

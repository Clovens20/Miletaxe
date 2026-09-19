import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { useAuth } from '@/features/auth/AuthProvider';
import { useBrandLogoSrc } from '@/features/reports/brandLogo';
import { DocumentPreview } from '@/features/reports/DocumentPreview';
import { accountantPackageHtml } from '@/features/reports/documentHtml';
import { reportSummary, useAccountantPdfActions, useReports } from '@/features/reports/hooks';
import type { SupportedLocale } from '@/types/domain';
import { colors, radius, space, type } from '@/theme';

export default function ReportPreviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { profile } = useAuth();
  const reports = useReports();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const country = profile?.country_code;
  const report = reports.data?.find((row) => row.id === id);
  const summary = report ? reportSummary(report) : null;
  const logoSrc = useBrandLogoSrc();
  const html = useMemo(
    () => (summary ? accountantPackageHtml(summary, locale, country, logoSrc) : ''),
    [country, locale, logoSrc, summary],
  );
  const pdf = useAccountantPdfActions(summary, locale, country);

  return (
    <Screen
      title={t('reports.previewTitle')}
      subtitle={t('reports.previewSubtitle')}
      style={styles.screen}
      footer={
        summary ? (
          <View style={styles.actions}>
            <Button
              label={t('reports.sendToAccountant')}
              loading={pdf.emailing}
              disabled={pdf.sharing || pdf.downloading}
              onPress={() => void pdf.emailAccountant(() => router.push('/(app)/settings/accountant' as Href))}
            />
            <Button
              label={t('reports.downloadPdf')}
              variant="secondary"
              loading={pdf.downloading}
              disabled={pdf.sharing || pdf.emailing}
              onPress={() => void pdf.download()}
            />
            <Button
              label={t('reports.sharePdf')}
              variant="ghost"
              loading={pdf.sharing}
              disabled={pdf.downloading || pdf.emailing}
              onPress={() => void pdf.share()}
            />
          </View>
        ) : (
          <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
        )
      }
    >
      {summary && html ? (
        <View style={styles.paper}>
          <DocumentPreview html={html} />
        </View>
      ) : (
        <Text style={styles.note}>{t('reports.missing')}</Text>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    gap: space.sm,
  },
  paper: {
    flex: 1,
    minHeight: 320,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  actions: {
    gap: space.sm,
  },
  note: {
    ...type.body,
    color: colors.textSecondary,
  },
});

import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { space } from '@/theme';

type PdfActions = {
  emailing: boolean;
  downloading: boolean;
  sharing: boolean;
  emailAccountant: (onMissingAccountant: () => void) => Promise<void>;
  download: () => Promise<void>;
  share: () => Promise<void>;
};

/** Actions du dossier, affichées en haut pour rester accessibles sans tout faire défiler. */
export function ReportPdfActions({
  pdf,
  onMissingAccountant,
}: {
  pdf: PdfActions;
  onMissingAccountant: () => void;
}) {
  const { t } = useTranslation();
  const locked = pdf.sharing || pdf.downloading || pdf.emailing;

  return (
    <View style={styles.actions}>
      <Button
        label={t('reports.sendToAccountant')}
        loading={pdf.emailing}
        disabled={locked && !pdf.emailing}
        onPress={() => void pdf.emailAccountant(onMissingAccountant)}
      />
      <Button
        label={t('reports.downloadPdf')}
        variant="secondary"
        loading={pdf.downloading}
        disabled={locked && !pdf.downloading}
        onPress={() => void pdf.download()}
      />
      <Button
        label={t('reports.sharePdf')}
        variant="ghost"
        loading={pdf.sharing}
        disabled={locked && !pdf.sharing}
        onPress={() => void pdf.share()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: space.sm,
  },
});

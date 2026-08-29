import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { asLegalSections } from '@/features/account/legal';
import { PRODUCT } from '@/lib/constants';
import { colors, type } from '@/theme';

export function LegalDocument({ kind }: { kind: 'privacy' | 'terms' }) {
  const { t } = useTranslation();
  const title = t(kind === 'privacy' ? 'legal.privacyTitle' : 'legal.termsTitle');
  const sections = asLegalSections(t(kind === 'privacy' ? 'legal.privacySections' : 'legal.termsSections'));

  return (
    <Screen title={title} scroll home={false}>
      <Text style={styles.meta}>{t('legal.updated', { date: PRODUCT.legalUpdatedOn })}</Text>
      {sections.map((section) => (
        <Text key={section.heading} style={styles.block}>
          <Text style={styles.heading}>{section.heading}{'\n'}</Text>
          <Text style={styles.body}>{section.body}</Text>
        </Text>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: {
    ...type.caption,
    color: colors.textMuted,
  },
  block: {
    ...type.body,
    color: colors.textSecondary,
  },
  heading: {
    ...type.section,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
});

import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { LegalEditor } from '@/features/admin/LegalEditor';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, type } from '@/theme';

export default function AdminLegalScreen() {
  const { t } = useTranslation();
  const { isStaff } = useAuth();

  if (!isStaff) {
    return (
      <Screen title={t('admin.legalPages')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('admin.legalPages')} subtitle={t('admin.legalHint')} scroll home={false} back={false}>
      <LegalEditor />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
});

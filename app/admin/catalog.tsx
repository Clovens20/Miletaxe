import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { CatalogEditor } from '@/features/admin/CatalogEditor';
import { useAuth } from '@/features/auth/AuthProvider';
import { CatalogRealtime } from '@/features/tax-config/realtime';
import { colors, type } from '@/theme';

export default function AdminCatalogScreen() {
  const { t } = useTranslation();
  const { isStaff } = useAuth();

  if (!isStaff) {
    return (
      <Screen title={t('admin.catalog')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('admin.catalog')} scroll home={false} back={false}>
      <CatalogRealtime />
      <CatalogEditor />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
});

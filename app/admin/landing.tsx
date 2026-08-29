import { StyleSheet, Text } from 'react-native';
import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { LandingEditor } from '@/features/admin/LandingEditor';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, type } from '@/theme';

export default function AdminLandingScreen() {
  const { t } = useTranslation();
  const { isStaff } = useAuth();

  if (!isStaff) {
    return (
      <Screen title={t('admin.landing')} scroll home={false} back={false}>
        <Text style={styles.muted}>{t('admin.notStaff')}</Text>
      </Screen>
    );
  }

  return (
    <Screen title={t('admin.landing')} subtitle={t('admin.landingHint')} scroll home={false} back={false}>
      <LandingEditor />
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: {
    ...type.body,
    color: colors.textSecondary,
  },
});

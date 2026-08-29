import { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { buildAccountExport, shareAccountExport } from '@/features/account/exportData';
import { useAuth } from '@/features/auth/AuthProvider';
import { PRODUCT } from '@/lib/constants';
import { setAppLocale } from '@/lib/i18n';
import type { SupportedLocale } from '@/types/domain';
import { colors, type } from '@/theme';

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { user, profile, updateProfile, signOut } = useAuth();
  const locale = (i18n.language === 'en' ? 'en' : 'fr') as SupportedLocale;
  const [exporting, setExporting] = useState(false);
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const exportData = async () => {
    if (!user) return;
    setExporting(true);
    try {
      const payload = await buildAccountExport(user.id);
      await shareAccountExport(payload);
    } catch {
      Alert.alert(t('common.error'), t('account.exportFailed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <Screen title={t('settings.title')} scroll>
      <Card>
        <ListRow title={t('settings.profile')} subtitle={profile?.full_name ?? undefined} />
        <ListRow
          title={t('settings.jurisdiction')}
          subtitle={[profile?.country_code, profile?.occupancy].filter(Boolean).join(' · ')}
        />
        <ListRow title={t('settings.version')} subtitle={t('settings.versionValue', { version })} />
        <ListRow title={t('settings.support')} subtitle={PRODUCT.supportEmail} />
      </Card>
      <SegmentedControl
        value={locale}
        onChange={(value) => {
          const next = value as SupportedLocale;
          setAppLocale(next);
          void updateProfile({ preferred_locale: next });
        }}
        options={[
          { value: 'fr', label: t('settings.languageFr') },
          { value: 'en', label: t('settings.languageEn') },
        ]}
      />
      <Text style={styles.label}>{t('settings.cadence')}</Text>
      <SegmentedControl
        value={profile?.reporting_cadence === 'semiannual' ? 'semiannual' : 'annual'}
        onChange={(value) => {
          void updateProfile({ reporting_cadence: value as 'annual' | 'semiannual' });
        }}
        options={[
          { value: 'annual', label: t('settings.cadenceAnnual') },
          { value: 'semiannual', label: t('settings.cadenceSemiannual') },
        ]}
      />
      <Card>
        <ListRow
          icon="shield-checkmark-outline"
          title={t('settings.privacy')}
          onPress={() => router.push('/legal/privacy')}
        />
        <ListRow
          icon="document-text-outline"
          title={t('settings.terms')}
          onPress={() => router.push('/legal/terms')}
        />
        {user ? (
          <ListRow
            icon="key-outline"
            title={t('settings.changePassword')}
            subtitle={t('settings.changePasswordHint')}
            onPress={() => router.push('/(app)/settings/password')}
          />
        ) : null}
        <ListRow
          icon="download-outline"
          title={t('settings.exportData')}
          subtitle={t('settings.exportDataHint')}
          onPress={() => void exportData()}
        />
        <ListRow
          icon="trash-outline"
          title={t('settings.deleteAccount')}
          onPress={() => router.push('/(app)/settings/delete-account')}
        />
      </Card>
      {exporting ? <Text style={styles.hint}>{t('account.exportBusy')}</Text> : null}
      <Button label={t('settings.signOut')} variant="danger" onPress={() => void signOut()} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: {
    ...type.label,
    color: colors.text,
  },
  hint: {
    ...type.caption,
    color: colors.info,
  },
});

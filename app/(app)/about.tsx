import { StyleSheet, Text } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/BrandMark';
import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { ListRow } from '@/components/ui/ListRow';
import { Screen } from '@/components/ui/Screen';
import { Card } from '@/components/ui/Card';
import { PRODUCT } from '@/lib/constants';
import { colors, type } from '@/theme';

export default function AboutScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen title={t('about.title')} scroll>
      <BrandMark />
      <Text style={styles.body}>{t('about.body')}</Text>
      <Text style={styles.meta}>{t('settings.versionValue', { version })}</Text>
      <DisclaimerBanner text={t('disclaimer.report')} />
      <DisclaimerBanner text={t('disclaimer.rates')} />
      <Card>
        <ListRow title={t('settings.privacy')} onPress={() => router.push('/legal/privacy')} />
        <ListRow title={t('settings.terms')} onPress={() => router.push('/legal/terms')} />
        <ListRow title={t('settings.support')} subtitle={PRODUCT.supportEmail} />
      </Card>
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  meta: {
    ...type.caption,
    color: colors.textMuted,
  },
});

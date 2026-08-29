import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { BrandMark } from '@/components/ui/BrandMark';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { LandingPage } from '@/features/marketing/LandingPage';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors, space, type } from '@/theme';

export default function IndexScreen() {
  const { t } = useTranslation();
  const { configured, preview, isLoading } = useAuth();

  if (Platform.OS === 'web') {
    return <LandingPage />;
  }

  if (!configured && !preview && !isLoading) {
    return (
      <View style={styles.setup}>
        <BrandMark />
        <Text style={styles.title}>{t('setup.title')}</Text>
        <Text style={styles.body}>{t('setup.body')}</Text>
        <DisclaimerBanner />
      </View>
    );
  }

  return (
    <View style={styles.boot}>
      <Image source={require('../assets/logo.png')} style={styles.bootLogo} resizeMode="contain" />
    </View>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bootLogo: {
    width: 240,
    height: 280,
  },
  setup: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.xl,
    justifyContent: 'center',
    gap: space.md,
  },
  title: {
    ...type.title,
    color: colors.text,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
});

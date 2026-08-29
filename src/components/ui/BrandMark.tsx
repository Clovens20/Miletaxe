import { Image, StyleSheet, Text, View } from 'react-native';

import { colors, type } from '@/theme';

const logo = require('../../../assets/logo-mark.png');

export function BrandMark({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return <Image source={logo} style={styles.compact} resizeMode="contain" />;
  }

  return (
    <View style={styles.wrap}>
      <Image source={logo} style={styles.heroImage} resizeMode="contain" />
      <Text style={styles.tag}>Dossiers. Pas d'impôt calculé.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    gap: 8,
  },
  heroImage: {
    width: '100%',
    height: 168,
  },
  compact: {
    width: 44,
    height: 44,
  },
  tag: {
    ...type.caption,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

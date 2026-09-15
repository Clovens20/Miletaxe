import { createElement } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { colors } from '@/theme';

export function DocumentPreview({ html }: { html: string }) {
  if (Platform.OS === 'web') {
    return (
      <View style={styles.fill}>
        {createElement('iframe', {
          srcDoc: html,
          title: 'preview',
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            backgroundColor: colors.surface,
          },
        })}
      </View>
    );
  }

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      style={styles.fill}
      scalesPageToFit
      nestedScrollEnabled
      setSupportMultipleWindows={false}
      showsVerticalScrollIndicator
    />
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.surface,
  },
});

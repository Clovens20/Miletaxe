import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { i18n } from '@/lib/i18n';
import { colors, space, type } from '@/theme';

type Props = { children: ReactNode };
type State = { error: Error | null };

/** Écran de secours si un rendu plante. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('MileTax render error', error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.title}>{i18n.t('common.crashTitle')}</Text>
        <Text style={styles.body}>{i18n.t('common.crashBody')}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => this.setState({ error: null })}
          style={({ pressed }) => [styles.btn, pressed && styles.pressed]}
        >
          <Text style={styles.btnLabel}>{i18n.t('common.retry')}</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: space.lg,
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
  btn: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnLabel: {
    ...type.bodyMedium,
    color: colors.textInverse,
  },
  pressed: {
    opacity: 0.88,
  },
});

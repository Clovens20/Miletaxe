import { StyleSheet, Text } from 'react-native';

import { colors, type } from '@/theme';
import { Card } from './Card';

export function MetricCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 96,
    justifyContent: 'space-between',
  },
  label: {
    ...type.captionMedium,
    color: colors.textSecondary,
  },
  value: {
    ...type.metric,
    color: colors.text,
    fontSize: 22,
    lineHeight: 28,
  },
  hint: {
    ...type.caption,
    color: colors.textMuted,
  },
});

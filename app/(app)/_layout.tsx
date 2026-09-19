import { Stack } from 'expo-router';

import { RecurringSync } from '@/features/recurring/RecurringSync';
import { colors } from '@/theme';

export default function AppLayout() {
  return (
    <>
      <RecurringSync />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
    </>
  );
}

import { Stack } from 'expo-router';

import { colors } from '@/theme';

export default function AuthResetLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />;
}

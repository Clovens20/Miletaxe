import { useEffect } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts, DMSans_400Regular, DMSans_500Medium, DMSans_600SemiBold, DMSans_700Bold } from '@expo-google-fonts/dm-sans';
import * as SplashScreen from 'expo-splash-screen';

import { AppProviders } from '@/components/providers/AppProviders';
import { useAuth } from '@/features/auth/AuthProvider';
import { colors } from '@/theme';
import '@/lib/i18n';

void SplashScreen.preventAutoHideAsync();

function Gate() {
  const { isLoading, session, profile, configured, preview } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    const group = segments[0];
    const inLegal = group === 'legal';
    const inAdmin = group === 'admin';

    if (!configured && !preview) {
      if (group !== undefined && !inLegal) router.replace('/');
      return;
    }

    if (!session) {
      if (group !== '(auth)' && !inLegal && !inAdmin) router.replace('/(auth)/login');
      return;
    }

    if (inAdmin) return;

    if (!profile?.onboarding_completed_at) {
      if (group !== '(onboarding)' && !inLegal) router.replace('/(onboarding)');
      return;
    }

    if (group !== '(app)' && !inLegal) {
      router.replace('/(app)/(tabs)');
    }
  }, [configured, isLoading, preview, profile?.onboarding_completed_at, router, segments, session]);

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(app)" />
      <Stack.Screen name="legal" />
      <Stack.Screen name="admin" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_600SemiBold,
    DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return (
      <View style={styles.boot}>
        <Image source={require('../assets/logo.png')} style={styles.bootLogo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <AppProviders>
      <StatusBar style="dark" />
      <Gate />
    </AppProviders>
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
});

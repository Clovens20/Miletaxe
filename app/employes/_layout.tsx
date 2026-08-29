import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Slot, usePathname, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeskNav } from '@/components/desk/DeskNav';
import { Screen } from '@/components/ui/Screen';
import { PasswordForm } from '@/features/auth/PasswordForm';
import { useAuth } from '@/features/auth/AuthProvider';
import { SupportRealtime } from '@/features/support/hooks';
import { colors, space, type } from '@/theme';

export default function EmployesLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, session, isAgent, mustChangePassword, signOut } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (session) router.replace('/(app)/(tabs)');
      else router.replace('/(auth)/login');
    }
  }, [router, session]);

  useEffect(() => {
    if (isLoading || Platform.OS !== 'web') return;
    if (!session || isAgent) return;
    if (pathname !== '/employes') router.replace('/employes' as Href);
  }, [isLoading, isAgent, pathname, router, session]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{t('admin.webOnly')}</Text>
      </View>
    );
  }

  if (session && isAgent && mustChangePassword) {
    return (
      <View style={styles.shell}>
        <View style={styles.content}>
          <Screen title={t('auth.mustChangePassword')} scroll home={false} back={false}>
            <PasswordForm forced />
          </Screen>
        </View>
      </View>
    );
  }

  const nav = session && isAgent ? (
    <DeskNav
      brand={t('support.deskTitle')}
      leaveLabel={t('admin.signOut')}
      onLeave={() => void signOut()}
      links={[
        { href: '/employes', label: t('support.inbox'), active: pathname === '/employes' },
        { href: '/employes/topics', label: t('support.topics'), active: pathname.startsWith('/employes/topics') },
        {
          href: '/employes/password',
          label: t('auth.changePasswordTitle'),
          active: pathname.startsWith('/employes/password'),
        },
      ]}
    />
  ) : null;

  return (
    <View style={styles.shell}>
      {nav}
      <View style={styles.content}>
        {session && isAgent ? <SupportRealtime /> : null}
        <Slot />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.xl,
    backgroundColor: colors.bg,
  },
  body: {
    ...type.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

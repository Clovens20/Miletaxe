import { useEffect } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Slot, usePathname, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { DeskNav } from '@/components/desk/DeskNav';
import { useAuth } from '@/features/auth/AuthProvider';
import { SupportRealtime } from '@/features/support/hooks';
import { colors, space, type } from '@/theme';

export default function AdminLayout() {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading, session, isStaff, signOut } = useAuth();

  useEffect(() => {
    if (Platform.OS !== 'web') {
      if (session) router.replace('/(app)/(tabs)');
      else router.replace('/(auth)/login');
    }
  }, [router, session]);

  useEffect(() => {
    if (isLoading || Platform.OS !== 'web') return;
    if (!session || isStaff) return;
    if (pathname !== '/admin') router.replace('/admin' as Href);
  }, [isLoading, isStaff, pathname, router, session]);

  if (Platform.OS !== 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.body}>{t('admin.webOnly')}</Text>
      </View>
    );
  }

  const nav = session && isStaff ? (
    <DeskNav
      brand={t('admin.title')}
      leaveLabel={t('admin.signOut')}
      onLeave={() => void signOut()}
      links={[
        { href: '/admin', label: t('admin.dashboard'), active: pathname === '/admin' },
        {
          href: '/admin/inbox',
          label: t('support.techInbox'),
          active: pathname.startsWith('/admin/inbox') || pathname.startsWith('/admin/thread'),
        },
        { href: '/admin/team', label: t('admin.team'), active: pathname.startsWith('/admin/team') },
        { href: '/admin/topics', label: t('support.topics'), active: pathname.startsWith('/admin/topics') },
        { href: '/admin/users', label: t('admin.users'), active: pathname.startsWith('/admin/users') },
        { href: '/admin/catalog', label: t('admin.catalog'), active: pathname.startsWith('/admin/catalog') },
        { href: '/admin/landing', label: t('admin.landing'), active: pathname.startsWith('/admin/landing') },
        { href: '/admin/legal', label: t('admin.legalPages'), active: pathname.startsWith('/admin/legal') },
        {
          href: '/admin/password',
          label: t('auth.changePasswordTitle'),
          active: pathname.startsWith('/admin/password'),
        },
      ]}
    />
  ) : null;

  return (
    <View style={styles.shell}>
      {nav}
      <View style={styles.content}>
        {session && isStaff ? <SupportRealtime /> : null}
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

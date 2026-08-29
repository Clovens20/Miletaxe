import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Slot, usePathname, useRouter, type Href } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
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

  return (
    <View style={styles.shell}>
      {session && isStaff ? (
        <View style={styles.nav}>
          <Text style={styles.brand}>{t('admin.title')}</Text>
          <View style={styles.links}>
            <NavLink href="/admin" label={t('admin.dashboard')} active={pathname === '/admin'} />
            <NavLink href="/admin/users" label={t('admin.users')} active={pathname.startsWith('/admin/users')} />
            <NavLink href="/admin/catalog" label={t('admin.catalog')} active={pathname.startsWith('/admin/catalog')} />
          </View>
          <Pressable onPress={() => void signOut()} style={({ pressed }) => pressed && styles.pressed}>
            <Text style={styles.leave}>{t('admin.signOut')}</Text>
          </Pressable>
        </View>
      ) : null}
      <Slot />
    </View>
  );
}

function NavLink({ href, label, active }: { href: '/admin' | '/admin/users' | '/admin/catalog'; label: string; active: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      onPress={() => router.push(href as Href)}
      style={({ pressed }) => [styles.link, active && styles.linkOn, pressed && styles.pressed]}
    >
      <Text style={[styles.linkText, active && styles.linkTextOn]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: colors.bg,
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
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexWrap: 'wrap',
  },
  brand: {
    ...type.bodyMedium,
    color: colors.text,
  },
  links: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.xs,
    flex: 1,
  },
  link: {
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    borderRadius: 8,
  },
  linkOn: {
    backgroundColor: colors.primarySoft,
  },
  linkText: {
    ...type.callout,
    color: colors.textSecondary,
  },
  linkTextOn: {
    color: colors.primary,
  },
  leave: {
    ...type.callout,
    color: colors.danger,
  },
  pressed: {
    opacity: 0.7,
  },
});

import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { deleteCurrentAccount } from '@/features/account/deleteAccount';
import { useAuth } from '@/features/auth/AuthProvider';
import { PRODUCT } from '@/lib/constants';
import { colors, radius, space, type } from '@/theme';

export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { signOut } = useAuth();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!confirmed) return;
    setBusy(true);
    try {
      await deleteCurrentAccount();
      await signOut();
      Alert.alert(t('account.deletedTitle'), t('account.deletedBody'));
    } catch {
      Alert.alert(t('common.error'), t('account.deleteFailed', { email: PRODUCT.supportEmail }));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen title={t('account.deleteTitle')} scroll>
      <Text style={styles.body}>{t('account.deleteBody')}</Text>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: confirmed }}
        onPress={() => setConfirmed((value) => !value)}
        style={styles.checkRow}
      >
        <View style={[styles.box, confirmed && styles.boxOn]} />
        <Text style={styles.checkLabel}>{t('account.deleteConfirm')}</Text>
      </Pressable>
      <Button
        label={t('account.deleteAction')}
        variant="danger"
        disabled={!confirmed}
        loading={busy}
        onPress={() => void run()}
      />
      <Button label={t('common.cancel')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    ...type.body,
    color: colors.textSecondary,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  box: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    marginTop: 2,
  },
  boxOn: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  checkLabel: {
    ...type.body,
    color: colors.text,
    flex: 1,
  },
});

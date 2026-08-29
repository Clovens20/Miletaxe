import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { DisclaimerBanner } from '@/components/ui/DisclaimerBanner';
import { Screen } from '@/components/ui/Screen';
import { TextField } from '@/components/ui/TextField';
import { useAuth } from '@/features/auth/AuthProvider';

export default function AccountantScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { profile, updateProfile } = useAuth();
  const [name, setName] = useState(profile?.accountant_name ?? '');
  const [email, setEmail] = useState(profile?.accountant_email ?? '');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateProfile({ accountant_name: name, accountant_email: email });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen title={t('more.accountant')} scroll>
      <TextField label={t('settings.accountantName')} value={name} onChangeText={setName} />
      <TextField
        label={t('settings.accountantEmail')}
        hint={t('settings.accountantHint')}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <DisclaimerBanner />
      <Button label={t('common.save')} loading={saving} onPress={() => void save()} />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

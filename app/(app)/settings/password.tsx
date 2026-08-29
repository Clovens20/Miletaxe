import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/Button';
import { Screen } from '@/components/ui/Screen';
import { PasswordForm } from '@/features/auth/PasswordForm';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <Screen title={t('auth.changePasswordTitle')} scroll>
      <PasswordForm />
      <Button label={t('common.back')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

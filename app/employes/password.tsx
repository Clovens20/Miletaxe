import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { PasswordForm } from '@/features/auth/PasswordForm';
import { useAuth } from '@/features/auth/AuthProvider';

export default function EmployesPasswordScreen() {
  const { t } = useTranslation();
  const { isAgent, mustChangePassword } = useAuth();
  return (
    <Screen
      title={mustChangePassword ? t('auth.mustChangePassword') : t('auth.changePasswordTitle')}
      subtitle={mustChangePassword ? t('auth.mustChangePasswordHint') : t('auth.changePasswordSubtitle')}
      scroll
      home={false}
      back={false}
    >
      {isAgent ? <PasswordForm /> : null}
    </Screen>
  );
}

import { useTranslation } from 'react-i18next';

import { Screen } from '@/components/ui/Screen';
import { PasswordForm } from '@/features/auth/PasswordForm';
import { useAuth } from '@/features/auth/AuthProvider';

export default function EmployesPasswordScreen() {
  const { t } = useTranslation();
  const { isAgent } = useAuth();
  return (
    <Screen title={t('auth.changePasswordTitle')} scroll home={false} back={false}>
      {isAgent ? <PasswordForm /> : null}
    </Screen>
  );
}

function text(error: unknown) {
  if (!error || typeof error !== 'object') return { code: '', message: '' };
  const row = error as { code?: string; message?: string };
  return {
    code: (row.code ?? '').toLowerCase(),
    message: (row.message ?? '').toLowerCase(),
  };
}

export function authErrorKey(error: unknown, fallback: 'login' | 'register'): string {
  const { code, message } = text(error);
  if (code === 'not_configured' || message === 'not_configured') return 'auth.notConfigured';
  if (code === 'email_not_confirmed' || message.includes('email not confirmed')) return 'auth.emailNotConfirmed';
  if (code === 'invalid_credentials' || message.includes('invalid login')) return 'auth.invalidCredentials';
  if (
    code === 'user_already_registered' ||
    code === 'email_exists' ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return 'auth.emailInUse';
  }
  if (code === 'over_email_send_rate_limit' || message.includes('rate limit') || message.includes('too many')) {
    return 'auth.rateLimited';
  }
  if (code === 'weak_password' || message.includes('weak password')) return 'validation.minPassword';
  if (message.includes('database') || message.includes('saving new user')) return 'auth.signUpFailed';
  return fallback === 'register' ? 'auth.signUpFailed' : 'auth.signInFailed';
}

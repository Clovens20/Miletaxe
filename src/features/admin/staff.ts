import type { User } from '@supabase/supabase-js';

export function staffRole(user: User | null | undefined): 'admin' | 'agent' | null {
  const role = user?.app_metadata?.role;
  if (role === 'admin' || role === 'agent') return role;
  return null;
}

export function isStaffUser(user: User | null | undefined): boolean {
  return staffRole(user) === 'admin';
}

export function isAgentUser(user: User | null | undefined): boolean {
  return staffRole(user) === 'agent';
}

export function isSupportUser(user: User | null | undefined): boolean {
  return isStaffUser(user) || isAgentUser(user);
}

export function mustChangePassword(user: User | null | undefined): boolean {
  return user?.app_metadata?.must_change_password === true;
}

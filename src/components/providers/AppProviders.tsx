import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { AuthProvider } from '@/features/auth/AuthProvider';
import { queryClient } from '@/lib/query/client';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{children}</AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

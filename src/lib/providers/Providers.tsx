'use client';

import { type ReactNode, Suspense } from 'react';
import QueryProvider from './QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import AnalyticsProvider from '@/lib/analytics/AnalyticsProvider';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <Suspense fallback={null}>
          <AnalyticsProvider>
            {children}
          </AnalyticsProvider>
        </Suspense>
      </AuthProvider>
    </QueryProvider>
  );
}

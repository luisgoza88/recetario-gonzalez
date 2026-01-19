'use client';

import { type ReactNode, Suspense } from 'react';
import QueryProvider from './QueryProvider';
import { AuthProvider } from '@/contexts/AuthContext';
import AnalyticsProvider from '@/lib/analytics/AnalyticsProvider';
import { HouseholdProvider } from '@/components/providers/HouseholdProvider';

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <HouseholdProvider>
          <Suspense fallback={null}>
            <AnalyticsProvider>
              {children}
            </AnalyticsProvider>
          </Suspense>
        </HouseholdProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

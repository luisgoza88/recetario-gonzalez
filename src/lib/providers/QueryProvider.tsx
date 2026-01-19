'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

interface QueryProviderProps {
  children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
  // Crear QueryClient una sola vez por componente
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Mantener datos frescos por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Cache por 30 minutos
            gcTime: 30 * 60 * 1000,
            // Reintentar una vez en caso de error
            retry: 1,
            // No refetch automático al enfocar ventana (PWA)
            refetchOnWindowFocus: false,
            // Refetch al reconectar a internet
            refetchOnReconnect: true,
          },
          mutations: {
            // Reintentar mutaciones una vez
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
}

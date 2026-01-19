'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import analytics from './index';

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider que inicializa y gestiona analytics
 * Debe envolver la aplicación en el layout principal
 */
export default function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initializedRef = useRef(false);

  // Inicializar analytics una sola vez
  useEffect(() => {
    if (!initializedRef.current) {
      analytics.init();
      analytics.sessionStart();
      initializedRef.current = true;
    }
  }, []);

  // Trackear cambios de página
  useEffect(() => {
    if (!initializedRef.current) return;

    // Construir URL actual
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');

    // Mapear rutas a nombres legibles
    const pageNames: Record<string, string> = {
      '/': 'home',
      '/onboarding': 'onboarding',
      '/auth/login': 'login',
      '/auth/register': 'register',
      '/join': 'join_household',
    };

    const pageName = pageNames[pathname] || pathname.replace(/\//g, '_').slice(1) || 'home';

    analytics.track('feature_discovered', {
      feature_name: `pageview_${pageName}`,
    });
  }, [pathname, searchParams]);

  return <>{children}</>;
}

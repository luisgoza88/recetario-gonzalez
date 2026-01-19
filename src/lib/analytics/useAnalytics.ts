'use client';

import { useCallback, useEffect, useRef } from 'react';
import analytics, {
  AnalyticsEvent,
  EventProperties,
  onboardingAnalytics,
  authAnalytics,
  recipeAnalytics,
  menuAnalytics,
  shoppingAnalytics,
  inventoryAnalytics,
  aiAnalytics,
  homeAnalytics,
  subscriptionAnalytics,
  engagementAnalytics,
} from './index';

/**
 * Hook para usar analytics en componentes React
 * Proporciona funciones memorizadas para mejor rendimiento
 */
export function useAnalytics() {
  // Track generic event
  const track = useCallback((event: AnalyticsEvent, properties?: EventProperties) => {
    analytics.track(event, properties);
  }, []);

  // Timer helpers para medir duraciones
  const startTimer = useCallback(() => {
    return Date.now();
  }, []);

  const getElapsedMs = useCallback((startTime: number) => {
    return Date.now() - startTime;
  }, []);

  return {
    track,
    startTimer,
    getElapsedMs,
    // Módulos específicos
    onboarding: onboardingAnalytics,
    auth: authAnalytics,
    recipe: recipeAnalytics,
    menu: menuAnalytics,
    shopping: shoppingAnalytics,
    inventory: inventoryAnalytics,
    ai: aiAnalytics,
    home: homeAnalytics,
    subscription: subscriptionAnalytics,
    engagement: engagementAnalytics,
  };
}

/**
 * Hook para trackear el tiempo en una página/vista
 */
export function usePageViewTracking(pageName: string, properties?: EventProperties) {
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    startTimeRef.current = Date.now();

    // Track page view
    analytics.track('feature_discovered', {
      feature_name: `page_${pageName}`,
      ...properties,
    });

    // Cleanup: track tiempo en página al salir
    return () => {
      const duration = Date.now() - startTimeRef.current;
      if (duration > 1000) { // Solo si estuvo más de 1 segundo
        analytics.track('feature_discovered', {
          feature_name: `page_${pageName}_exit`,
          duration_ms: duration,
        });
      }
    };
  }, [pageName]);
}

/**
 * Hook para trackear tiempo de carga de features
 */
export function useFeatureLoadTracking(featureName: string) {
  const startTimeRef = useRef<number>(Date.now());
  const trackedRef = useRef<boolean>(false);

  const markLoaded = useCallback(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    const loadTime = Date.now() - startTimeRef.current;
    analytics.track('feature_discovered', {
      feature_name: `${featureName}_loaded`,
      duration_ms: loadTime,
    });
  }, [featureName]);

  const markError = useCallback((error: string) => {
    if (trackedRef.current) return;
    trackedRef.current = true;

    analytics.track('feature_discovered', {
      feature_name: `${featureName}_error`,
      error_message: error,
      duration_ms: Date.now() - startTimeRef.current,
    });
  }, [featureName]);

  return { markLoaded, markError };
}

/**
 * Hook para trackear interacciones con botones/CTAs
 */
export function useButtonTracking() {
  const trackClick = useCallback((buttonName: string, properties?: EventProperties) => {
    analytics.track('feature_discovered', {
      feature_name: `button_${buttonName}`,
      ...properties,
    });
  }, []);

  return { trackClick };
}

export default useAnalytics;

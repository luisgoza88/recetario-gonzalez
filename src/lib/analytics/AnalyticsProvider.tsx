"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import analytics from "./index";

interface AnalyticsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider que inicializa y gestiona analytics
 * Debe envolver la aplicación en el layout principal
 */
export default function AnalyticsProvider({
  children,
}: AnalyticsProviderProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [initialized, setInitialized] = useState(false);

  // Inicializar analytics una sola vez (lazy: posthog se carga async)
  useEffect(() => {
    let active = true;
    analytics.init().then(() => {
      if (!active) return;
      analytics.sessionStart();
      setInitialized(true);
    });
    return () => {
      active = false;
    };
  }, []);

  // Trackear cambios de página
  useEffect(() => {
    if (!initialized) return;

    // Construir URL actual
    const url =
      pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");

    // Mapear rutas a nombres legibles
    const pageNames: Record<string, string> = {
      "/": "home",
      "/onboarding": "onboarding",
      "/auth/login": "login",
      "/auth/register": "register",
      "/join": "join_household",
    };

    const pageName =
      pageNames[pathname] || pathname.replace(/\//g, "_").slice(1) || "home";

    analytics.track("feature_discovered", {
      feature_name: `pageview_${pageName}`,
    });
  }, [pathname, searchParams, initialized]);

  return <>{children}</>;
}

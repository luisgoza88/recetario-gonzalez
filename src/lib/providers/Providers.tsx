"use client";

import { type ReactNode, Suspense } from "react";
import QueryProvider from "./QueryProvider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import AnalyticsProvider from "@/lib/analytics/AnalyticsProvider";
import { HouseholdProvider } from "@/components/providers/HouseholdProvider";
import { ToastProvider } from "@/components/ui/Toast";

interface ProvidersProps {
  children: ReactNode;
}

export default function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <QueryProvider>
        <AuthProvider>
          <HouseholdProvider>
            <ToastProvider>
              <Suspense fallback={null}>
                <AnalyticsProvider>{children}</AnalyticsProvider>
              </Suspense>
            </ToastProvider>
          </HouseholdProvider>
        </AuthProvider>
      </QueryProvider>
    </ThemeProvider>
  );
}

"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";

// ============================================================
// Tipos
// ============================================================

export type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

// ============================================================
// Contexto
// ============================================================

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "recetario.theme";

function getSystemTheme(): ResolvedTheme {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(_resolved: ResolvedTheme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // FIX modo oscuro: la app aún NO tiene un tema oscuro real. Los tokens
  // (--bg/--ink/--border/--accent) sólo definen valores claros y ~116
  // utilidades `dark:*` conviven con superficies claras hardcodeadas
  // (bg-white, stone-50), lo que producía una UI mitad clara / mitad oscura
  // en teléfonos en modo oscuro, sin forma de forzar claro.
  // Por eso resolvemos SIEMPRE a tema claro: nunca añadimos la clase `.dark`.
  // El resto de la API del context (theme/setTheme/resolvedTheme) queda intacta.
  // Reversible: para reactivar un tema oscuro real, restaurar el toggle
  //   _resolved === "dark" ? root.classList.add("dark") : root.classList.remove("dark");
  root.classList.remove("dark");
}

// ============================================================
// Provider
// ============================================================

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>("light");

  // Inicializar desde localStorage (solo en cliente)
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    const initial: Theme = stored ?? "system";
    setThemeState(initial);

    const resolved = initial === "system" ? getSystemTheme() : initial;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Escuchar cambios del sistema cuando theme === "system"
  useEffect(() => {
    if (theme !== "system") return;

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      const resolved: ResolvedTheme = e.matches ? "dark" : "light";
      setResolvedTheme(resolved);
      applyTheme(resolved);
    };

    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [theme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    localStorage.setItem(STORAGE_KEY, next);

    const resolved: ResolvedTheme = next === "system" ? getSystemTheme() : next;
    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useTheme(): ThemeContextType {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme debe usarse dentro de ThemeProvider");
  }
  return ctx;
}

"use client";
import { useEffect, useState, useCallback } from "react";
import { TRANSLATIONS, DEFAULT_LOCALE, type Locale } from "./translations";

const STORAGE_KEY = "recetario.locale";

export function useTranslation() {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Locale | null;
    if (saved) setLocaleState(saved);
    else {
      // Detectar idioma del browser
      const browser = navigator.language.slice(0, 2) as Locale;
      if (["es", "en", "pt"].includes(browser)) {
        setLocaleState(browser);
      }
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    localStorage.setItem(STORAGE_KEY, l);
    setLocaleState(l);
  }, []);

  const t = useCallback(
    (path: string): string => {
      const parts = path.split(".");
      let current: unknown = TRANSLATIONS[locale];
      for (const p of parts) {
        current = (current as Record<string, unknown>)?.[p];
        if (current === undefined) {
          // Fallback al default
          let fallback: unknown = TRANSLATIONS[DEFAULT_LOCALE];
          for (const fp of parts)
            fallback = (fallback as Record<string, unknown>)?.[fp];
          return (fallback as string) ?? path;
        }
      }
      return (current as string) ?? path;
    },
    [locale],
  );

  return { locale, setLocale, t };
}

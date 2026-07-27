"use client";

import { useEffect, ReactNode } from "react";
import { useHouseholdStore } from "@/lib/stores/useHouseholdStore";
import { useAuth } from "@/contexts/AuthContext";
import type { Household as StoreHousehold } from "@/lib/types/household";

interface HouseholdProviderProps {
  children: ReactNode;
}

/**
 * SECURITY: Espera a que AuthContext confirme un usuario autenticado
 * antes de hacer fetch. Sin esto, la version anterior cargaba el primer
 * hogar de la DB para CUALQUIER visitor anonimo (fuga de datos).
 *
 * Si el usuario hace logout, el household se resetea via setHousehold(null).
 */
export function HouseholdProvider({ children }: HouseholdProviderProps) {
  const {
    setHousehold,
    setUser,
    setLoading,
    setInitialized,
    setError,
  } = useHouseholdStore();
  const {
    supabaseUser,
    currentHousehold,
    isLoading: authLoading,
  } = useAuth();

  useEffect(() => {
    // Esperar a que AuthContext termine de resolver la sesion
    if (authLoading) return;

    // Si no hay usuario autenticado, limpiar y no fetchear
    if (!supabaseUser) {
      setHousehold(null);
      setUser(null);
      setInitialized(true);
      setLoading(false);
      return;
    }

    // AuthContext ya carga y valida las membresías. Mantener una segunda
    // consulta aquí permitía que ambos estados divergieran: si faltaba el
    // perfil de usuario legacy, AuthContext sí tenía hogar pero este store
    // quedaba inicializado en null. Sincronizar desde la única fuente de
    // verdad también hace que cambiar de hogar se refleje inmediatamente.
    setLoading(false);
    setError(null);
    setHousehold((currentHousehold as StoreHousehold | null) ?? null);
    setUser(null);
    setInitialized(true);
  }, [
    authLoading,
    supabaseUser,
    currentHousehold,
    setHousehold,
    setUser,
    setLoading,
    setInitialized,
    setError,
  ]);

  return <>{children}</>;
}

export default HouseholdProvider;

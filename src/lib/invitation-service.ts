/**
 * Servicio de Invitaciones
 * Maneja la creación, validación y uso de códigos de invitación
 */

import { supabase } from "@/lib/supabase/client";
import type {
  HouseholdInvitation,
  HouseholdMembership,
  UserRole,
} from "@/types";
import { logger } from "@/lib/logger";

// =====================================================
// Tipos
// =====================================================

export interface CreateInvitationParams {
  householdId: string;
  role: UserRole;
  suggestedName?: string;
  maxUses?: number;
  expiresInDays?: number;
}

export interface InvitationValidation {
  isValid: boolean;
  invitation?: HouseholdInvitation;
  householdName?: string;
  error?: string;
}

export interface UseInvitationResult {
  success: boolean;
  membership?: HouseholdMembership;
  error?: string;
}

// =====================================================
// Funciones del servicio
// =====================================================

/**
 * Crear una nueva invitación
 */
export async function createInvitation(
  params: CreateInvitationParams,
): Promise<{
  invitation?: HouseholdInvitation;
  error?: string;
}> {
  try {
    // NOTA: el RPC create_invitation NO acepta p_email (su firma es
    // p_household_id, p_role, p_suggested_name, p_max_uses, p_expires_in_days).
    // Pasarlo hacía fallar el RPC (PGRST202). El código es de un solo uso por
    // defecto; la restricción por email no está soportada por el backend.
    const { data, error } = await supabase.rpc("create_invitation", {
      p_household_id: params.householdId,
      p_role: params.role,
      p_suggested_name: params.suggestedName || null,
      p_max_uses: params.maxUses || 1,
      p_expires_in_days: params.expiresInDays || 7,
    });

    if (error) {
      logger.error("Error creando invitación", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { error: error.message };
    }

    return { invitation: data as HouseholdInvitation };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { error: message };
  }
}

/**
 * Validar un código de invitación sin usarlo.
 * Usa el API route /api/validate-invitation que aplica rate limiting server-side.
 */
export async function validateInvitationCode(
  code: string,
): Promise<InvitationValidation> {
  try {
    const response = await fetch("/api/validate-invitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });

    const data = await response.json();

    if (response.status === 429) {
      return {
        isValid: false,
        error:
          data.error ||
          "Demasiados intentos. Espera antes de intentar de nuevo.",
      };
    }

    if (!data.isValid) {
      return {
        isValid: false,
        error: data.error || "Código de invitación inválido o expirado",
      };
    }

    return {
      isValid: true,
      invitation: data.invitation as HouseholdInvitation,
      householdName: data.householdName,
    };
  } catch {
    return {
      isValid: false,
      error: "Error al validar el código",
    };
  }
}

/**
 * Usar un código de invitación para unirse a un hogar
 */
export async function redeemInvitationCode(
  code: string,
): Promise<UseInvitationResult> {
  try {
    const normalizedCode = code.toUpperCase().trim();

    const { data, error } = await supabase.rpc("use_invitation_code", {
      p_code: normalizedCode,
    });

    if (error) {
      logger.error("Error usando invitación", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      membership: data as HouseholdMembership,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return {
      success: false,
      error: message,
    };
  }
}

/**
 * Obtener todas las invitaciones de un hogar
 */
export async function getHouseholdInvitations(householdId: string): Promise<{
  invitations: HouseholdInvitation[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("household_invitations")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: false });

    if (error) {
      return { invitations: [], error: error.message };
    }

    return { invitations: data as HouseholdInvitation[] };
  } catch {
    return { invitations: [], error: "Error al cargar invitaciones" };
  }
}

/**
 * Cancelar/desactivar una invitación
 */
export async function cancelInvitation(
  invitationId: string,
): Promise<{ error?: string }> {
  try {
    const { error } = await supabase
      .from("household_invitations")
      .update({ is_active: false })
      .eq("id", invitationId);

    if (error) {
      return { error: error.message };
    }

    return {};
  } catch {
    return { error: "Error al cancelar la invitación" };
  }
}

/**
 * Generar link de invitación
 */
export function generateInvitationLink(code: string): string {
  if (typeof window === "undefined") return "";
  const normalizedCode = code.toUpperCase().trim();
  return `${window.location.origin}/join?code=${encodeURIComponent(normalizedCode)}`;
}

/**
 * Copiar código o link al portapapeles
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback para navegadores antiguos
    const textArea = document.createElement("textarea");
    textArea.value = text;
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }
}

// =====================================================
// Utilidades de formato
// =====================================================

/**
 * Formatear código para mostrar (con guión en medio)
 */
export function formatInvitationCode(code: string): string {
  if (code.length !== 8) return code;
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/**
 * Obtener tiempo restante de la invitación
 */
export function getInvitationTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffMs = expires.getTime() - now.getTime();

  if (diffMs <= 0) return "Expirado";

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} día${diffDays > 1 ? "s" : ""}`;
  }

  if (diffHours > 0) {
    return `${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  }

  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  return `${diffMinutes} minuto${diffMinutes > 1 ? "s" : ""}`;
}

/**
 * Obtener color según el rol
 */
export function getRoleColor(role: UserRole): string {
  switch (role) {
    case "admin":
      return "bg-purple-100 text-purple-700";
    case "empleado":
      return "bg-blue-100 text-blue-700";
    case "familia":
      return "bg-green-100 text-green-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

/**
 * Obtener nombre del rol en español
 */
export function getRoleName(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Administrador";
    case "empleado":
      return "Empleado";
    case "familia":
      return "Familia";
    default:
      return role;
  }
}

/**
 * Obtener descripción del rol
 */
export function getRoleDescription(role: UserRole): string {
  switch (role) {
    case "admin":
      return "Control total del hogar: usuarios, empleados, espacios y configuración";
    case "empleado":
      return "Ver tareas asignadas, marcar completadas, registrar entrada/salida";
    case "familia":
      return "Ver menú, lista de compras y estado del hogar";
    default:
      return "";
  }
}

/**
 * Cooking Profile Helper
 *
 * Fetches and provides defaults for the household's cooking profile.
 * Used by AI API routes to replace hardcoded family/city references.
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import type { CookingProfile } from "@/types";

/** Default cooking profile values (fallback when no profile is stored) */
export const DEFAULT_COOKING_PROFILE: Required<CookingProfile> = {
  city: "Medellín",
  region: "Andina",
  country: "Colombia",
  cooking_style: "colombiana casera con variaciones internacionales",
  family_name: "",
  family_size: 2,
  portions_config: {},
};

/**
 * Fetches the cooking profile for a household.
 * Returns merged defaults for any missing fields.
 */
export async function getCookingProfile(
  householdId?: string | null,
): Promise<Required<CookingProfile>> {
  if (!householdId) {
    return DEFAULT_COOKING_PROFILE;
  }

  try {
    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("households")
      .select("cooking_profile, name")
      .eq("id", householdId)
      .single();

    if (error || !data) {
      logger.warn("Could not fetch cooking profile, using defaults", {
        householdId,
        error: error?.message,
      });
      return DEFAULT_COOKING_PROFILE;
    }

    const stored = (data.cooking_profile as CookingProfile) || {};

    return {
      city: stored.city || DEFAULT_COOKING_PROFILE.city,
      region: stored.region || DEFAULT_COOKING_PROFILE.region,
      country: stored.country || DEFAULT_COOKING_PROFILE.country,
      cooking_style:
        stored.cooking_style || DEFAULT_COOKING_PROFILE.cooking_style,
      family_name:
        stored.family_name || data.name || DEFAULT_COOKING_PROFILE.family_name,
      family_size: stored.family_size ?? DEFAULT_COOKING_PROFILE.family_size,
      portions_config:
        stored.portions_config || DEFAULT_COOKING_PROFILE.portions_config,
    };
  } catch (err) {
    logger.error("Error fetching cooking profile", {
      error: err instanceof Error ? err.message : String(err),
    });
    return DEFAULT_COOKING_PROFILE;
  }
}

/**
 * Builds a display name for the family.
 * e.g. "la Familia González" or "la familia" if no name is set.
 */
export function getFamilyDisplayName(
  profile: Required<CookingProfile>,
): string {
  if (profile.family_name) {
    return profile.family_name;
  }
  return "la familia";
}

/**
 * Builds a location string for prompts.
 * e.g. "en Medellín, Colombia" or "en Colombia" if no city.
 */
export function getLocationString(profile: Required<CookingProfile>): string {
  const parts: string[] = [];
  if (profile.city) parts.push(profile.city);
  if (profile.country) parts.push(profile.country);
  return parts.length > 0 ? `en ${parts.join(", ")}` : "";
}

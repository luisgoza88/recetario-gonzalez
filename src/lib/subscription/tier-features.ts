export type Tier = "free" | "premium" | "family";

export interface TierLimits {
  recipesGeneratedPerMonth: number;
  imagesGeneratedPerMonth: number;
  maxHouseholdMembers: number;
  multipleHouseholds: boolean;
  whatsappBot: boolean;
  voiceAssistant: boolean;
  monthlyReports: boolean;
  customMoods: boolean;
  externalRecipes: boolean;
  prioritySupport: boolean;
}

export const TIER_LIMITS: Record<Tier, TierLimits> = {
  free: {
    recipesGeneratedPerMonth: 30,
    imagesGeneratedPerMonth: 10,
    maxHouseholdMembers: 2,
    multipleHouseholds: false,
    whatsappBot: false,
    voiceAssistant: false,
    monthlyReports: false,
    customMoods: false,
    externalRecipes: false,
    prioritySupport: false,
  },
  premium: {
    recipesGeneratedPerMonth: -1, // unlimited
    imagesGeneratedPerMonth: -1,
    maxHouseholdMembers: 4,
    multipleHouseholds: true,
    whatsappBot: false,
    voiceAssistant: true,
    monthlyReports: true,
    customMoods: true,
    externalRecipes: true,
    prioritySupport: false,
  },
  family: {
    recipesGeneratedPerMonth: -1,
    imagesGeneratedPerMonth: -1,
    maxHouseholdMembers: 8,
    multipleHouseholds: true,
    whatsappBot: true,
    voiceAssistant: true,
    monthlyReports: true,
    customMoods: true,
    externalRecipes: true,
    prioritySupport: true,
  },
};

export function canAccess(tier: Tier, feature: keyof TierLimits): boolean {
  const value = TIER_LIMITS[tier][feature];
  return (
    value === true || value === -1 || (typeof value === "number" && value > 0)
  );
}

export const TIER_PRICES_COP = {
  premium: 19_900,
  family: 39_900,
};

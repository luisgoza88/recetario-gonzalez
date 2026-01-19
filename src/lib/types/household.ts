/**
 * Multi-tenant Types
 * Defines the structure for households, users, and invitations
 */

export type PlanType = 'free' | 'basic' | 'premium' | 'enterprise';
export type UserRole = 'owner' | 'admin' | 'member' | 'viewer';

export interface HouseholdFeatures {
  ai_assistant: boolean;
  voice_commands: boolean;
  proactive_alerts: boolean;
  image_scanning: boolean;
  budget_tracking: boolean;
  multi_employee: boolean;
}

export interface HouseholdSettings {
  menu_cycle_days?: number;
  default_portions?: number;
  shopping_day?: number; // 0-6 (Sunday-Saturday)
  meal_times?: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  notifications?: {
    meal_reminders?: boolean;
    task_reminders?: boolean;
    inventory_alerts?: boolean;
    shopping_day_reminder?: boolean;
  };
}

export interface Household {
  id: string;
  name: string;
  slug: string;
  owner_name?: string;
  address?: string;
  plan: PlanType;
  plan_expires_at?: string;
  settings: HouseholdSettings;
  features: HouseholdFeatures;
  max_users: number;
  max_recipes: number;
  max_employees: number;
  timezone: string;
  language: string;
  currency: string;
  setup_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  auth_id?: string;
  household_id?: string;
  email: string;
  name?: string;
  avatar_url?: string;
  role: UserRole;
  permissions: Record<string, boolean>;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdInvitation {
  id: string;
  household_id: string;
  email: string;
  role: UserRole;
  invited_by?: string;
  token: string;
  expires_at: string;
  accepted_at?: string;
  created_at: string;
}

// Plan limits configuration
export const PLAN_LIMITS: Record<PlanType, {
  max_users: number;
  max_recipes: number;
  max_employees: number;
  features: HouseholdFeatures;
}> = {
  free: {
    max_users: 2,
    max_recipes: 20,
    max_employees: 1,
    features: {
      ai_assistant: true,
      voice_commands: false,
      proactive_alerts: false,
      image_scanning: false,
      budget_tracking: false,
      multi_employee: false,
    }
  },
  basic: {
    max_users: 5,
    max_recipes: 100,
    max_employees: 3,
    features: {
      ai_assistant: true,
      voice_commands: true,
      proactive_alerts: true,
      image_scanning: false,
      budget_tracking: true,
      multi_employee: true,
    }
  },
  premium: {
    max_users: 10,
    max_recipes: 500,
    max_employees: 10,
    features: {
      ai_assistant: true,
      voice_commands: true,
      proactive_alerts: true,
      image_scanning: true,
      budget_tracking: true,
      multi_employee: true,
    }
  },
  enterprise: {
    max_users: -1, // unlimited
    max_recipes: -1,
    max_employees: -1,
    features: {
      ai_assistant: true,
      voice_commands: true,
      proactive_alerts: true,
      image_scanning: true,
      budget_tracking: true,
      multi_employee: true,
    }
  }
};

// Helper to check if user has permission
export function hasPermission(user: User | null, permission: string): boolean {
  if (!user) return false;

  // Owners and admins have all permissions
  if (user.role === 'owner' || user.role === 'admin') return true;

  // Check specific permission
  return user.permissions[permission] === true;
}

// Helper to check if action is allowed by plan
export function isPlanFeatureEnabled(
  household: Household | null,
  feature: keyof HouseholdFeatures
): boolean {
  if (!household) return false;
  return household.features[feature] === true;
}

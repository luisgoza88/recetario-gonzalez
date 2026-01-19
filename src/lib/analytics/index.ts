/**
 * Analytics Service - Sistema centralizado de tracking
 *
 * Eventos trackea dos:
 * - Onboarding y autenticación
 * - Uso de recetas y menú
 * - Lista de compras e inventario
 * - IA y asistente
 * - Tareas del hogar
 * - Suscripciones y monetización
 */

import posthog from 'posthog-js';

// ============================================
// TIPOS Y DEFINICIONES DE EVENTOS
// ============================================

export type AnalyticsEvent =
  // Autenticación y Onboarding
  | 'signup_started'
  | 'signup_completed'
  | 'login_completed'
  | 'logout'
  | 'onboarding_started'
  | 'onboarding_step_completed'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  // Recetas
  | 'recipe_viewed'
  | 'recipe_created'
  | 'recipe_edited'
  | 'recipe_deleted'
  | 'recipe_shared'
  | 'recipe_favorited'
  // Menú y Calendario
  | 'menu_viewed'
  | 'meal_assigned'
  | 'meal_completed'
  | 'meal_feedback_submitted'
  // Lista de Compras
  | 'shopping_list_viewed'
  | 'shopping_list_generated'
  | 'shopping_item_checked'
  | 'shopping_item_added'
  // Inventario
  | 'inventory_viewed'
  | 'inventory_updated'
  | 'scan_pantry_used'
  | 'scan_receipt_used'
  // IA y Asistente
  | 'ai_recipe_generated'
  | 'ai_recipe_saved'
  | 'ai_chat_started'
  | 'ai_chat_message_sent'
  | 'ai_suggestion_accepted'
  | 'ai_suggestion_rejected'
  // Hogar y Tareas
  | 'task_created'
  | 'task_completed'
  | 'task_assigned'
  | 'employee_added'
  | 'space_created'
  // Suscripciones
  | 'subscription_viewed'
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'trial_started'
  | 'trial_ended'
  // Engagement
  | 'app_opened'
  | 'feature_discovered'
  | 'notification_received'
  | 'notification_clicked'
  | 'share_initiated';

// Propiedades comunes para todos los eventos
interface BaseEventProperties {
  timestamp?: string;
  session_id?: string;
  platform?: 'web' | 'ios' | 'android';
}

// Propiedades específicas por evento
export interface EventProperties extends BaseEventProperties {
  // Onboarding
  step?: string;
  step_number?: number;
  total_steps?: number;
  profile_type?: 'admin' | 'family' | 'employee';
  household_size?: number;
  dietary_preferences?: string[];
  cuisine_templates?: string[];

  // Recetas
  recipe_id?: string;
  recipe_name?: string;
  recipe_type?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipe_source?: 'manual' | 'ai_generated' | 'imported';
  ingredients_count?: number;

  // Menú
  day_number?: number;
  meal_type?: 'breakfast' | 'lunch' | 'dinner';
  rating?: number;
  feedback_text?: string;

  // Shopping
  items_count?: number;
  total_amount?: number;

  // Inventario
  scan_type?: 'pantry' | 'receipt';
  items_detected?: number;

  // IA
  ai_model?: string;
  prompt_type?: string;
  response_time_ms?: number;
  recipe_style?: string;
  user_request?: string;

  // Tareas
  task_id?: string;
  task_type?: string;
  assigned_to?: string;
  space_id?: string;

  // Suscripciones
  plan_type?: 'free' | 'premium' | 'family';
  price?: number;
  currency?: string;
  trial_days?: number;

  // Generales
  feature_name?: string;
  error_message?: string;
  success?: boolean;
  duration_ms?: number;

  // Cualquier propiedad adicional
  [key: string]: unknown;
}

// Propiedades del usuario
export interface UserProperties {
  user_id?: string;
  email?: string;
  name?: string;
  role?: 'admin' | 'family' | 'employee';
  household_id?: string;
  household_name?: string;
  created_at?: string;
  subscription_plan?: 'free' | 'premium' | 'family';
  subscription_status?: 'active' | 'trial' | 'cancelled' | 'expired';
  onboarding_completed?: boolean;
  total_recipes?: number;
  total_meals_logged?: number;
  preferred_language?: string;
  timezone?: string;
}

// ============================================
// CONFIGURACIÓN
// ============================================

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY || '';
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let initialized = false;

// ============================================
// FUNCIONES PRINCIPALES
// ============================================

/**
 * Inicializa el servicio de analytics
 * Debe llamarse una vez al cargar la app
 */
export function initAnalytics(): void {
  if (typeof window === 'undefined') return;
  if (initialized) return;

  // Solo inicializar si hay API key configurada
  if (!POSTHOG_KEY) {
    console.warn('[Analytics] PostHog API key not configured. Analytics disabled.');
    return;
  }

  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      person_profiles: 'identified_only',
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: false, // Deshabilitamos autocapture para control manual
      persistence: 'localStorage',
      loaded: (posthog) => {
        // En desarrollo, podemos habilitar debug
        if (process.env.NODE_ENV === 'development') {
          posthog.debug(false); // Cambiar a true para ver logs
        }
      }
    });

    initialized = true;
    console.log('[Analytics] PostHog initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
  }
}

/**
 * Trackea un evento con propiedades opcionales
 */
export function trackEvent(event: AnalyticsEvent, properties?: EventProperties): void {
  if (typeof window === 'undefined') return;

  const enrichedProperties: EventProperties = {
    ...properties,
    timestamp: new Date().toISOString(),
    platform: 'web',
  };

  // Log en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] Event: ${event}`, enrichedProperties);
  }

  // Si PostHog no está configurado, solo loguear
  if (!POSTHOG_KEY) return;

  try {
    posthog.capture(event, enrichedProperties);
  } catch (error) {
    console.error('[Analytics] Failed to track event:', error);
  }
}

/**
 * Identifica al usuario actual
 * Llamar después del login/signup
 */
export function identifyUser(userId: string, properties?: UserProperties): void {
  if (typeof window === 'undefined') return;

  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] Identify user: ${userId}`, properties);
  }

  if (!POSTHOG_KEY) return;

  try {
    posthog.identify(userId, properties);
  } catch (error) {
    console.error('[Analytics] Failed to identify user:', error);
  }
}

/**
 * Actualiza propiedades del usuario
 */
export function updateUserProperties(properties: Partial<UserProperties>): void {
  if (typeof window === 'undefined') return;

  if (!POSTHOG_KEY) return;

  try {
    posthog.people.set(properties);
  } catch (error) {
    console.error('[Analytics] Failed to update user properties:', error);
  }
}

/**
 * Incrementa un contador del usuario
 * Nota: PostHog JS SDK no tiene increment, usamos set con valor actual + increment
 */
export function incrementUserProperty(property: string, value: number = 1): void {
  if (typeof window === 'undefined') return;

  if (!POSTHOG_KEY) return;

  try {
    // Get current value from localStorage or start at 0
    const storageKey = `analytics_${property}`;
    const current = parseInt(localStorage.getItem(storageKey) || '0', 10);
    const newValue = current + value;
    localStorage.setItem(storageKey, String(newValue));

    posthog.people.set({ [property]: newValue });
  } catch (error) {
    console.error('[Analytics] Failed to increment user property:', error);
  }
}

/**
 * Resetea el usuario (logout)
 */
export function resetUser(): void {
  if (typeof window === 'undefined') return;

  if (!POSTHOG_KEY) return;

  try {
    posthog.reset();
  } catch (error) {
    console.error('[Analytics] Failed to reset user:', error);
  }
}

/**
 * Trackea el inicio de una sesión
 */
export function trackSessionStart(): void {
  trackEvent('app_opened', {
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
  });
}

// ============================================
// FUNCIONES ESPECÍFICAS POR FEATURE
// ============================================

// --- Onboarding ---
export const onboardingAnalytics = {
  started: () => trackEvent('onboarding_started'),

  stepCompleted: (step: string, stepNumber: number, totalSteps: number) =>
    trackEvent('onboarding_step_completed', { step, step_number: stepNumber, total_steps: totalSteps }),

  completed: (profileType: string, householdSize: number, dietaryPrefs: string[], cuisines: string[]) =>
    trackEvent('onboarding_completed', {
      profile_type: profileType as 'admin' | 'family' | 'employee',
      household_size: householdSize,
      dietary_preferences: dietaryPrefs,
      cuisine_templates: cuisines,
    }),

  skipped: (atStep: string) => trackEvent('onboarding_skipped', { step: atStep }),
};

// --- Autenticación ---
export const authAnalytics = {
  signupStarted: () => trackEvent('signup_started'),

  signupCompleted: (userId: string, email: string) => {
    identifyUser(userId, { user_id: userId, email, created_at: new Date().toISOString() });
    trackEvent('signup_completed');
  },

  loginCompleted: (userId: string, email: string) => {
    identifyUser(userId, { user_id: userId, email });
    trackEvent('login_completed');
  },

  logout: () => {
    trackEvent('logout');
    resetUser();
  },
};

// --- Recetas ---
export const recipeAnalytics = {
  viewed: (recipeId: string, recipeName: string, recipeType: string, source?: string) =>
    trackEvent('recipe_viewed', { recipe_id: recipeId, recipe_name: recipeName, recipe_type: recipeType as EventProperties['recipe_type'], recipe_source: source as EventProperties['recipe_source'] }),

  created: (recipeId: string, recipeName: string, recipeType: string, ingredientsCount: number, source: string) => {
    trackEvent('recipe_created', {
      recipe_id: recipeId,
      recipe_name: recipeName,
      recipe_type: recipeType as EventProperties['recipe_type'],
      ingredients_count: ingredientsCount,
      recipe_source: source as EventProperties['recipe_source'],
    });
    incrementUserProperty('total_recipes');
  },

  edited: (recipeId: string, recipeName: string) =>
    trackEvent('recipe_edited', { recipe_id: recipeId, recipe_name: recipeName }),

  deleted: (recipeId: string) => trackEvent('recipe_deleted', { recipe_id: recipeId }),

  shared: (recipeId: string, recipeName: string) =>
    trackEvent('recipe_shared', { recipe_id: recipeId, recipe_name: recipeName }),

  favorited: (recipeId: string, recipeName: string) =>
    trackEvent('recipe_favorited', { recipe_id: recipeId, recipe_name: recipeName }),
};

// --- Menú ---
export const menuAnalytics = {
  viewed: (dayNumber?: number) => trackEvent('menu_viewed', { day_number: dayNumber }),

  mealAssigned: (dayNumber: number, mealType: string, recipeId: string) =>
    trackEvent('meal_assigned', {
      day_number: dayNumber,
      meal_type: mealType as EventProperties['meal_type'],
      recipe_id: recipeId,
    }),

  mealCompleted: (mealType: string, recipeId: string) => {
    trackEvent('meal_completed', {
      meal_type: mealType as EventProperties['meal_type'],
      recipe_id: recipeId,
    });
    incrementUserProperty('total_meals_logged');
  },

  feedbackSubmitted: (recipeId: string, rating: number, feedbackText?: string) =>
    trackEvent('meal_feedback_submitted', {
      recipe_id: recipeId,
      rating,
      feedback_text: feedbackText,
    }),
};

// --- Shopping List ---
export const shoppingAnalytics = {
  viewed: () => trackEvent('shopping_list_viewed'),

  generated: (itemsCount: number) =>
    trackEvent('shopping_list_generated', { items_count: itemsCount }),

  itemChecked: (itemId: string) =>
    trackEvent('shopping_item_checked', { [itemId]: true }),

  itemAdded: (itemName: string) =>
    trackEvent('shopping_item_added', { feature_name: itemName }),
};

// --- Inventario ---
export const inventoryAnalytics = {
  viewed: () => trackEvent('inventory_viewed'),

  updated: (itemsCount: number) =>
    trackEvent('inventory_updated', { items_count: itemsCount }),

  pantryScanUsed: (itemsDetected: number, durationMs: number) =>
    trackEvent('scan_pantry_used', {
      scan_type: 'pantry',
      items_detected: itemsDetected,
      duration_ms: durationMs,
    }),

  receiptScanUsed: (itemsDetected: number, durationMs: number) =>
    trackEvent('scan_receipt_used', {
      scan_type: 'receipt',
      items_detected: itemsDetected,
      duration_ms: durationMs,
    }),
};

// --- IA ---
export const aiAnalytics = {
  recipeGenerated: (style: string, mealType: string, responseTimeMs: number, success: boolean) =>
    trackEvent('ai_recipe_generated', {
      recipe_style: style,
      meal_type: mealType as EventProperties['meal_type'],
      response_time_ms: responseTimeMs,
      success,
    }),

  recipeSaved: (recipeId: string, recipeName: string, style: string) => {
    trackEvent('ai_recipe_saved', {
      recipe_id: recipeId,
      recipe_name: recipeName,
      recipe_style: style,
    });
    recipeAnalytics.created(recipeId, recipeName, 'lunch', 0, 'ai_generated');
  },

  chatStarted: () => trackEvent('ai_chat_started'),

  chatMessageSent: (promptType: string) =>
    trackEvent('ai_chat_message_sent', { prompt_type: promptType }),

  suggestionAccepted: (suggestionType: string) =>
    trackEvent('ai_suggestion_accepted', { feature_name: suggestionType }),

  suggestionRejected: (suggestionType: string) =>
    trackEvent('ai_suggestion_rejected', { feature_name: suggestionType }),
};

// --- Hogar y Tareas ---
export const homeAnalytics = {
  taskCreated: (taskId: string, taskType: string, spaceId?: string) =>
    trackEvent('task_created', { task_id: taskId, task_type: taskType, space_id: spaceId }),

  taskCompleted: (taskId: string, taskType: string, assignedTo?: string) =>
    trackEvent('task_completed', { task_id: taskId, task_type: taskType, assigned_to: assignedTo }),

  taskAssigned: (taskId: string, assignedTo: string) =>
    trackEvent('task_assigned', { task_id: taskId, assigned_to: assignedTo }),

  employeeAdded: (role: string) =>
    trackEvent('employee_added', { feature_name: role }),

  spaceCreated: (spaceId: string, spaceName: string) =>
    trackEvent('space_created', { space_id: spaceId, feature_name: spaceName }),
};

// --- Suscripciones ---
export const subscriptionAnalytics = {
  viewed: () => trackEvent('subscription_viewed'),

  started: (planType: string, price: number, currency: string = 'USD') => {
    trackEvent('subscription_started', {
      plan_type: planType as EventProperties['plan_type'],
      price,
      currency,
    });
    updateUserProperties({
      subscription_plan: planType as UserProperties['subscription_plan'],
      subscription_status: 'active',
    });
  },

  cancelled: (planType: string, reason?: string) => {
    trackEvent('subscription_cancelled', {
      plan_type: planType as EventProperties['plan_type'],
      feature_name: reason,
    });
    updateUserProperties({ subscription_status: 'cancelled' });
  },

  trialStarted: (planType: string, trialDays: number) => {
    trackEvent('trial_started', {
      plan_type: planType as EventProperties['plan_type'],
      trial_days: trialDays,
    });
    updateUserProperties({ subscription_status: 'trial' });
  },

  trialEnded: (planType: string, converted: boolean) =>
    trackEvent('trial_ended', {
      plan_type: planType as EventProperties['plan_type'],
      success: converted,
    }),
};

// --- Feature Discovery ---
export const engagementAnalytics = {
  featureDiscovered: (featureName: string) =>
    trackEvent('feature_discovered', { feature_name: featureName }),

  notificationReceived: (notificationType: string) =>
    trackEvent('notification_received', { feature_name: notificationType }),

  notificationClicked: (notificationType: string) =>
    trackEvent('notification_clicked', { feature_name: notificationType }),

  shareInitiated: (contentType: string, method: string) =>
    trackEvent('share_initiated', { feature_name: contentType, prompt_type: method }),
};

// ============================================
// EXPORT DEFAULT
// ============================================

const analytics = {
  init: initAnalytics,
  track: trackEvent,
  identify: identifyUser,
  updateUser: updateUserProperties,
  incrementUser: incrementUserProperty,
  reset: resetUser,
  sessionStart: trackSessionStart,
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

export default analytics;

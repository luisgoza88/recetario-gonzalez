---
name: analytics-posthog-patterns
description: "PostHog en Next.js: 40+ eventos, useAnalytics hook, AnalyticsProvider, modo log-only."
globs:
  - "src/lib/analytics/**"
---

# Analytics & PostHog Patterns

## Setup

```typescript
// AnalyticsProvider.tsx — Wraps app
import posthog from 'posthog-js';

export function AnalyticsProvider({ children }) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
        capture_pageview: true,
        capture_pageleave: true
      });
    }
  }, []);
  return <>{children}</>;
}
```

## Hook `useAnalytics`

```typescript
const analytics = useAnalytics();

// Auth
analytics.auth.signupStarted("email");
analytics.auth.loginCompleted("google");

// Recetas
analytics.recipe.viewed("recipe-id", "Pasta", "lunch");
analytics.recipe.created("id", "Arroz", "dinner", 5, "ai");

// IA
analytics.ai.recipeGenerated("saludable", "dinner", 1500, true);
analytics.ai.chatStarted("voice");

// Timer para medir duraciones
const start = analytics.startTimer();
// ... operacion
const ms = analytics.getElapsedMs(start);
```

## Nomenclatura de Eventos

Formato: `{modulo}_{accion}_{detalle?}`

| Modulo       | Eventos                                                                       |
| ------------ | ----------------------------------------------------------------------------- |
| auth         | signup_started, signup_completed, login_completed, logout                     |
| onboarding   | onboarding_started, step_completed, completed, skipped                        |
| recipe       | recipe_viewed, created, edited, deleted, shared                               |
| menu         | menu_viewed, meal_assigned, meal_completed, feedback_submitted                |
| shopping     | list_viewed, list_generated, item_checked                                     |
| inventory    | inventory_viewed, updated, scan_pantry_used, scan_receipt_used                |
| ai           | ai_recipe_generated, ai_recipe_saved, ai_chat_started, ai_suggestion_accepted |
| home         | task_created, task_completed, employee_added, space_created                   |
| subscription | subscription_viewed, trial_started                                            |
| engagement   | feature_discovery                                                             |

## Modo Fallback (sin API key)

```typescript
// Si no hay NEXT_PUBLIC_POSTHOG_KEY, eventos van a console.log
// Esto permite desarrollo local sin PostHog
function trackEvent(name: string, properties?: Record<string, unknown>) {
  if (posthog.__loaded) {
    posthog.capture(name, properties);
  } else {
    console.log(`[Analytics] ${name}`, properties);
  }
}
```

## Reglas

1. Usar `useAnalytics()` hook, nunca PostHog directo
2. Nomenclatura: `modulo_accion` en snake_case
3. No incluir PII en eventos (no emails, nombres completos, IDs reales de usuarios)
4. Medir duraciones con `startTimer()` / `getElapsedMs()`
5. Eventos de error incluir `error_type` y `error_message` (sin stack traces)

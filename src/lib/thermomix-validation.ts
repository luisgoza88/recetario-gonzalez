import type { ThermomixRecipe, ThermomixStep } from "@/types";

export interface ThermomixValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

function numericSpeed(speed: string): number | null {
  const normalized = speed.toLowerCase().replace(",", ".").trim();
  if (/^(turbo|cuchara|amasar|espiga)$/.test(normalized)) return null;
  const match = normalized.match(/\b(\d+(?:\.\d+)?)\b/);
  return match ? Number(match[1]) : null;
}

function numericTemperature(temperature: string): number | null {
  const match = temperature.replace(",", ".").match(/\b(\d+(?:\.\d+)?)\b/);
  return match ? Number(match[1]) : null;
}

function looksTimed(step: ThermomixStep): boolean {
  return /\d+\s*(seg|s|min|hora|h)\b/i.test(step.time);
}

export function validateThermomixRecipe(
  recipe: ThermomixRecipe,
): ThermomixValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const steps = recipe.thermomixSteps ?? [];

  if (steps.length < 2) errors.push("La adaptación necesita al menos dos pasos.");
  if (steps.length > 20) warnings.push("La adaptación tiene demasiados pasos para una guía práctica.");
  if (recipe.totalTimeMinutes <= 0) errors.push("El tiempo total no es válido.");

  for (const [index, step] of steps.entries()) {
    const label = `Paso ${index + 1}`;
    if (!step.description?.trim()) errors.push(`${label}: falta la instrucción.`);
    if (!step.speed?.trim()) errors.push(`${label}: falta la velocidad.`);
    if (!step.temperature?.trim()) errors.push(`${label}: falta la temperatura.`);
    if (!step.time?.trim() || !looksTimed(step)) {
      errors.push(`${label}: el tiempo debe indicar segundos, minutos u horas.`);
    }

    const speed = numericSpeed(step.speed ?? "");
    if (speed !== null && (speed < 0 || speed > 10)) {
      errors.push(`${label}: la velocidad ${step.speed} está fuera del rango 0–10.`);
    }
    if (step.accessory === "mariposa" && speed !== null && speed > 4) {
      errors.push(`${label}: la mariposa no puede usarse por encima de velocidad 4.`);
    }
    if (/sp[aá]tula/i.test(step.speed)) {
      warnings.push(`${label}: usa “Cuchara” como velocidad y “giro inverso” por separado.`);
    }

    const temperature = numericTemperature(step.temperature ?? "");
    if (temperature !== null && temperature > 120) {
      errors.push(
        `${label}: temperaturas superiores a 120 °C no deben inventarse en una adaptación manual.`,
      );
    }
    if (step.mode === "coccion-lenta" && step.accessory !== "cubrecuchillas") {
      warnings.push(`${label}: la cocción lenta de piezas delicadas suele requerir cubrecuchillas.`);
    }
    if (step.reverse && /^(8|9|10|turbo)$/i.test(step.speed.trim())) {
      warnings.push(`${label}: revisa la combinación de giro inverso y velocidad alta.`);
    }
  }

  const hasButterfly = steps.some((step) => step.accessory === "mariposa");
  const mentionsButterfly = steps.some((step) => /mariposa/i.test(step.description));
  if (hasButterfly && !mentionsButterfly) {
    warnings.push("Debe indicarse explícitamente cuándo colocar o retirar la mariposa.");
  }

  const usesVaroma = steps.some(
    (step) => step.accessory === "varoma" || /varoma/i.test(step.temperature),
  );
  const mentionsWater = steps.some((step) => /agua|caldo|l[ií]quido/i.test(step.description));
  if (usesVaroma && !mentionsWater) {
    warnings.push("La cocción Varoma debe indicar el líquido suficiente en el vaso.");
  }

  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
  };
}

export function attachThermomixQualityWarnings(
  recipe: ThermomixRecipe,
): ThermomixRecipe {
  const validation = validateThermomixRecipe(recipe);
  return {
    ...recipe,
    qualityWarnings: [...validation.errors, ...validation.warnings],
  };
}

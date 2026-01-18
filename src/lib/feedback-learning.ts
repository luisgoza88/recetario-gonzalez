/**
 * Sistema de Aprendizaje de Feedback con Pesos Temporales
 * Genera sugerencias inteligentes basadas en patrones del feedback
 */

import { createClient } from '@supabase/supabase-js';
import { MealFeedback, AdjustmentSuggestion, PortionRating, LeftoverRating, MealType } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Configuración del sistema de aprendizaje
const CONFIG = {
  // Decaimiento temporal: días después de los cuales el feedback pierde 50% de peso
  halfLifeDays: 14,
  // Peso mínimo para considerar un feedback
  minWeight: 0.1,
  // Umbral de confianza para generar sugerencia
  confidenceThreshold: 0.65,
  // Mínimo de feedbacks ponderados para generar sugerencia
  minWeightedCount: 1.5,
  // Máximo de días para considerar feedback
  maxAgeDays: 90,
};

interface WeightedFeedback {
  feedback: MealFeedback;
  weight: number;
  daysSinceCreation: number;
}

interface PatternAnalysis {
  recipeId: string;
  recipeName: string;
  portionPattern: {
    tooMuch: number;
    good: number;
    tooLittle: number;
    confidence: number;
    recommendation: 'increase' | 'decrease' | 'none';
    suggestedChange: number;
  };
  leftoverPattern: {
    none: number;
    some: number;
    lots: number;
    confidence: number;
    recommendation: 'reduce_portions' | 'none';
    suggestedChange: number;
  };
  missingIngredientsPattern: {
    ingredients: Map<string, number>;
    topMissing: string[];
  };
  mealTypePattern: {
    type: MealType;
    successRate: number;
  };
  weekdayPattern: {
    dayOfWeek: number;
    averageRating: number;
  }[];
  totalWeightedFeedbacks: number;
}

/**
 * Calcular peso temporal de un feedback
 * Feedback más reciente tiene más peso
 */
function calculateTimeWeight(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const daysDiff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);

  // Si es muy viejo, ignorar
  if (daysDiff > CONFIG.maxAgeDays) return 0;

  // Decaimiento exponencial
  const weight = Math.pow(0.5, daysDiff / CONFIG.halfLifeDays);

  return Math.max(weight, CONFIG.minWeight);
}

/**
 * Cargar feedbacks con pesos temporales
 */
async function loadWeightedFeedbacks(recipeId?: string): Promise<WeightedFeedback[]> {
  let query = supabase
    .from('meal_feedback')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (recipeId) {
    query = query.eq('recipe_id', recipeId);
  }

  const { data, error } = await query;

  if (error || !data) {
    console.error('Error loading feedbacks:', error);
    return [];
  }

  return data.map(feedback => {
    const weight = calculateTimeWeight(feedback.created_at || new Date().toISOString());
    const daysSinceCreation = Math.floor(
      (new Date().getTime() - new Date(feedback.created_at || new Date()).getTime()) / (1000 * 60 * 60 * 24)
    );

    return { feedback, weight, daysSinceCreation };
  }).filter(wf => wf.weight > 0);
}

/**
 * Analizar patrones para una receta específica
 */
export async function analyzeRecipePattern(recipeId: string): Promise<PatternAnalysis | null> {
  const weightedFeedbacks = await loadWeightedFeedbacks(recipeId);

  if (weightedFeedbacks.length === 0) return null;

  const totalWeight = weightedFeedbacks.reduce((sum, wf) => sum + wf.weight, 0);
  const recipeName = weightedFeedbacks[0]?.feedback.recipe_name || 'Receta';

  // Análisis de porciones
  let portionTooMuch = 0, portionGood = 0, portionTooLittle = 0;
  for (const wf of weightedFeedbacks) {
    const rating = wf.feedback.portion_rating as PortionRating;
    if (rating === 'mucha') portionTooMuch += wf.weight;
    else if (rating === 'bien') portionGood += wf.weight;
    else if (rating === 'poca') portionTooLittle += wf.weight;
  }

  const portionTotal = portionTooMuch + portionGood + portionTooLittle;
  const portionConfidence = portionTotal > 0 ? Math.max(portionTooMuch, portionGood, portionTooLittle) / portionTotal : 0;

  let portionRecommendation: 'increase' | 'decrease' | 'none' = 'none';
  let portionSuggestedChange = 0;

  if (portionConfidence >= CONFIG.confidenceThreshold && portionTotal >= CONFIG.minWeightedCount) {
    if (portionTooMuch > portionTooLittle && portionTooMuch > portionGood) {
      portionRecommendation = 'decrease';
      // Calcular reducción proporcional (max 25%)
      portionSuggestedChange = -Math.min(25, Math.round((portionTooMuch / portionTotal) * 30));
    } else if (portionTooLittle > portionTooMuch && portionTooLittle > portionGood) {
      portionRecommendation = 'increase';
      // Calcular aumento proporcional (max 25%)
      portionSuggestedChange = Math.min(25, Math.round((portionTooLittle / portionTotal) * 30));
    }
  }

  // Análisis de sobras
  let leftoverNone = 0, leftoverSome = 0, leftoverLots = 0;
  for (const wf of weightedFeedbacks) {
    const rating = wf.feedback.leftover_rating as LeftoverRating;
    if (rating === 'nada') leftoverNone += wf.weight;
    else if (rating === 'poco') leftoverSome += wf.weight;
    else if (rating === 'mucho') leftoverLots += wf.weight;
  }

  const leftoverTotal = leftoverNone + leftoverSome + leftoverLots;
  const leftoverConfidence = leftoverTotal > 0 ? leftoverLots / leftoverTotal : 0;

  let leftoverRecommendation: 'reduce_portions' | 'none' = 'none';
  let leftoverSuggestedChange = 0;

  if (leftoverConfidence >= 0.4 && leftoverTotal >= CONFIG.minWeightedCount && leftoverLots > leftoverSome + leftoverNone) {
    leftoverRecommendation = 'reduce_portions';
    leftoverSuggestedChange = -Math.min(20, Math.round(leftoverConfidence * 25));
  }

  // Análisis de ingredientes faltantes
  const missingIngredients = new Map<string, number>();
  for (const wf of weightedFeedbacks) {
    const missing = wf.feedback.missing_ingredients as string[] || [];
    for (const ing of missing) {
      const current = missingIngredients.get(ing) || 0;
      missingIngredients.set(ing, current + wf.weight);
    }
  }

  // Top 3 ingredientes más frecuentemente faltantes
  const topMissing = Array.from(missingIngredients.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .filter(([_, weight]) => weight >= 0.5)
    .map(([ing, _]) => ing);

  // Análisis por día de la semana
  const weekdayStats = new Array(7).fill(null).map(() => ({ total: 0, count: 0 }));
  for (const wf of weightedFeedbacks) {
    const date = new Date(wf.feedback.date);
    const day = date.getDay();
    const rating = wf.feedback.portion_rating === 'bien' ? 1 : 0;
    weekdayStats[day].total += rating * wf.weight;
    weekdayStats[day].count += wf.weight;
  }

  const weekdayPattern = weekdayStats.map((stats, day) => ({
    dayOfWeek: day,
    averageRating: stats.count > 0 ? stats.total / stats.count : 0
  }));

  // Análisis por tipo de comida
  const mealTypes: Record<MealType, { good: number; total: number }> = {
    breakfast: { good: 0, total: 0 },
    lunch: { good: 0, total: 0 },
    dinner: { good: 0, total: 0 }
  };

  for (const wf of weightedFeedbacks) {
    const type = wf.feedback.meal_type as MealType;
    if (mealTypes[type]) {
      mealTypes[type].total += wf.weight;
      if (wf.feedback.portion_rating === 'bien' && wf.feedback.leftover_rating !== 'mucho') {
        mealTypes[type].good += wf.weight;
      }
    }
  }

  // Encontrar el mejor tipo de comida para esta receta
  const bestMealType = (Object.entries(mealTypes) as [MealType, { good: number; total: number }][])
    .filter(([_, stats]) => stats.total > 0)
    .sort((a, b) => (b[1].good / b[1].total) - (a[1].good / a[1].total))[0];

  return {
    recipeId,
    recipeName,
    portionPattern: {
      tooMuch: portionTooMuch,
      good: portionGood,
      tooLittle: portionTooLittle,
      confidence: portionConfidence,
      recommendation: portionRecommendation,
      suggestedChange: portionSuggestedChange
    },
    leftoverPattern: {
      none: leftoverNone,
      some: leftoverSome,
      lots: leftoverLots,
      confidence: leftoverConfidence,
      recommendation: leftoverRecommendation,
      suggestedChange: leftoverSuggestedChange
    },
    missingIngredientsPattern: {
      ingredients: missingIngredients,
      topMissing
    },
    mealTypePattern: {
      type: bestMealType ? bestMealType[0] : 'lunch',
      successRate: bestMealType ? bestMealType[1].good / bestMealType[1].total : 0
    },
    weekdayPattern,
    totalWeightedFeedbacks: totalWeight
  };
}

/**
 * Generar sugerencias de ajuste basadas en análisis
 */
export async function generateSmartSuggestions(): Promise<AdjustmentSuggestion[]> {
  const suggestions: AdjustmentSuggestion[] = [];

  // Obtener todas las recetas con feedback
  const { data: feedbacks } = await supabase
    .from('meal_feedback')
    .select('recipe_id, recipe_name')
    .not('recipe_id', 'is', null);

  if (!feedbacks) return suggestions;

  // Agrupar por receta
  const recipeIds = [...new Set(feedbacks.map(f => f.recipe_id).filter(Boolean))];

  for (const recipeId of recipeIds) {
    const analysis = await analyzeRecipePattern(recipeId);
    if (!analysis) continue;

    // Verificar si ya existe sugerencia pendiente
    const { data: existingSuggestion } = await supabase
      .from('adjustment_suggestions')
      .select('id')
      .eq('recipe_id', recipeId)
      .eq('status', 'pending')
      .limit(1);

    if (existingSuggestion && existingSuggestion.length > 0) continue;

    // Generar sugerencia de porción
    if (analysis.portionPattern.recommendation !== 'none' &&
        analysis.portionPattern.confidence >= CONFIG.confidenceThreshold) {
      const suggestion: Partial<AdjustmentSuggestion> = {
        suggestion_type: 'portion',
        recipe_id: recipeId,
        recipe_name: analysis.recipeName,
        change_percent: analysis.portionPattern.suggestedChange,
        reason: analysis.portionPattern.recommendation === 'decrease'
          ? `Patrón detectado: ${Math.round(analysis.portionPattern.confidence * 100)}% de feedback indica porciones muy grandes`
          : `Patrón detectado: ${Math.round(analysis.portionPattern.confidence * 100)}% de feedback indica porciones muy pequeñas`,
        feedback_count: Math.round(analysis.totalWeightedFeedbacks),
        status: 'pending'
      };

      // Insertar sugerencia
      const { data } = await supabase
        .from('adjustment_suggestions')
        .insert(suggestion)
        .select()
        .single();

      if (data) suggestions.push(data as AdjustmentSuggestion);
    }

    // Generar sugerencia de mercado (por sobras)
    if (analysis.leftoverPattern.recommendation === 'reduce_portions' &&
        analysis.leftoverPattern.confidence >= 0.4) {
      const suggestion: Partial<AdjustmentSuggestion> = {
        suggestion_type: 'market',
        recipe_id: recipeId,
        recipe_name: analysis.recipeName,
        change_percent: analysis.leftoverPattern.suggestedChange,
        reason: `Patrón de sobras detectado: ${Math.round(analysis.leftoverPattern.lots)} reportes ponderados de "sobró mucho"`,
        feedback_count: Math.round(analysis.totalWeightedFeedbacks),
        status: 'pending'
      };

      const { data } = await supabase
        .from('adjustment_suggestions')
        .insert(suggestion)
        .select()
        .single();

      if (data) suggestions.push(data as AdjustmentSuggestion);
    }

    // Generar sugerencia de ingredientes faltantes
    if (analysis.missingIngredientsPattern.topMissing.length > 0) {
      const topMissing = analysis.missingIngredientsPattern.topMissing;
      const suggestion: Partial<AdjustmentSuggestion> = {
        suggestion_type: 'ingredient',
        recipe_id: recipeId,
        recipe_name: analysis.recipeName,
        ingredient_name: topMissing.join(', '),
        reason: `Ingredientes frecuentemente faltantes: ${topMissing.join(', ')}. Considera añadirlos a la lista de compras.`,
        feedback_count: Math.round(analysis.totalWeightedFeedbacks),
        status: 'pending'
      };

      const { data } = await supabase
        .from('adjustment_suggestions')
        .insert(suggestion)
        .select()
        .single();

      if (data) suggestions.push(data as AdjustmentSuggestion);
    }
  }

  return suggestions;
}

/**
 * Analizar feedback recién guardado y generar sugerencias si aplica
 */
export async function analyzeNewFeedback(feedback: MealFeedback): Promise<void> {
  if (!feedback.recipe_id) return;

  const analysis = await analyzeRecipePattern(feedback.recipe_id);
  if (!analysis) return;

  // Verificar si hay patrones significativos que ameriten nueva sugerencia
  const shouldCreatePortionSuggestion =
    analysis.portionPattern.recommendation !== 'none' &&
    analysis.portionPattern.confidence >= CONFIG.confidenceThreshold &&
    analysis.totalWeightedFeedbacks >= CONFIG.minWeightedCount;

  const shouldCreateLeftoverSuggestion =
    analysis.leftoverPattern.recommendation === 'reduce_portions' &&
    analysis.leftoverPattern.confidence >= 0.4 &&
    analysis.totalWeightedFeedbacks >= CONFIG.minWeightedCount;

  if (shouldCreatePortionSuggestion || shouldCreateLeftoverSuggestion) {
    // Verificar que no exista sugerencia pendiente
    const { data: existing } = await supabase
      .from('adjustment_suggestions')
      .select('id, suggestion_type, feedback_count')
      .eq('recipe_id', feedback.recipe_id)
      .eq('status', 'pending');

    if (existing && existing.length > 0) {
      // Actualizar contador de sugerencia existente
      for (const sug of existing) {
        await supabase
          .from('adjustment_suggestions')
          .update({ feedback_count: Math.round(analysis.totalWeightedFeedbacks) })
          .eq('id', sug.id);
      }
    } else {
      // Crear nueva sugerencia
      await generateSmartSuggestions();
    }
  }
}

/**
 * Obtener resumen de aprendizaje para mostrar al usuario
 */
export async function getLearningInsights(): Promise<{
  totalFeedbacks: number;
  activePatterns: number;
  topRecipesNeedingAdjustment: string[];
  overallConfidence: number;
}> {
  const { count } = await supabase
    .from('meal_feedback')
    .select('id', { count: 'exact', head: true });

  const { data: pendingSuggestions } = await supabase
    .from('adjustment_suggestions')
    .select('recipe_name, feedback_count')
    .eq('status', 'pending')
    .order('feedback_count', { ascending: false })
    .limit(3);

  const topRecipes = pendingSuggestions?.map(s => s.recipe_name).filter(Boolean) || [];

  // Calcular confianza general basada en cantidad de datos
  const totalFeedbacks = count || 0;
  const overallConfidence = Math.min(1, totalFeedbacks / 50); // 50 feedbacks = 100% confianza

  return {
    totalFeedbacks,
    activePatterns: pendingSuggestions?.length || 0,
    topRecipesNeedingAdjustment: topRecipes as string[],
    overallConfidence
  };
}

// Tipos principales del Recetario

// Información nutricional por porción
export interface NutritionInfo {
  calories: number;        // kcal por porción
  protein: number;         // gramos
  carbs: number;           // gramos
  fat: number;             // gramos
  fiber?: number;          // gramos
  sodium?: number;         // mg
  sugar?: number;          // gramos
}

// Tags dietéticos para filtrado
export type DietaryTag =
  | 'vegetariano'
  | 'vegano'
  | 'sin-gluten'
  | 'sin-lactosa'
  | 'bajo-carbohidrato'
  | 'alto-proteina'
  | 'bajo-sodio'
  | 'bajo-azucar'
  | 'keto'
  | 'paleo';

// Dificultad de la receta
export type RecipeDifficulty = 'fácil' | 'media' | 'difícil';

export interface Recipe {
  id: string;
  name: string;
  type: 'breakfast' | 'lunch' | 'dinner';
  portions?: {
    luis: string;
    mariana: string;
  };
  total?: string;
  ingredients: Ingredient[];
  steps: string[];
  // Campos de tiempo (en minutos)
  prep_time?: number;
  cook_time?: number;
  total_time?: number;
  // Información nutricional (por porción)
  nutrition?: NutritionInfo;
  // Metadatos adicionales
  difficulty?: RecipeDifficulty;
  dietary_tags?: DietaryTag[];
  description?: string;
  tips?: string;
  source?: 'manual' | 'ai_generated';
  image_url?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Ingredient {
  name: string;
  total?: string;
  luis: string;
  mariana: string;
}

export interface DayMenu {
  id: string;
  day_number: number; // 0-11 (12 días de ciclo, excluyendo domingos)
  breakfast_id: string;
  lunch_id: string;
  dinner_id: string | null;
  reminder: string | null;
  breakfast?: Recipe;
  lunch?: Recipe;
  dinner?: Recipe | null;
}

export interface CompletedDay {
  id: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  created_at?: string;
}

export interface IngredientCategory {
  id: string;
  name: string;
  name_es: string;
  icon: string;
  color: string;
  ai_description?: string;
  sort_order: number;
}

export interface MarketItem {
  id: string;
  category: string; // Deprecated: usar category_id
  category_id?: string;
  category_data?: IngredientCategory;
  name: string;
  quantity: string;
  checked: boolean;
  order_index: number;
  is_custom?: boolean;
  ai_tags?: string[];
  unit?: string;
  created_at?: string;
  // Campos de inventario (despensa)
  currentQuantity?: string;
  currentNumber?: number;
}

export interface InventoryItem {
  id: string;
  item_id: string;
  current_quantity: string;
  current_number: number;
  last_updated: string;
}

export interface MarketChecklist {
  id: string;
  item_id: string;
  checked: boolean;
  checked_at?: string;
}

// Categorías del mercado (legacy - para compatibilidad)
export const MARKET_CATEGORIES = [
  'Proteínas Premium',
  'Proteínas Económicas',
  'Vegetales',
  'Tubérculos',
  'Carbohidratos',
  'Lácteos',
  'Despensa',
  'Especias'
] as const;

export type MarketCategory = typeof MARKET_CATEGORIES[number];

// Nuevas categorías de ingredientes (desde DB)
export const INGREDIENT_CATEGORY_IDS = [
  'proteins',
  'dairy',
  'vegetables',
  'fruits',
  'grains',
  'pantry',
  'spices',
  'beverages',
  'frozen',
  'other'
] as const;

export type IngredientCategoryId = typeof INGREDIENT_CATEGORY_IDS[number];

// Tipos de comida
export const MEAL_TYPES = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena'
} as const;

export type MealType = keyof typeof MEAL_TYPES;

// Tipos para el sistema de feedback
export type PortionRating = 'poca' | 'bien' | 'mucha';
export type LeftoverRating = 'nada' | 'poco' | 'mucho';
export type SuggestionType = 'portion' | 'ingredient' | 'market';
export type SuggestionStatus = 'pending' | 'applied' | 'dismissed';

export interface MealFeedback {
  id: string;
  date: string;
  meal_type: MealType;
  recipe_id: string;
  recipe_name?: string;
  portion_rating?: PortionRating;
  leftover_rating?: LeftoverRating;
  missing_ingredients?: string[];
  used_up_ingredients?: string[];
  notes?: string;
  created_at?: string;
}

export interface AdjustmentSuggestion {
  id: string;
  suggestion_type: SuggestionType;
  recipe_id?: string;
  recipe_name?: string;
  ingredient_name?: string;
  item_id?: string;
  item_name?: string;
  current_value?: string;
  suggested_value?: string;
  change_percent?: number;
  reason: string;
  feedback_count: number;
  status: SuggestionStatus;
  created_at?: string;
  applied_at?: string;
}

// =====================================================
// TIPOS PARA MÓDULO GESTIÓN DEL HOGAR
// =====================================================

export interface Household {
  id: string;
  name: string;
  owner_name?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
  setup_completed: boolean;
}

export interface SpaceType {
  id: string;
  name: string;
  category: 'interior' | 'exterior';
  icon: string;
  default_tasks: string[];
  sort_order: number;
}

export interface SpaceAttributes {
  has_bathroom: boolean;
  has_walkin_closet: boolean;
  has_balcony: boolean;
  has_windows: number; // cantidad de ventanas
  floor_type: 'tile' | 'wood' | 'carpet' | 'concrete' | 'other';
  has_curtains: boolean;
  has_air_conditioning: boolean;
}

export interface Space {
  id: string;
  household_id: string;
  space_type_id?: string;
  space_type?: SpaceType;
  custom_name?: string;
  category: 'interior' | 'exterior';
  usage_level: 'alto' | 'medio' | 'bajo';
  has_bathroom: boolean;
  area_sqm?: number;
  attributes?: SpaceAttributes;
  characteristics?: Record<string, unknown>;
  notes?: string;
  created_at?: string;
}

export interface DaySchedule {
  enabled: boolean;
  startTime: string;
  endTime: string;
}

export interface HomeEmployee {
  id: string;
  household_id: string;
  name: string;
  role?: string;
  zone: 'interior' | 'exterior' | 'ambos';
  work_days: string[];
  hours_per_day: number;
  schedule?: Record<string, DaySchedule>;
  phone?: string;
  notes?: string;
  active: boolean;
  created_at?: string;
}

export type TaskFrequency = 'diaria' | 'semanal' | 'quincenal' | 'mensual' | 'trimestral' | 'personalizada';
export type TaskPriority = 'alta' | 'normal' | 'baja';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'omitida';

export interface TaskTemplate {
  id: string;
  household_id: string;
  space_id: string;
  space?: Space;
  name: string;
  description?: string;
  frequency: TaskFrequency;
  frequency_days?: number;
  estimated_minutes: number;
  priority: TaskPriority;
  category?: string;
  assigned_employee_id?: string;
  assigned_employee?: HomeEmployee;
  is_active: boolean;
  created_at?: string;
}

export interface ScheduledTask {
  id: string;
  household_id: string;
  task_template_id: string;
  task_template?: TaskTemplate;
  space_id: string;
  space?: Space;
  employee_id?: string;
  employee?: HomeEmployee;
  scheduled_date: string;
  status: TaskStatus;
  completed_at?: string;
  completed_by?: string;
  notes?: string;
  actual_minutes?: number;
  created_at?: string;
}

export interface CleaningHistory {
  id: string;
  space_id: string;
  task_name: string;
  completed_at: string;
  employee_id?: string;
  notes?: string;
  rating?: number;
}

// =====================================================
// TIPOS PARA ANÁLISIS Y OPTIMIZACIÓN DE HORARIOS
// =====================================================

export interface WorkloadAnalysis {
  employeeId: string;
  employeeName: string;
  day: string;
  totalMinutes: number;
  availableMinutes: number;
  taskCount: number;
  utilizationPercent: number;
  isOverloaded: boolean;
  tasks: {
    taskName: string;
    spaceName: string;
    minutes: number;
  }[];
}

export interface ScheduleIssue {
  type: 'overload' | 'uncovered_space' | 'uncovered_task' | 'time_conflict' | 'inefficient_distribution';
  severity: 'high' | 'medium' | 'low';
  description: string;
  affectedDay?: string;
  affectedEmployee?: string;
  affectedSpace?: string;
  suggestion: string;
}

export interface ScheduleOptimization {
  id: string;
  type: 'redistribute' | 'reschedule' | 'add_employee' | 'reduce_frequency' | 'combine_tasks';
  description: string;
  impact: string;
  tasks: {
    taskId: string;
    currentDay: string;
    suggestedDay?: string;
    currentEmployee?: string;
    suggestedEmployee?: string;
  }[];
  estimatedImprovement: number; // porcentaje de mejora
}

export interface CoverageReport {
  totalSpaces: number;
  coveredSpaces: number;
  uncoveredSpaces: Space[];
  totalTasks: number;
  scheduledTasks: number;
  unscheduledTasks: {
    spaceName: string;
    taskName: string;
    reason: string;
  }[];
  weeklyWorkload: {
    day: string;
    totalMinutes: number;
    employeeWorkloads: WorkloadAnalysis[];
  }[];
}

// =====================================================
// TIPOS PARA SISTEMA DE PRESUPUESTO
// =====================================================

export interface PriceHistory {
  id: string;
  item_id: string;
  price: number;
  price_unit: string;
  source?: string;
  recorded_at: string;
}

export interface Budget {
  id: string;
  period_type: 'weekly' | 'monthly';
  period_start: string;
  period_end: string;
  budget_amount: number;
  actual_spent: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Purchase {
  id: string;
  item_id?: string;
  item_name: string;
  quantity?: string;
  price: number;
  store?: string;
  purchased_at: string;
  budget_id?: string;
  notes?: string;
}

export interface BudgetSummary {
  budget: Budget | null;
  totalSpent: number;
  remaining: number;
  percentUsed: number;
  averageDailySpend: number;
  daysRemaining: number;
  projectedTotal: number;
  isOverBudget: boolean;
  purchases: Purchase[];
}

// Tipos principales del Recetario

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

export interface MarketItem {
  id: string;
  category: string;
  name: string;
  quantity: string;
  checked: boolean;
  order_index: number;
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

// Categorías del mercado
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

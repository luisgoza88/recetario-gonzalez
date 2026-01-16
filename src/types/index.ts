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

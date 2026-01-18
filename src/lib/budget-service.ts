/**
 * Sistema de Control de Presupuesto
 * Gestiona presupuestos, compras y estimaciones de costos
 */

import { createClient } from '@supabase/supabase-js';
import { Budget, Purchase, BudgetSummary, MarketItem } from '@/types';
import { normalizeQuantity } from './units';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Precios estimados por defecto (COP) - si no hay precio en DB
const DEFAULT_PRICES: Record<string, number> = {
  // Proteínas (por kg)
  'pollo': 14000,
  'pechuga': 18000,
  'carne': 28000,
  'res': 28000,
  'cerdo': 16000,
  'pescado': 25000,
  'huevo': 800, // por unidad
  'huevos': 15000, // por 30 unidades
  // Vegetales (por kg)
  'tomate': 4000,
  'cebolla': 3000,
  'papa': 2500,
  'zanahoria': 3500,
  'lechuga': 3000,
  'aguacate': 6000,
  // Lácteos
  'leche': 4500, // por litro
  'queso': 22000, // por kg
  'yogurt': 8000, // por litro
  'crema': 12000, // por litro
  // Despensa
  'arroz': 4000, // por kg
  'pasta': 5000, // por kg
  'aceite': 15000, // por litro
  'azucar': 3500, // por kg
  'sal': 1500, // por kg
};

/**
 * Obtener o crear presupuesto para el período actual
 */
export async function getCurrentBudget(periodType: 'weekly' | 'monthly' = 'weekly'): Promise<Budget | null> {
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (periodType === 'weekly') {
    // Semana comienza el lunes
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - diff);
    periodStart.setHours(0, 0, 0, 0);

    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
    periodEnd.setHours(23, 59, 59, 999);
  } else {
    // Mes actual
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  const startStr = periodStart.toISOString().split('T')[0];
  const endStr = periodEnd.toISOString().split('T')[0];

  // Buscar presupuesto existente
  const { data, error } = await supabase
    .from('budgets')
    .select('*')
    .eq('period_type', periodType)
    .eq('period_start', startStr)
    .single();

  if (data) return data as Budget;

  // No existe, devolver null (el usuario debe crear uno)
  return null;
}

/**
 * Crear un nuevo presupuesto
 */
export async function createBudget(
  periodType: 'weekly' | 'monthly',
  amount: number,
  notes?: string
): Promise<Budget | null> {
  const now = new Date();
  let periodStart: Date;
  let periodEnd: Date;

  if (periodType === 'weekly') {
    const dayOfWeek = now.getDay();
    const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    periodStart = new Date(now);
    periodStart.setDate(now.getDate() - diff);
    periodEnd = new Date(periodStart);
    periodEnd.setDate(periodStart.getDate() + 6);
  } else {
    periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  }

  const { data, error } = await supabase
    .from('budgets')
    .insert({
      period_type: periodType,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      budget_amount: amount,
      actual_spent: 0,
      notes
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating budget:', error);
    return null;
  }

  return data as Budget;
}

/**
 * Registrar una compra
 */
export async function recordPurchase(purchase: Omit<Purchase, 'id' | 'purchased_at'>): Promise<Purchase | null> {
  const budget = await getCurrentBudget();

  const { data, error } = await supabase
    .from('purchases')
    .insert({
      ...purchase,
      budget_id: budget?.id || null,
      purchased_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('Error recording purchase:', error);
    return null;
  }

  // Actualizar el gasto del presupuesto
  if (budget) {
    await supabase
      .from('budgets')
      .update({
        actual_spent: budget.actual_spent + purchase.price,
        updated_at: new Date().toISOString()
      })
      .eq('id', budget.id);
  }

  return data as Purchase;
}

/**
 * Obtener resumen del presupuesto actual
 */
export async function getBudgetSummary(periodType: 'weekly' | 'monthly' = 'weekly'): Promise<BudgetSummary> {
  const budget = await getCurrentBudget(periodType);

  if (!budget) {
    return {
      budget: null,
      totalSpent: 0,
      remaining: 0,
      percentUsed: 0,
      averageDailySpend: 0,
      daysRemaining: periodType === 'weekly' ? 7 : 30,
      projectedTotal: 0,
      isOverBudget: false,
      purchases: []
    };
  }

  // Obtener compras del período
  const { data: purchases } = await supabase
    .from('purchases')
    .select('*')
    .eq('budget_id', budget.id)
    .order('purchased_at', { ascending: false });

  const purchaseList = (purchases || []) as Purchase[];
  const totalSpent = purchaseList.reduce((sum, p) => sum + p.price, 0);

  // Calcular días transcurridos y restantes
  const start = new Date(budget.period_start);
  const end = new Date(budget.period_end);
  const now = new Date();

  const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const daysPassed = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, totalDays - daysPassed);

  const averageDailySpend = daysPassed > 0 ? totalSpent / daysPassed : 0;
  const projectedTotal = averageDailySpend * totalDays;

  return {
    budget,
    totalSpent,
    remaining: budget.budget_amount - totalSpent,
    percentUsed: (totalSpent / budget.budget_amount) * 100,
    averageDailySpend,
    daysRemaining,
    projectedTotal,
    isOverBudget: totalSpent > budget.budget_amount,
    purchases: purchaseList
  };
}

/**
 * Estimar costo de una lista de compras
 */
export async function estimateShoppingCost(items: Array<{ name: string; quantity: string }>): Promise<{
  total: number;
  breakdown: Array<{ name: string; quantity: string; estimatedPrice: number; priceSource: string }>;
}> {
  // Cargar precios de la DB
  const { data: marketItems } = await supabase
    .from('market_items')
    .select('id, name, estimated_price, price_unit, quantity');

  const priceMap = new Map<string, { price: number; unit: string }>();
  if (marketItems) {
    for (const item of marketItems) {
      if (item.estimated_price) {
        priceMap.set(item.name.toLowerCase(), {
          price: item.estimated_price,
          unit: item.price_unit || 'kg'
        });
      }
    }
  }

  const breakdown: Array<{ name: string; quantity: string; estimatedPrice: number; priceSource: string }> = [];
  let total = 0;

  for (const item of items) {
    const itemLower = item.name.toLowerCase();
    let estimatedPrice = 0;
    let priceSource = 'sin precio';

    // Buscar precio en DB primero
    const dbPrice = priceMap.get(itemLower);
    if (dbPrice) {
      // Normalizar cantidad para calcular precio
      const normalized = normalizeQuantity(item.quantity);
      if (normalized.baseUnit === 'g') {
        estimatedPrice = (normalized.value / 1000) * dbPrice.price; // Convertir a kg
      } else if (normalized.baseUnit === 'ml') {
        estimatedPrice = (normalized.value / 1000) * dbPrice.price; // Convertir a litro
      } else {
        estimatedPrice = normalized.value * (dbPrice.price / 10); // Aproximar por unidad
      }
      priceSource = 'base de datos';
    } else {
      // Buscar en precios por defecto
      for (const [key, defaultPrice] of Object.entries(DEFAULT_PRICES)) {
        if (itemLower.includes(key)) {
          const normalized = normalizeQuantity(item.quantity);
          if (normalized.baseUnit === 'g') {
            estimatedPrice = (normalized.value / 1000) * defaultPrice;
          } else if (normalized.baseUnit === 'ml') {
            estimatedPrice = (normalized.value / 1000) * defaultPrice;
          } else {
            estimatedPrice = normalized.value * (defaultPrice / 10);
          }
          priceSource = 'estimado';
          break;
        }
      }
    }

    breakdown.push({
      name: item.name,
      quantity: item.quantity,
      estimatedPrice: Math.round(estimatedPrice),
      priceSource
    });
    total += estimatedPrice;
  }

  return {
    total: Math.round(total),
    breakdown
  };
}

/**
 * Actualizar precio de un item
 */
export async function updateItemPrice(
  itemId: string,
  price: number,
  priceUnit: string = 'kg',
  source?: string
): Promise<void> {
  // Actualizar en market_items
  await supabase
    .from('market_items')
    .update({
      estimated_price: price,
      price_unit: priceUnit,
      last_price_update: new Date().toISOString()
    })
    .eq('id', itemId);

  // Guardar en historial
  await supabase
    .from('price_history')
    .insert({
      item_id: itemId,
      price,
      price_unit: priceUnit,
      source
    });
}

/**
 * Obtener historial de gastos por categoría
 */
export async function getSpendingByCategory(budgetId?: string): Promise<Record<string, number>> {
  let query = supabase
    .from('purchases')
    .select('item_id, item_name, price');

  if (budgetId) {
    query = query.eq('budget_id', budgetId);
  }

  const { data: purchases } = await query;
  if (!purchases) return {};

  // Cargar categorías de items
  const { data: items } = await supabase
    .from('market_items')
    .select('id, category');

  const categoryMap = new Map<string, string>();
  if (items) {
    for (const item of items) {
      categoryMap.set(item.id, item.category || 'Otros');
    }
  }

  const spending: Record<string, number> = {};
  for (const purchase of purchases) {
    const category = (purchase.item_id && categoryMap.get(purchase.item_id)) || 'Otros';
    spending[category] = (spending[category] || 0) + purchase.price;
  }

  return spending;
}

/**
 * Obtener alertas de presupuesto
 */
export async function getBudgetAlerts(): Promise<string[]> {
  const summary = await getBudgetSummary();
  const alerts: string[] = [];

  if (!summary.budget) {
    alerts.push('No hay presupuesto configurado para esta semana');
    return alerts;
  }

  if (summary.isOverBudget) {
    alerts.push(`Has excedido tu presupuesto por $${Math.abs(Math.round(summary.remaining)).toLocaleString()}`);
  } else if (summary.percentUsed > 80) {
    alerts.push(`Has usado el ${Math.round(summary.percentUsed)}% de tu presupuesto`);
  }

  if (summary.projectedTotal > summary.budget.budget_amount * 1.1 && !summary.isOverBudget) {
    const excess = Math.round(summary.projectedTotal - summary.budget.budget_amount);
    alerts.push(`A este ritmo, excederás tu presupuesto por ~$${excess.toLocaleString()}`);
  }

  return alerts;
}

/**
 * Formatear precio en COP
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

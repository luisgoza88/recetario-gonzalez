/**
 * AI Assistant Module
 *
 * Módulo centralizado para el asistente de IA del hogar González.
 * Exporta tipos, constantes, utilidades y cliente de base de datos.
 */

// Types
export * from './types';

// Constants
export {
  SYSTEM_PROMPT,
  TOOL_DESCRIPTIONS,
  getToolDescription,
  DAYS_OF_WEEK,
  MEAL_TYPE_LABELS,
  RECIPE_VARIANTS,
} from './constants';

// Database client
export { createAIClient, getMarketItemName, getRecipeName } from './db';
export type { MarketItemRef, RecipeRef } from './db';

// Utilities
export {
  createToolStreamEvent,
  createToolStartEvent,
  createToolResultEvent,
  createContentEvent,
  createDoneEvent,
  isInvalidResponse,
  messageRequiresFunction,
  getFallbackResponse,
  calculateCycleDay,
  isWeekendDinner,
  normalizeText,
  fuzzyMatch,
} from './utils';
export type { ToolStreamEventExtended } from './utils';

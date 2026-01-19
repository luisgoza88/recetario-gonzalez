/**
 * Rich Message Types for AI Assistant
 * Supports text, cards, lists, and interactive buttons
 */

// Base message types
export type RichMessageType = 'text' | 'card' | 'list' | 'recipe_card' | 'inventory_alert' | 'task_summary';

// Action that can be triggered from a button
export interface MessageAction {
  id: string;
  label: string;
  action: string; // Action identifier (e.g., 'add_to_cart:leche', 'show_recipe:carbonara')
  variant?: 'primary' | 'secondary' | 'danger';
  icon?: string; // Lucide icon name
}

// Base rich message structure
export interface RichMessage {
  type: RichMessageType;
  content: string;
}

// Text message (standard)
export interface TextMessage extends RichMessage {
  type: 'text';
}

// Card message for recipes, items, etc.
export interface CardMessage extends RichMessage {
  type: 'card';
  title: string;
  subtitle?: string;
  image?: string;
  badges?: Array<{ label: string; color: string }>;
  details?: Array<{ label: string; value: string }>;
  actions?: MessageAction[];
}

// Recipe card with specific fields
export interface RecipeCardMessage extends RichMessage {
  type: 'recipe_card';
  recipe: {
    name: string;
    prepTime: number;
    category: string;
    portions: number;
    ingredientCount: number;
    availableCount: number;
    coveragePercent: number;
  };
  actions?: MessageAction[];
}

// List message for shopping lists, inventory, etc.
export interface ListMessage extends RichMessage {
  type: 'list';
  title: string;
  items: Array<{
    text: string;
    status?: 'available' | 'missing' | 'low' | 'normal';
    icon?: string;
  }>;
  actions?: MessageAction[];
}

// Inventory alert message
export interface InventoryAlertMessage extends RichMessage {
  type: 'inventory_alert';
  alerts: {
    critical: string[];
    low: string[];
  };
  actions?: MessageAction[];
}

// Task summary message
export interface TaskSummaryMessage extends RichMessage {
  type: 'task_summary';
  summary: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  };
  actions?: MessageAction[];
}

// Union type for all message types
export type AIRichMessage =
  | TextMessage
  | CardMessage
  | RecipeCardMessage
  | ListMessage
  | InventoryAlertMessage
  | TaskSummaryMessage;

// Message with potential rich content
export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  richContent?: AIRichMessage;
  timestamp: Date;
  isLoading?: boolean;
}

// Helper to check if content contains rich data
export function hasRichContent(content: string): boolean {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' && 'type' in parsed;
  } catch {
    return false;
  }
}

// Helper to parse rich content from string
export function parseRichContent(content: string): AIRichMessage | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === 'object' && 'type' in parsed) {
      return parsed as AIRichMessage;
    }
    return null;
  } catch {
    return null;
  }
}

// Action handlers registry type
export type ActionHandler = (action: string, params?: string) => void | Promise<void>;

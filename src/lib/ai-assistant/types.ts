/**
 * AI Assistant Types
 *
 * Tipos compartidos para el módulo de asistente de IA.
 * Extraídos de route.ts para mejor organización.
 */

import { AIProposedAction, AIRiskLevel } from "@/types";

// Types for messages with images
export interface MessageWithImage {
  role: string;
  content: string;
  image?: string; // Base64 image data
}

// Types for AI Command Center integration
export interface ExecutionContext {
  householdId: string;
  userId?: string;
  sessionId: string;
}

export interface ExecutionResult {
  result: unknown;
  auditLogId?: string;
  canUndo: boolean;
  riskLevel: AIRiskLevel;
}

export interface ProposalResponse {
  type: "proposal";
  proposalId: string;
  summary: string;
  actions: AIProposedAction[];
  riskLevel: AIRiskLevel;
  expiresAt: string;
}

// Recipe types
export interface RecipeIngredient {
  name: string;
  luis: string;
  mariana: string;
  total?: string;
  amount?: string;
}

// Inventory types
export interface InventoryUpdate {
  item_name: string;
  quantity: number;
  action?: "set" | "add" | "subtract";
}

// Receipt scanning types
export interface ReceiptItem {
  name: string;
  quantity: number;
  unit?: string;
}

// Multi-step task result
export interface MultiStepResult {
  task_type: string;
  steps_completed: string[];
  results: Record<string, unknown>;
  summary: string;
  next_suggestions?: string[];
  use_general_knowledge?: boolean;
  instruction?: string;
}

// Tool stream event for SSE
export interface ToolStreamEvent {
  type: "tool_start" | "tool_end" | "content" | "done" | "error";
  name?: string;
  description?: string;
  result?: unknown;
  content?: string;
  error?: string;
  done?: boolean;
}

// Function call result from Gemini
export interface FunctionCallResult {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

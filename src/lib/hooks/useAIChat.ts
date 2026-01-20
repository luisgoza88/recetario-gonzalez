'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  saveMessage,
  loadConversationHistory,
  clearConversationHistory,
  getAIContext,
  updateContextFromMessage,
  resetSession,
  type ConversationMessage
} from '@/lib/ai-memory';
import type { AIProposedAction, AIRiskLevel } from '@/types';

// Types for messages
export interface MessageAction {
  id: string;
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  actions?: MessageAction[];
  image?: string;
}

// Response types for proposal handling
export interface AIProposalResponse {
  type: 'proposal';
  proposalId: string;
  summary: string;
  actions: AIProposedAction[];
  riskLevel: AIRiskLevel;
  expiresAt: string;
}

export interface AIExecutionMetadata {
  actionsExecuted: number;
  undoAvailable: boolean;
  undoableActions: Array<{
    functionName: string;
    auditLogId?: string;
  }>;
}

// Tool streaming types
export interface ActiveTool {
  name: string;
  description?: string;
  status: 'running' | 'completed' | 'failed';
  result?: {
    success: boolean;
    summary?: string;
  };
}

export interface ToolStreamEvent {
  type: 'tool_start' | 'tool_result' | 'content' | 'done';
  tool?: {
    name: string;
    description?: string;
    args?: Record<string, unknown>;
  };
  result?: {
    success: boolean;
    summary?: string;
  };
  content?: string;
  done?: boolean;
  sessionId?: string;
  executionMetadata?: AIExecutionMetadata;
}

interface UseAIChatOptions {
  maxHistoryMessages?: number;
  onSpeakResponse?: (text: string) => void;
  householdId?: string;
  userId?: string;
  onProposal?: (proposal: AIProposalResponse) => void;
  onExecutionMetadata?: (metadata: AIExecutionMetadata) => void;
  onToolEvent?: (tool: ActiveTool) => void;
}

// Helper para detectar si el mensaje es una acción (write) o consulta (read)
function isActionMessage(content: string): boolean {
  const actionPatterns = [
    // Acciones de escritura
    /\b(agrega|agregar|añade|añadir)\b/i,
    /\b(crea|crear|nuevo|nueva)\b/i,
    /\b(elimina|eliminar|borra|borrar|quita|quitar)\b/i,
    /\b(cambia|cambiar|modifica|modificar|actualiza|actualizar)\b/i,
    /\b(marca|marcar|desmarca|desmarcar)\b/i,
    /\b(mueve|mover|reprograma|reprogramar)\b/i,
    /\b(registra|registrar)\b/i,
    /\b(asigna|asignar)\b/i,
    /\b(completa|completar)\b/i,
    // Comandos directos
    /\b(pon|poner)\s+(en|a)\b/i,
    /\b(quiero|necesito)\s+(agregar|crear|cambiar)\b/i,
    // Acciones con "la lista de compras"
    /agreg[ao]\s+.+\s+a\s+(la\s+)?lista/i,
    /quita\s+.+\s+de\s+(la\s+)?lista/i,
  ];

  for (const pattern of actionPatterns) {
    if (pattern.test(content)) {
      return true;
    }
  }
  return false;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const {
    maxHistoryMessages = 20,
    onSpeakResponse,
    householdId,
    userId,
    onProposal,
    onExecutionMetadata,
    onToolEvent,
  } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);
  const [activeTools, setActiveTools] = useState<ActiveTool[]>([]);

  const generateId = () => crypto.randomUUID();

  // Load conversation history on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await loadConversationHistory(maxHistoryMessages);
        if (history.length > 0) {
          const loadedMessages: Message[] = history.map((msg: ConversationMessage) => ({
            id: msg.id,
            role: msg.role,
            content: msg.content,
            timestamp: new Date(msg.created_at),
          }));
          setMessages(loadedMessages);
          setShowWelcome(false);
        }
      } catch (error) {
        console.error('Error loading conversation history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, [maxHistoryMessages]);

  const sendMessage = useCallback(async (content: string, image?: string | null) => {
    if ((!content.trim() && !image) || isLoading) return;

    setShowWelcome(false);

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim() || (image ? '📷 Imagen enviada' : ''),
      timestamp: new Date(),
      image: image || undefined,
    };

    const loadingMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    // Save user message to database
    saveMessage('user', userMessage.content).catch(console.error);
    updateContextFromMessage(userMessage.content, 'user').catch(console.error);

    try {
      const historyMessages = [...messages]
        .filter(m => !m.isLoading)
        .slice(-9)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const currentMessage = {
        role: userMessage.role,
        content: userMessage.content,
        image: image || undefined
      };

      const history = [...historyMessages, currentMessage];
      const conversationContext = await getAIContext();

      // Determinar qué endpoint usar basado en si es consulta o acción
      const isAction = isActionMessage(userMessage.content);
      const endpoint = isAction ? '/api/ai-assistant' : '/api/ai-assistant/chat';

      console.log(`[useAIChat] Using ${isAction ? 'action' : 'query'} endpoint for: "${userMessage.content.substring(0, 50)}..."`);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          conversationContext,
          stream: true,
          // Solo enviar householdId/userId para acciones (endpoint principal)
          ...(isAction && { householdId, userId }),
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';
        const toolsInProgress: Map<string, ActiveTool> = new Map();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6)) as ToolStreamEvent;

                  // Handle different event types
                  switch (data.type) {
                    case 'tool_start':
                      if (data.tool) {
                        const activeTool: ActiveTool = {
                          name: data.tool.name,
                          description: data.tool.description,
                          status: 'running',
                        };
                        toolsInProgress.set(data.tool.name, activeTool);
                        setActiveTools(Array.from(toolsInProgress.values()));
                        onToolEvent?.(activeTool);
                      }
                      break;

                    case 'tool_result':
                      if (data.tool) {
                        const existingTool = toolsInProgress.get(data.tool.name);
                        if (existingTool) {
                          const completedTool: ActiveTool = {
                            ...existingTool,
                            status: data.result?.success ? 'completed' : 'failed',
                            result: data.result,
                          };
                          toolsInProgress.set(data.tool.name, completedTool);
                          setActiveTools(Array.from(toolsInProgress.values()));
                          onToolEvent?.(completedTool);
                        }
                      }
                      break;

                    case 'content':
                      if (data.content && !data.done) {
                        fullContent += data.content;
                        setMessages(prev =>
                          prev.map(m =>
                            m.isLoading
                              ? { ...m, content: fullContent, isLoading: true }
                              : m
                          )
                        );
                      }
                      break;

                    case 'done':
                      // Handle execution metadata
                      if (data.executionMetadata) {
                        onExecutionMetadata?.(data.executionMetadata);
                      }
                      // Clear active tools
                      setActiveTools([]);
                      break;

                    default:
                      // Legacy format support (content/done without type)
                      if (data.content && !data.done) {
                        fullContent += data.content;
                        setMessages(prev =>
                          prev.map(m =>
                            m.isLoading
                              ? { ...m, content: fullContent, isLoading: true }
                              : m
                          )
                        );
                      }
                  }
                } catch {
                  // Ignore invalid JSON lines
                }
              }
            }
          }
        }

        const assistantContent = fullContent || 'No pude procesar tu solicitud.';

        saveMessage('assistant', assistantContent).catch(console.error);
        updateContextFromMessage(assistantContent, 'assistant').catch(console.error);

        onSpeakResponse?.(assistantContent);

        setMessages(prev =>
          prev.map(m =>
            m.isLoading
              ? {
                  id: m.id,
                  role: 'assistant',
                  content: assistantContent,
                  timestamp: new Date(),
                }
              : m
          )
        );
      } else {
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        // Check if this is a proposal response
        if (data.proposal && data.proposal.type === 'proposal') {
          onProposal?.(data.proposal);

          // Show a message indicating a proposal was created
          const proposalMessage = `He preparado una propuesta con ${data.proposal.actions?.length || 0} acción(es): "${data.proposal.summary}". Por favor, revísala y apruébala si estás de acuerdo.`;

          saveMessage('assistant', proposalMessage).catch(console.error);

          setMessages(prev =>
            prev.map(m =>
              m.isLoading
                ? {
                    id: m.id,
                    role: 'assistant',
                    content: proposalMessage,
                    timestamp: new Date(),
                  }
                : m
            )
          );
        } else {
          const assistantContent = data.content || 'No pude procesar tu solicitud.';

          // Check for execution metadata (undo actions)
          if (data.executionMetadata) {
            onExecutionMetadata?.(data.executionMetadata);
          }

          saveMessage('assistant', assistantContent).catch(console.error);
          updateContextFromMessage(assistantContent, 'assistant').catch(console.error);

          onSpeakResponse?.(assistantContent);

          setMessages(prev =>
            prev.map(m =>
              m.isLoading
                ? {
                    id: m.id,
                    role: 'assistant',
                    content: assistantContent,
                    timestamp: new Date(),
                  }
                : m
            )
          );
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev =>
        prev.map(m =>
          m.isLoading
            ? {
                id: m.id,
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
                timestamp: new Date(),
              }
            : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, messages, onSpeakResponse]);

  const clearChat = useCallback(async () => {
    setMessages([]);
    setShowWelcome(true);
    await clearConversationHistory();
    resetSession();
  }, []);

  return {
    messages,
    isLoading,
    isLoadingHistory,
    showWelcome,
    activeTools,
    sendMessage,
    clearChat,
    setShowWelcome,
  };
}

// Parse message content for action buttons
export function parseMessageContent(content: string): { text: string; actions: MessageAction[] } {
  const actions: MessageAction[] = [];

  if (content.includes('¿Quieres que') || content.includes('¿Los agrego')) {
    actions.push({
      id: 'confirm-yes',
      label: 'Sí, agregar',
      action: 'confirm:yes',
      variant: 'primary'
    });
    actions.push({
      id: 'confirm-no',
      label: 'No, gracias',
      action: 'confirm:no',
      variant: 'secondary'
    });
  }

  const recipeMatch = content.match(/(?:preparar|cocinar|receta[s]?[:]?\s*)[""]?([^"".\n]+)[""]?/i);
  if (recipeMatch) {
    actions.push({
      id: 'view-recipe',
      label: 'Ver receta completa',
      action: `view_recipe:${recipeMatch[1].trim()}`,
      variant: 'secondary'
    });
  }

  if (content.includes('bajo') && content.includes('inventario')) {
    actions.push({
      id: 'add-to-list',
      label: 'Agregar todos a lista',
      action: 'add_low_to_shopping',
      variant: 'primary'
    });
  }

  if (content.includes('faltan') || content.includes('faltantes')) {
    actions.push({
      id: 'add-missing',
      label: 'Agregar faltantes a compras',
      action: 'add_missing_to_shopping',
      variant: 'primary'
    });
  }

  return { text: content, actions };
}

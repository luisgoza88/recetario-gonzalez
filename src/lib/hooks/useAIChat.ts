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

interface UseAIChatOptions {
  maxHistoryMessages?: number;
  onSpeakResponse?: (text: string) => void;
}

export function useAIChat(options: UseAIChatOptions = {}) {
  const { maxHistoryMessages = 20, onSpeakResponse } = options;

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showWelcome, setShowWelcome] = useState(true);

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

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          conversationContext,
          stream: true
        }),
      });

      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
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

        const assistantContent = data.content || 'No pude procesar tu solicitud.';

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

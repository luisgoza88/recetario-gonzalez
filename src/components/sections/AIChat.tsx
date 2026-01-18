'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2, Mic, MicOff,
  Calendar, ShoppingCart, Home, UtensilsCrossed,
  CheckCircle2, ListTodo, ChefHat, RefreshCw
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'menu-today',
    label: 'Menu de la semana',
    icon: <Calendar size={16} />,
    prompt: '¿Cuál es el menú para esta semana?',
    color: 'bg-green-50 text-green-700 hover:bg-green-100'
  },
  {
    id: 'suggest-recipe',
    label: 'Sugerir receta',
    icon: <ChefHat size={16} />,
    prompt: 'Sugiere una receta con los ingredientes que tengo disponibles',
    color: 'bg-orange-50 text-orange-700 hover:bg-orange-100'
  },
  {
    id: 'tasks-status',
    label: 'Estado tareas',
    icon: <Home size={16} />,
    prompt: '¿Cómo va el progreso de las tareas de hoy?',
    color: 'bg-blue-50 text-blue-700 hover:bg-blue-100'
  },
  {
    id: 'shopping-list',
    label: 'Lista de compras',
    icon: <ShoppingCart size={16} />,
    prompt: '¿Qué necesito comprar?',
    color: 'bg-purple-50 text-purple-700 hover:bg-purple-100'
  },
];

const SUGGESTION_CHIPS = [
  '¿Qué hay para almorzar hoy?',
  '¿Qué tareas tiene Yolima hoy?',
  'Agrega leche a la lista de compras',
  '¿Qué ingredientes tengo disponibles?',
  'Marca la tarea de barrer como completada',
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const generateId = () => crypto.randomUUID();

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setShowWelcome(false);
    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    // Agregar mensaje del usuario y placeholder de loading
    const loadingMessage: Message = {
      id: generateId(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages(prev => [...prev, userMessage, loadingMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Preparar historial para la API (últimos 10 mensajes)
      const history = [...messages, userMessage]
        .filter(m => !m.isLoading)
        .slice(-10)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Reemplazar mensaje de loading con respuesta real
      setMessages(prev =>
        prev.map(m =>
          m.isLoading
            ? {
                id: m.id,
                role: 'assistant',
                content: data.content || 'No pude procesar tu solicitud.',
                timestamp: new Date(),
              }
            : m
        )
      );
    } catch (error) {
      console.error('Error sending message:', error);
      // Reemplazar loading con mensaje de error
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
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setShowWelcome(true);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={24} />
            </div>
            <div>
              <h1 className="font-semibold">Asistente IA</h1>
              <p className="text-sm text-purple-200">Tu ayudante para el hogar</p>
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Nueva conversación"
            >
              <RefreshCw size={20} />
            </button>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 bg-white border-b flex-shrink-0 overflow-x-auto">
        <div className="flex gap-2">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${action.color} disabled:opacity-50`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto">
        {showWelcome && messages.length === 0 ? (
          // Welcome Screen
          <div className="p-6 flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
              <Sparkles size={40} className="text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              ¿En qué puedo ayudarte?
            </h2>
            <p className="text-gray-500 text-center mb-6 max-w-xs">
              Puedo consultar el menú, sugerir recetas, gestionar tareas del hogar y mucho más.
            </p>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-sm">
              {SUGGESTION_CHIPS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-2 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Capabilities */}
            <div className="mt-8 grid grid-cols-2 gap-3 w-full max-w-xs">
              <div className="bg-white p-3 rounded-xl border text-center">
                <UtensilsCrossed size={24} className="mx-auto mb-1 text-green-600" />
                <p className="text-xs text-gray-600">Recetas y Menú</p>
              </div>
              <div className="bg-white p-3 rounded-xl border text-center">
                <ShoppingCart size={24} className="mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-gray-600">Lista de Compras</p>
              </div>
              <div className="bg-white p-3 rounded-xl border text-center">
                <ListTodo size={24} className="mx-auto mb-1 text-blue-600" />
                <p className="text-xs text-gray-600">Tareas del Hogar</p>
              </div>
              <div className="bg-white p-3 rounded-xl border text-center">
                <CheckCircle2 size={24} className="mx-auto mb-1 text-amber-600" />
                <p className="text-xs text-gray-600">Progreso Diario</p>
              </div>
            </div>
          </div>
        ) : (
          // Messages List
          <div className="p-4 space-y-4">
            {messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                {/* Avatar */}
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
                  ${message.role === 'user' ? 'bg-green-100' : 'bg-purple-100'}
                `}>
                  {message.role === 'user'
                    ? <User size={18} className="text-green-600" />
                    : <Sparkles size={18} className="text-purple-600" />
                  }
                </div>

                {/* Message Bubble */}
                <div className={`
                  max-w-[80%] p-3 rounded-2xl
                  ${message.role === 'user'
                    ? 'bg-green-600 text-white rounded-br-md'
                    : 'bg-white shadow-sm border rounded-bl-md'
                  }
                `}>
                  {message.isLoading ? (
                    <div className="flex items-center gap-2 text-purple-600">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Pensando...</span>
                    </div>
                  ) : (
                    <>
                      <p className="text-sm whitespace-pre-line">{message.content}</p>
                      <p className={`text-xs mt-1 ${
                        message.role === 'user' ? 'text-green-200' : 'text-gray-400'
                      }`}>
                        {formatTime(message.timestamp)}
                      </p>
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t flex-shrink-0">
        <div className="flex gap-2 items-center">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu pregunta..."
            disabled={isLoading}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all
              ${input.trim() && !isLoading
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400'
              }
            `}
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

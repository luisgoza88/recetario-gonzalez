'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2,
  UtensilsCrossed, Home, Calendar, ShoppingCart
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'menu-week',
    label: 'Menu de la semana',
    icon: <Calendar size={16} />,
    prompt: '¿Cuál es el menú para esta semana?'
  },
  {
    id: 'suggest-recipe',
    label: 'Sugerir receta',
    icon: <UtensilsCrossed size={16} />,
    prompt: 'Sugiere una receta con los ingredientes que tengo disponibles'
  },
  {
    id: 'cleaning-status',
    label: 'Estado limpieza',
    icon: <Home size={16} />,
    prompt: '¿Cómo vamos con las tareas de limpieza esta semana?'
  },
  {
    id: 'shopping-list',
    label: 'Lista de compras',
    icon: <ShoppingCart size={16} />,
    prompt: '¿Qué necesito comprar esta semana?'
  },
];

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente para la gestión del hogar y recetas. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateId = () => crypto.randomUUID();

  const sendMessage = async (content: string) => {
    if (!content.trim() || loading) return;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simular respuesta de IA (en producción conectar con API)
    setTimeout(() => {
      const responses: Record<string, string> = {
        'menu': 'Esta semana tienes programado:\n\n• Lunes: Huevos revueltos / Pollo al horno\n• Martes: Arepa con queso / Arroz con carne\n• Miércoles: Pancakes / Pasta boloñesa\n\n¿Necesitas más detalles de algún día?',
        'receta': 'Con los ingredientes que tienes disponibles, te sugiero preparar un **Arroz con pollo**. Tienes pollo, arroz, vegetales y las especias necesarias. ¿Quieres que te dé los pasos?',
        'limpieza': 'Esta semana van completadas 8 de 12 tareas de limpieza (67%). Las áreas pendientes son:\n\n• Limpiar ventanas (sala)\n• Organizar closet principal\n• Lavar cortinas\n\n¿Quieres que las programe?',
        'compras': 'Para esta semana necesitas:\n\n🥛 Leche (2 litros)\n🥚 Huevos (30 unidades)\n🍞 Pan (2 paquetes)\n🧅 Cebolla (1 kg)\n\n¿Quieres agregar algo más a la lista?',
      };

      let response = 'Entiendo tu consulta. Déjame ayudarte con eso. ¿Podrías darme más detalles sobre lo que necesitas?';

      const lowerContent = content.toLowerCase();
      if (lowerContent.includes('menú') || lowerContent.includes('menu') || lowerContent.includes('semana')) {
        response = responses['menu'];
      } else if (lowerContent.includes('receta') || lowerContent.includes('sugiere') || lowerContent.includes('ingredientes')) {
        response = responses['receta'];
      } else if (lowerContent.includes('limpieza') || lowerContent.includes('tareas') || lowerContent.includes('hogar')) {
        response = responses['limpieza'];
      } else if (lowerContent.includes('compra') || lowerContent.includes('lista') || lowerContent.includes('mercado')) {
        response = responses['compras'];
      }

      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      setLoading(false);
    }, 1500);
  };

  const handleQuickAction = (action: QuickAction) => {
    sendMessage(action.prompt);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={24} />
          </div>
          <div>
            <h1 className="font-semibold">Asistente IA</h1>
            <p className="text-sm text-purple-200">Tu ayudante para el hogar</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="p-3 bg-white border-b overflow-x-auto">
        <div className="flex gap-2">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-full text-sm font-medium whitespace-nowrap hover:bg-purple-100 transition-colors"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(message => (
          <div
            key={message.id}
            className={`flex gap-3 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div className={`
              w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${message.role === 'user' ? 'bg-green-100' : 'bg-purple-100'}
            `}>
              {message.role === 'user'
                ? <User size={18} className="text-green-600" />
                : <Sparkles size={18} className="text-purple-600" />
              }
            </div>
            <div className={`
              max-w-[80%] p-3 rounded-2xl
              ${message.role === 'user'
                ? 'bg-green-600 text-white rounded-br-md'
                : 'bg-white shadow-sm rounded-bl-md'
              }
            `}>
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              <p className={`text-xs mt-1 ${message.role === 'user' ? 'text-green-200' : 'text-gray-400'}`}>
                {message.timestamp.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
              <Sparkles size={18} className="text-purple-600" />
            </div>
            <div className="bg-white shadow-sm rounded-2xl rounded-bl-md p-3">
              <div className="flex items-center gap-2 text-purple-600">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Pensando...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
            placeholder="Escribe tu pregunta..."
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center
              ${input.trim() && !loading
                ? 'bg-purple-600 text-white'
                : 'bg-gray-200 text-gray-400'
              }
              transition-colors
            `}
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

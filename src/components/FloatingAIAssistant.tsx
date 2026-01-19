'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2,
  Calendar, ShoppingCart, Home, UtensilsCrossed,
  ChefHat, RefreshCw, X, Mic, MicOff, Volume2, VolumeX,
  Camera, Image as ImageIcon, Minimize2, Maximize2,
  AlertCircle, ChevronRight
} from 'lucide-react';
import { useAIChat, parseMessageContent, type Message, type MessageAction } from '@/lib/hooks/useAIChat';
import { useVoiceInput } from '@/lib/hooks/useVoiceInput';
import { useImageInput } from '@/lib/hooks/useImageInput';
import { useProactiveAlerts } from '@/lib/hooks/useProactiveAlerts';

type ActiveSection = 'hoy' | 'recetario' | 'hogar' | 'ia' | 'ajustes';

interface FloatingAIAssistantProps {
  activeSection?: ActiveSection;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

// Contextual quick actions based on active section
const getContextualActions = (section: ActiveSection): QuickAction[] => {
  switch (section) {
    case 'hoy':
      return [
        { id: 'menu-today', label: 'Menú de hoy', icon: <Calendar size={14} />, prompt: '¿Cuál es el menú para hoy?' },
        { id: 'tasks-today', label: 'Tareas de hoy', icon: <Home size={14} />, prompt: '¿Cómo van las tareas de hoy?' },
      ];
    case 'recetario':
      return [
        { id: 'suggest-recipe', label: 'Sugerir receta', icon: <ChefHat size={14} />, prompt: 'Sugiere una receta con los ingredientes que tengo' },
        { id: 'menu-week', label: 'Menú semanal', icon: <Calendar size={14} />, prompt: '¿Cuál es el menú de esta semana?' },
        { id: 'shopping', label: 'Lista compras', icon: <ShoppingCart size={14} />, prompt: '¿Qué necesito comprar?' },
      ];
    case 'hogar':
      return [
        { id: 'tasks-status', label: 'Estado tareas', icon: <Home size={14} />, prompt: '¿Cómo va el progreso de las tareas?' },
        { id: 'employee-summary', label: 'Resumen empleados', icon: <User size={14} />, prompt: 'Dame un resumen de las tareas de cada empleado' },
      ];
    default:
      return [
        { id: 'help', label: '¿Qué puedo hacer?', icon: <Sparkles size={14} />, prompt: '¿Qué puedes hacer por mí?' },
      ];
  }
};

// Format message with markdown-like styling
function FormattedMessage({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="text-sm space-y-1">
      {lines.map((line, i) => {
        let formatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        if (line.match(/^[✅❌⚠️📝💡🍽️⏱️🧊📊]/)) {
          return (
            <p
              key={i}
              className="flex items-start gap-1"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }

        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <p
              key={i}
              className="pl-3 flex items-start gap-1"
              dangerouslySetInnerHTML={{ __html: '• ' + formatted.slice(2) }}
            />
          );
        }

        if (line.trim()) {
          return (
            <p
              key={i}
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }

        return <br key={i} />;
      })}
    </div>
  );
}

// Action Button Component
function ActionButton({ action, onAction, disabled }: { action: MessageAction; onAction: (action: string) => void; disabled?: boolean }) {
  const variants = {
    primary: 'bg-purple-600 text-white hover:bg-purple-700',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
    danger: 'bg-red-100 text-red-700 hover:bg-red-200',
  };

  return (
    <button
      onClick={() => onAction(action.action)}
      disabled={disabled}
      className={`
        px-2 py-1 rounded-lg text-xs font-medium transition-colors
        flex items-center gap-1 disabled:opacity-50
        ${variants[action.variant || 'secondary']}
      `}
    >
      {action.label}
      <ChevronRight size={12} />
    </button>
  );
}

export default function FloatingAIAssistant({ activeSection = 'hoy' }: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Custom hooks
  const voice = useVoiceInput({
    onFinalTranscript: (transcript) => {
      setInput(transcript);
      // Auto-send after voice input
      setTimeout(() => {
        if (transcript.trim()) {
          handleSend(transcript);
        }
      }, 300);
    }
  });

  const image = useImageInput();

  const chat = useAIChat({
    onSpeakResponse: voice.speakText
  });

  const alertsHook = useProactiveAlerts();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async (content?: string) => {
    const messageContent = content || input;
    if ((!messageContent.trim() && !image.selectedImage) || chat.isLoading) return;

    await chat.sendMessage(messageContent, image.selectedImage);
    setInput('');
    image.clearImage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickAction = (action: QuickAction) => {
    chat.sendMessage(action.prompt);
  };

  const handleAction = async (action: string) => {
    const [actionType, ...params] = action.split(':');
    const param = params.join(':');

    switch (actionType) {
      case 'confirm':
        if (param === 'yes') {
          chat.sendMessage('Sí, agrégalo');
        }
        break;
      case 'view_recipe':
        chat.sendMessage(`Muéstrame los detalles de la receta ${param}`);
        break;
      case 'add_low_to_shopping':
        chat.sendMessage('Agrega todos los ingredientes bajos a la lista de compras');
        break;
      case 'add_missing_to_shopping':
        chat.sendMessage('Agrega los ingredientes faltantes a la lista de compras');
        break;
      default:
        console.log('Unknown action:', action);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  const quickActions = getContextualActions(activeSection);

  // Floating button (closed state)
  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[100] w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
      >
        <Bot size={24} />
        {alertsHook.alertCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {alertsHook.alertCount > 9 ? '9+' : alertsHook.alertCount}
          </span>
        )}
      </button>
    );
  }

  // Chat panel (open state)
  return (
    <div
      className={`fixed z-[100] bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-300 ${
        isExpanded
          ? 'inset-4 sm:inset-8'
          : 'bottom-24 right-4 w-[calc(100%-2rem)] max-w-sm h-[70vh] max-h-[500px]'
      }`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Bot size={18} />
          </div>
          <div>
            <h3 className="font-medium text-sm">Asistente IA</h3>
            <p className="text-xs text-purple-200">
              {activeSection === 'recetario' ? 'Recetas y menú' :
               activeSection === 'hogar' ? 'Tareas del hogar' :
               'Tu ayudante'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* Alerts Button */}
          {alertsHook.alertCount > 0 && (
            <button
              onClick={alertsHook.toggleAlerts}
              className="relative p-1.5 hover:bg-white/20 rounded-lg transition-colors"
            >
              <AlertCircle size={18} />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                {alertsHook.alertCount}
              </span>
            </button>
          )}
          {chat.messages.length > 0 && (
            <button
              onClick={chat.clearChat}
              className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
              title="Nueva conversación"
            >
              <RefreshCw size={16} />
            </button>
          )}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex-shrink-0 bg-gray-50 border-b p-2">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={chat.isLoading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border rounded-full text-xs font-medium whitespace-nowrap hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors disabled:opacity-50"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 p-3">
        {chat.isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-purple-500" />
          </div>
        ) : chat.showWelcome && chat.messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-3">
              <Sparkles size={24} className="text-white" />
            </div>
            <h4 className="font-medium text-gray-800 mb-1">¿En qué puedo ayudarte?</h4>
            <p className="text-xs text-gray-500">
              Pregúntame sobre recetas, menú, tareas o compras
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {chat.messages.map(message => (
              <div
                key={message.id}
                className={`flex gap-2 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
                  ${message.role === 'user' ? 'bg-green-100' : 'bg-purple-100'}
                `}>
                  {message.role === 'user'
                    ? <User size={14} className="text-green-600" />
                    : <Sparkles size={14} className="text-purple-600" />
                  }
                </div>

                <div className={`
                  max-w-[85%] rounded-xl text-sm
                  ${message.role === 'user'
                    ? 'bg-green-600 text-white rounded-br-sm p-2.5'
                    : 'bg-white shadow-sm border rounded-bl-sm'
                  }
                `}>
                  {message.isLoading && !message.content ? (
                    <div className="flex items-center gap-1.5 text-purple-600 p-2.5">
                      <Loader2 size={14} className="animate-spin" />
                      <span className="text-xs">Pensando...</span>
                    </div>
                  ) : message.isLoading && message.content ? (
                    <div className="p-2.5">
                      <FormattedMessage content={message.content} />
                      <div className="flex items-center gap-0.5 mt-1.5 text-purple-400">
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  ) : message.role === 'user' ? (
                    <>
                      {message.image && (
                        <div className="mb-2 -mx-2.5 -mt-2.5">
                          <img
                            src={message.image}
                            alt="Imagen enviada"
                            className="w-full max-h-32 object-cover rounded-t-xl"
                          />
                        </div>
                      )}
                      {message.content && message.content !== '📷 Imagen enviada' && (
                        <p className="text-xs whitespace-pre-line">{message.content}</p>
                      )}
                    </>
                  ) : (
                    (() => {
                      const { text, actions } = parseMessageContent(message.content);
                      return (
                        <div className="p-2.5">
                          <FormattedMessage content={text} />
                          {actions.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-gray-100">
                              {actions.map(action => (
                                <ActionButton
                                  key={action.id}
                                  action={action}
                                  onAction={handleAction}
                                  disabled={chat.isLoading}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Voice Listening Indicator */}
      {voice.isListening && (
        <div className="px-3 py-1.5 bg-purple-50 border-t flex items-center gap-2">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-purple-700 flex-1">
            {voice.interimTranscript || 'Escuchando...'}
          </span>
          <button
            onClick={voice.stopListening}
            className="text-xs text-purple-600 hover:text-purple-800"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Image Preview */}
      {image.selectedImage && (
        <div className="px-3 py-2 bg-gray-50 border-t">
          <div className="relative inline-block">
            <img
              src={image.selectedImage}
              alt="Preview"
              className="h-14 w-auto rounded-lg object-cover"
            />
            <button
              onClick={image.removeSelectedImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
            >
              <X size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={image.imageInputRef}
        type="file"
        accept="image/*"
        onChange={image.handleImageSelect}
        className="hidden"
      />
      <input
        ref={image.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={image.handleImageSelect}
        className="hidden"
      />

      {/* Image Options Popup */}
      {image.showImageOptions && (
        <div className="absolute bottom-20 left-3 bg-white rounded-xl shadow-xl border p-1 z-50">
          <button
            onClick={image.openCamera}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg w-full"
          >
            <Camera size={16} className="text-purple-600" />
            <span className="text-xs font-medium">Tomar foto</span>
          </button>
          <button
            onClick={image.openGallery}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg w-full"
          >
            <ImageIcon size={16} className="text-purple-600" />
            <span className="text-xs font-medium">Galería</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-2 bg-white border-t flex-shrink-0">
        <div className="flex gap-1.5 items-center">
          {/* Image Button */}
          <button
            onClick={image.toggleImageOptions}
            disabled={chat.isLoading || voice.isListening}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              image.selectedImage
                ? 'bg-purple-100 text-purple-600'
                : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600'
            }`}
          >
            <Camera size={16} />
          </button>

          {/* TTS Toggle */}
          {voice.ttsSupported && (
            <button
              onClick={voice.toggleTTS}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                voice.ttsEnabled
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              {voice.ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={voice.isListening ? voice.interimTranscript : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={image.selectedImage ? 'Describe...' : (voice.isListening ? 'Escuchando...' : 'Escribe...')}
            disabled={chat.isLoading || voice.isListening}
            className="flex-1 px-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />

          {/* Voice Button */}
          {voice.voiceSupported && (
            <button
              onClick={voice.toggleListening}
              disabled={chat.isLoading}
              className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all
                ${voice.isListening
                  ? 'bg-red-500 text-white animate-pulse'
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                }
              `}
            >
              {voice.isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={() => handleSend()}
            disabled={(!input.trim() && !image.selectedImage) || chat.isLoading || voice.isListening}
            className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-all
              ${(input.trim() || image.selectedImage) && !chat.isLoading && !voice.isListening
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                : 'bg-gray-200 text-gray-400'
              }
            `}
          >
            {chat.isLoading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

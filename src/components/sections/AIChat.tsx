'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Bot, User, Sparkles, Loader2,
  Calendar, ShoppingCart, Home, UtensilsCrossed,
  CheckCircle2, ListTodo, ChefHat, RefreshCw,
  Clock, AlertTriangle, ChevronRight,
  AlertCircle, TrendingUp, Mic, MicOff, Volume2, VolumeX,
  Camera, Image as ImageIcon, X
} from 'lucide-react';
import {
  saveMessage,
  loadConversationHistory,
  clearConversationHistory,
  getAIContext,
  updateContextFromMessage,
  resetSession,
  type ConversationMessage
} from '@/lib/ai-memory';
import {
  generateProactiveAlerts,
  getActiveAlerts,
  dismissAlert,
  requestNotificationPermission,
  type ProactiveAlert
} from '@/lib/ai-notifications';
import {
  getVoiceManager,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  speak,
  stopSpeaking,
  formatForSpeech,
  type VoiceManager
} from '@/lib/voice-commands';

// Types for rich messages
interface MessageAction {
  id: string;
  label: string;
  action: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isLoading?: boolean;
  actions?: MessageAction[];
  image?: string; // Base64 image for display
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
  '¿Qué ingredientes me faltan para hoy?',
  'Dame el reporte semanal',
  '¿Qué ingredientes tengo bajos?',
  'Consejos de preparación para hoy',
];

// Action Button Component
interface ActionButtonProps {
  action: MessageAction;
  onAction: (action: string) => void;
  disabled?: boolean;
}

function ActionButton({ action, onAction, disabled }: ActionButtonProps) {
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
        px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
        flex items-center gap-1.5 disabled:opacity-50
        ${variants[action.variant || 'secondary']}
      `}
    >
      {action.label}
      <ChevronRight size={14} />
    </button>
  );
}

// Parse message content for special formatting
function parseMessageContent(content: string): { text: string; actions: MessageAction[] } {
  const actions: MessageAction[] = [];

  // Detect patterns for suggested actions
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

  // Detect recipe mentions for "ver receta" action
  const recipeMatch = content.match(/(?:preparar|cocinar|receta[s]?[:]?\s*)[""]?([^"".\n]+)[""]?/i);
  if (recipeMatch) {
    actions.push({
      id: 'view-recipe',
      label: 'Ver receta completa',
      action: `view_recipe:${recipeMatch[1].trim()}`,
      variant: 'secondary'
    });
  }

  // Detect low inventory alerts
  if (content.includes('bajo') && content.includes('inventario')) {
    actions.push({
      id: 'add-to-list',
      label: 'Agregar todos a lista',
      action: 'add_low_to_shopping',
      variant: 'primary'
    });
  }

  // Detect missing ingredients
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

// Format message with markdown-like styling
function FormattedMessage({ content }: { content: string }) {
  // Split by lines and format
  const lines = content.split('\n');

  return (
    <div className="text-sm space-y-1">
      {lines.map((line, i) => {
        // Bold text **text**
        let formatted = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // Emoji indicators at start
        if (line.match(/^[✅❌⚠️📝💡🍽️⏱️🧊📊]/)) {
          return (
            <p
              key={i}
              className="flex items-start gap-1"
              dangerouslySetInnerHTML={{ __html: formatted }}
            />
          );
        }

        // Bullet points
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <p
              key={i}
              className="pl-3 flex items-start gap-1"
              dangerouslySetInnerHTML={{ __html: '• ' + formatted.slice(2) }}
            />
          );
        }

        // Regular line
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

export default function AIChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [alerts, setAlerts] = useState<ProactiveAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState('');
  // Image state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showImageOptions, setShowImageOptions] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const voiceManagerRef = useRef<VoiceManager | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  // Load conversation history and alerts on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await loadConversationHistory(20);
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

        // Load proactive alerts
        const activeAlerts = await generateProactiveAlerts();
        setAlerts(activeAlerts);

        // Request notification permission
        requestNotificationPermission();
      } catch (error) {
        console.error('Error loading conversation history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadHistory();
  }, []);

  // Refresh alerts periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const activeAlerts = getActiveAlerts();
      setAlerts(activeAlerts);
    }, 5 * 60 * 1000); // Every 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Initialize voice recognition
  useEffect(() => {
    const supported = isSpeechRecognitionSupported();
    setVoiceSupported(supported);

    if (supported) {
      voiceManagerRef.current = getVoiceManager();
    }

    // Check TTS support
    if (isSpeechSynthesisSupported()) {
      // Load voices (sometimes needs a delay)
      setTimeout(() => {
        window.speechSynthesis.getVoices();
      }, 100);
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const generateId = () => crypto.randomUUID();

  // Voice recognition handlers
  const startListening = () => {
    if (!voiceManagerRef.current) return;

    const started = voiceManagerRef.current.start({
      onResult: (transcript, isFinal) => {
        if (isFinal) {
          setInput(transcript);
          setInterimTranscript('');
          setIsListening(false);
          // Auto-send after brief delay
          setTimeout(() => {
            if (transcript.trim()) {
              sendMessage(transcript);
            }
          }, 500);
        } else {
          setInterimTranscript(transcript);
        }
      },
      onError: (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
        setInterimTranscript('');
      },
      onEnd: () => {
        setIsListening(false);
      }
    });

    if (started) {
      setIsListening(true);
      setInterimTranscript('');
    }
  };

  const stopListening = () => {
    voiceManagerRef.current?.stop();
    setIsListening(false);
    setInterimTranscript('');
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  // Text-to-speech for assistant responses
  const speakResponse = (text: string) => {
    if (!ttsEnabled) return;
    const cleanText = formatForSpeech(text);
    speak(cleanText).catch(console.error);
  };

  const toggleTTS = () => {
    if (ttsEnabled) {
      stopSpeaking();
    }
    setTtsEnabled(!ttsEnabled);
  };

  // Image handlers
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen es muy grande. Máximo 5MB.');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setShowImageOptions(false);
      };
      reader.readAsDataURL(file);
    }
    // Reset input
    e.target.value = '';
  };

  const removeSelectedImage = () => {
    setSelectedImage(null);
  };

  const sendMessage = async (content: string) => {
    // Allow sending if there's text OR an image
    if ((!content.trim() && !selectedImage) || isLoading) return;

    setShowWelcome(false);

    // Capture image before clearing state
    const imageToSend = selectedImage;

    const userMessage: Message = {
      id: generateId(),
      role: 'user',
      content: content.trim() || (imageToSend ? '📷 Imagen enviada' : ''),
      timestamp: new Date(),
      image: imageToSend || undefined,
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
    setSelectedImage(null); // Clear image after capturing
    setIsLoading(true);

    // Save user message to database (don't await)
    saveMessage('user', userMessage.content).catch(console.error);
    updateContextFromMessage(userMessage.content, 'user').catch(console.error);

    try {
      // Preparar historial para la API (últimos 10 mensajes)
      // Note: Images are only sent for the current message, not history
      const historyMessages = [...messages]
        .filter(m => !m.isLoading)
        .slice(-9) // -9 to leave room for current message with image
        .map(m => ({
          role: m.role,
          content: m.content
          // Don't include images from history to save bandwidth
        }));

      // Current message with image
      const currentMessage = {
        role: userMessage.role,
        content: userMessage.content,
        image: imageToSend || undefined
      };

      const history = [...historyMessages, currentMessage];

      // Get conversation context for enhanced prompt
      const conversationContext = await getAIContext();

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          conversationContext,
          stream: true  // Habilitar streaming
        }),
      });

      // Verificar si es streaming (text/event-stream) o JSON normal
      const contentType = response.headers.get('content-type') || '';

      if (contentType.includes('text/event-stream')) {
        // Procesar respuesta en streaming
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
                    // Actualizar mensaje en tiempo real
                    setMessages(prev =>
                      prev.map(m =>
                        m.isLoading
                          ? { ...m, content: fullContent, isLoading: true }
                          : m
                      )
                    );
                  }
                } catch {
                  // Ignorar líneas que no son JSON válido
                }
              }
            }
          }
        }

        // Finalizar el mensaje
        const assistantContent = fullContent || 'No pude procesar tu solicitud.';

        // Save assistant message to database (don't await)
        saveMessage('assistant', assistantContent).catch(console.error);
        updateContextFromMessage(assistantContent, 'assistant').catch(console.error);

        // Speak the response if TTS is enabled
        speakResponse(assistantContent);

        // Marcar mensaje como completado (quitar isLoading)
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
        // Fallback: respuesta JSON normal (sin streaming)
        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        const assistantContent = data.content || 'No pude procesar tu solicitud.';

        // Save assistant message to database (don't await)
        saveMessage('assistant', assistantContent).catch(console.error);
        updateContextFromMessage(assistantContent, 'assistant').catch(console.error);

        // Speak the response if TTS is enabled
        speakResponse(assistantContent);

        // Reemplazar mensaje de loading con respuesta real
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

  const clearChat = async () => {
    setMessages([]);
    setShowWelcome(true);
    // Clear history in database and reset session
    await clearConversationHistory();
    resetSession();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
  };

  // Handle action button clicks
  const handleAction = async (action: string) => {
    const [actionType, ...params] = action.split(':');
    const param = params.join(':');

    switch (actionType) {
      case 'confirm':
        if (param === 'yes') {
          // Find the last assistant message mentioning items
          const lastMsg = messages.filter(m => m.role === 'assistant').pop();
          if (lastMsg?.content.includes('Huevos')) {
            sendMessage('Sí, agrega los huevos a la lista');
          } else {
            sendMessage('Sí, agrégalo');
          }
        }
        break;

      case 'view_recipe':
        sendMessage(`Muéstrame los detalles de la receta ${param}`);
        break;

      case 'add_low_to_shopping':
        sendMessage('Agrega todos los ingredientes bajos a la lista de compras');
        break;

      case 'add_missing_to_shopping':
        sendMessage('Agrega los ingredientes faltantes a la lista de compras');
        break;

      case 'view_tasks':
        sendMessage('¿Cómo van las tareas de hoy?');
        break;

      case 'view_inventory':
        sendMessage('Muéstrame el estado del inventario');
        break;

      default:
        console.log('Unknown action:', action);
    }
  };

  // Handle alert actions
  const handleAlertAction = (alert: ProactiveAlert) => {
    if (alert.actionable) {
      handleAction(alert.actionable.action);
    }
    handleDismissAlert(alert.id);
    setShowAlerts(false);
  };

  // Dismiss alert
  const handleDismissAlert = (alertId: string) => {
    dismissAlert(alertId);
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  // Get priority color
  const getPriorityColor = (priority: ProactiveAlert['priority']) => {
    switch (priority) {
      case 'high': return 'bg-red-50 border-red-200 text-red-800';
      case 'medium': return 'bg-amber-50 border-amber-200 text-amber-800';
      case 'low': return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  // Get priority icon
  const getPriorityIcon = (type: ProactiveAlert['type']) => {
    switch (type) {
      case 'inventory_alert': return <AlertTriangle size={16} className="text-red-500" />;
      case 'meal_reminder': return <UtensilsCrossed size={16} className="text-amber-500" />;
      case 'task_reminder': return <ListTodo size={16} className="text-blue-500" />;
      case 'prep_tip': return <Clock size={16} className="text-green-500" />;
      case 'weekly_summary': return <TrendingUp size={16} className="text-purple-500" />;
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden">
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
          <div className="flex items-center gap-2">
            {/* Alerts Button */}
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2 hover:bg-white/20 rounded-lg transition-colors"
              title="Alertas"
            >
              <AlertCircle size={20} />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                  {alerts.length}
                </span>
              )}
            </button>
            {/* Clear Chat Button */}
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
      </div>

      {/* Alerts Panel */}
      {showAlerts && alerts.length > 0 && (
        <div className="absolute top-16 right-2 left-2 z-50 bg-white rounded-xl shadow-xl border max-h-80 overflow-y-auto">
          <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-white">
            <h3 className="font-semibold text-gray-800">Alertas inteligentes</h3>
            <button
              onClick={() => setShowAlerts(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="p-2 space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getPriorityColor(alert.priority)}`}
              >
                <div className="flex items-start gap-2">
                  {getPriorityIcon(alert.type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs mt-0.5 whitespace-pre-line">{alert.body}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {alert.actionable && (
                        <button
                          onClick={() => handleAlertAction(alert)}
                          className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
                        >
                          {alert.actionable.label}
                        </button>
                      )}
                      <button
                        onClick={() => handleDismissAlert(alert.id)}
                        className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700"
                      >
                        Descartar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions - Scroll horizontal */}
      <div className="flex-shrink-0 bg-white border-b">
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
          {QUICK_ACTIONS.map(action => (
            <button
              key={action.id}
              onClick={() => handleQuickAction(action)}
              disabled={isLoading}
              className={`flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex-shrink-0 ${action.color} disabled:opacity-50`}
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Cargando conversación...</span>
            </div>
          </div>
        ) : showWelcome && messages.length === 0 ? (
          // Welcome Screen - scrollable content
          <div className="p-4 flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              ¿En qué puedo ayudarte?
            </h2>
            <p className="text-gray-500 text-center mb-4 text-sm max-w-xs">
              Puedo consultar el menú, sugerir recetas, gestionar tareas del hogar y mucho más.
            </p>

            {/* Suggestion Chips */}
            <div className="flex flex-wrap justify-center gap-2 max-w-sm mb-4">
              {SUGGESTION_CHIPS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => handleSuggestionClick(suggestion)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Capabilities */}
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <UtensilsCrossed size={20} className="mx-auto mb-1 text-green-600" />
                <p className="text-xs text-gray-600">Recetas y Menú</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <ShoppingCart size={20} className="mx-auto mb-1 text-purple-600" />
                <p className="text-xs text-gray-600">Lista de Compras</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <ListTodo size={20} className="mx-auto mb-1 text-blue-600" />
                <p className="text-xs text-gray-600">Tareas del Hogar</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <CheckCircle2 size={20} className="mx-auto mb-1 text-amber-600" />
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
                  max-w-[85%] rounded-2xl
                  ${message.role === 'user'
                    ? 'bg-green-600 text-white rounded-br-md p-3'
                    : 'bg-white shadow-sm border rounded-bl-md'
                  }
                `}>
                  {message.isLoading && !message.content ? (
                    // Still thinking - no content yet
                    <div className="flex items-center gap-2 text-purple-600 p-3">
                      <Loader2 size={16} className="animate-spin" />
                      <span className="text-sm">Pensando...</span>
                    </div>
                  ) : message.isLoading && message.content ? (
                    // Streaming - show partial content with typing indicator
                    <div className="p-3">
                      <FormattedMessage content={message.content} />
                      <div className="flex items-center gap-1 mt-2 text-purple-400">
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  ) : message.role === 'user' ? (
                    // User message - text + optional image
                    <>
                      {/* Show image if present */}
                      {message.image && (
                        <div className="mb-2 -mx-3 -mt-3">
                          <img
                            src={message.image}
                            alt="Imagen enviada"
                            className="w-full max-h-48 object-cover rounded-t-2xl"
                          />
                        </div>
                      )}
                      {/* Only show text if it's not just the placeholder */}
                      {message.content && message.content !== '📷 Imagen enviada' && (
                        <p className="text-sm whitespace-pre-line">{message.content}</p>
                      )}
                      {message.content === '📷 Imagen enviada' && (
                        <p className="text-sm text-green-200 italic">Analiza esta imagen</p>
                      )}
                      <p className="text-xs mt-1 text-green-200">
                        {formatTime(message.timestamp)}
                      </p>
                    </>
                  ) : (
                    // Assistant message - formatted with potential actions
                    (() => {
                      const { text, actions } = parseMessageContent(message.content);
                      return (
                        <div className="p-3">
                          <FormattedMessage content={text} />

                          {/* Action Buttons */}
                          {actions.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
                              {actions.map(action => (
                                <ActionButton
                                  key={action.id}
                                  action={action}
                                  onAction={handleAction}
                                  disabled={isLoading}
                                />
                              ))}
                            </div>
                          )}

                          <p className="text-xs mt-2 text-gray-400">
                            {formatTime(message.timestamp)}
                          </p>
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
      {isListening && (
        <div className="px-4 py-2 bg-purple-50 border-t flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-purple-700">
            {interimTranscript || 'Escuchando...'}
          </span>
          <button
            onClick={stopListening}
            className="ml-auto text-xs text-purple-600 hover:text-purple-800"
          >
            Cancelar
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        onChange={handleImageSelect}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        className="hidden"
      />

      {/* Image Preview */}
      {selectedImage && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <div className="relative inline-block">
            <img
              src={selectedImage}
              alt="Preview"
              className="h-20 w-auto rounded-lg object-cover"
            />
            <button
              onClick={removeSelectedImage}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
            >
              <X size={14} />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">Imagen lista para enviar</p>
        </div>
      )}

      {/* Image Options Popup */}
      {showImageOptions && (
        <div className="absolute bottom-24 left-4 bg-white rounded-xl shadow-xl border p-2 z-50">
          <button
            onClick={() => {
              cameraInputRef.current?.click();
              setShowImageOptions(false);
            }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg w-full"
          >
            <Camera size={20} className="text-purple-600" />
            <span className="text-sm font-medium">Tomar foto</span>
          </button>
          <button
            onClick={() => {
              imageInputRef.current?.click();
              setShowImageOptions(false);
            }}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg w-full"
          >
            <ImageIcon size={20} className="text-purple-600" />
            <span className="text-sm font-medium">Elegir de galería</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-white border-t flex-shrink-0">
        <div className="flex gap-2 items-center">
          {/* Image Button */}
          <button
            onClick={() => setShowImageOptions(!showImageOptions)}
            disabled={isLoading || isListening}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              selectedImage
                ? 'bg-purple-100 text-purple-600'
                : 'bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600'
            }`}
            title="Enviar imagen"
          >
            <Camera size={18} />
          </button>

          {/* TTS Toggle */}
          {isSpeechSynthesisSupported() && (
            <button
              onClick={toggleTTS}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                ttsEnabled
                  ? 'bg-purple-100 text-purple-600'
                  : 'bg-gray-100 text-gray-400'
              }`}
              title={ttsEnabled ? 'Desactivar voz' : 'Activar voz'}
            >
              {ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
            </button>
          )}

          <input
            ref={inputRef}
            type="text"
            value={isListening ? interimTranscript : input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={selectedImage ? 'Describe la imagen (opcional)...' : (isListening ? 'Escuchando...' : 'Escribe tu pregunta...')}
            disabled={isLoading || isListening}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />

          {/* Voice Button */}
          {voiceSupported && (
            <button
              onClick={toggleListening}
              disabled={isLoading}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${isListening
                  ? 'bg-red-500 text-white animate-pulse shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                }
              `}
              title={isListening ? 'Detener' : 'Hablar'}
            >
              {isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          {/* Send Button */}
          <button
            onClick={() => sendMessage(input)}
            disabled={(!input.trim() && !selectedImage) || isLoading || isListening}
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all
              ${(input.trim() || selectedImage) && !isLoading && !isListening
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

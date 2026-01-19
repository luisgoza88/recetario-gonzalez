'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Brain, X, Loader2, Mic, Sparkles, Send, Settings, MessageCircle, Zap } from 'lucide-react';
import { useSmartFABContext, SmartAction } from '@/lib/hooks/useSmartFABContext';
import { getVoiceManager, isSpeechRecognitionSupported } from '@/lib/voice-commands';
import { getAIContext } from '@/lib/ai-memory';

// Re-export for backwards compatibility
export interface FABAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'ai' | 'alert';
  badge?: number;
}

interface SmartFABProps {
  open: boolean;
  onToggle: () => void;
  actions?: FABAction[]; // Optional legacy actions
  activeSection: 'hoy' | 'recetario' | 'hogar' | 'ajustes';
  onOpenAICommandCenter?: () => void;
  pendingProposals?: number;
}

export default function SmartFAB({ open, onToggle, activeSection, onOpenAICommandCenter, pendingProposals = 0 }: SmartFABProps) {
  const { actions, contextInfo, isLoading } = useSmartFABContext(activeSection);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);
  const [aiMode, setAiMode] = useState<'menu' | 'chat'>('menu'); // 'menu' shows options, 'chat' shows chat panel

  // Voice command state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [showVoicePanel, setShowVoicePanel] = useState(false);
  const [textInput, setTextInput] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPress = useRef(false);
  const LONG_PRESS_DURATION = 400; // ms

  // Listen for success events
  useEffect(() => {
    const handleSuccess = (e: CustomEvent<{ message: string }>) => {
      setShowSuccess(e.detail.message);
      setTimeout(() => setShowSuccess(null), 2500);
    };

    window.addEventListener('fabSuccess' as keyof WindowEventMap, handleSuccess as EventListener);
    return () => window.removeEventListener('fabSuccess' as keyof WindowEventMap, handleSuccess as EventListener);
  }, []);

  // Handle navigation events from smart actions
  useEffect(() => {
    const handleNavigate = (e: CustomEvent<{ section: string; tab?: string }>) => {
      const { section, tab } = e.detail;

      // Close FAB first
      if (open) onToggle();

      // Navigate using the app store (dispatched to page.tsx)
      window.dispatchEvent(new CustomEvent('appNavigate', {
        detail: { section, tab }
      }));
    };

    window.addEventListener('navigateToSection' as keyof WindowEventMap, handleNavigate as EventListener);
    return () => window.removeEventListener('navigateToSection' as keyof WindowEventMap, handleNavigate as EventListener);
  }, [open, onToggle]);

  // Check voice support on mount
  useEffect(() => {
    setVoiceSupported(isSpeechRecognitionSupported());
  }, []);

  // Process voice command or text input - send to AI
  const processAIMessage = useCallback(async (text: string) => {
    if (!text.trim()) {
      return;
    }

    setTranscript(text);
    setIsProcessingAI(true);
    setAiResponse(null);
    setTextInput('');

    try {
      // Get AI context for better responses
      const context = await getAIContext();

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: text }],
          conversationContext: {
            activeSection,
            ...context
          },
          stream: true
        })
      });

      if (!response.ok) throw new Error('AI request failed');

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.content) {
                  fullResponse += data.content;
                  setAiResponse(fullResponse);
                }
              } catch {
                // Ignore parse errors from incomplete chunks
              }
            }
          }
        }
      }

      if (!fullResponse) {
        setAiResponse('Lo siento, no pude procesar tu solicitud.');
      }
    } catch (error) {
      console.error('AI error:', error);
      setAiResponse('Error al conectar con la IA. Intenta de nuevo.');
    } finally {
      setIsProcessingAI(false);
    }
  }, [activeSection]);

  // Handle text input submit
  const handleTextSubmit = useCallback(() => {
    if (!textInput.trim() || isProcessingAI) return;
    processAIMessage(textInput);
  }, [textInput, isProcessingAI, processAIMessage]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleTextSubmit();
    }
  }, [handleTextSubmit]);

  // Start voice recognition
  const startListening = useCallback(() => {
    if (!voiceSupported) return;

    const voiceManager = getVoiceManager();
    setTranscript('');
    setAiResponse(null);
    setIsListening(true);
    setShowVoicePanel(true);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    voiceManager.start({
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          // Send to AI when done
          processAIMessage(text);
        }
      },
      onError: (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
        setTranscript('');
        setShowVoicePanel(false);
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
  }, [voiceSupported, processAIMessage]);

  // Stop voice recognition
  const stopListening = useCallback(() => {
    const voiceManager = getVoiceManager();
    voiceManager.stop();
    setIsListening(false);
  }, []);

  // Long press handlers
  const handlePressStart = useCallback(() => {
    if (!voiceSupported || open) return;

    isLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPress.current = true;
      startListening();
    }, LONG_PRESS_DURATION);
  }, [voiceSupported, open, startListening]);

  const handlePressEnd = useCallback(() => {
    // Clear the timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // If was listening, stop
    if (isListening) {
      stopListening();
      return;
    }

    // If it wasn't a long press, do normal toggle
    if (!isLongPress.current) {
      onToggle();
    }

    isLongPress.current = false;
  }, [isListening, stopListening, onToggle]);

  // Cancel on mouse/touch leave
  const handlePressCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    if (isListening) {
      stopListening();
    }
    isLongPress.current = false;
  }, [isListening, stopListening]);

  // Close voice panel
  const closeVoicePanel = useCallback(() => {
    setShowVoicePanel(false);
    setTranscript('');
    setAiResponse(null);
    setIsProcessingAI(false);
    setTextInput('');
  }, []);

  // Open AI panel for text input (simple click, not long press)
  const openAIPanel = useCallback(() => {
    setShowVoicePanel(true);
    setTranscript('');
    setAiResponse(null);
    // Focus the input after a short delay
    setTimeout(() => textInputRef.current?.focus(), 100);
  }, []);

  // AI FAB is always vibrant green
  const getFABStyle = () => {
    return 'from-emerald-500 to-green-600';
  };

  // Get action button style based on variant
  const getActionStyle = (variant: SmartAction['variant']) => {
    switch (variant) {
      case 'ai':
        return 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25';
      case 'alert':
        return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25';
      case 'success':
        return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25';
      default:
        return 'bg-white text-gray-700 border border-gray-200 shadow-md hover:shadow-lg';
    }
  };

  // Get the top alert count for badge
  const alertCount = actions.filter(a => a.variant === 'alert').length;

  // Total badge count includes pending proposals
  const totalBadge = alertCount + pendingProposals;

  const handleActionClick = (action: SmartAction) => {
    action.onClick();
    onToggle();
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity duration-300"
          onClick={onToggle}
        />
      )}

      {/* Success Toast */}
      {showSuccess && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-green-600 text-white px-5 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-bounce-in">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm font-medium">{showSuccess}</span>
        </div>
      )}

      {/* FAB Container */}
      <div className="relative z-50">
        {/* AI Menu */}
        <div
          className={`
            absolute bottom-20 left-1/2 -translate-x-1/2
            flex flex-col-reverse gap-2.5 items-center w-max
            transition-all duration-300 ease-out
            ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none translate-y-4'}
          `}
        >
          {isLoading ? (
            <div className="bg-white rounded-full px-4 py-2 shadow-lg flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-gray-400" />
              <span className="text-sm text-gray-500">Cargando...</span>
            </div>
          ) : (
            <>
              {/* Context-specific actions */}
              {actions.map((action, index) => (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-2xl
                    font-medium text-sm whitespace-nowrap min-w-[200px]
                    transition-all duration-200 ease-out
                    hover:scale-[1.02] active:scale-[0.98]
                    ${getActionStyle(action.variant)}
                    ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                  `}
                  style={{
                    transitionDelay: open ? `${(index + 2) * 50}ms` : '0ms',
                  }}
                >
                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    {action.icon}
                  </span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span>{action.label}</span>
                      {action.badge && action.badge > 0 && (
                        <span className={`
                          px-1.5 py-0.5 text-[10px] font-bold rounded-full
                          ${action.variant === 'default'
                            ? 'bg-red-500 text-white'
                            : 'bg-white/30 text-white'}
                        `}>
                          {action.badge > 99 ? '99+' : action.badge}
                        </span>
                      )}
                    </div>
                    {action.sublabel && (
                      <div className={`text-xs mt-0.5 ${
                        action.variant === 'default' ? 'text-gray-500' : 'text-white/80'
                      }`}>
                        {action.sublabel}
                      </div>
                    )}
                  </div>
                </button>
              ))}

              {/* AI Command Center button */}
              {onOpenAICommandCenter && (
                <button
                  onClick={() => {
                    onToggle();
                    onOpenAICommandCenter();
                  }}
                  className={`
                    flex items-center gap-3 px-4 py-2.5 rounded-2xl
                    font-medium text-sm whitespace-nowrap min-w-[200px]
                    bg-gradient-to-r from-purple-600 to-indigo-600 text-white
                    shadow-lg shadow-purple-500/25
                    transition-all duration-200 ease-out
                    hover:scale-[1.02] active:scale-[0.98]
                    ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                  `}
                  style={{
                    transitionDelay: open ? '50ms' : '0ms',
                  }}
                >
                  <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                    <Settings size={18} />
                  </span>
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span>Centro de Comando</span>
                      {pendingProposals > 0 && (
                        <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-white/30 text-white">
                          {pendingProposals}
                        </span>
                      )}
                    </div>
                    <div className="text-xs mt-0.5 text-white/80">
                      Monitorear y configurar IA
                    </div>
                  </div>
                </button>
              )}

              {/* Chat with AI button - always first */}
              <button
                onClick={() => {
                  openAIPanel();
                  onToggle();
                }}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-2xl
                  font-medium text-sm whitespace-nowrap min-w-[200px]
                  bg-gradient-to-r from-emerald-500 to-green-600 text-white
                  shadow-lg shadow-emerald-500/30
                  transition-all duration-200 ease-out
                  hover:scale-[1.02] active:scale-[0.98]
                  ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                `}
                style={{
                  transitionDelay: open ? '0ms' : '0ms',
                }}
              >
                <span className="w-6 h-6 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={20} />
                </span>
                <div className="flex-1 text-left">
                  <span className="font-semibold">Hablar con IA</span>
                  <div className="text-xs mt-0.5 text-white/80">
                    Pregunta lo que necesites
                  </div>
                </div>
              </button>
            </>
          )}
        </div>

        {/* Voice Panel - Full Width Bottom Card */}
        {showVoicePanel && (
          <div className="fixed inset-x-4 bottom-24 z-[60] animate-slide-up">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600">
                <div className="flex items-center gap-2 text-white">
                  {isListening ? (
                    <>
                      <Mic size={18} className="animate-pulse" />
                      <span className="text-sm font-medium">Escuchando...</span>
                    </>
                  ) : isProcessingAI ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      <span className="text-sm font-medium">Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span className="text-sm font-medium">Asistente IA</span>
                    </>
                  )}
                </div>
                <button
                  onClick={closeVoicePanel}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Content */}
              <div className="p-4 max-h-[40vh] overflow-y-auto">
                {/* User's transcript/message */}
                {transcript && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-400 mb-1">Tu mensaje:</p>
                    <p className="text-gray-800 bg-gray-50 rounded-xl px-3 py-2 text-sm">
                      {transcript}
                    </p>
                  </div>
                )}

                {/* AI Response */}
                {isProcessingAI && !aiResponse && (
                  <div className="flex items-center gap-2 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                )}

                {aiResponse && (
                  <div>
                    <p className="text-xs text-purple-600 mb-1">Respuesta:</p>
                    <div className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
                      {aiResponse}
                    </div>
                  </div>
                )}

                {/* Empty state while listening */}
                {isListening && !transcript && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-red-50 flex items-center justify-center">
                      <Mic size={32} className="text-red-500 animate-pulse" />
                    </div>
                    <p className="text-gray-500 text-sm">Habla ahora...</p>
                    <p className="text-gray-400 text-xs mt-1">Suelta el botón para enviar</p>
                  </div>
                )}

                {/* Welcome state - show when no transcript and not listening */}
                {!transcript && !isListening && !aiResponse && !isProcessingAI && (
                  <div className="text-center py-4">
                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-purple-50 flex items-center justify-center">
                      <Sparkles size={24} className="text-purple-500" />
                    </div>
                    <p className="text-gray-600 text-sm font-medium">¿En qué puedo ayudarte?</p>
                    <p className="text-gray-400 text-xs mt-1">Escribe tu mensaje abajo o mantén presionado para hablar</p>
                  </div>
                )}
              </div>

              {/* Text Input Area */}
              <div className="p-3 border-t bg-gray-50">
                <div className="flex gap-2 items-center">
                  {/* Voice button */}
                  {voiceSupported && (
                    <button
                      onMouseDown={startListening}
                      onMouseUp={stopListening}
                      onMouseLeave={stopListening}
                      onTouchStart={startListening}
                      onTouchEnd={stopListening}
                      disabled={isProcessingAI}
                      className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                        isListening
                          ? 'bg-red-500 text-white animate-pulse'
                          : 'bg-gray-200 text-gray-600 hover:bg-purple-100 hover:text-purple-600'
                      } disabled:opacity-50`}
                    >
                      <Mic size={18} />
                    </button>
                  )}

                  {/* Text input */}
                  <input
                    ref={textInputRef}
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe tu pregunta..."
                    disabled={isProcessingAI || isListening}
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
                  />

                  {/* Send button */}
                  <button
                    onClick={handleTextSubmit}
                    disabled={!textInput.trim() || isProcessingAI || isListening}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-all flex-shrink-0 ${
                      textInput.trim() && !isProcessingAI && !isListening
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                  >
                    {isProcessingAI ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Send size={18} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main FAB Button - AI Brain */}
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressCancel}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressCancel}
          className={`
            w-16 h-16 rounded-full
            flex items-center justify-center
            text-white select-none
            transition-all duration-300 ease-out
            shadow-[0_4px_20px_rgba(16,185,129,0.5)]
            ${isListening
              ? 'bg-gradient-to-br from-red-500 to-rose-600 scale-110 shadow-[0_4px_30px_rgba(239,68,68,0.6)]'
              : `bg-gradient-to-br ${getFABStyle()}`}
            ${open ? 'scale-110 shadow-[0_4px_30px_rgba(16,185,129,0.6)]' : 'hover:scale-105 hover:shadow-[0_4px_25px_rgba(16,185,129,0.6)]'}
            ${!isListening && 'active:scale-95'}
          `}
          style={{
            boxShadow: isListening
              ? '0 4px 30px rgba(239,68,68,0.6), 0 0 60px rgba(239,68,68,0.3)'
              : '0 4px 20px rgba(16,185,129,0.5), 0 0 40px rgba(16,185,129,0.2)'
          }}
        >
          {isListening ? (
            <Mic size={28} strokeWidth={2.5} className="animate-pulse" />
          ) : open ? (
            <X size={28} strokeWidth={2.5} />
          ) : (
            <Brain size={28} strokeWidth={2} />
          )}

          {/* Recording indicator ring */}
          {isListening && (
            <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
          )}

          {/* Glow ring effect when idle */}
          {!open && !isListening && (
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 opacity-0 animate-pulse-slow" />
          )}

          {/* Badge for alerts/proposals */}
          {!open && !isListening && totalBadge > 0 && (
            <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-bounce shadow-lg border-2 border-white">
              {totalBadge > 9 ? '9+' : totalBadge}
            </span>
          )}

          {/* Subtle pulsing ring when has AI suggestions */}
          {!open && !isListening && actions.some(a => a.variant === 'ai') && totalBadge === 0 && (
            <span className="absolute inset-[-4px] rounded-full border-2 border-emerald-300/50 animate-ping" />
          )}
        </button>

        {/* AI Label below FAB */}
        {!open && !isListening && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-emerald-600 font-semibold tracking-wide">
              IA
            </span>
          </div>
        )}

        {/* Voice hint when listening (only if panel not showing) */}
        {isListening && !showVoicePanel && (
          <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-red-500 font-medium animate-pulse">
              Escuchando... suelta para enviar
            </span>
          </div>
        )}
      </div>
    </>
  );
}

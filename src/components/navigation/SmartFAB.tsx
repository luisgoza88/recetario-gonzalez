'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, Loader2, Mic } from 'lucide-react';
import { useSmartFABContext, SmartAction } from '@/lib/hooks/useSmartFABContext';
import { getVoiceManager, isSpeechRecognitionSupported } from '@/lib/voice-commands';

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
}

export default function SmartFAB({ open, onToggle, activeSection }: SmartFABProps) {
  const { actions, contextInfo, isLoading } = useSmartFABContext(activeSection);
  const [showSuccess, setShowSuccess] = useState<string | null>(null);

  // Voice command state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [voiceSupported, setVoiceSupported] = useState(false);
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

  // Start voice recognition
  const startListening = useCallback(() => {
    if (!voiceSupported) return;

    const voiceManager = getVoiceManager();
    setTranscript('');
    setIsListening(true);

    // Haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    voiceManager.start({
      onResult: (text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
          // Send to AI when done
          processVoiceCommand(text);
        }
      },
      onError: (error) => {
        console.error('Voice error:', error);
        setIsListening(false);
        setTranscript('');
      },
      onEnd: () => {
        setIsListening(false);
      }
    });
  }, [voiceSupported]);

  // Stop voice recognition
  const stopListening = useCallback(() => {
    const voiceManager = getVoiceManager();
    voiceManager.stop();
    setIsListening(false);
  }, []);

  // Process voice command - send to AI
  const processVoiceCommand = useCallback((text: string) => {
    if (!text.trim()) return;

    // Dispatch event to open AI chat with the voice command
    window.dispatchEvent(new CustomEvent('openAIChat', {
      detail: { initialMessage: text }
    }));

    // Show feedback
    setShowSuccess(`"${text.length > 30 ? text.substring(0, 30) + '...' : text}"`);
    setTimeout(() => setShowSuccess(null), 2500);
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

  // Get FAB button style based on context
  const getFABStyle = () => {
    if (contextInfo.hasUrgentItems) {
      return 'from-amber-500 to-orange-500';
    }

    switch (activeSection) {
      case 'hoy':
        return contextInfo.timeOfDay === 'morning'
          ? 'from-amber-500 to-orange-500'
          : contextInfo.timeOfDay === 'evening'
            ? 'from-indigo-500 to-purple-500'
            : 'from-emerald-500 to-teal-500';
      case 'hogar':
        return 'from-teal-500 to-cyan-500';
      case 'recetario':
      default:
        return 'from-green-500 to-emerald-600';
    }
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

  // Don't show FAB in ajustes
  if (activeSection === 'ajustes') return null;

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
        {/* Smart Actions Menu */}
        <div
          className={`
            absolute bottom-16 left-1/2 -translate-x-1/2
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
            actions.map((action, index) => (
              <button
                key={action.id}
                onClick={() => handleActionClick(action)}
                className={`
                  flex items-center gap-3 px-4 py-2.5 rounded-2xl
                  font-medium text-sm whitespace-nowrap min-w-[180px]
                  transition-all duration-200 ease-out
                  hover:scale-[1.02] active:scale-[0.98]
                  ${getActionStyle(action.variant)}
                  ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}
                `}
                style={{
                  transitionDelay: open ? `${index * 50}ms` : '0ms',
                }}
              >
                {/* Icon */}
                <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">
                  {action.icon}
                </span>

                {/* Labels */}
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
            ))
          )}
        </div>

        {/* Voice Transcript Bubble */}
        {isListening && transcript && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-2xl px-4 py-2 shadow-xl max-w-[250px] animate-fade-in">
            <p className="text-sm text-gray-700 text-center">{transcript}</p>
          </div>
        )}

        {/* Main FAB Button */}
        <button
          onMouseDown={handlePressStart}
          onMouseUp={handlePressEnd}
          onMouseLeave={handlePressCancel}
          onTouchStart={handlePressStart}
          onTouchEnd={handlePressEnd}
          onTouchCancel={handlePressCancel}
          className={`
            w-14 h-14 rounded-full shadow-xl
            flex items-center justify-center
            text-white select-none
            transition-all duration-300 ease-out
            ${isListening
              ? 'bg-gradient-to-br from-red-500 to-rose-600 scale-110 shadow-2xl'
              : `bg-gradient-to-br ${getFABStyle()}`}
            ${open ? 'rotate-45 scale-110 shadow-2xl' : 'hover:scale-105 hover:shadow-2xl'}
            ${!isListening && 'active:scale-95'}
          `}
        >
          {isListening ? (
            <Mic size={26} strokeWidth={2.5} className="animate-pulse" />
          ) : open ? (
            <X size={26} strokeWidth={2.5} />
          ) : (
            <Plus size={26} strokeWidth={2.5} />
          )}

          {/* Recording indicator ring */}
          {isListening && (
            <span className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping" />
          )}

          {/* Alert/AI badge on FAB when closed */}
          {!open && !isListening && alertCount > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold animate-pulse shadow-lg">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}

          {/* AI indicator ring when has smart suggestions */}
          {!open && !isListening && actions.some(a => a.variant === 'ai') && alertCount === 0 && (
            <span className="absolute inset-0 rounded-full border-2 border-white/30 animate-ping" />
          )}
        </button>

        {/* Context indicator - subtle text below FAB */}
        {!open && !isListening && (
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap">
            <span className="text-[10px] text-gray-400 font-medium">
              {contextInfo.timeOfDay === 'morning' ? 'Buenos días' :
               contextInfo.timeOfDay === 'afternoon' ? 'Buenas tardes' : 'Buenas noches'}
            </span>
          </div>
        )}

        {/* Voice hint when listening */}
        {isListening && (
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

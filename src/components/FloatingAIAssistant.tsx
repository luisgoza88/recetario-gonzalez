"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Wand2,
  Loader2,
  Calendar,
  ShoppingCart,
  Home,
  ChefHat,
  RefreshCw,
  X,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import { useAIChat } from "@/lib/hooks/useAIChat";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { useImageInput } from "@/lib/hooks/useImageInput";
import { useProactiveAlerts } from "@/lib/hooks/useProactiveAlerts";
import { useAIProposal } from "@/lib/hooks/useAIProposal";
import { ProposalCard } from "@/components/ai/ProposalCard";
import { UndoToastContainer } from "@/components/ai/UndoToast";
import { ChatMessageList } from "@/components/ai/chat/ChatMessageList";
import { useOptionalAuth } from "@/contexts/AuthContext";
import logger from "@/lib/logger";

type ActiveSection = "hoy" | "recetario" | "hogar" | "ia" | "ajustes";

interface FloatingAIAssistantProps {
  activeSection?: ActiveSection;
  openSignal?: number;
  showLauncher?: boolean;
}

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
}

const formatTime = (date: Date) =>
  date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// Contextual quick actions based on active section
const getContextualActions = (section: ActiveSection): QuickAction[] => {
  switch (section) {
    case "hoy":
      return [
        {
          id: "menu-today",
          label: "Menú de hoy",
          icon: <Calendar size={14} />,
          prompt: "¿Cuál es el menú para hoy?",
        },
        {
          id: "tasks-today",
          label: "Tareas de hoy",
          icon: <Home size={14} />,
          prompt: "¿Cómo van las tareas de hoy?",
        },
      ];
    case "recetario":
      return [
        {
          id: "suggest-recipe",
          label: "Sugerir receta",
          icon: <ChefHat size={14} />,
          prompt: "Sugiere una receta con los ingredientes que tengo",
        },
        {
          id: "menu-week",
          label: "Menú semanal",
          icon: <Calendar size={14} />,
          prompt: "¿Cuál es el menú de esta semana?",
        },
        {
          id: "shopping",
          label: "Lista compras",
          icon: <ShoppingCart size={14} />,
          prompt: "¿Qué necesito comprar?",
        },
      ];
    case "hogar":
      return [
        {
          id: "tasks-status",
          label: "Estado tareas",
          icon: <Home size={14} />,
          prompt: "¿Cómo va el progreso de las tareas?",
        },
        {
          id: "employee-summary",
          label: "Resumen empleados",
          icon: <User size={14} />,
          prompt: "Dame un resumen de las tareas de cada empleado",
        },
      ];
    default:
      return [
        {
          id: "help",
          label: "¿Qué puedo hacer?",
          icon: <Sparkles size={14} />,
          prompt: "¿Qué puedes hacer por mí?",
        },
      ];
  }
};

export default function FloatingAIAssistant({
  activeSection = "hoy",
  openSignal = 0,
  showLauncher = true,
}: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  useEffect(() => {
    if (openSignal > 0) setIsOpen(true);
  }, [openSignal]);
  const [input, setInput] = useState("");
  const [showProposalModal, setShowProposalModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auth context for household and user info
  const auth = useOptionalAuth();
  const householdId = auth?.currentHousehold?.id || "default-household";
  const userId = auth?.user?.id;

  // AI Proposal hook for managing proposals and undo actions
  const proposal = useAIProposal({ householdId, userId });

  // Voice input
  const voice = useVoiceInput({
    onFinalTranscript: (transcript) => {
      setInput(transcript);
      setTimeout(() => {
        if (transcript.trim()) {
          handleSend(transcript);
        }
      }, 300);
    },
  });

  // Image input
  const {
    selectedImage,
    showImageOptions,
    imageInputRef,
    cameraInputRef,
    handleImageSelect,
    removeSelectedImage,
    openCamera,
    openGallery,
    toggleImageOptions,
    clearImage,
  } = useImageInput();

  // Core chat hook
  const chat = useAIChat({
    onSpeakResponse: voice.speakText,
    householdId,
    userId,
    onProposal: (proposalData) => {
      proposal.setActiveProposal({
        id: proposalData.proposalId,
        summary: proposalData.summary,
        actions: proposalData.actions,
        riskLevel: proposalData.riskLevel,
        expiresAt: proposalData.expiresAt,
      });
      setShowProposalModal(true);
    },
    onExecutionMetadata: (metadata) => {
      proposal.processAIResponse({ executionMetadata: metadata });
    },
  });

  const alertsHook = useProactiveAlerts();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = useCallback(
    async (content?: string) => {
      const messageContent = content || input;
      if ((!messageContent.trim() && !selectedImage) || chat.isLoading) return;
      await chat.sendMessage(messageContent, selectedImage);
      setInput("");
      clearImage();
    },
    [input, selectedImage, chat, clearImage],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAction = useCallback(
    async (action: string) => {
      const [actionType, ...params] = action.split(":");
      const param = params.join(":");

      switch (actionType) {
        case "confirm":
          if (param === "yes") {
            await chat.sendMessage("Sí, agrégalo");
          }
          break;
        case "view_recipe":
          await chat.sendMessage(
            `Muéstrame los detalles de la receta ${param}`,
          );
          break;
        case "add_low_to_shopping":
          await chat.sendMessage(
            "Agrega todos los ingredientes bajos a la lista de compras",
          );
          break;
        case "add_missing_to_shopping":
          await chat.sendMessage(
            "Agrega los ingredientes faltantes a la lista de compras",
          );
          break;
        default:
          logger.warn("Unknown action", { action });
      }
    },
    [chat],
  );

  const quickActions = getContextualActions(activeSection);

  // Floating button (closed state)
  if (!isOpen) {
    if (!showLauncher) return null;
    return (
      <button
        aria-label="Abrir asistente de IA"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-[100] w-14 h-14 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105 flex items-center justify-center"
      >
        <Bot size={24} />
        {alertsHook.alertCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {alertsHook.alertCount > 9 ? "9+" : alertsHook.alertCount}
          </span>
        )}
      </button>
    );
  }

  // Chat overlay (open state) — full-screen "Asistente Recetario"
  return (
    <div className="fixed inset-0 z-[400] bg-[var(--bg)] flex flex-col animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 to-violet-700 text-white px-5 pt-12 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-[15px] font-semibold">Asistente Recetario</p>
              <p className="text-[11px] text-white/70">
                Gemini 2.5 · Conoce tu cocina
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {alertsHook.alertCount > 0 && (
              <button
                onClick={alertsHook.toggleAlerts}
                className="relative w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur transition-colors hover:bg-white/30"
              >
                <AlertCircle size={16} />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                  {alertsHook.alertCount}
                </span>
              </button>
            )}
            {chat.messages.length > 0 && (
              <button
                onClick={chat.clearChat}
                title="Nueva conversación"
                className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur transition-colors hover:bg-white/30"
              >
                <RefreshCw size={15} />
              </button>
            )}
            <button
              aria-label="Cerrar asistente"
              onClick={() => setIsOpen(false)}
              className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center backdrop-blur transition-colors hover:bg-white/30"
            >
              <X size={16} />
            </button>
          </div>
        </div>
        <div className="flex gap-1.5 mt-3 overflow-x-auto scrollbar-hide">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => chat.sendMessage(action.prompt)}
              disabled={chat.isLoading}
              className="bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-[10.5px] font-medium whitespace-nowrap transition-colors hover:bg-white/25 disabled:opacity-50 flex items-center gap-1"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto min-h-0 px-5 py-4">
        {chat.isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 size={20} className="animate-spin text-purple-600" />
          </div>
        ) : chat.showWelcome && chat.messages.length === 0 ? (
          <div className="space-y-3">
            {/* Welcome bubble (IA side) */}
            <div className="flex justify-start">
              <div className="max-w-[80%] px-3.5 py-2.5 rounded-2xl text-[13.5px] leading-relaxed bg-white border border-[var(--border)] text-[var(--ink)]">
                ¿En qué puedo ayudarte? Pregúntame sobre recetas, menú, tareas o
                compras.
              </div>
            </div>
            {/* Suggestions */}
            <div className="pt-2">
              <p className="text-[11px] uppercase tracking-wider text-[var(--ink-soft)] font-semibold mb-2 px-1">
                Sugerencias
              </p>
              <div className="space-y-1.5">
                {quickActions.map((action) => (
                  <button
                    key={action.id}
                    onClick={() => chat.sendMessage(action.prompt)}
                    disabled={chat.isLoading}
                    className="w-full text-left bg-white border border-[var(--border)] rounded-xl px-3.5 py-2.5 text-[13px] text-[var(--ink)] active:bg-stone-50 hover:bg-stone-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <Wand2
                      size={13}
                      className="text-purple-600 flex-shrink-0"
                    />
                    {action.prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <ChatMessageList
            messages={chat.messages}
            activeTools={chat.activeTools}
            isLoading={chat.isLoading}
            onAction={handleAction}
            actionButtonSize="sm"
            messagesEndRef={messagesEndRef}
            formatTime={formatTime}
            showTimestamp={false}
          />
        )}
      </div>

      {/* Voice Listening Indicator */}
      {voice.isListening && (
        <div className="px-5 py-1.5 bg-purple-50 border-t border-[var(--border)] flex items-center gap-2 flex-shrink-0">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-xs text-purple-700 flex-1">
            {voice.interimTranscript || "Escuchando..."}
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
      {selectedImage && (
        <div className="px-5 py-2 bg-stone-50 border-t border-[var(--border)] flex-shrink-0">
          <div className="relative inline-block">
            <img
              src={selectedImage}
              alt="Preview"
              className="h-14 w-auto rounded-lg object-cover"
            />
            <button
              onClick={removeSelectedImage}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-red-600"
            >
              <X size={12} />
            </button>
          </div>
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

      {/* Image Options Popup */}
      {showImageOptions && (
        <div className="absolute bottom-20 left-3 bg-white rounded-xl shadow-xl border border-[var(--border)] p-1 z-[410]">
          <button
            onClick={openCamera}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg w-full"
          >
            <Camera size={16} className="text-purple-600" />
            <span className="text-xs font-medium">Tomar foto</span>
          </button>
          <button
            onClick={openGallery}
            className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-lg w-full"
          >
            <ImageIcon size={16} className="text-purple-600" />
            <span className="text-xs font-medium">Galería</span>
          </button>
        </div>
      )}

      {/* Input Area */}
      <div className="border-t border-[var(--border)] bg-white px-3 py-2.5 flex items-center gap-2 flex-shrink-0">
        <button
          onClick={toggleImageOptions}
          disabled={chat.isLoading || voice.isListening}
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            selectedImage
              ? "bg-purple-100 text-purple-600"
              : "bg-stone-100 text-stone-600 hover:bg-purple-50 hover:text-purple-600"
          }`}
        >
          <Camera size={16} />
        </button>

        {voice.ttsSupported && (
          <button
            onClick={voice.toggleTTS}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              voice.ttsEnabled
                ? "bg-purple-100 text-purple-600"
                : "bg-stone-100 text-stone-400"
            }`}
          >
            {voice.ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
          </button>
        )}

        {voice.voiceSupported && (
          <button
            onClick={voice.toggleListening}
            disabled={chat.isLoading}
            className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              voice.isListening
                ? "bg-red-500 text-white animate-pulse"
                : "bg-stone-100 text-stone-600 hover:bg-purple-100 hover:text-purple-600"
            }`}
          >
            {voice.isListening ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
        )}

        <input
          ref={inputRef}
          type="text"
          value={voice.isListening ? voice.interimTranscript : input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            selectedImage
              ? "Describe la imagen…"
              : voice.isListening
                ? "Escuchando…"
                : "Pídele algo a tu Recetario…"
          }
          disabled={chat.isLoading || voice.isListening}
          className="flex-1 bg-stone-100 rounded-full px-4 py-2 text-[13.5px] focus:outline-none focus:bg-stone-50 placeholder:text-stone-400 disabled:opacity-50"
        />

        <button
          onClick={() => handleSend()}
          disabled={
            (!input.trim() && !selectedImage) ||
            chat.isLoading ||
            voice.isListening
          }
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
            (input.trim() || selectedImage) &&
            !chat.isLoading &&
            !voice.isListening
              ? "bg-gradient-to-br from-purple-600 to-violet-700 text-white shadow-md"
              : "bg-stone-200 text-stone-400"
          }`}
        >
          {chat.isLoading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Send size={15} />
          )}
        </button>
      </div>

      {/* Proposal Modal */}
      {showProposalModal && proposal.activeProposal && (
        <div className="fixed inset-0 z-[420] flex items-center justify-center p-4 bg-black/50">
          <div className="w-full max-w-md max-h-[80vh] overflow-y-auto">
            <ProposalCard
              proposalId={proposal.activeProposal.id}
              summary={proposal.activeProposal.summary}
              actions={proposal.activeProposal.actions}
              riskLevel={proposal.activeProposal.riskLevel}
              expiresAt={proposal.activeProposal.expiresAt}
              onApprove={async (proposalId, selectedActions) => {
                await proposal.approveProposal(proposalId, selectedActions);
                setShowProposalModal(false);
              }}
              onReject={async (proposalId) => {
                await proposal.rejectProposal(proposalId);
                setShowProposalModal(false);
              }}
              onClose={() => setShowProposalModal(false)}
            />
          </div>
        </div>
      )}

      {/* Undo Toast Container */}
      <UndoToastContainer
        actions={proposal.undoActions}
        onUndo={proposal.undoAction}
        onDismiss={proposal.removeUndoAction}
      />
    </div>
  );
}

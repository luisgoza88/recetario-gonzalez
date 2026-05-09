"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
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
  Minimize2,
  Maximize2,
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
}: FloatingAIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    return (
      <button
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

  // Chat panel (open state)
  return (
    <div
      className={`fixed z-[100] bg-white rounded-2xl shadow-2xl border overflow-hidden flex flex-col transition-all duration-300 ${
        isExpanded
          ? "inset-4 sm:inset-8"
          : "bottom-24 right-4 w-[calc(100%-2rem)] max-w-sm h-[70vh] max-h-[500px]"
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
              {activeSection === "recetario"
                ? "Recetas y menú"
                : activeSection === "hogar"
                  ? "Tareas del hogar"
                  : "Tu ayudante"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
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
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => chat.sendMessage(action.prompt)}
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
            <h4 className="font-medium text-gray-800 mb-1">
              ¿En qué puedo ayudarte?
            </h4>
            <p className="text-xs text-gray-500">
              Pregúntame sobre recetas, menú, tareas o compras
            </p>
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
        <div className="px-3 py-1.5 bg-purple-50 border-t flex items-center gap-2">
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
        <div className="px-3 py-2 bg-gray-50 border-t">
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
        <div className="absolute bottom-20 left-3 bg-white rounded-xl shadow-xl border p-1 z-50">
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
      <div className="p-2 bg-white border-t flex-shrink-0">
        <div className="flex gap-1.5 items-center">
          <button
            onClick={toggleImageOptions}
            disabled={chat.isLoading || voice.isListening}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
              selectedImage
                ? "bg-purple-100 text-purple-600"
                : "bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600"
            }`}
          >
            <Camera size={16} />
          </button>

          {voice.ttsSupported && (
            <button
              onClick={voice.toggleTTS}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                voice.ttsEnabled
                  ? "bg-purple-100 text-purple-600"
                  : "bg-gray-100 text-gray-400"
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
            placeholder={
              selectedImage
                ? "Describe..."
                : voice.isListening
                  ? "Escuchando..."
                  : "Escribe..."
            }
            disabled={chat.isLoading || voice.isListening}
            className="flex-1 px-3 py-2 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />

          {voice.voiceSupported && (
            <button
              onClick={voice.toggleListening}
              disabled={chat.isLoading}
              className={`
                w-9 h-9 rounded-full flex items-center justify-center transition-all
                ${
                  voice.isListening
                    ? "bg-red-500 text-white animate-pulse"
                    : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600"
                }
              `}
            >
              {voice.isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          )}

          <button
            onClick={() => handleSend()}
            disabled={
              (!input.trim() && !selectedImage) ||
              chat.isLoading ||
              voice.isListening
            }
            className={`
              w-9 h-9 rounded-full flex items-center justify-center transition-all
              ${
                (input.trim() || selectedImage) &&
                !chat.isLoading &&
                !voice.isListening
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-400"
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

      {/* Proposal Modal */}
      {showProposalModal && proposal.activeProposal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/50">
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

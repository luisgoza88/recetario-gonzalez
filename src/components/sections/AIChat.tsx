"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  Sparkles,
  Loader2,
  Calendar,
  ShoppingCart,
  Home,
  UtensilsCrossed,
  CheckCircle2,
  ListTodo,
  ChefHat,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Clock,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useAIChat } from "@/lib/hooks/useAIChat";
import { useVoiceInput } from "@/lib/hooks/useVoiceInput";
import { useImageInput } from "@/lib/hooks/useImageInput";
import {
  useProactiveAlerts,
  type Alert as ProactiveAlert,
} from "@/lib/hooks/useProactiveAlerts";
import { isSpeechSynthesisSupported } from "@/lib/voice-commands";
import { useToast } from "@/components/ui/Toast";
import { useOptionalAuth } from "@/contexts/AuthContext";
import { ChatMessageList } from "@/components/ai/chat/ChatMessageList";
import logger from "@/lib/logger";

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  prompt: string;
  color: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: "menu-today",
    label: "Menu de la semana",
    icon: <Calendar size={16} />,
    prompt: "¿Cuál es el menú para esta semana?",
    color: "bg-green-50 text-green-700 hover:bg-green-100",
  },
  {
    id: "suggest-recipe",
    label: "Sugerir receta",
    icon: <ChefHat size={16} />,
    prompt: "Sugiere una receta con los ingredientes que tengo disponibles",
    color: "bg-orange-50 text-orange-700 hover:bg-orange-100",
  },
  {
    id: "tasks-status",
    label: "Estado tareas",
    icon: <Home size={16} />,
    prompt: "¿Cómo va el progreso de las tareas de hoy?",
    color: "bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  {
    id: "shopping-list",
    label: "Lista de compras",
    icon: <ShoppingCart size={16} />,
    prompt: "¿Qué necesito comprar?",
    color: "bg-purple-50 text-purple-700 hover:bg-purple-100",
  },
];

const SUGGESTION_CHIPS = [
  "¿Qué hay para almorzar hoy?",
  "¿Qué ingredientes me faltan para hoy?",
  "Dame el reporte semanal",
  "¿Qué ingredientes tengo bajos?",
  "Consejos de preparación para hoy",
];

const formatTime = (date: Date) =>
  date.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

export default function AIChat() {
  const toast = useToast();
  const auth = useOptionalAuth();
  const householdId = auth?.currentHousehold?.id;

  const [input, setInput] = useState("");
  const [showAlerts, setShowAlerts] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sprint 3.13: snapshot del estado del hogar cargado en background.
  // Se inyecta en cada request via snapshotRef pasado al hook.
  const householdSnapshotRef = useRef<string | null>(null);

  // Proactive alerts
  const {
    alerts,
    showAlerts: showAlertsPanel,
    setShowAlerts: setShowAlertsPanel,
    dismiss: dismissAlertById,
    getPriorityColor: getAlertColor,
  } = useProactiveAlerts({
    autoGenerateOnMount: true,
    refreshIntervalMs: 5 * 60 * 1000,
  });

  // Voice
  const voice = useVoiceInput({
    onFinalTranscript: (transcript) => {
      setInput(transcript);
      setTimeout(() => {
        if (transcript.trim()) {
          chat.sendMessage(transcript, selectedImage);
          clearImage();
          setInput("");
        }
      }, 500);
    },
  });

  // Image
  const {
    selectedImage,
    showImageOptions,
    imageInputRef,
    cameraInputRef,
    handleImageSelect: handleImageSelectRaw,
    removeSelectedImage,
    openCamera,
    openGallery,
    toggleImageOptions,
    clearImage,
  } = useImageInput();

  // Override handleImageSelect to show toast on oversized file
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.size > 5 * 1024 * 1024) {
      toast.warning("La imagen es muy grande. Máximo 5MB.");
      e.target.value = "";
      return;
    }
    handleImageSelectRaw(e);
  };

  // Core chat hook — snapshot injected via ref (Sprint 3.13)
  const chat = useAIChat({
    householdId,
    onSpeakResponse: voice.speakText,
    snapshotRef: householdSnapshotRef,
  });

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chat.messages, scrollToBottom]);

  // Sprint 3.13: Cargar snapshot del hogar en background al abrir.
  useEffect(() => {
    const loadSnapshot = async () => {
      try {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const cycleDay = (((dayOfWeek === 0 ? 7 : dayOfWeek) - 1) % 12) + 1;
        const todayIso = today.toISOString().split("T")[0];

        const [menuResult, lowStockResult, feedbackResult, tasksResult] =
          await Promise.all([
            supabase
              .from("day_menu")
              .select(
                "breakfast:recipes!day_menu_breakfast_id_fkey(name), lunch:recipes!day_menu_lunch_id_fkey(name), dinner:recipes!day_menu_dinner_id_fkey(name)",
              )
              .eq("day_number", cycleDay)
              .single(),
            supabase
              .from("inventory")
              .select("current_number, market_item:market_items(name)")
              .lte("current_number", 2)
              .gt("current_number", 0)
              .limit(5),
            supabase
              .from("adjustment_suggestions")
              .select("id")
              .eq("status", "pending")
              .limit(10),
            supabase
              .from("scheduled_tasks")
              .select("status")
              .eq("scheduled_date", todayIso)
              .limit(20),
          ]);

        const lines: string[] = [];

        if (menuResult.data) {
          const m = menuResult.data;
          const breakfast = (m.breakfast as { name?: string } | null)?.name;
          const lunch = (m.lunch as { name?: string } | null)?.name;
          const dinner = (m.dinner as { name?: string } | null)?.name;
          const isWeekend = dayOfWeek === 5 || dayOfWeek === 6;
          lines.push(
            `- Menu hoy (dia ${cycleDay}): Desayuno "${breakfast || "No prog."}", Almuerzo "${lunch || "No prog."}", Cena "${isWeekend ? "Sin cena (salen a comer)" : dinner || "No prog."}"`,
          );
        }

        if (lowStockResult.data && lowStockResult.data.length > 0) {
          const items = lowStockResult.data
            .map(
              (i) =>
                `${(i.market_item as { name?: string } | null)?.name || "item"} (stock: ${i.current_number})`,
            )
            .join(", ");
          lines.push(`- Ingredientes criticos: ${items}`);
        } else {
          lines.push("- Ingredientes criticos: ninguno");
        }

        const pendingFeedback = feedbackResult.data?.length || 0;
        if (pendingFeedback > 0) {
          lines.push(`- Sugerencias de ajuste pendientes: ${pendingFeedback}`);
        }

        if (tasksResult.data && tasksResult.data.length > 0) {
          const total = tasksResult.data.length;
          const done = tasksResult.data.filter(
            (t) => t.status === "completada",
          ).length;
          lines.push(`- Tareas hoy: ${done}/${total} completadas`);
        }

        if (lines.length > 0) {
          householdSnapshotRef.current = lines.join("\n");
        }
      } catch {
        // Snapshot fallo — la IA arranca sin contexto previo, no es critico
      }
    };

    void loadSnapshot();
  }, [householdId]);

  const handleSend = useCallback(async () => {
    const content = input.trim();
    if ((!content && !selectedImage) || chat.isLoading) return;
    const imageToSend = selectedImage;
    setInput("");
    clearImage();
    await chat.sendMessage(content, imageToSend);
  }, [input, selectedImage, chat, clearImage]);

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
            const lastMsg = chat.messages
              .filter((m) => m.role === "assistant")
              .pop();
            if (lastMsg?.content.includes("Huevos")) {
              await chat.sendMessage("Sí, agrega los huevos a la lista");
            } else {
              await chat.sendMessage("Sí, agrégalo");
            }
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
        case "view_tasks":
          await chat.sendMessage("¿Cómo van las tareas de hoy?");
          break;
        case "view_inventory":
          await chat.sendMessage("Muéstrame el estado del inventario");
          break;
        default:
          logger.warn("Unknown action", { action });
      }
    },
    [chat],
  );

  const handleAlertAction = (alert: ProactiveAlert) => {
    if (alert.action) {
      const payload = alert.action.payload as
        | { tab?: string; section?: string }
        | undefined;
      if (payload?.tab) handleAction(`navigate:${payload.tab}`);
    }
    dismissAlertById(alert.id);
    setShowAlertsPanel(false);
  };

  const getAlertIcon = (source: ProactiveAlert["source"]) => {
    switch (source) {
      case "inventory":
        return <AlertTriangle size={16} className="text-red-500" />;
      case "menu":
        return <Clock size={16} className="text-green-500" />;
      case "tasks":
        return <ListTodo size={16} className="text-blue-500" />;
      case "missing_ingredients":
        return <UtensilsCrossed size={16} className="text-amber-500" />;
      default:
        return <TrendingUp size={16} className="text-purple-500" />;
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
              <p className="text-sm text-purple-200">
                Tu ayudante para el hogar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
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
            {chat.messages.length > 0 && (
              <button
                onClick={chat.clearChat}
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
      {showAlertsPanel && alerts.length > 0 && (
        <div className="absolute top-16 right-2 left-2 z-50 bg-white rounded-xl shadow-xl border max-h-80 overflow-y-auto">
          <div className="p-3 border-b flex items-center justify-between sticky top-0 bg-white">
            <h3 className="font-semibold text-gray-800">
              Alertas inteligentes
            </h3>
            <button
              onClick={() => setShowAlertsPanel(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="p-2 space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-3 rounded-lg border ${getAlertColor(alert.severity)}`}
              >
                <div className="flex items-start gap-2">
                  {getAlertIcon(alert.source)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{alert.title}</p>
                    <p className="text-xs mt-0.5 whitespace-pre-line">
                      {alert.body}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      {alert.action && (
                        <button
                          onClick={() => handleAlertAction(alert)}
                          className="text-xs px-2 py-1 bg-white rounded border hover:bg-gray-50"
                        >
                          {alert.action.label}
                        </button>
                      )}
                      <button
                        onClick={() => dismissAlertById(alert.id)}
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

      {/* Quick Actions */}
      <div className="flex-shrink-0 bg-white border-b">
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.id}
              onClick={() => chat.sendMessage(action.prompt)}
              disabled={chat.isLoading}
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
        {chat.isLoadingHistory ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Loader2 size={24} className="animate-spin" />
              <span className="text-sm">Cargando conversación...</span>
            </div>
          </div>
        ) : chat.showWelcome && chat.messages.length === 0 ? (
          <div className="p-4 flex flex-col items-center py-6">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
              <Sparkles size={32} className="text-white" />
            </div>
            <h2 className="text-lg font-bold text-gray-800 mb-1">
              ¿En qué puedo ayudarte?
            </h2>
            <p className="text-gray-500 text-center mb-4 text-sm max-w-xs">
              Puedo consultar el menú, sugerir recetas, gestionar tareas del
              hogar y mucho más.
            </p>
            <div className="flex flex-wrap justify-center gap-2 max-w-sm mb-4">
              {SUGGESTION_CHIPS.map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => chat.sendMessage(suggestion)}
                  className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs text-gray-700 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-700 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <UtensilsCrossed
                  size={20}
                  className="mx-auto mb-1 text-green-600"
                />
                <p className="text-xs text-gray-600">Recetas y Menú</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <ShoppingCart
                  size={20}
                  className="mx-auto mb-1 text-purple-600"
                />
                <p className="text-xs text-gray-600">Lista de Compras</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <ListTodo size={20} className="mx-auto mb-1 text-blue-600" />
                <p className="text-xs text-gray-600">Tareas del Hogar</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border text-center">
                <CheckCircle2
                  size={20}
                  className="mx-auto mb-1 text-amber-600"
                />
                <p className="text-xs text-gray-600">Progreso Diario</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <ChatMessageList
              messages={chat.messages}
              activeTools={chat.activeTools}
              isLoading={chat.isLoading}
              onAction={handleAction}
              actionButtonSize="md"
              messagesEndRef={messagesEndRef}
              formatTime={formatTime}
              showTimestamp={true}
            />
          </div>
        )}
      </div>

      {/* Voice Listening Indicator */}
      {voice.isListening && (
        <div className="px-4 py-2 bg-purple-50 border-t flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
          <span className="text-sm text-purple-700">
            {voice.interimTranscript || "Escuchando..."}
          </span>
          <button
            onClick={voice.stopListening}
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
            onClick={openCamera}
            className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 rounded-lg w-full"
          >
            <Camera size={20} className="text-purple-600" />
            <span className="text-sm font-medium">Tomar foto</span>
          </button>
          <button
            onClick={openGallery}
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
          <button
            onClick={toggleImageOptions}
            disabled={chat.isLoading || voice.isListening}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
              selectedImage
                ? "bg-purple-100 text-purple-600"
                : "bg-gray-100 text-gray-500 hover:bg-purple-50 hover:text-purple-600"
            }`}
            title="Enviar imagen"
          >
            <Camera size={18} />
          </button>

          {isSpeechSynthesisSupported() && (
            <button
              onClick={voice.toggleTTS}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                voice.ttsEnabled
                  ? "bg-purple-100 text-purple-600"
                  : "bg-gray-100 text-gray-400"
              }`}
              title={voice.ttsEnabled ? "Desactivar voz" : "Activar voz"}
            >
              {voice.ttsEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
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
                ? "Describe la imagen (opcional)..."
                : voice.isListening
                  ? "Escuchando..."
                  : "Escribe tu pregunta..."
            }
            disabled={chat.isLoading || voice.isListening}
            className="flex-1 px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
          />

          {voice.voiceSupported && (
            <button
              onClick={voice.toggleListening}
              disabled={chat.isLoading}
              className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${
                  voice.isListening
                    ? "bg-red-500 text-white animate-pulse shadow-lg"
                    : "bg-gray-100 text-gray-600 hover:bg-purple-100 hover:text-purple-600"
                }
              `}
              title={voice.isListening ? "Detener" : "Hablar"}
            >
              {voice.isListening ? <MicOff size={20} /> : <Mic size={20} />}
            </button>
          )}

          <button
            onClick={handleSend}
            disabled={
              (!input.trim() && !selectedImage) ||
              chat.isLoading ||
              voice.isListening
            }
            className={`
              w-12 h-12 rounded-full flex items-center justify-center transition-all
              ${
                (input.trim() || selectedImage) &&
                !chat.isLoading &&
                !voice.isListening
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:shadow-xl"
                  : "bg-gray-200 text-gray-400"
              }
            `}
          >
            {chat.isLoading ? (
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

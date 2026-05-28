"use client";

import { Loader2, User, Sparkles } from "lucide-react";
import { FormattedMessage } from "./FormattedMessage";
import { ActionButton } from "./ActionButton";
import { ContextPills } from "@/components/ai/ContextPills";
import { parseMessageContent } from "@/lib/hooks/useAIChat";
import type { Message, ActiveTool } from "@/lib/hooks/useAIChat";

interface ChatMessageListProps {
  messages: Message[];
  activeTools: ActiveTool[];
  isLoading: boolean;
  onAction: (action: string) => void;
  actionButtonSize?: "sm" | "md";
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  formatTime: (date: Date) => string;
  showTimestamp?: boolean;
}

export function ChatMessageList({
  messages,
  activeTools,
  isLoading,
  onAction,
  actionButtonSize = "md",
  messagesEndRef,
  formatTime,
  showTimestamp = true,
}: ChatMessageListProps) {
  return (
    <div className="space-y-3 md:space-y-4">
      {messages.map((message) => (
        <div
          key={message.id}
          className={`flex gap-2 md:gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
        >
          {/* Avatar */}
          <div
            className={`
              w-6 h-6 md:w-8 md:h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${message.role === "user" ? "bg-stone-200" : "bg-purple-100"}
            `}
          >
            {message.role === "user" ? (
              <User size={14} className="text-stone-600 md:hidden" />
            ) : (
              <Sparkles size={14} className="text-purple-600 md:hidden" />
            )}
            {message.role === "user" ? (
              <User size={18} className="text-stone-600 hidden md:block" />
            ) : (
              <Sparkles size={18} className="text-purple-600 hidden md:block" />
            )}
          </div>

          {/* Message Bubble */}
          <div
            className={`
              max-w-[85%] rounded-2xl text-[13.5px] leading-relaxed
              ${
                message.role === "user"
                  ? "bg-[var(--ink)] text-white rounded-br-md p-2.5 md:p-3"
                  : "bg-white shadow-sm border border-[var(--border)] rounded-bl-md text-[var(--ink)]"
              }
            `}
          >
            {message.isLoading && !message.content ? (
              <div className="p-2.5 md:p-3 space-y-2">
                {activeTools.length > 0 && (
                  <ContextPills tools={activeTools} className="mb-2" />
                )}
                <div className="flex items-center gap-1.5 text-purple-600">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="text-xs md:text-sm">
                    {activeTools.length > 0
                      ? activeTools.find((t) => t.status === "running")
                          ?.description || "Procesando..."
                      : "Pensando..."}
                  </span>
                </div>
              </div>
            ) : message.isLoading && message.content ? (
              <div className="p-2.5 md:p-3">
                {activeTools.length > 0 && (
                  <ContextPills tools={activeTools} className="mb-2" />
                )}
                <FormattedMessage content={message.content} />
                <div className="flex items-center gap-0.5 md:gap-1 mt-1.5 md:mt-2 text-purple-400">
                  <span
                    className="w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "0ms" }}
                  />
                  <span
                    className="w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "150ms" }}
                  />
                  <span
                    className="w-1 h-1 md:w-1.5 md:h-1.5 bg-purple-400 rounded-full animate-bounce"
                    style={{ animationDelay: "300ms" }}
                  />
                </div>
              </div>
            ) : message.role === "user" ? (
              <>
                {message.image && (
                  <div className="mb-2 -mx-2.5 md:-mx-3 -mt-2.5 md:-mt-3">
                    <img
                      src={message.image}
                      alt="Imagen enviada"
                      className="w-full max-h-32 md:max-h-48 object-cover rounded-t-2xl"
                    />
                  </div>
                )}
                {message.content && message.content !== "📷 Imagen enviada" && (
                  <p className="text-xs md:text-sm whitespace-pre-line">
                    {message.content}
                  </p>
                )}
                {message.content === "📷 Imagen enviada" && (
                  <p className="text-xs md:text-sm text-white/70 italic">
                    Analiza esta imagen
                  </p>
                )}
                {showTimestamp && (
                  <p className="text-xs mt-1 text-white/70">
                    {formatTime(message.timestamp)}
                  </p>
                )}
              </>
            ) : (
              (() => {
                const { text, actions } = parseMessageContent(message.content);
                return (
                  <div className="p-2.5 md:p-3">
                    <FormattedMessage content={text} />
                    {actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 md:gap-2 mt-2 md:mt-3 pt-2 md:pt-3 border-t border-gray-100">
                        {actions.map((action) => (
                          <ActionButton
                            key={action.id}
                            action={action}
                            onAction={onAction}
                            disabled={isLoading}
                            size={actionButtonSize}
                          />
                        ))}
                      </div>
                    )}
                    {showTimestamp && (
                      <p className="text-xs mt-1.5 md:mt-2 text-gray-400">
                        {formatTime(message.timestamp)}
                      </p>
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
  );
}

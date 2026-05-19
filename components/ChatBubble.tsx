"use client";

import { useEffect, useRef } from "react";
import type { Message } from "@/lib/types";

interface ChatBubbleProps {
  message: Message;
  pinyinMode: boolean;
  onSpeak?: (text: string) => void;
}

export default function ChatBubble({ message, pinyinMode, onSpeak }: ChatBubbleProps) {
  const isUser = message.role === "user";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.classList.add("animate-ink-reveal");
    }
  }, []);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      ref={ref}
      className={`flex gap-3 opacity-0 ${isUser ? "flex-row-reverse" : "flex-row"}`}
    >
      {/* Avatar */}
      <div
        className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold select-none ${
          isUser
            ? "bg-ink-500 text-cream-200"
            : "bg-vermillion-700 text-cream-100"
        }`}
      >
        {isUser ? "你" : "师"}
      </div>

      {/* Bubble */}
      <div className={`flex flex-col gap-1 max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        <div
          className={`relative px-4 py-3 rounded-2xl leading-relaxed text-[0.95rem] ${
            isUser
              ? "bg-ink-500 text-cream-100 rounded-tr-sm"
              : "bg-ink-700 border border-ink-500 text-cream-100 rounded-tl-sm"
          }`}
        >
          <span className={pinyinMode ? "ruby-enabled" : ""}>
            {message.content}
          </span>

          {/* Speak button for assistant messages */}
          {!isUser && onSpeak && (
            <button
              onClick={() => onSpeak(message.content)}
              className="absolute -bottom-2 -right-2 w-6 h-6 rounded-full bg-ink-400 hover:bg-gold-700 text-xs flex items-center justify-center transition-colors cursor-pointer opacity-70 hover:opacity-100"
              title="Read aloud"
            >
              🔊
            </button>
          )}
        </div>
        <span className="text-cream-500 text-xs px-1">{formattedTime}</span>
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-up">
      <div className="w-9 h-9 rounded-full bg-vermillion-700 flex items-center justify-center text-sm font-bold text-cream-100 select-none shrink-0">
        师
      </div>
      <div className="px-4 py-3 bg-ink-700 border border-ink-500 rounded-2xl rounded-tl-sm">
        <div className="flex gap-1.5 items-center h-5">
          <span className="typing-dot" />
          <span className="typing-dot" />
          <span className="typing-dot" />
        </div>
      </div>
    </div>
  );
}

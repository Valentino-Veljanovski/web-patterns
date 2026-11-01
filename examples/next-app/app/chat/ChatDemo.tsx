"use client";
import { useMemo } from "react";
import { createOnPageAssistant, FloatingChatWidget } from "web-patterns/chat";
import { FALLBACK, GREETING, SOURCES, STARTERS } from "./sources";

export function ChatDemo() {
  const assistant = useMemo(() => createOnPageAssistant({ sources: SOURCES, fallback: FALLBACK }), []);
  return (
    <FloatingChatWidget
      assistant={assistant}
      greeting={GREETING}
      starters={STARTERS}
      storageKey="web-patterns-example-chat"
      title="Site assistant"
    />
  );
}

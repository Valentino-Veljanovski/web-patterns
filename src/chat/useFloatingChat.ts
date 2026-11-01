"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { AssistantLink, OnPageAssistant } from "./createOnPageAssistant";

/**
 * useFloatingChat
 * ===============
 * State for a floating chat panel over an `OnPageAssistant`: open flag,
 * input, messages, `send`, `reset`, the starter questions and a ref for the
 * scrolling list.
 *
 * - `send(text)` appends the user's message and the assistant's answer in
 *   the same state update. The assistant is synchronous, so there is no
 *   loading state, no stream and no request.
 * - History lives in localStorage under `storageKey`. It is read ONLY in an
 *   effect after mount, never during render: the server render and the
 *   first client render show the greeting, then the effect swaps in the
 *   stored messages. The old widget read it inside `useMemo` during render.
 * - The parse is guarded: malformed JSON, a non-array, or entries without a
 *   role are ignored. A message without `parts` renders as empty text.
 * - Saved on every change after the first load, capped at `maxStored`
 *   messages; quota and private-mode errors are swallowed.
 */

export interface ChatMessagePart {
  type: "text";
  text: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: ChatMessagePart[];
  link?: AssistantLink;
}

export interface UseFloatingChatOptions {
  assistant: OnPageAssistant;
  /** First assistant message, also what `reset` returns to. */
  greeting: string;
  /** Suggested questions, shown as buttons. */
  starters?: string[];
  /** localStorage key. Default "web-patterns-chat". */
  storageKey?: string;
  /** Messages kept in storage. Default 30. */
  maxStored?: number;
}

export interface FloatingChatState {
  open: boolean;
  setOpen: (open: boolean) => void;
  input: string;
  setInput: (value: string) => void;
  messages: ChatMessage[];
  send: (text: string) => void;
  reset: () => void;
  starters: string[];
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

const DEFAULT_KEY = "web-patterns-chat";
const DEFAULT_MAX_STORED = 30;

/** Text of a message; tolerates stored messages whose `parts` is missing or malformed. */
export function messageText(message: Pick<ChatMessage, "parts"> | { parts?: unknown }): string {
  const parts = (message as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((p) => (p && typeof p === "object" && typeof (p as ChatMessagePart).text === "string" ? (p as ChatMessagePart).text : ""))
    .join("");
}

function isMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const role = (value as { role?: unknown }).role;
  return role === "user" || role === "assistant";
}

function readHistory(key: string): ChatMessage[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const messages = parsed.filter(isMessage).map((m, i) => ({ ...m, id: typeof m.id === "string" ? m.id : `stored-${i}` }));
    return messages.length ? messages : null;
  } catch {
    return null;
  }
}

function writeHistory(key: string, messages: ChatMessage[], max: number): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(messages.slice(-max)));
  } catch {
    // Private mode or a full quota: the conversation still works for this visit.
  }
}

function clearHistory(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function useFloatingChat(options: UseFloatingChatOptions): FloatingChatState {
  const { assistant, greeting, starters = [], storageKey = DEFAULT_KEY, maxStored = DEFAULT_MAX_STORED } = options;
  const greetingMessage = useCallback(
    (): ChatMessage => ({ id: "greeting", role: "assistant", parts: [{ type: "text", text: greeting }] }),
    [greeting],
  );
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [greetingMessage()]);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const loadedRef = useRef(false);
  const counterRef = useRef(0);

  // Storage is read here, after mount, never during render: the server and the first client render
  // agree on the greeting, then the stored conversation replaces it. That is one extra commit on
  // purpose, so the lint rule against setState in effects is switched off for this line.
  useEffect(() => {
    const stored = readHistory(storageKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setMessages(stored);
    loadedRef.current = true;
  }, [storageKey]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (messages.length > 1) writeHistory(storageKey, messages, maxStored);
  }, [messages, storageKey, maxStored]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, open]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const n = ++counterRef.current;
      const reply = assistant.answer(trimmed);
      const user: ChatMessage = { id: `u${n}`, role: "user", parts: [{ type: "text", text: trimmed }] };
      const answer: ChatMessage = { id: `a${n}`, role: "assistant", parts: [{ type: "text", text: reply.text }], ...(reply.link ? { link: reply.link } : {}) };
      setMessages((prev) => [...prev, user, answer]);
      setInput("");
    },
    [assistant],
  );

  const reset = useCallback(() => {
    clearHistory(storageKey);
    setMessages([greetingMessage()]);
    setInput("");
  }, [greetingMessage, storageKey]);

  return { open, setOpen, input, setInput, messages, send, reset, starters, scrollRef };
}

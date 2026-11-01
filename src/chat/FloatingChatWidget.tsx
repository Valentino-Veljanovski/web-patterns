"use client";
import { useId, type CSSProperties, type FormEvent, type KeyboardEvent } from "react";
import type { OnPageAssistant } from "./createOnPageAssistant";
import { messageText, useFloatingChat, type UseFloatingChatOptions } from "./useFloatingChat";

/**
 * FloatingChatWidget
 * ==================
 * The presentational layer over `useFloatingChat`: a toggle button in the
 * corner and, when open, a panel with the messages, the starter questions,
 * the input and a reset button.
 *
 * Accessibility: the toggle carries `aria-expanded` and `aria-controls`; the
 * panel is `role="dialog"` with `aria-label`; the input has a visible label;
 * Escape anywhere in the panel closes it and returns focus to the toggle.
 * Every message is `data-chat-message="user|assistant"`, and an assistant
 * message with a link renders it as an anchor after the text.
 *
 * Styling is inline with CSS variables, so a stylesheet can retheme it:
 *   --chat-bg (#fff) --chat-fg (#111) --chat-accent (#2563eb)
 *   --chat-border (#d1d5db) --chat-z (100) --chat-width (22rem)
 * Nothing in this file makes a network request; the assistant is synchronous.
 */

export interface FloatingChatWidgetProps extends UseFloatingChatOptions {
  assistant: OnPageAssistant;
  /** Accessible name of the toggle and the dialog. Default "Site assistant". */
  title?: string;
  /** Input placeholder. Default "Ask about the site". */
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}

const panelStyle: CSSProperties = {
  position: "fixed",
  right: "1.5rem",
  bottom: "5rem",
  width: "var(--chat-width, 22rem)",
  maxWidth: "calc(100vw - 3rem)",
  maxHeight: "70vh",
  display: "flex",
  flexDirection: "column",
  background: "var(--chat-bg, #fff)",
  color: "var(--chat-fg, #111)",
  border: "1px solid var(--chat-border, #d1d5db)",
  borderRadius: "0.75rem",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.25)",
  zIndex: "var(--chat-z, 100)",
  overflow: "hidden",
};

const toggleStyle: CSSProperties = {
  position: "fixed",
  right: "1.5rem",
  bottom: "1.5rem",
  padding: "0.6rem 1rem",
  borderRadius: "999px",
  border: "1px solid var(--chat-border, #d1d5db)",
  background: "var(--chat-accent, #2563eb)",
  color: "#fff",
  cursor: "pointer",
  zIndex: "var(--chat-z, 100)",
};

export function FloatingChatWidget(props: FloatingChatWidgetProps) {
  const { title = "Site assistant", placeholder = "Ask about the site", className, style, ...hookOptions } = props;
  const { open, setOpen, input, setInput, messages, send, reset, starters, scrollRef } = useFloatingChat(hookOptions);
  const id = useId();
  const panelId = `${id}-panel`;
  const inputId = `${id}-input`;
  const toggleId = `${id}-toggle`;

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    send(input);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      e.stopPropagation();
      setOpen(false);
      document.getElementById(toggleId)?.focus();
    }
  };

  return (
    <div className={className} style={style} data-floating-chat={open ? "open" : "closed"}>
      <button
        id={toggleId}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        style={toggleStyle}
      >
        {title}
      </button>
      {open && (
        <section id={panelId} role="dialog" aria-label={title} onKeyDown={onKeyDown} style={panelStyle}>
          <div ref={scrollRef} style={{ overflowY: "auto", padding: "1rem", display: "grid", gap: "0.5rem" }}>
            {messages.map((m) => (
              <div
                key={m.id}
                data-chat-message={m.role}
                style={{
                  justifySelf: m.role === "user" ? "end" : "start",
                  maxWidth: "85%",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.75rem",
                  background: m.role === "user" ? "var(--chat-accent, #2563eb)" : "rgba(127, 127, 127, 0.15)",
                  color: m.role === "user" ? "#fff" : "inherit",
                  whiteSpace: "pre-wrap",
                }}
              >
                {messageText(m)}
                {m.link && (
                  <>
                    {" "}
                    <a href={m.link.href} style={{ color: "inherit", textDecoration: "underline" }}>
                      {m.link.label}
                    </a>
                  </>
                )}
              </div>
            ))}
          </div>
          {starters.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", padding: "0 1rem 0.75rem" }}>
              {starters.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  style={{ fontSize: "0.85rem", padding: "0.3rem 0.6rem", borderRadius: "999px", border: "1px solid var(--chat-border, #d1d5db)", background: "transparent", color: "inherit", cursor: "pointer" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={onSubmit} style={{ display: "flex", gap: "0.5rem", padding: "0.75rem 1rem", borderTop: "1px solid var(--chat-border, #d1d5db)" }}>
            <label htmlFor={inputId} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0 0 0 0)" }}>
              Your question
            </label>
            <input
              id={inputId}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={placeholder}
              autoComplete="off"
              style={{ flex: 1, padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--chat-border, #d1d5db)", background: "transparent", color: "inherit" }}
            />
            <button type="submit" style={{ padding: "0.5rem 0.9rem", borderRadius: "0.5rem", border: "none", background: "var(--chat-accent, #2563eb)", color: "#fff", cursor: "pointer" }}>
              Send
            </button>
            <button type="button" onClick={reset} style={{ padding: "0.5rem 0.75rem", borderRadius: "0.5rem", border: "1px solid var(--chat-border, #d1d5db)", background: "transparent", color: "inherit", cursor: "pointer" }}>
              Reset
            </button>
          </form>
        </section>
      )}
    </div>
  );
}

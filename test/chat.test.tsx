import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToString } from "react-dom/server";
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { createOnPageAssistant } from "../src/chat/createOnPageAssistant";
import { useFloatingChat } from "../src/chat/useFloatingChat";
import { FloatingChatWidget } from "../src/chat/FloatingChatWidget";

const SOURCES = [
  { keywords: ["music", "song", "songs"], answer: "Start with the featured songs on the Music page.", link: { label: "Music", href: "/music" } },
  { keywords: ["theatre", "award"], answer: "The Theatre page lists stage music and awards.", link: { label: "Theatre", href: "/theatre" } },
  { keywords: ["book", "booking", "contact"], answer: "Use the Contact section and include city, date and request type." },
];
const FALLBACK = "I can help with the music, theatre work and booking.";
const assistant = createOnPageAssistant({ sources: SOURCES, fallback: FALLBACK });
const STARTERS = ["Tell me about the music", "How can I book the artist?"];
const GREETING = "Hello. Ask me about music, theatre or booking.";
const KEY = "test-chat-history";

const widget = () => (
  <FloatingChatWidget assistant={assistant} starters={STARTERS} greeting={GREETING} storageKey={KEY} title="Site assistant" />
);

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(() => {
  window.localStorage.clear();
});

describe("createOnPageAssistant E21d", () => {
  it("E21d: unknown question → fallback; keyword match → the source's answer with its link", () => {
    expect(assistant.answer("What is the weather?")).toEqual({ text: FALLBACK });
    expect(assistant.answer("Tell me about the MUSIC")).toEqual({
      text: SOURCES[0]!.answer,
      link: { label: "Music", href: "/music" },
    });
  });

  it("matches on word boundaries, case-insensitively, and ties go to the first source", () => {
    expect(assistant.answer("musician").text).toBe(FALLBACK);
    expect(assistant.answer("Song!").text).toBe(SOURCES[0]!.answer);
    expect(assistant.answer("music and theatre").text).toBe(SOURCES[0]!.answer);
    expect(assistant.answer("theatre, award and music").text).toBe(SOURCES[1]!.answer);
    expect(assistant.answer("").text).toBe(FALLBACK);
  });
});

describe("useFloatingChat E21", () => {
  // Old floating-chat-widget.tsx line 44: `useMemo(() => loadHistory() ?? [INITIAL_GREETING], [])` read
  // localStorage during render, also during the server render.
  it("E21a: no localStorage read during render", () => {
    window.localStorage.setItem(KEY, JSON.stringify([{ id: "a", role: "assistant", parts: [{ type: "text", text: "old" }] }]));
    const getItem = vi.spyOn(Storage.prototype, "getItem");
    const html = renderToString(widget());
    expect(html).toContain("Site assistant");
    expect(getItem).not.toHaveBeenCalled();

    // After mount the effect reads it once and the stored history is shown.
    render(widget());
    expect(getItem).toHaveBeenCalledTimes(1);
    expect(getItem).toHaveBeenCalledWith(KEY);
    fireEvent.click(screen.getByRole("button", { name: /site assistant/i }));
    expect(screen.getByText("old")).toBeTruthy();
  });

  it("E21b: malformed stored history is ignored, no crash", () => {
    window.localStorage.setItem(KEY, "{not json");
    const { result } = renderHook(() => useFloatingChat({ assistant, starters: STARTERS, greeting: GREETING, storageKey: KEY }));
    expect(result.current.messages).toHaveLength(1);
    expect(result.current.messages[0]!.parts[0]!.text).toBe(GREETING);

    window.localStorage.setItem(KEY, JSON.stringify({ not: "an array" }));
    const second = renderHook(() => useFloatingChat({ assistant, starters: STARTERS, greeting: GREETING, storageKey: KEY }));
    expect(second.result.current.messages).toHaveLength(1);
  });

  it("E21c: message parts are guarded", () => {
    window.localStorage.setItem(KEY, JSON.stringify([{ id: "x", role: "assistant" }, { id: "y", role: "user", parts: "nope" }]));
    const { container } = render(widget());
    fireEvent.click(screen.getByRole("button", { name: /site assistant/i }));
    const items = container.querySelectorAll("[data-chat-message]");
    expect(items).toHaveLength(2);
    expect(items[0]!.textContent).toBe("");
    expect(items[1]!.textContent).toBe("");
  });

  it("saves history on change, capped at maxStored, and swallows quota errors", () => {
    const { result } = renderHook(() =>
      useFloatingChat({ assistant, starters: STARTERS, greeting: GREETING, storageKey: KEY, maxStored: 3 }),
    );
    act(() => result.current.send("music"));
    act(() => result.current.send("theatre"));
    const stored = JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as Array<{ role: string }>;
    expect(stored).toHaveLength(3);
    expect(stored.map((m) => m.role)).toEqual(["assistant", "user", "assistant"]);
    expect(result.current.messages).toHaveLength(5);

    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    expect(() => act(() => result.current.send("book"))).not.toThrow();
    expect(result.current.messages).toHaveLength(7);

    act(() => result.current.reset());
    expect(result.current.messages).toHaveLength(1);
  });

  it("ignores empty input and keeps the input state", () => {
    const { result } = renderHook(() => useFloatingChat({ assistant, starters: STARTERS, greeting: GREETING, storageKey: KEY }));
    act(() => result.current.send("   "));
    expect(result.current.messages).toHaveLength(1);
    act(() => result.current.setInput("hello"));
    expect(result.current.input).toBe("hello");
    act(() => result.current.send(result.current.input));
    expect(result.current.input).toBe("");
    expect(result.current.starters).toEqual(STARTERS);
  });
});

describe("FloatingChatWidget E21e/f", () => {
  it("E21e: FloatingChatWidget renders, opens, sends, resets; Escape closes", () => {
    render(widget());
    const toggle = screen.getByRole("button", { name: /site assistant/i });
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const dialog = screen.getByRole("dialog");
    expect(screen.getByText(GREETING)).toBeTruthy();
    expect(screen.getByRole("button", { name: STARTERS[0]! })).toBeTruthy();

    const input = screen.getByLabelText(/your question/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "Where is the music?" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText("Where is the music?")).toBeTruthy();
    expect(screen.getByText(SOURCES[0]!.answer)).toBeTruthy();
    expect(screen.getByRole("link", { name: "Music" }).getAttribute("href")).toBe("/music");
    expect(input.value).toBe("");

    fireEvent.click(screen.getByRole("button", { name: STARTERS[1]! }));
    expect(screen.getByText(SOURCES[2]!.answer)).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    expect(screen.queryByText(SOURCES[0]!.answer)).toBeNull();
    expect(screen.getByText(GREETING)).toBeTruthy();

    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
  });

  it("E21f: no network", () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const xhrOpen = vi.spyOn(XMLHttpRequest.prototype, "open");
    render(widget());
    fireEvent.click(screen.getByRole("button", { name: /site assistant/i }));
    const input = screen.getByLabelText(/your question/i);
    fireEvent.change(input, { target: { value: "book" } });
    fireEvent.submit(input.closest("form")!);
    expect(screen.getByText(SOURCES[2]!.answer)).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(xhrOpen).not.toHaveBeenCalled();
  });
});

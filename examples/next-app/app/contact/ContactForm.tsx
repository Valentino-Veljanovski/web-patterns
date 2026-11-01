"use client";
import { useState, type FormEvent } from "react";

interface Result {
  status: number;
  body: Record<string, unknown>;
  payload?: unknown;
}

export function ContactForm() {
  const [result, setResult] = useState<Result | null>(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const body = Object.fromEntries(new FormData(e.currentTarget).entries());
    setBusy(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as Record<string, unknown>;
      let payload: unknown;
      if (res.ok) {
        const last = (await (await fetch("/api/contact")).json()) as { last: unknown };
        payload = last.last;
      }
      setResult({ status: res.status, body: json, payload });
    } finally {
      setBusy(false);
    }
  };

  const message =
    result && typeof result.body.error === "string"
      ? `${result.body.error}${Array.isArray(result.body.fields) ? ` (${result.body.fields.join(", ")})` : ""}`
      : "ok";

  return (
    <>
      <form onSubmit={onSubmit} className="contact-form" data-contact-form>
        <label>
          Name
          <input name="name" type="text" defaultValue="Ada Lovelace" required />
        </label>
        <label>
          E-mail
          <input name="email" type="text" defaultValue="ada@example.com" />
        </label>
        <label>
          Message
          <textarea name="message" rows={4} defaultValue="Hello from the example app." />
        </label>
        {/* Honeypot: hidden from people, filled by bots. */}
        <label className="visually-hidden" aria-hidden="true">
          Website
          <input name="website" type="text" tabIndex={-1} autoComplete="off" />
        </label>
        <button type="submit" disabled={busy}>
          Send
        </button>
      </form>
      {result && (
        <div className="card" data-contact-status={result.status}>
          <p>
            HTTP {result.status}: <span data-contact-message>{message}</span>
          </p>
          {result.payload !== undefined && (
            <pre data-contact-payload style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
              {JSON.stringify(result.payload, null, 2)}
            </pre>
          )}
        </div>
      )}
    </>
  );
}

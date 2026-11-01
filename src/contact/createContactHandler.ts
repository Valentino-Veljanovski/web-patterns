import type { SendMailPayload } from "./graphTypes";

/**
 * createContactHandler
 * ====================
 * A factory for a contact-form POST handler (`export const POST =
 * createContactHandler({...})` in a Next route file; any runtime with the
 * Fetch API works, there is no Next import).
 *
 * Pipeline, each step answers on its own:
 *   1. method must be POST (405)
 *   2. rate limit per client key (429)
 *   3. JSON object body (400 "invalid_body")
 *   4. honeypot: a filled honeypot field answers 200 and sends nothing,
 *      so the bot learns nothing
 *   5. required fields present and strings (400 "missing_fields" + list)
 *   6. field lengths (400 "too_long" + list)
 *   7. e-mail format (400 "invalid_email")
 *   8. build the Graph sendMail payload, every value HTML-escaped, and call
 *      the injected `send(payload)`
 *
 * A transport failure answers 500 with the fixed `SEND_FAILED_MESSAGE` and
 * nothing else; the error text stays on the server (console.error). The
 * payload has the same shape as `sendMailPayload` in the n8n repository,
 * see graphTypes.ts.
 */

export const SEND_FAILED_MESSAGE = "The message could not be sent. Please try again later.";

export interface RateLimiter {
  /** True when the request identified by `key` at time `now` (ms) may proceed. */
  allow(key: string, now: number): boolean;
}

export interface ContactHandlerOptions {
  /** The transport, e.g. `createGraphSender(...).send`. */
  send: (payload: SendMailPayload) => Promise<void>;
  /** Required body fields, e.g. ["name", "email", "message"]. */
  fields: string[];
  /** Mailbox the form delivers to. */
  recipient: string;
  /** Mailbox the mail is sent from (the Graph user). */
  sender: string;
  /** Subject becomes "<subjectPrefix>: <name field value>". Default "Contact form". */
  subjectPrefix?: string;
  /** Field that holds the sender's address. Default "email". */
  emailField?: string;
  /** Field used in the subject. Default "name". */
  nameField?: string;
  /** Hidden field that only bots fill. Omit to disable. */
  honeypot?: string;
  /** Maximum length of any field value. Default 10000. */
  maxLength?: number;
  /** In-memory sliding window; default 5 per hour. `null` disables. */
  rateLimit?: { max: number; windowMs: number } | null;
  /** Custom limiter, replaces the in-memory default. */
  rateLimiter?: RateLimiter;
  /** Client identity for the limiter. Default: first x-forwarded-for address, else "unknown". */
  clientKey?: (request: Request) => string;
  /** Clock, for tests. */
  now?: () => number;
}

export type ContactHandler = (request: Request) => Promise<Response>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** One validator for the whole handler: a@b.tld without whitespace, at most 254 characters. */
export function isEmail(value: string): boolean {
  return value.length <= 254 && EMAIL_RE.test(value);
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

/** Counts the requests per key inside the last `windowMs`; the (max+1)th is refused. */
export function createSlidingWindowLimiter({ max, windowMs }: { max: number; windowMs: number }): RateLimiter {
  const hits = new Map<string, number[]>();
  return {
    allow(key, now) {
      const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
      if (recent.length >= max) {
        hits.set(key, recent);
        return false;
      }
      recent.push(now);
      hits.set(key, recent);
      return true;
    },
  };
}

function defaultClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8" } });
}

function buildHtml(fields: string[], values: Record<string, string>): string {
  const rows = fields
    .map(
      (f) =>
        `<p style="margin:0 0 4px"><strong>${escapeHtml(f)}</strong></p>` +
        `<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(values[f] ?? "")}</p>`,
    )
    .join("\n");
  return `<div style="font-family:Arial,sans-serif;max-width:600px">\n${rows}\n</div>`;
}

export function createContactHandler(options: ContactHandlerOptions): ContactHandler {
  const {
    send,
    fields,
    recipient,
    sender,
    subjectPrefix = "Contact form",
    emailField = "email",
    nameField = "name",
    honeypot,
    maxLength = 10000,
    rateLimit = { max: 5, windowMs: 60 * 60 * 1000 },
    clientKey = defaultClientKey,
    now = Date.now,
  } = options;
  const limiter = options.rateLimiter ?? (rateLimit ? createSlidingWindowLimiter(rateLimit) : null);

  return async (request) => {
    if (request.method !== "POST") return json(405, { error: "method_not_allowed" });
    if (limiter && !limiter.allow(clientKey(request), now())) return json(429, { error: "rate_limited" });

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return json(400, { error: "invalid_body" });
    }
    if (typeof body !== "object" || body === null || Array.isArray(body)) return json(400, { error: "invalid_body" });
    const record = body as Record<string, unknown>;

    if (honeypot && typeof record[honeypot] === "string" && record[honeypot] !== "") return json(200, { ok: true });

    const values: Record<string, string> = {};
    const missing: string[] = [];
    for (const f of fields) {
      const v = record[f];
      if (typeof v !== "string" || v.trim() === "") missing.push(f);
      else values[f] = v.trim();
    }
    if (missing.length) return json(400, { error: "missing_fields", fields: missing });

    const tooLong = fields.filter((f) => (values[f] ?? "").length > maxLength);
    if (tooLong.length) return json(400, { error: "too_long", fields: tooLong });

    const email = values[emailField];
    if (email !== undefined && !isEmail(email)) return json(400, { error: "invalid_email", fields: [emailField] });

    const subjectName = values[nameField] ?? values[fields[0] ?? ""] ?? "";
    const payload: SendMailPayload = {
      message: {
        subject: `${subjectPrefix}: ${subjectName}`,
        body: { contentType: "HTML", content: buildHtml(fields, values) },
        toRecipients: [{ emailAddress: { address: recipient } }],
        from: { emailAddress: { address: sender } },
        ...(email ? { replyTo: [{ emailAddress: { address: email } }] } : {}),
      },
      saveToSentItems: true,
    };

    try {
      await send(payload);
    } catch (err) {
      console.error("contact: send failed", err);
      return json(500, { error: SEND_FAILED_MESSAGE });
    }
    return json(200, { ok: true });
  };
}

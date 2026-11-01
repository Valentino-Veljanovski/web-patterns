import { describe, expect, it, vi } from "vitest";
import { createContactHandler, createSlidingWindowLimiter, isEmail, SEND_FAILED_MESSAGE } from "../src/contact/createContactHandler";
import { createGraphSender } from "../src/contact/graphSend";
import type { SendMailPayload } from "../src/contact/graphTypes";

const ENDPOINT = "http://localhost/api/contact";
function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}
const VALID = { name: "Ada <Lovelace>", email: "ada@example.com", message: 'Hello & "bye"\nsecond line' };

function setup(overrides: Partial<Parameters<typeof createContactHandler>[0]> = {}) {
  const send = vi.fn<(payload: SendMailPayload) => Promise<void>>(async () => {});
  const handler = createContactHandler({
    send,
    fields: ["name", "email", "message"],
    recipient: "inbox@example.com",
    sender: "forms@example.com",
    subjectPrefix: "Website",
    ...overrides,
  });
  return { send, handler };
}

describe("createContactHandler C1-C6", () => {
  it("C1: 400 with the missing-field list", async () => {
    const { send, handler } = setup();
    const res = await handler(post({ name: "Ada", email: 42 }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("missing_fields");
    expect(body.fields).toEqual(["email", "message"]);
    expect(send).not.toHaveBeenCalled();
  });

  it("C2: 400 on invalid email", async () => {
    const { send, handler } = setup();
    const res = await handler(post({ ...VALID, email: "not an email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_email", fields: ["email"] });
    expect(send).not.toHaveBeenCalled();
    expect(isEmail("a@b.co")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("a b@c.de")).toBe(false);
    expect(isEmail(`${"x".repeat(250)}@c.de`)).toBe(false);
  });

  it("C3: payload shape equals the Graph sendMail shape and every value is HTML-escaped", async () => {
    const { send, handler } = setup();
    const res = await handler(post(VALID));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(send).toHaveBeenCalledTimes(1);
    const payload = send.mock.calls[0]![0];
    expect(payload.saveToSentItems).toBe(true);
    expect(payload.message.subject).toBe("Website: Ada <Lovelace>");
    expect(payload.message.body.contentType).toBe("HTML");
    expect(payload.message.toRecipients).toEqual([{ emailAddress: { address: "inbox@example.com" } }]);
    expect(payload.message.from).toEqual({ emailAddress: { address: "forms@example.com" } });
    expect(payload.message.replyTo).toEqual([{ emailAddress: { address: "ada@example.com" } }]);
    expect(Object.keys(payload).sort()).toEqual(["message", "saveToSentItems"]);
    const html = payload.message.body.content;
    expect(html).toContain("Ada &lt;Lovelace&gt;");
    expect(html).toContain("Hello &amp; &quot;bye&quot;");
    expect(html).not.toContain("<Lovelace>");
    expect(html).not.toContain('"bye"');
  });

  // Old api-contact-graph.ts line 155: `{ error: "Failed to send email", detail: error.message }` went to the browser.
  it("C4: transport failure → 500 with the fixed message and no error text in the body", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    const { handler } = setup({ send: vi.fn(async () => Promise.reject(new Error("AADSTS7000215 secret 42 expired"))) });
    const res = await handler(post(VALID));
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(JSON.parse(text)).toEqual({ error: SEND_FAILED_MESSAGE });
    expect(text).not.toContain("AADSTS");
    expect(text).not.toContain("42");
    expect(text).not.toContain("detail");
    expect(logged).toHaveBeenCalledTimes(1); // the error text goes to the server log only
  });

  it("C5: honeypot filled → 200, send never called", async () => {
    const { send, handler } = setup({ honeypot: "website" });
    const res = await handler(post({ ...VALID, website: "http://spam.example" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(send).not.toHaveBeenCalled();
    const ok = await handler(post({ ...VALID, website: "" }));
    expect(ok.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("C6: rate limit: the (N+1)th request within the window → 429", async () => {
    let now = 1_000_000;
    const { send, handler } = setup({ rateLimit: { max: 2, windowMs: 60_000 }, now: () => now });
    const ip = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };
    expect((await handler(post(VALID, ip))).status).toBe(200);
    expect((await handler(post(VALID, ip))).status).toBe(200);
    const third = await handler(post(VALID, ip));
    expect(third.status).toBe(429);
    expect(await third.json()).toEqual({ error: "rate_limited" });
    expect(send).toHaveBeenCalledTimes(2);
    // Another client is not affected; the first is allowed again once the window has passed.
    expect((await handler(post(VALID, { "x-forwarded-for": "198.51.100.2" }))).status).toBe(200);
    now += 60_001;
    expect((await handler(post(VALID, ip))).status).toBe(200);
  });

  it("sliding window limiter counts only the requests inside the window", () => {
    const limiter = createSlidingWindowLimiter({ max: 2, windowMs: 1000 });
    expect(limiter.allow("k", 0)).toBe(true);
    expect(limiter.allow("k", 500)).toBe(true);
    expect(limiter.allow("k", 900)).toBe(false);
    expect(limiter.allow("k", 1001)).toBe(true); // the request at 0 has left the window
    expect(limiter.allow("k", 1200)).toBe(false);
  });

  it("rejects non-POST, non-JSON and over-long fields with client errors", async () => {
    const { send, handler } = setup({ maxLength: 20 });
    expect((await handler(new Request(ENDPOINT, { method: "GET" }))).status).toBe(405);
    expect((await handler(post("{not json"))).status).toBe(400);
    expect((await handler(post([1, 2]))).status).toBe(400);
    const long = await handler(post({ ...VALID, message: "x".repeat(21) }));
    expect(long.status).toBe(400);
    expect(await long.json()).toEqual({ error: "too_long", fields: ["message"] });
    expect(send).not.toHaveBeenCalled();
  });
});

describe("graphSend C7", () => {
  const TOKEN_URL = "https://login.microsoftonline.com/tenant-1/oauth2/v2.0/token";
  const SEND_URL = "https://graph.microsoft.com/v1.0/users/forms@example.com/sendMail";
  const payload: SendMailPayload = {
    message: {
      subject: "s",
      body: { contentType: "HTML", content: "<p>x</p>" },
      toRecipients: [{ emailAddress: { address: "inbox@example.com" } }],
    },
    saveToSentItems: true,
  };

  function mockFetch() {
    return vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (url === TOKEN_URL) {
        return new Response(JSON.stringify({ access_token: "tok-" + (init?.body ? "cc" : "?"), expires_in: 3600, token_type: "Bearer" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      if (url === SEND_URL) return new Response(null, { status: 202 });
      return new Response("not found", { status: 404 });
    });
  }

  it("C7a: requests a token once and reuses it until expiry", async () => {
    let now = 0;
    const fetch = mockFetch();
    const sender = createGraphSender({
      tenantId: "tenant-1",
      clientId: "client-1",
      clientSecret: "secret-1",
      sender: "forms@example.com",
      fetch,
      now: () => now,
    });
    await sender.send(payload);
    await sender.send(payload);
    const tokenCalls = () => fetch.mock.calls.filter((c) => String(c[0]) === TOKEN_URL);
    expect(tokenCalls()).toHaveLength(1);
    const tokenInit = tokenCalls()[0]![1]!;
    expect(tokenInit.method).toBe("POST");
    const form = new URLSearchParams(String(tokenInit.body));
    expect(form.get("grant_type")).toBe("client_credentials");
    expect(form.get("scope")).toBe("https://graph.microsoft.com/.default");
    expect(form.get("client_id")).toBe("client-1");
    expect(form.get("client_secret")).toBe("secret-1");

    now = 3600 * 1000 + 1;
    await sender.send(payload);
    expect(tokenCalls()).toHaveLength(2);
  });

  it("C7b: posts to /users/{sender}/sendMail", async () => {
    const fetch = mockFetch();
    const sender = createGraphSender({ tenantId: "tenant-1", clientId: "c", clientSecret: "s", sender: "forms@example.com", fetch });
    await sender.send(payload);
    const call = fetch.mock.calls.find((c) => String(c[0]) === SEND_URL);
    expect(call).toBeDefined();
    const init = call![1]!;
    expect(init.method).toBe("POST");
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBe("Bearer tok-cc");
    expect(headers.get("content-type")).toBe("application/json");
    expect(JSON.parse(String(init.body))).toEqual(payload);
  });

  it("C7c: a non-2xx Graph answer throws, and the token is dropped on 401", async () => {
    const fetch = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url === TOKEN_URL) return new Response(JSON.stringify({ access_token: "t", expires_in: 3600 }), { status: 200 });
      return new Response("denied", { status: 401 });
    });
    const sender = createGraphSender({ tenantId: "tenant-1", clientId: "c", clientSecret: "s", sender: "forms@example.com", fetch });
    await expect(sender.send(payload)).rejects.toThrow(/401/);
    await expect(sender.send(payload)).rejects.toThrow(/401/);
    expect(fetch.mock.calls.filter((c) => String(c[0]) === TOKEN_URL)).toHaveLength(2);
  });

  it("C7d: a failed token request throws without leaking the secret", async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: "invalid_client", error_description: "secret-1 is wrong" }), { status: 400 }));
    const sender = createGraphSender({ tenantId: "tenant-1", clientId: "c", clientSecret: "secret-1", sender: "forms@example.com", fetch });
    let message = "";
    try {
      await sender.send(payload);
    } catch (err) {
      message = String(err);
    }
    expect(message).toMatch(/token/i);
    expect(message).not.toContain("secret-1");
  });
});

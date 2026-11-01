import type { SendMailPayload } from "./graphTypes";

/**
 * graphSend
 * =========
 * Microsoft Graph transport for the contact handler, with `fetch` only:
 *
 * - client-credentials token from
 *   `https://login.microsoftonline.com/{tenant}/oauth2/v2.0/token` with the
 *   scope `https://graph.microsoft.com/.default`; the app registration needs
 *   the application permission Mail.Send with admin consent
 * - `POST https://graph.microsoft.com/v1.0/users/{sender}/sendMail`
 * - the token is cached until 60 s before `expires_in` and dropped after a
 *   401, so the next call fetches a fresh one
 *
 * Errors carry the HTTP status, never the response body or the secret: the
 * handler turns them into a fixed 500 anyway, and the server log must not
 * echo credentials. No SDK: the old route pulled three packages for two
 * requests.
 */

export interface GraphSenderOptions {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Mailbox the mail is sent from, e.g. "forms@example.com". */
  sender: string;
  /** Injected for tests; default `globalThis.fetch`. */
  fetch?: typeof fetch;
  /** Clock in ms, for tests. */
  now?: () => number;
  /** Override the login host, e.g. for a national cloud. */
  loginHost?: string;
  /** Override the Graph origin. */
  graphOrigin?: string;
}

export interface GraphSender {
  send(payload: SendMailPayload): Promise<void>;
}

const SKEW_MS = 60 * 1000;

export function createGraphSender(options: GraphSenderOptions): GraphSender {
  const {
    tenantId,
    clientId,
    clientSecret,
    sender,
    now = Date.now,
    loginHost = "https://login.microsoftonline.com",
    graphOrigin = "https://graph.microsoft.com",
  } = options;
  const doFetch = options.fetch ?? globalThis.fetch;
  const tokenUrl = `${loginHost}/${tenantId}/oauth2/v2.0/token`;
  const sendUrl = `${graphOrigin}/v1.0/users/${sender}/sendMail`;
  let cached: { token: string; expiresAt: number } | null = null;

  async function token(): Promise<string> {
    const t = now();
    if (cached && cached.expiresAt > t) return cached.token;
    const form = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      scope: "https://graph.microsoft.com/.default",
    });
    const res = await doFetch(tokenUrl, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
    if (!res.ok) throw new Error(`graph token request failed: HTTP ${res.status}`);
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) throw new Error("graph token request failed: no access_token in the answer");
    const ttl = (typeof data.expires_in === "number" ? data.expires_in : 3600) * 1000;
    cached = { token: data.access_token, expiresAt: t + ttl - SKEW_MS };
    return cached.token;
  }

  return {
    async send(payload) {
      const bearer = await token();
      const res = await doFetch(sendUrl, {
        method: "POST",
        headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.status === 401) cached = null;
      if (!res.ok) throw new Error(`graph sendMail failed: HTTP ${res.status}`);
    },
  };
}

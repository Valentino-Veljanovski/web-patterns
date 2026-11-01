import { createContactHandler, type SendMailPayload } from "web-patterns/contact";

// Recording transport: the payload that would go to Microsoft Graph is kept in memory
// and shown on /contact. Nothing leaves the process; the host proof runs without network.
let lastPayload: SendMailPayload | null = null;

export const dynamic = "force-dynamic";

export const POST = createContactHandler({
  send: async (payload) => {
    lastPayload = payload;
  },
  fields: ["name", "email", "message"],
  recipient: "inbox@example.com",
  sender: "forms@example.com",
  subjectPrefix: "Example contact",
  honeypot: "website",
  // Wider than the default 5 per hour so that repeated host-proof runs on one machine stay under it.
  rateLimit: { max: 20, windowMs: 60_000 },
});

export function GET() {
  return Response.json({ last: lastPayload });
}

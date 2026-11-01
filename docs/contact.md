# Contact form: a route handler over Microsoft Graph, and the PHP variant

`src/contact/` comes from the 3D-service landing page prototype (a Next route that sent mail through Microsoft Graph) and from the company-site prototype (a PHP handler over SMTP). Neither prototype was deployed. The Next variant is re-implemented and tested; the PHP variant is kept as documented files.

## createContactHandler

`createContactHandler({ send, fields, recipient, sender, ... })` returns a `(request) => Promise<Response>` that a Next route file exports as `POST`. There is no Next import: anything with the Fetch API can mount it.

The pipeline is the one from the PHP handler, each step with its own answer: method, rate limit, JSON body, honeypot, required fields, lengths, e-mail format, send. A client fault is a 400 with an `error` code and a `fields` list, so the form can mark the right input. A transport fault is a 500 with one fixed sentence. The old route answered `{ error, detail: error.message }`, which put Azure error strings and tenant details in the browser; test C4 posts with a failing transport and checks that none of the error text reaches the body.

Every field value goes through one HTML escaper before it lands in the mail body. The payload is the Graph `sendMail` shape: `message.subject`, `message.body` with `contentType: "HTML"`, `toRecipients`, `from`, `replyTo` with the submitter's address, and `saveToSentItems: true`. That is the same shape `sendMailPayload` builds in the n8n-automation-patterns repository; the type is copied into `graphTypes.ts` and documented as such, there is no import between the repositories.

Honeypot: give the hidden input a name and pass it as `honeypot`. A filled honeypot answers 200 and sends nothing, so a bot sees success and does not retry with variations.

Rate limit: `createSlidingWindowLimiter({ max, windowMs })` keeps the request times per client key in memory and refuses the (max+1)th inside the window. The default is 5 per hour per first `x-forwarded-for` address. It is per process; a deployment with several instances needs a limiter over a shared store, which is why the `RateLimiter` interface is one method, `allow(key, now)`.

## graphSend

`createGraphSender({ tenantId, clientId, clientSecret, sender })` is the transport, with `fetch` only. It requests a client-credentials token from `login.microsoftonline.com` with the scope `https://graph.microsoft.com/.default`, caches it until a minute before `expires_in`, and posts to `/v1.0/users/{sender}/sendMail`. A 401 drops the cached token. Errors carry the HTTP status, never the response body, so a misconfigured secret does not end up in a log line. The old route pulled three packages for these two requests.

Setup in Entra ID: an app registration with a client secret, the application permission `Mail.Send` on Microsoft Graph with admin consent, and a mailbox for `sender`. Environment names the example expects: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `CONTACT_SENDER`, `CONTACT_RECIPIENT`. Wire it as

```ts
export const POST = createContactHandler({
  send: createGraphSender({
    tenantId: process.env.AZURE_TENANT_ID!,
    clientId: process.env.AZURE_CLIENT_ID!,
    clientSecret: process.env.AZURE_CLIENT_SECRET!,
    sender: process.env.CONTACT_SENDER!,
  }).send,
  fields: ["name", "email", "message"],
  recipient: process.env.CONTACT_RECIPIENT!,
  sender: process.env.CONTACT_SENDER!,
  honeypot: "website",
});
```

The example app uses a recording transport instead and shows the payload on `/contact`; CI never calls Graph.

## The PHP variant

`src/contact/php/send-contact.php` and `config.example.php` are the handler and the config template from the company-site prototype, never deployed: PHPMailer over SMTP, origin check, a sliding-window rate limit in a JSON file, honeypot fields, anonymised IPs in the log. They are not compiled or run here. The structure test checks that the config holds placeholders only and that every address is an `example.com` one.

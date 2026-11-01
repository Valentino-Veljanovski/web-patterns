/**
 * Microsoft Graph `POST /users/{id}/sendMail` request body.
 *
 * This is the same shape that `lib/graph/mail.js` (`sendMailPayload`) in the
 * n8n-automation-patterns repository builds. The type is copied here, not
 * imported: the two repositories share no code, only the documented contract
 * with Graph. If Graph's shape changes, both copies change.
 */

export interface GraphRecipient {
  emailAddress: { address: string; name?: string };
}

export interface GraphFileAttachment {
  "@odata.type": "#microsoft.graph.fileAttachment";
  name: string;
  contentType: string;
  /** base64 */
  contentBytes: string;
}

export interface GraphMessage {
  subject: string;
  body: { contentType: "HTML" | "Text"; content: string };
  toRecipients: GraphRecipient[];
  ccRecipients?: GraphRecipient[];
  bccRecipients?: GraphRecipient[];
  replyTo?: GraphRecipient[];
  from?: GraphRecipient;
  attachments?: GraphFileAttachment[];
}

export interface SendMailPayload {
  message: GraphMessage;
  saveToSentItems: boolean;
}

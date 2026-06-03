// ═════════════════════════════════════════════════════════════════════════════
// Transactional Email Dispatcher (MODULE 15)
// ─────────────────────────────────────────────────────────────────────────────
// Provider-agnostic outbound-email helper. Currently wires to:
//
//   1. RESEND          (recommended) → if RESEND_API_KEY is set
//   2. (extensible)    POSTMARK_TOKEN, SENDGRID_API_KEY can be added below
//   3. LOG-ONLY MODE   (default)     → if no provider env, prints to server log
//                                      so dev/preview deploys don't error
//
// FAILURE POSTURE — FIRE-AND-FORGET
//   Email outages MUST NOT block revenue capture. Every call returns a
//   small result envelope; the caller checks `.ok` but the caller MUST
//   wrap in `void` if they care more about not blocking than knowing.
//   3s hard timeout via AbortSignal.
//
// IDEMPOTENCY
//   This module doesn't enforce one-email-per-recipient. The CALLER does,
//   typically via a `emailSentAt` column on the relevant row updated
//   atomically via `updateMany where: emailSentAt: null` before calling
//   sendTransactionalEmail(). See /api/checkout/verify for the pattern.
//
// WHY NO NPM DEP
//   Resend's REST API is `POST https://api.resend.com/emails` with a
//   simple JSON body. Raw `fetch()` works perfectly + keeps the bundle
//   small + sidesteps the build-time install hassles on Vercel.
// ═════════════════════════════════════════════════════════════════════════════

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const DEFAULT_TIMEOUT_MS = 3000;
const DEFAULT_FROM = 'ConnectVision <connect@connectvision.us>';
const DEFAULT_REPLY_TO = 'support@connectvision.us';

export interface TransactionalEmailPayload {
  /** Recipient email — required. */
  to: string;
  /** Subject line. */
  subject: string;
  /** Full HTML body (use buildPurchaseEmail() for the purchase confirmation). */
  html: string;
  /** Optional plain-text fallback. Improves deliverability + accessibility. */
  text?: string;
  /** Override the From address. Defaults to CONNECTVISION_EMAIL_FROM env or the constant. */
  from?: string;
  /** Override the Reply-To. Defaults to CONNECTVISION_EMAIL_REPLY_TO env or the constant. */
  replyTo?: string;
  /** Optional tag for provider-side analytics. */
  tag?: string;
}

export interface TransactionalEmailResult {
  /** True iff the provider acknowledged the send (200/202). */
  ok: boolean;
  /** Provider's message id (Resend `id`) on success. */
  providerId?: string;
  /** Short error message on failure. */
  error?: string;
  /** Which provider handled the send. */
  via: 'resend' | 'bluehost-relay' | 'log-only';
}

/**
 * Send a transactional email. Returns a small result envelope. Never throws.
 *
 * @example
 *   void sendTransactionalEmail({
 *     to: 'buyer@example.com',
 *     subject: 'Your ConnectVision purchase is ready',
 *     html: buildPurchaseEmail({...}),
 *   });
 */
export async function sendTransactionalEmail(
  payload: TransactionalEmailPayload,
): Promise<TransactionalEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const isResend = !!apiKey && !apiKey.startsWith('CHANGE_ME');

  // Provider preference: Resend (best deliverability) → Bluehost PHP relay
  // (connect@connectvision.us via the license-server box, no signup) →
  // log-only (dev/preview). The relay covers the "no Resend account yet" gap.
  if (!isResend) {
    const relayUrl = process.env.CV_RELAY_URL;
    const relaySecret = process.env.CV_RELAY_SECRET;
    const relayLive = !!relayUrl && !!relaySecret && !relaySecret.startsWith('CHANGE_ME');

    if (relayLive) {
      return sendViaBluehostRelay(payload, relayUrl, relaySecret);
    }

    // eslint-disable-next-line no-console
    console.warn(
      `[transactionalEmail] LOG-ONLY MODE — would send to ${payload.to}: ` +
      `subject="${payload.subject}" (${payload.html.length} chars)`,
    );
    return { ok: false, via: 'log-only', error: 'No email provider configured (log-only mode)' };
  }

  const from = payload.from ?? process.env.CONNECTVISION_EMAIL_FROM ?? DEFAULT_FROM;
  const replyTo = payload.replyTo ?? process.env.CONNECTVISION_EMAIL_REPLY_TO ?? DEFAULT_REPLY_TO;

  const body: Record<string, unknown> = {
    from,
    to: [payload.to],
    subject: payload.subject,
    html: payload.html,
    reply_to: [replyTo],
  };
  if (payload.text) body['text'] = payload.text;
  if (payload.tag)  body['tags'] = [{ name: 'category', value: payload.tag }];

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return {
        ok: false,
        via: 'resend',
        error: `Resend HTTP ${res.status}: ${text.slice(0, 200)}`,
      };
    }
    const data = (await res.json()) as { id?: string };
    return { ok: true, via: 'resend', ...(data.id ? { providerId: data.id } : {}) };
  } catch (e) {
    return {
      ok: false,
      via: 'resend',
      error: e instanceof Error ? e.message : 'Network fault',
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Bluehost PHP relay — send via connect@connectvision.us (no Resend account)
// ─────────────────────────────────────────────────────────────────────────────
// POSTs to the license-server box's /api/relay/send.php, authenticated with a
// shared secret. That endpoint hands off to the local MTA (PHP mail()). Used
// when RESEND_API_KEY is absent but CV_RELAY_URL + CV_RELAY_SECRET are set.

async function sendViaBluehostRelay(
  payload: TransactionalEmailPayload,
  relayUrl: string,
  relaySecret: string,
): Promise<TransactionalEmailResult> {
  const from = payload.from ?? process.env.CONNECTVISION_EMAIL_FROM ?? DEFAULT_FROM;
  const replyTo = payload.replyTo ?? process.env.CONNECTVISION_EMAIL_REPLY_TO ?? DEFAULT_REPLY_TO;

  const body: Record<string, unknown> = {
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    from,
    reply_to: replyTo,
  };
  if (payload.text) body['text'] = payload.text;

  try {
    const res = await fetch(relayUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Relay-Secret': relaySecret,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '<no body>');
      return { ok: false, via: 'bluehost-relay', error: `Relay HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    return { ok: true, via: 'bluehost-relay' };
  } catch (e) {
    return {
      ok: false,
      via: 'bluehost-relay',
      error: e instanceof Error ? e.message : 'Relay network fault',
    };
  }
}

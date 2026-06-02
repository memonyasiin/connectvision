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
  /** Which provider handled the send: 'resend' | 'log-only'. */
  via: 'resend' | 'log-only';
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
  const isLiveProvider = !!apiKey && !apiKey.startsWith('CHANGE_ME');

  if (!isLiveProvider) {
    // eslint-disable-next-line no-console
    console.warn(
      `[transactionalEmail] LOG-ONLY MODE — would send to ${payload.to}: ` +
      `subject="${payload.subject}" (${payload.html.length} chars)`,
    );
    return { ok: false, via: 'log-only', error: 'RESEND_API_KEY not configured (log-only mode)' };
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

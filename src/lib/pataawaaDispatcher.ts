// ═════════════════════════════════════════════════════════════════════════════
// PataaWaa Dispatcher — fire-and-forget WhatsApp send wrapper (MODULE 4)
// ─────────────────────────────────────────────────────────────────────────────
// Thin wrapper around `fetch(${PATAAWAA_BASE_URL}/api/messages/send, ...)`
// for non-pataawaa routes that need to dispatch a WhatsApp message.
//
// IMPORTANT — read the project memory rule `pataawaa-routes-use-pwbackend`:
//   - Routes UNDER `app/api/pataawaa/**` MUST use `pwBackendCall` (which
//     routes through Bluehost's localhost:4001 in production).
//   - Routes OUTSIDE that tree (like this booking-confirmation route) CALL
//     THE PUBLIC HTTPS DOMAIN directly: `${PATAAWAA_BASE_URL}/api/messages/send`
//     which resolves to wa.pataainternational.com — Vercel's edge can
//     reach it because it's not localhost.
//
// FAILURE POSTURE — fire-and-forget by default
//   PataaWaa availability MUST NOT block the booking confirmation. The
//   merchant's revenue capture (CV_Ledger row) is the contract; the
//   WhatsApp greeting is a courtesy. So:
//     - 3s hard timeout via AbortSignal
//     - Catch every exception; log to console.error
//     - Caller should ALWAYS use `void dispatchWhatsApp(...)` — never await
//
// ENVELOPE COMPATIBILITY
//   The payload shape mirrors the CV_CustomerLedger broadcast contract
//   from MODULE customers route — same `metadata.cv_source` discriminator
//   pattern so PataaWaa's inbox can group by source.
// ═════════════════════════════════════════════════════════════════════════════

const DEFAULT_TIMEOUT_MS = 3000;

export interface PataawaaSendPayload {
  /** Digits-only recipient phone (no '+'). */
  to: string;
  /** Plain-text message body. PataaWaa renders simple emoji + line breaks. */
  body: string;
  /** Tenant subdomain — used by PataaWaa for multi-tenant inbox sorting. */
  tenantSubdomain?: string;
  /** Free-form bag for source attribution + correlation. */
  metadata?: Record<string, string | number | boolean>;
}

export interface PataawaaDispatchResult {
  ok: boolean;
  /** HTTP status from PataaWaa, or 0 if the request never landed. */
  status: number;
  /** Short reason on failure; undefined on success. */
  error?: string;
}

/**
 * Fire a single WhatsApp send through PataaWaa's public endpoint. The
 * promise NEVER rejects — caller can `void dispatchPataawaaSend(...)` and
 * forget. Returns a small result envelope for callers that want to log it.
 *
 * @example
 *   void dispatchPataawaaSend({
 *     to: '919876543210',
 *     body: 'Your booking is confirmed.',
 *     tenantSubdomain: 'memon-beauty',
 *     metadata: { cv_source: 'booking-confirm', cv_appointment_id: 'abc123' },
 *   });
 */
export async function dispatchPataawaaSend(
  payload: PataawaaSendPayload,
  options: { timeoutMs?: number } = {},
): Promise<PataawaaDispatchResult> {
  const base = (process.env.PATAAWAA_BASE_URL ?? '').replace(/\/$/, '');
  const token = process.env.PATAAWAA_GATEWAY_TOKEN;

  if (!base) {
    return { ok: false, status: 0, error: 'PATAAWAA_BASE_URL not configured' };
  }
  if (!token) {
    return { ok: false, status: 0, error: 'PATAAWAA_GATEWAY_TOKEN not configured' };
  }

  const url = `${base}/api/messages/send`;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Source-Platform': 'connectvision',
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      // Drain the body so the upstream connection can close cleanly.
      await res.text().catch(() => '');
      return { ok: false, status: res.status, error: `Upstream HTTP ${res.status}` };
    }
    return { ok: true, status: res.status };
  } catch (err) {
    // Network fault / timeout / abort — all funnel through here.
    return {
      ok: false,
      status: 0,
      error: err instanceof Error ? err.message : 'Network fault',
    };
  }
}

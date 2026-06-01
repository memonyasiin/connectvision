// ═════════════════════════════════════════════════════════════════════════════
// POST /api/checkout/webhook — Razorpay webhook backstop (MODULE 11)
// ─────────────────────────────────────────────────────────────────────────────
// Defence-in-depth for the client-driven verify flow in MODULE 8.
//
// PROBLEM IT SOLVES
//   MODULE 8's /api/checkout/verify runs from the customer's browser inside
//   Razorpay's modal `handler` callback. If the browser closes / network
//   drops / the customer navigates away between "payment captured" and
//   "/verify POST landed", the bank already debited the customer but the
//   CustomizationDraft stays in LOCKED forever — no license issued, no
//   download, no proof of purchase. Support headache + chargeback risk.
//
// HOW THE WEBHOOK FIXES IT
//   Razorpay POSTs to this endpoint on every payment lifecycle event,
//   independent of the customer's browser state. On `payment.captured`
//   we run the same license-issuance logic as /verify — the @unique
//   constraints on licenseKey + razorpayPaymentId make this idempotent
//   against the client-driven path (whichever lands first wins; the other
//   acknowledges silently).
//
// HANDLED EVENTS
//   payment.captured  → issue license, flip status PURCHASED (primary path)
//   payment.failed    → unlock the draft (status → DRAFT, clear orderId)
//                       so the customer can re-checkout cleanly
//   payment.authorized → acknowledged, no-op (capture event comes next)
//   refund.processed  → acknowledged, no-op (out of scope for MODULE 11)
//   <any other>       → acknowledged, no-op (stops Razorpay retry loop)
//
// SECURITY
//   - PUBLIC endpoint (Razorpay needs to reach it from their servers)
//   - HMAC-SHA256 of RAW body (not JSON-parsed) with RAZORPAY_WEBHOOK_SECRET
//   - timingSafeEqual comparison (no early-return signal on first mismatch)
//   - Missing/invalid signature → 401 (Razorpay will retry with backoff)
//   - Missing secret env var    → 503 (operator config gap, Razorpay retries)
//
// RAZORPAY EVENT PAYLOAD SHAPE
//   {
//     entity: 'event',
//     event: 'payment.captured',
//     contains: ['payment'],
//     payload: {
//       payment: {
//         entity: { id: 'pay_*', order_id: 'order_*', amount: 199900, ... }
//       }
//     },
//     created_at: 1234567890
//   }
//
// RUNTIME
//   nodejs. Needs raw body access via req.text() + Node crypto for HMAC.
// ═════════════════════════════════════════════════════════════════════════════

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// License key generator — duplicated from /api/checkout/verify intentionally
// ─────────────────────────────────────────────────────────────────────────────
// Both routes must produce keys in the same format. Keeping the generator
// inline (rather than extracting to a shared lib) means a future change to
// the format requires editing both files — explicit cross-route audit. The
// 8 LOC of duplication is worth that clarity.

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateLicenseKey(): string {
  const bytes = randomBytes(15);
  let raw = '';
  for (const b of bytes) {
    raw += BASE36_CHARS[b % 36] ?? '0';
  }
  return `CV-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Response helpers — webhook semantics
// ─────────────────────────────────────────────────────────────────────────────
// Razorpay retries any non-2xx response with exponential backoff. We
// return 200 for every case where we don't want a retry (idempotent ack,
// unknown event types, unhandled draft states). 4xx is reserved for
// genuine "your request is malformed" cases (bad signature, missing
// header) where retrying with the same payload won't help — Razorpay
// also stops retrying on 4xx after a few attempts.

function ack(note: string, extra: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ ok: true, ack: true, note, ...extra }, { status: 200 });
}

function fault(status: number, code: string, detail: string): NextResponse {
  return NextResponse.json({ ok: false, status, error: code, detail }, { status });
}

// ─────────────────────────────────────────────────────────────────────────────
// HMAC verification — constant-time
// ─────────────────────────────────────────────────────────────────────────────

function verifyWebhookSignature(rawBody: string, presented: string, secret: string): boolean {
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  // Both are lowercase hex strings of identical length (SHA-256 = 64 chars).
  // timingSafeEqual demands equal-length buffers — short-circuit on length
  // mismatch BEFORE the comparison to avoid an exception, but with the
  // same observable timing (string length check is constant-time per JS).
  if (presented.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(expected, 'utf8'),
      Buffer.from(presented, 'utf8'),
    );
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Event payload narrowing
// ─────────────────────────────────────────────────────────────────────────────

interface RazorpayPaymentEntity {
  id: string;
  order_id: string;
  amount: number;        // paise
  currency: string;
  status: string;
  email?: string;
  contact?: string;
  vpa?: string;
}

interface RazorpayEvent {
  entity: string;
  event: string;
  payload?: {
    payment?: { entity?: RazorpayPaymentEntity };
  };
}

function extractPayment(event: unknown): RazorpayPaymentEntity | null {
  if (event === null || typeof event !== 'object') return null;
  const e = event as Partial<RazorpayEvent>;
  const ent = e.payload?.payment?.entity;
  if (!ent || typeof ent !== 'object') return null;
  if (typeof ent.id !== 'string' || typeof ent.order_id !== 'string') return null;
  return ent;
}

function getEventType(event: unknown): string {
  if (event === null || typeof event !== 'object') return '';
  const e = event as { event?: unknown };
  return typeof e.event === 'string' ? e.event : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // ── Step 1 — Secret check (operator config gap → 503 retry) ────────────
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || secret.startsWith('CHANGE_ME')) {
    // eslint-disable-next-line no-console
    console.warn('[checkout/webhook] RAZORPAY_WEBHOOK_SECRET not configured');
    return fault(503, 'WEBHOOK_SECRET_NOT_CONFIGURED', 'Server is missing RAZORPAY_WEBHOOK_SECRET.');
  }

  // ── Step 2 — Signature header presence ────────────────────────────────
  const presentedSignature = req.headers.get('x-razorpay-signature') ?? '';
  if (presentedSignature === '') {
    return fault(400, 'MISSING_SIGNATURE', 'X-Razorpay-Signature header is required.');
  }

  // ── Step 3 — Read RAW body (must come BEFORE JSON.parse for HMAC) ─────
  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return fault(400, 'BODY_READ_FAULT', 'Could not read the request body.');
  }

  // ── Step 4 — HMAC verification ────────────────────────────────────────
  if (!verifyWebhookSignature(rawBody, presentedSignature, secret)) {
    return fault(401, 'SIGNATURE_MISMATCH', 'Webhook signature did not verify.');
  }

  // ── Step 5 — Parse + narrow ──────────────────────────────────────────
  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return fault(400, 'INVALID_JSON', 'Webhook body is not valid JSON.');
  }
  const eventType = getEventType(event);
  const payment   = extractPayment(event);

  if (eventType === '') {
    return ack('event payload missing `event` field');
  }
  if (!payment) {
    // Some event types (e.g. refund.created) carry refund.entity not
    // payment.entity. We don't handle refunds in MODULE 11 — ack quietly.
    return ack(`event ${eventType} carried no payment entity`, { eventType });
  }

  // ── Step 6 — Locate the draft by order id ─────────────────────────────
  const draft = await prisma.customizationDraft.findUnique({
    where: { razorpayOrderId: payment.order_id },
  });
  if (!draft) {
    // Order id we don't recognise — could be from another system sharing
    // the same Razorpay account. Always ack so Razorpay stops retrying.
    return ack('unknown order_id', {
      eventType,
      razorpayOrderId: payment.order_id,
    });
  }

  // ── Step 7 — Dispatch by event type ───────────────────────────────────
  switch (eventType) {
    // ─────────────────────────────────────────────────────────────────
    // payment.captured — issue license, flip status PURCHASED
    // ─────────────────────────────────────────────────────────────────
    case 'payment.captured': {
      // Idempotency vs the client-driven /verify path: if it landed first,
      // the draft is already PURCHASED with a license + paymentId stamped.
      if (draft.status === 'PURCHASED') {
        return ack('draft already PURCHASED by another handler', {
          eventType,
          draftId: draft.id,
          licenseKey: draft.licenseKey ?? null,
        });
      }

      if (draft.status !== 'LOCKED') {
        // Unexpected state (DRAFT means /order never ran for this id —
        // shouldn't happen since razorpayOrderId is set, but defensive).
        return ack(`draft in unexpected state ${draft.status}`, {
          eventType,
          draftId: draft.id,
        });
      }

      // No amount verification here: CustomizationDraft purchases trust
      // the captured amount AS-IS because the price is fixed per theme in
      // the marketplace manifest. The Razorpay order was created with
      // that catalog price on /api/checkout/order — any payment captured
      // against that order id matches by construction.
      //
      // (Per-tenant surge-priced appointments live on BusinessAppointment
      // and verify amount in /api/booking/confirm. Different model.)

      const licenseKey = generateLicenseKey();
      const purchasedAt = new Date();

      try {
        await prisma.customizationDraft.update({
          where: { id: draft.id },
          data: {
            status: 'PURCHASED',
            razorpayPaymentId: payment.id,
            licenseKey,
            purchasedAt,
          },
        });
        return ack('license issued via webhook', {
          eventType,
          action: 'issued',
          draftId: draft.id,
          licenseKey,
          purchasedAt: purchasedAt.toISOString(),
        });
      } catch (e) {
        // P2002 unique-constraint race: another handler (likely
        // /api/checkout/verify) won. Re-read + ack with the existing key.
        // eslint-disable-next-line no-console
        console.error('[checkout/webhook] update fault — likely race:', e);
        const fresh = await prisma.customizationDraft.findUnique({
          where: { id: draft.id },
          select: { status: true, licenseKey: true, purchasedAt: true },
        });
        if (fresh?.status === 'PURCHASED' && fresh.licenseKey) {
          return ack('race won by another handler', {
            eventType,
            action: 'race-lost',
            draftId: draft.id,
            licenseKey: fresh.licenseKey,
          });
        }
        return fault(500, 'INTERNAL_FAULT', 'Could not finalise the purchase.');
      }
    }

    // ─────────────────────────────────────────────────────────────────
    // payment.failed — unlock the draft so customer can re-checkout
    // ─────────────────────────────────────────────────────────────────
    case 'payment.failed': {
      // Only unlock if we never finalised the purchase. A failed event
      // arriving AFTER a successful capture (Razorpay quirks) must not
      // wipe a legitimate purchase.
      if (draft.status === 'PURCHASED' || draft.razorpayPaymentId) {
        return ack('draft already purchased — ignoring late failure event', {
          eventType,
          draftId: draft.id,
        });
      }
      if (draft.status !== 'LOCKED') {
        return ack(`no unlock needed for state ${draft.status}`, {
          eventType,
          draftId: draft.id,
        });
      }

      // Wipe razorpayOrderId so the customer's next /api/checkout/order
      // call mints a fresh order against Razorpay (the failed order id
      // can't be re-paid). Clear lockedAt for clean audit.
      await prisma.customizationDraft.update({
        where: { id: draft.id },
        data: {
          status: 'DRAFT',
          razorpayOrderId: null,
          lockedAt: null,
        },
      });
      return ack('draft unlocked for retry', {
        eventType,
        action: 'unlocked',
        draftId: draft.id,
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // payment.authorized — capture event will follow, acknowledge no-op
    // ─────────────────────────────────────────────────────────────────
    case 'payment.authorized': {
      return ack('authorized event acknowledged; awaiting capture', {
        eventType,
        draftId: draft.id,
      });
    }

    // ─────────────────────────────────────────────────────────────────
    // Anything else — acknowledge so Razorpay stops retrying
    // ─────────────────────────────────────────────────────────────────
    default: {
      return ack(`event type ${eventType} not handled by MODULE 11`, {
        eventType,
        draftId: draft.id,
      });
    }
  }
}

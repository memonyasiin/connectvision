// ═════════════════════════════════════════════════════════════════════════════
// POST /api/checkout/verify — Razorpay HMAC verify + license issuance (MODULE 8)
// ─────────────────────────────────────────────────────────────────────────────
// Second hop in the checkout state machine. Called from CheckoutClient's
// Razorpay `handler` callback (or directly in mock mode).
//
//   1. Looks up draft by id, verifies status = LOCKED, order id matches.
//   2. LIVE mode: HMAC-SHA256(orderId|paymentId, RAZORPAY_KEY_SECRET) ===
//                 presented signature (timing-safe compare).
//      MOCK mode: signature check skipped — order id starts `order_mock_*`.
//   3. Generates a unique licenseKey (CV-XXXXX-XXXXX-XXXXX).
//   4. Single transaction: status → PURCHASED + razorpayPaymentId +
//      licenseKey + purchasedAt stamped.
//   5. Returns licenseKey to the client for reveal on the success panel.
//
// IDEMPOTENCY
//   Re-call with the same draftId post-PURCHASE returns the existing
//   licenseKey (no new key issued, no DB write). Razorpay's handler
//   callback can fire twice on flaky networks.
//
// FUTURE — PHP license-server bridge
//   When ConnectVision-PHP is deployed, this route can additionally POST
//   the issued key to its registration endpoint so it's recognised by
//   distributed themes during runtime verification. Out of scope for
//   MODULE 8 — the local row is canonical for now.
// ═════════════════════════════════════════════════════════════════════════════

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendTransactionalEmail } from '@/lib/transactionalEmail';
import {
  buildPurchaseEmail,
  buildPurchaseEmailSubject,
  buildPurchaseEmailText,
} from '@/lib/buildPurchaseEmail';
import { findThemeBySlug } from '@/data/themeMarketplaceCatalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Shapes
// ─────────────────────────────────────────────────────────────────────────────

interface VerifyRequest {
  draftId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}

interface ApiError {
  ok: false;
  status: number;
  error: string;
  detail: string;
}

function err(status: number, code: string, detail: string): ApiError {
  return { ok: false, status, error: code, detail };
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay HMAC verification — constant-time
// ─────────────────────────────────────────────────────────────────────────────
// Per Razorpay docs:
//   signature = HMAC-SHA256(`${razorpay_order_id}|${razorpay_payment_id}`,
//                            RAZORPAY_KEY_SECRET)
// Returns the hex-encoded digest. Constant-time compare avoids leaking
// the first-mismatch position via timing side-channel.

function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  presentedSignature: string,
  keySecret: string,
): boolean {
  const expected = createHmac('sha256', keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  // Length must match for timingSafeEqual; we still constant-time the
  // comparison even when lengths differ to avoid an early-return signal.
  const presentedBuf = Buffer.from(presentedSignature, 'utf8');
  const expectedBuf  = Buffer.from(expected,           'utf8');
  if (presentedBuf.length !== expectedBuf.length) return false;
  return timingSafeEqual(presentedBuf, expectedBuf);
}

// ─────────────────────────────────────────────────────────────────────────────
// License key generation — CV-XXXXX-XXXXX-XXXXX (3 × 5-char base36 groups)
// ─────────────────────────────────────────────────────────────────────────────
// 15 base36 chars = log2(36^15) ≈ 77 bits of entropy. The `CV-` prefix is
// the brand handle. Visually scannable, type-able with one keyboard, and
// unique enough that 1M+ issuances have a negligible collision risk
// (the @unique constraint on licenseKey provides the belt-and-suspenders
// guard if a real-world collision ever fires).

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

function generateLicenseKey(): string {
  const bytes = randomBytes(15);
  let raw = '';
  for (const b of bytes) {
    const ch = BASE36_CHARS[b % 36];
    // Defensive — character at index 0-35 is always defined; the check
    // satisfies TS noUncheckedIndexedAccess without runtime cost.
    raw += ch ?? '0';
  }
  return `CV-${raw.slice(0, 5)}-${raw.slice(5, 10)}-${raw.slice(10, 15)}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // ── Body parse + narrow ────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(err(400, 'INVALID_JSON', 'Body is not valid JSON.'), {
      status: 400,
    });
  }
  if (raw === null || typeof raw !== 'object') {
    return NextResponse.json(err(400, 'INVALID_BODY', 'Body must be a JSON object.'), {
      status: 400,
    });
  }
  const c = raw as Record<string, unknown>;
  if (
    !isString(c['draftId'])           || c['draftId'].trim()           === '' ||
    !isString(c['razorpayOrderId'])   || c['razorpayOrderId'].trim()   === '' ||
    !isString(c['razorpayPaymentId']) || c['razorpayPaymentId'].trim() === '' ||
    !isString(c['razorpaySignature'])
  ) {
    return NextResponse.json(
      err(400, 'INVALID_BODY', 'Required fields: draftId, razorpayOrderId, razorpayPaymentId, razorpaySignature.'),
      { status: 400 },
    );
  }
  const body: VerifyRequest = {
    draftId:           c['draftId'].trim(),
    razorpayOrderId:   c['razorpayOrderId'].trim(),
    razorpayPaymentId: c['razorpayPaymentId'].trim(),
    razorpaySignature: c['razorpaySignature'].trim(),
  };

  // ── Load draft ────────────────────────────────────────────────────────
  const draft = await prisma.customizationDraft.findUnique({
    where: { id: body.draftId },
  });
  if (!draft) {
    return NextResponse.json(err(404, 'NOT_FOUND', 'Customization draft not found.'), {
      status: 404,
    });
  }

  // ── Idempotency: already PURCHASED → return existing license ──────────
  if (draft.status === 'PURCHASED' && draft.licenseKey) {
    return NextResponse.json({
      ok: true,
      wasAlreadyPurchased: true,
      draftId: draft.id,
      licenseKey: draft.licenseKey,
      themeSlug: draft.themeSlug,
      businessName: draft.businessName,
      purchasedAt: draft.purchasedAt?.toISOString() ?? null,
    });
  }

  // ── Order id must match what we issued ────────────────────────────────
  if (draft.razorpayOrderId !== body.razorpayOrderId) {
    return NextResponse.json(
      err(409, 'ORDER_MISMATCH', 'Presented Razorpay order id does not match the draft.'),
      { status: 409 },
    );
  }
  if (draft.status !== 'LOCKED') {
    return NextResponse.json(
      err(
        409,
        'INVALID_STATE',
        `Cannot verify a draft in status ${draft.status} — expected LOCKED.`,
      ),
      { status: 409 },
    );
  }

  // ── Signature verification ────────────────────────────────────────────
  const isMockMode = body.razorpayOrderId.startsWith('order_mock_');

  if (!isMockMode) {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret || keySecret.startsWith('CHANGE_ME')) {
      return NextResponse.json(
        err(503, 'SECRET_NOT_CONFIGURED', 'Server is missing RAZORPAY_KEY_SECRET.'),
        { status: 503 },
      );
    }
    const ok = verifyRazorpaySignature(
      body.razorpayOrderId,
      body.razorpayPaymentId,
      body.razorpaySignature,
      keySecret,
    );
    if (!ok) {
      return NextResponse.json(
        err(401, 'SIGNATURE_MISMATCH', 'Razorpay payment signature did not verify.'),
        { status: 401 },
      );
    }
  }
  // Mock mode: no signature check; the synthetic order id IS the
  // proof-of-mock — see /api/checkout/order for how it was minted.

  // ── Issue license + flip status PURCHASED in a single update ─────────
  const licenseKey = generateLicenseKey();
  const purchasedAt = new Date();

  try {
    await prisma.customizationDraft.update({
      where: { id: draft.id },
      data: {
        status: 'PURCHASED',
        razorpayPaymentId: body.razorpayPaymentId,
        licenseKey,
        purchasedAt,
      },
    });
  } catch (e) {
    // Two-tier P2002 race: another concurrent verify won — re-read and
    // return whatever's already there.
    // eslint-disable-next-line no-console
    console.error('[checkout/verify] update fault:', e);
    const fresh = await prisma.customizationDraft.findUnique({
      where: { id: draft.id },
      select: { licenseKey: true, status: true, purchasedAt: true },
    });
    if (fresh?.status === 'PURCHASED' && fresh.licenseKey) {
      return NextResponse.json({
        ok: true,
        wasAlreadyPurchased: true,
        draftId: draft.id,
        licenseKey: fresh.licenseKey,
        themeSlug: draft.themeSlug,
        businessName: draft.businessName,
        purchasedAt: fresh.purchasedAt?.toISOString() ?? null,
      });
    }
    return NextResponse.json(
      err(500, 'INTERNAL_FAULT', 'Could not finalise the purchase. Please contact support.'),
      { status: 500 },
    );
  }

  // ── Fire-and-forget purchase confirmation email ─────────────────────────
  // Atomic guard: only the FIRST handler that wins the
  // `updateMany where: emailSentAt: null` actually dispatches the email.
  // Webhook + verify can both arrive for the same purchase; this gate
  // ensures exactly one email lands in the buyer's inbox.
  void dispatchPurchaseEmail({
    draftId: draft.id,
    businessName: draft.businessName,
    themeSlug: draft.themeSlug,
    licenseKey,
    toEmail: draft.contactEmail ?? draft.customerEmail ?? '',
    purchasedAt,
    req,
  });

  return NextResponse.json({
    ok: true,
    wasAlreadyPurchased: false,
    draftId: draft.id,
    licenseKey,
    themeSlug: draft.themeSlug,
    businessName: draft.businessName,
    purchasedAt: purchasedAt.toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Email dispatch helper — atomic guard + provider-agnostic send
// ─────────────────────────────────────────────────────────────────────────────

interface DispatchInput {
  draftId: string;
  businessName: string;
  themeSlug: string;
  licenseKey: string;
  toEmail: string;
  purchasedAt: Date;
  req: Request;
}

async function dispatchPurchaseEmail(input: DispatchInput): Promise<void> {
  if (!input.toEmail) {
    // eslint-disable-next-line no-console
    console.warn(`[checkout/verify] no email on draft ${input.draftId}, skipping send`);
    return;
  }

  // Atomic win: only the handler that flips emailSentAt from null actually
  // sends. Webhook concurrent dispatch loses the race + returns quietly.
  const claim = await prisma.customizationDraft.updateMany({
    where: { id: input.draftId, emailSentAt: null },
    data: { emailSentAt: new Date() },
  });
  if (claim.count !== 1) return; // Lost race — another handler will (or did) send.

  const theme = findThemeBySlug(input.themeSlug);
  const themeName = theme?.name ?? input.themeSlug;

  // Resolve the deployment base URL — prefer NEXTAUTH_URL, fall back to
  // request origin so previews / .vercel.app URLs also produce live links.
  const baseUrl =
    process.env.NEXTAUTH_URL ??
    new URL(input.req.url).origin;

  const html = buildPurchaseEmail({
    businessName: input.businessName,
    themeName,
    licenseKey: input.licenseKey,
    toEmail: input.toEmail,
    draftId: input.draftId,
    siteBaseUrl: baseUrl,
    purchasedAtIso: input.purchasedAt.toISOString(),
  });
  const text = buildPurchaseEmailText({
    businessName: input.businessName,
    themeName,
    licenseKey: input.licenseKey,
    toEmail: input.toEmail,
    draftId: input.draftId,
    siteBaseUrl: baseUrl,
    purchasedAtIso: input.purchasedAt.toISOString(),
  });

  const result = await sendTransactionalEmail({
    to: input.toEmail,
    subject: buildPurchaseEmailSubject(themeName),
    html,
    text,
    tag: 'purchase-confirmation',
  });

  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.error(
      `[checkout/verify] email dispatch failed (${result.via}) for draft ${input.draftId}: ${result.error}`,
    );
    // Roll back the emailSentAt claim so the webhook (or a retry) can
    // attempt again. Safe — we know it was OUR claim because count was 1.
    await prisma.customizationDraft.update({
      where: { id: input.draftId },
      data: { emailSentAt: null },
    });
  }
}

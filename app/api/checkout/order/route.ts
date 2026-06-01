// ═════════════════════════════════════════════════════════════════════════════
// POST /api/checkout/order — Create Razorpay order (MODULE 8)
// ─────────────────────────────────────────────────────────────────────────────
// First hop in the checkout state machine. Called by CheckoutClient when
// the customer taps "Pay ₹X via UPI / card". Side effects:
//
//   1. Looks up CustomizationDraft + matching marketplace theme.
//   2. If draft already has razorpayOrderId → returns it verbatim
//      (idempotent — survives re-clicks, Razorpay modal dismissals,
//      browser back/forward, page refreshes).
//   3. Otherwise creates a new order via Razorpay's REST API + stamps the
//      order id on the draft + flips status DRAFT → LOCKED.
//
// MOCK MODE
//   When RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET are absent (preview deploys,
//   local dev without billing), the route generates a synthetic order id
//   prefixed `order_mock_*` and returns `mode: 'mock'`. CheckoutClient
//   detects this and skips the Razorpay modal — handy for ThemeForest
//   demos + local QA without a real billing account.
//
// CONTRACT
//   Request:  { draftId: string }
//   Response: {
//     ok: true,
//     mode: 'live' | 'mock',
//     razorpayOrderId, razorpayKeyId, amountInr, currency, themeName,
//     prefill: { name, email?, contact? },     // for Razorpay modal autofill
//   }
//
// AUTH
//   PUBLIC. The route is part of the buy-flow — anyone holding a valid
//   draftId can checkout. Draft-id is server-generated cuid (unguessable).
// ═════════════════════════════════════════════════════════════════════════════

import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { findThemeBySlug } from '@/data/themeMarketplaceCatalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Shapes
// ─────────────────────────────────────────────────────────────────────────────

interface OrderRequest {
  draftId: string;
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

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay REST call — raw fetch (no SDK install)
// ─────────────────────────────────────────────────────────────────────────────

interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
}

async function createRazorpayOrder(
  amountInr: number,
  currency: string,
  notes: Record<string, string>,
  keyId: string,
  keySecret: string,
): Promise<RazorpayOrderResponse | { error: string; status: number }> {
  const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
  try {
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amountInr * 100), // paise
        currency,
        notes,
        // payment_capture: 1 is the new default — explicit-capture orders
        // are legacy. Leave it off; orders are auto-captured on success.
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return {
        error: `Razorpay upstream ${res.status}: ${text.slice(0, 200)}`,
        status: res.status,
      };
    }
    const data = (await res.json()) as RazorpayOrderResponse;
    return data;
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : 'Razorpay network fault',
      status: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // ── Body parse ────────────────────────────────────────────────────────
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(err(400, 'INVALID_JSON', 'Body is not valid JSON.'), {
      status: 400,
    });
  }
  if (raw === null || typeof raw !== 'object' || !('draftId' in raw)) {
    return NextResponse.json(err(400, 'INVALID_BODY', 'draftId is required.'), {
      status: 400,
    });
  }
  const { draftId } = raw as Partial<OrderRequest>;
  if (typeof draftId !== 'string' || draftId.trim() === '') {
    return NextResponse.json(err(400, 'INVALID_BODY', 'draftId must be a non-empty string.'), {
      status: 400,
    });
  }

  // ── Load draft + theme ────────────────────────────────────────────────
  const draft = await prisma.customizationDraft.findUnique({
    where: { id: draftId.trim() },
  });
  if (!draft) {
    return NextResponse.json(err(404, 'NOT_FOUND', 'Customization draft not found.'), {
      status: 404,
    });
  }
  if (draft.status === 'PURCHASED') {
    return NextResponse.json(
      err(409, 'ALREADY_PURCHASED', 'This draft has already been purchased — cannot re-order.'),
      { status: 409 },
    );
  }
  const theme = findThemeBySlug(draft.themeSlug);
  if (!theme) {
    return NextResponse.json(
      err(503, 'THEME_UNAVAILABLE', `Theme "${draft.themeSlug}" no longer exists in the marketplace.`),
      { status: 503 },
    );
  }

  // ── Build prefill block for the Razorpay modal ────────────────────────
  const prefill = {
    name: draft.businessName,
    ...(draft.contactEmail ? { email: draft.contactEmail } : {}),
    ...(draft.contactPhone ? { contact: draft.contactPhone } : {}),
  };

  // ── Idempotency: reuse existing order if already created ──────────────
  if (draft.razorpayOrderId) {
    return NextResponse.json({
      ok: true,
      mode: draft.razorpayOrderId.startsWith('order_mock_') ? 'mock' : 'live',
      razorpayOrderId: draft.razorpayOrderId,
      razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? 'mock',
      amountInr: theme.priceInr,
      currency: 'INR',
      themeName: theme.name,
      themeSlug: theme.slug,
      prefill,
    });
  }

  // ── Decide live vs mock based on env presence ─────────────────────────
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  const liveMode  = !!keyId && !!keySecret && !keyId.startsWith('CHANGE_ME');

  let razorpayOrderId: string;
  let mode: 'live' | 'mock';

  if (liveMode) {
    const orderRes = await createRazorpayOrder(
      theme.priceInr,
      'INR',
      {
        draftId: draft.id,
        themeSlug: theme.slug,
        themeName: theme.name,
        businessName: draft.businessName,
      },
      keyId,
      keySecret,
    );
    if ('error' in orderRes) {
      // eslint-disable-next-line no-console
      console.error('[checkout/order] Razorpay create-order fault:', orderRes.error);
      return NextResponse.json(
        err(502, 'RAZORPAY_UPSTREAM_FAULT', 'Could not create payment order. Please retry.'),
        { status: 502 },
      );
    }
    razorpayOrderId = orderRes.id;
    mode = 'live';
  } else {
    // Mock mode — generate a synthetic order id. Pattern matches
    // Razorpay's real `order_*` shape so client-side parsing isn't
    // confused, but the prefix makes the mode obvious at a glance.
    razorpayOrderId = `order_mock_${randomBytes(8).toString('hex')}`;
    mode = 'mock';
  }

  // ── Persist order id + flip status DRAFT → LOCKED ─────────────────────
  await prisma.customizationDraft.update({
    where: { id: draft.id },
    data: {
      razorpayOrderId,
      status: 'LOCKED',
      lockedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    mode,
    razorpayOrderId,
    razorpayKeyId: liveMode && keyId ? keyId : 'mock',
    amountInr: theme.priceInr,
    currency: 'INR',
    themeName: theme.name,
    themeSlug: theme.slug,
    prefill,
  });
}

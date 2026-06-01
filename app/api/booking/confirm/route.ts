// ═════════════════════════════════════════════════════════════════════════════
// POST /api/booking/confirm — Booking capture closure (MODULE 4)
// ─────────────────────────────────────────────────────────────────────────────
// Closes the loop opened by /api/booking (MODULE 3 hold):
//   PENDING_CHECKOUT → CONFIRMED
//   + writes the immutable CV_Ledger row (revenue audit)
//   + fires a locale-aware WhatsApp confirmation via PataaWaa (fire-and-forget)
//
// CALLERS
//   1. Razorpay / Cashfree / PSP webhook  — automatic on customer payment
//   2. Admin manual trigger               — when no PSP is wired and the
//                                           operator reconciles via bank
//                                           statement
//
// REQUEST
//   {
//     appointmentId: string,     // BusinessAppointment.id (echoed as txnRef
//                                // in the upi:// intent — see MODULE 3)
//     upiRefId:      string,     // 12-char NPCI reference from the bank
//     amountInr:     number,     // Captured amount (verified vs activePriceInr)
//     payerVpa?:     string,     // Optional payer VPA from the PSP webhook
//     payerName?:    string,     // Optional payer name
//   }
//
// SUCCESS (200)
//   {
//     ok: true,
//     appointmentId, status: 'CONFIRMED',
//     ledgerId, capturedAt,
//     whatsappDispatch: { ok, status, error? }   // best-effort result
//   }
//
// IDEMPOTENCY
//   - Re-confirmation of an already-CONFIRMED row returns 200 with the
//     existing ledger details + a `wasAlreadyConfirmed: true` flag.
//   - The CV_Ledger.upiRefHash @unique constraint is the belt-and-suspenders
//     guard against duplicate ledger rows when a PSP retries a webhook.
//
// AUTH
//   Three-path same as the rest of /api/admin/*:
//     Bearer CRON_SECRET | Bearer INTERNAL_SECRET | X-CV-Validation-Token
// ═════════════════════════════════════════════════════════════════════════════

import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { validateServiceToken } from '@/lib/vercelProxy';
import { dispatchPataawaaSend } from '@/lib/pataawaaDispatcher';
import { resolveLocale, t, type Locale } from '@/lib/translations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Tolerances + constants
// ─────────────────────────────────────────────────────────────────────────────

/** ±1 INR rounding tolerance — UPI apps occasionally round display vs charge. */
const AMOUNT_TOLERANCE_INR = 1;

// ─────────────────────────────────────────────────────────────────────────────
// Request shape
// ─────────────────────────────────────────────────────────────────────────────

interface ConfirmRequest {
  appointmentId: string;
  upiRefId: string;
  amountInr: number;
  payerVpa?: string;
  payerName?: string;
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

function parseBody(raw: unknown): ConfirmRequest | ApiError {
  if (raw === null || typeof raw !== 'object') {
    return err(400, 'INVALID_BODY', 'Body must be a JSON object.');
  }
  const c = raw as Record<string, unknown>;
  if (!isString(c['appointmentId']) || c['appointmentId'].trim() === '') {
    return err(400, 'INVALID_BODY', 'appointmentId is required.');
  }
  if (!isString(c['upiRefId']) || c['upiRefId'].trim() === '') {
    return err(400, 'INVALID_BODY', 'upiRefId is required.');
  }
  const amt = typeof c['amountInr'] === 'number' ? c['amountInr'] : NaN;
  if (!Number.isFinite(amt) || amt <= 0) {
    return err(400, 'INVALID_BODY', 'amountInr must be a positive number.');
  }
  return {
    appointmentId: c['appointmentId'].trim(),
    upiRefId:      c['upiRefId'].trim(),
    amountInr:     amt,
    ...(isString(c['payerVpa'])  ? { payerVpa:  c['payerVpa'].trim().toLowerCase() } : {}),
    ...(isString(c['payerName']) ? { payerName: c['payerName'].trim() }               : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth — three-path same as other admin routes
// ─────────────────────────────────────────────────────────────────────────────

function requireServiceAuth(req: Request): ApiError | null {
  const cronSecret     = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;
  const cvToken        = process.env.CV_VALIDATION_TOKEN;
  if (!cronSecret && !internalSecret && !cvToken) return null; // dev posture

  const authHeader = req.headers.get('authorization') ?? '';
  const cronOk     = !!cronSecret     && authHeader === `Bearer ${cronSecret}`;
  const internalOk = !!internalSecret && authHeader === `Bearer ${internalSecret}`;
  const cvOk       = !!cvToken        && validateServiceToken(req).ok;
  if (cronOk || internalOk || cvOk) return null;

  return err(401, 'UNAUTHORIZED', 'Missing or invalid service credential.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Hash — SHA-256 of the raw upiRefId (privacy posture for ledger storage)
// ─────────────────────────────────────────────────────────────────────────────

function sha256Hex(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// ─────────────────────────────────────────────────────────────────────────────
// Locale-aware confirmation message — reuses existing translation keys
// ─────────────────────────────────────────────────────────────────────────────

function buildConfirmationMessage(args: {
  locale: Locale;
  customerName: string;
  serviceName: string;
  startsAt: Date;
  businessName: string;
}): string {
  const when = args.startsAt.toLocaleString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return t(args.locale, 'notify.confirmation.body', {
    name:     args.customerName,
    service:  args.serviceName,
    when,
    business: args.businessName,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  const authErr = requireServiceAuth(req);
  if (authErr) return NextResponse.json(authErr, { status: authErr.status });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(err(400, 'INVALID_JSON', 'Body is not valid JSON.'), {
      status: 400,
    });
  }
  const parsed = parseBody(raw);
  if ('ok' in parsed && parsed.ok === false) {
    return NextResponse.json(parsed, { status: parsed.status });
  }
  const body = parsed as ConfirmRequest;

  // ── Load appointment + tenant + merchant in one round-trip ──────────────
  const appointment = await prisma.businessAppointment.findUnique({
    where: { id: body.appointmentId },
    include: {
      domain: {
        include: {
          merchant: { select: { id: true, name: true } },
          siteConfig: { select: { businessName: true } },
        },
      },
      ledger: true,
    },
  });
  if (!appointment) {
    return NextResponse.json(err(404, 'NOT_FOUND', 'Appointment not found.'), {
      status: 404,
    });
  }

  // ── Idempotency — already CONFIRMED with the same upiRefId ──────────────
  // PSP retries are normal; treat the second arrival as a no-op success.
  if (appointment.status === 'CONFIRMED' && appointment.upiRefId === body.upiRefId) {
    return NextResponse.json({
      ok: true,
      wasAlreadyConfirmed: true,
      appointmentId: appointment.id,
      status: appointment.status,
      ledgerId: appointment.ledger?.id ?? null,
      capturedAt: appointment.upiCapturedAt?.toISOString() ?? null,
    });
  }

  // ── Status guard ────────────────────────────────────────────────────────
  if (appointment.status !== 'PENDING_CHECKOUT') {
    return NextResponse.json(
      err(409, 'INVALID_STATE', `Cannot confirm an appointment with status ${appointment.status}.`),
      { status: 409 },
    );
  }

  // ── Amount verification — tolerance ±1 INR for app rounding ─────────────
  const expectedInr = appointment.activePriceInr
    ? Number.parseFloat(appointment.activePriceInr.toString())
    : NaN;
  if (!Number.isFinite(expectedInr)) {
    return NextResponse.json(
      err(503, 'PRICE_NOT_SNAPSHOTTED', 'Appointment has no activePriceInr — re-hold required.'),
      { status: 503 },
    );
  }
  if (Math.abs(body.amountInr - expectedInr) > AMOUNT_TOLERANCE_INR) {
    return NextResponse.json(
      err(
        409,
        'AMOUNT_MISMATCH',
        `Expected ₹${expectedInr.toFixed(2)} (±${AMOUNT_TOLERANCE_INR}), captured ₹${body.amountInr.toFixed(2)}.`,
      ),
      { status: 409 },
    );
  }

  // ── Atomic update + ledger insert (transaction) ─────────────────────────
  const capturedAt = new Date();
  const upiRefHash = sha256Hex(body.upiRefId);

  let ledgerId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.businessAppointment.update({
        where: { id: appointment.id },
        data: {
          status:        'CONFIRMED',
          upiRefId:      body.upiRefId,
          upiAmountInr:  new Prisma.Decimal(body.amountInr),
          upiCapturedAt: capturedAt,
          ...(body.payerVpa ? { upiVpa: body.payerVpa } : {}),
        },
      });
      const ledger = await tx.cV_Ledger.create({
        data: {
          merchantId:   appointment.domain.merchant.id,
          domainId:     appointment.domainId,
          appointmentId: appointment.id,
          upiRefHash,
          upiAmountInr: new Prisma.Decimal(body.amountInr),
          currency:     'INR',
          ...(body.payerVpa  ? { payerVpa:  body.payerVpa }  : {}),
          ...(body.payerName ? { payerName: body.payerName } : {}),
          capturedAt,
          metadata: {
            source:            'booking-confirm',
            cvAppointmentId:   appointment.id,
            cvServiceName:     appointment.serviceName,
          },
        },
      });
      return { ledgerId: ledger.id };
    });
    ledgerId = result.ledgerId;
  } catch (e) {
    // P2002 here = race on upiRefHash unique constraint (another concurrent
    // webhook landed first). Re-read appointment to surface its current
    // state to the caller — both sides should now see CONFIRMED.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      const fresh = await prisma.businessAppointment.findUnique({
        where: { id: appointment.id },
        select: { status: true, upiCapturedAt: true, ledger: { select: { id: true } } },
      });
      if (fresh?.status === 'CONFIRMED') {
        return NextResponse.json({
          ok: true,
          wasAlreadyConfirmed: true,
          appointmentId: appointment.id,
          status: 'CONFIRMED',
          ledgerId: fresh.ledger?.id ?? null,
          capturedAt: fresh.upiCapturedAt?.toISOString() ?? null,
        });
      }
    }
    // eslint-disable-next-line no-console
    console.error('[booking/confirm] transaction fault:', e);
    return NextResponse.json(
      err(500, 'INTERNAL_FAULT', 'Confirmation transaction failed.'),
      { status: 500 },
    );
  }

  // ── Fire-and-forget WhatsApp confirmation ───────────────────────────────
  // Customer locale snapshotted at hold time on the row; default to
  // mass-market hi-IN-Latn if missing. PataaWaa availability does NOT
  // block the merchant's revenue capture — see pataawaaDispatcher.ts
  // for the failure-mode contract.
  const locale = resolveLocale(appointment.customerLocale);
  const businessName =
    appointment.domain.siteConfig?.businessName ?? appointment.domain.merchant.name;
  const whatsappBody = buildConfirmationMessage({
    locale,
    customerName: appointment.customerName ?? 'there',
    serviceName:  appointment.serviceName,
    startsAt:     appointment.startsAt,
    businessName,
  });

  // Strip + and non-digits — PataaWaa accepts digit strings.
  const recipient = (appointment.customerPhone ?? '').replace(/[^\d]/g, '');

  // Detached promise — caller doesn't await. Result is logged inside the
  // dispatcher; we capture it here only for the response envelope so the
  // operator's admin tools can render a "WhatsApp sent ✓" badge.
  const whatsappDispatchPromise = recipient
    ? dispatchPataawaaSend({
        to:   recipient,
        body: whatsappBody,
        tenantSubdomain: appointment.domain.subdomain,
        metadata: {
          cv_source:        'booking-confirm',
          cv_appointment_id: appointment.id,
          cv_locale:         locale,
        },
      })
    : Promise.resolve({ ok: false, status: 0, error: 'no customer phone' });

  // We DO await this — but with a tight cap — so the response can include
  // a real dispatch status. If PataaWaa is slow, the wait is bounded by
  // its 3-second timeout inside the dispatcher.
  const whatsappDispatch = await whatsappDispatchPromise;

  return NextResponse.json({
    ok: true,
    wasAlreadyConfirmed: false,
    appointmentId: appointment.id,
    status:        'CONFIRMED',
    ledgerId,
    capturedAt:    capturedAt.toISOString(),
    whatsappDispatch,
  });
}

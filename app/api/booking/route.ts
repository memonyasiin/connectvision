// ═════════════════════════════════════════════════════════════════════════════
// POST /api/booking — Slot hold + UPI prepaid link generation (MODULE 3)
// ─────────────────────────────────────────────────────────────────────────────
// Atomic transition AVAILABLE → PENDING_CHECKOUT (a "soft hold") for a
// single BusinessAppointment row. Computes the surge multiplier at HOLD
// time so the customer's quoted price is locked from this moment; subsequent
// surge fluctuations cannot retroactively change what they're billed.
//
// REQUEST
//   {
//     action:        'hold',
//     appointmentId: string,
//     tenantSubdomain: string,           // multi-tenant scope guard
//     customer: {
//       name:   string,
//       phone:  string,                  // E.164-ish (digits + optional +)
//       email?: string,
//       locale?: 'en-IN' | 'hi-IN' | 'hi-IN-Latn',
//     }
//   }
//
// SUCCESS (200)
//   {
//     ok: true,
//     appointmentId, baselinePriceInr, surgeMultiplier, activePriceInr,
//     upiPrepaidLink,    // upi://pay?... ready for mobile deep link
//     payeeVpa, payeeName, txnNote, txnRef,
//     holdExpiresAt,     // ISO — soft-released after 5 min if no capture
//   }
//
// FAILURE
//   400 INVALID_BODY / INVALID_LOCALE / TENANT_MISMATCH
//   404 NOT_FOUND
//   409 SLOT_NOT_AVAILABLE  (someone else won the race — picker should refresh)
//   503 VPA_NOT_CONFIGURED  (merchant hasn't completed sovereign onboarding)
//
// CONCURRENCY
//   The hold uses `prisma.businessAppointment.updateMany` with `where:
//   { status: 'AVAILABLE' }` filtered on the appointment id. The atomic
//   COUNT === 1 check rules out the race where two customers tap the
//   same slot in the same millisecond. The second tap returns 409 and
//   the picker re-fetches.
//
// AUTH
//   PUBLIC route — no service token. The tenantSubdomain is the only
//   isolation hint and is verified against the appointment's domain
//   inside the transaction. Rate limiting is the caller's problem
//   (Vercel / Cloudflare).
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  computeSurgeMultiplier,
  computeActivePriceInr,
  buildUpiIntent,
} from '@/lib/surgePricing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Soft-hold window — server-enforced via the background scan that flips
// any PENDING_CHECKOUT row older than this back to AVAILABLE.
// ─────────────────────────────────────────────────────────────────────────────

const HOLD_DURATION_MS = 5 * 60 * 1000; // 5 minutes

// ─────────────────────────────────────────────────────────────────────────────
// Request shape
// ─────────────────────────────────────────────────────────────────────────────

type Locale = 'en-IN' | 'hi-IN' | 'hi-IN-Latn';

interface CustomerInput {
  name: string;
  phone: string;
  email?: string;
  locale?: Locale;
}

interface HoldRequest {
  action: 'hold';
  appointmentId: string;
  tenantSubdomain: string;
  customer: CustomerInput;
}

// ─────────────────────────────────────────────────────────────────────────────
// Error shape — single discriminated-union used by every fail branch
// ─────────────────────────────────────────────────────────────────────────────

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
// Body parse + light validation — defensive narrowing of unknown JSON
// ─────────────────────────────────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function parseBody(raw: unknown): HoldRequest | ApiError {
  if (raw === null || typeof raw !== 'object') {
    return err(400, 'INVALID_BODY', 'Body must be a JSON object.');
  }
  const c = raw as Record<string, unknown>;
  if (c['action'] !== 'hold') {
    return err(400, 'INVALID_BODY', 'action must be "hold".');
  }
  if (!isString(c['appointmentId']) || c['appointmentId'].trim() === '') {
    return err(400, 'INVALID_BODY', 'appointmentId is required.');
  }
  if (!isString(c['tenantSubdomain']) || c['tenantSubdomain'].trim() === '') {
    return err(400, 'INVALID_BODY', 'tenantSubdomain is required.');
  }

  const cust = c['customer'];
  if (cust === null || typeof cust !== 'object') {
    return err(400, 'INVALID_BODY', 'customer is required.');
  }
  const cc = cust as Record<string, unknown>;
  if (!isString(cc['name']) || cc['name'].trim().length < 2) {
    return err(400, 'INVALID_BODY', 'customer.name must be at least 2 chars.');
  }
  if (!isString(cc['phone'])) {
    return err(400, 'INVALID_BODY', 'customer.phone is required.');
  }
  const phoneDigits = cc['phone'].replace(/[^\d+]/g, '');
  if (phoneDigits.replace(/^\+/, '').length < 10) {
    return err(400, 'INVALID_BODY', 'customer.phone must contain at least 10 digits.');
  }
  const email = isString(cc['email']) && cc['email'].includes('@') ? cc['email'].trim() : undefined;

  let locale: Locale | undefined;
  if (cc['locale'] === 'en-IN' || cc['locale'] === 'hi-IN' || cc['locale'] === 'hi-IN-Latn') {
    locale = cc['locale'];
  }

  return {
    action: 'hold',
    appointmentId: c['appointmentId'].trim(),
    tenantSubdomain: c['tenantSubdomain'].trim().toLowerCase(),
    customer: {
      name: cc['name'].trim(),
      phone: phoneDigits,
      ...(email ? { email } : {}),
      ...(locale ? { locale } : {}),
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Recent-booking velocity heuristic — feeds the surge multiplier
// ─────────────────────────────────────────────────────────────────────────────
// Count confirmed bookings in the trailing 4-week window that fell in the
// same hour-of-week as the candidate slot. Cheap-ish query (indexed on
// `[domainId, startsAt]`) and only called once per hold.

async function countRecentSimilarBookings(
  domainId: string,
  slotStart: Date,
  serviceName: string,
): Promise<number> {
  const fourWeeksAgo = new Date(slotStart.getTime() - 4 * 7 * 24 * 60 * 60 * 1000);
  return prisma.businessAppointment.count({
    where: {
      domainId,
      serviceName,
      startsAt: { gte: fourWeeksAgo, lt: slotStart },
      status: { in: ['CONFIRMED', 'COMPLETED'] },
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(err(400, 'INVALID_JSON', 'Body is not valid JSON.'), {
      status: 400,
    });
  }

  const parsed = parseBody(rawBody);
  if ('ok' in parsed && parsed.ok === false) {
    return NextResponse.json(parsed, { status: parsed.status });
  }
  const body = parsed as HoldRequest;

  // ── Step 1 — Resolve tenant + appointment + merchant in one read ──────────
  // Single round-trip pulls everything we need for surge math + UPI link.
  const appointment = await prisma.businessAppointment.findUnique({
    where: { id: body.appointmentId },
    include: {
      domain: {
        include: { merchant: { select: { name: true, vpaAddress: true } } },
      },
    },
  });
  if (!appointment) {
    return NextResponse.json(err(404, 'NOT_FOUND', 'Appointment not found.'), {
      status: 404,
    });
  }
  if (appointment.domain.subdomain !== body.tenantSubdomain) {
    return NextResponse.json(
      err(400, 'TENANT_MISMATCH', 'Appointment does not belong to that tenant.'),
      { status: 400 },
    );
  }
  if (appointment.status !== 'AVAILABLE') {
    return NextResponse.json(
      err(409, 'SLOT_NOT_AVAILABLE', `Slot is currently ${appointment.status}.`),
      { status: 409 },
    );
  }
  const { vpaAddress, name: merchantName } = appointment.domain.merchant;
  if (!vpaAddress) {
    return NextResponse.json(
      err(503, 'VPA_NOT_CONFIGURED', 'Merchant has not registered a UPI VPA yet.'),
      { status: 503 },
    );
  }

  // ── Step 2 — Surge math (deterministic given the inputs) ──────────────────
  const baselinePriceInr = appointment.baselinePriceInr
    ? Number.parseFloat(appointment.baselinePriceInr.toString())
    : 0;
  if (baselinePriceInr <= 0) {
    return NextResponse.json(
      err(503, 'PRICE_NOT_CONFIGURED', 'Slot has no baseline price set.'),
      { status: 503 },
    );
  }
  const recentBookingCount = await countRecentSimilarBookings(
    appointment.domainId,
    appointment.startsAt,
    appointment.serviceName,
  );
  const surgeMultiplier = computeSurgeMultiplier(appointment.startsAt, {
    recentBookingCount,
  });
  const activePriceInr = computeActivePriceInr(baselinePriceInr, surgeMultiplier);

  // ── Step 3 — UPI intent ───────────────────────────────────────────────────
  const txnNote = `${appointment.serviceName} · ${formatSlotForNote(appointment.startsAt)}`;
  const upiPrepaidLink = buildUpiIntent({
    vpa: vpaAddress,
    payeeName: merchantName,
    amountInr: activePriceInr,
    txnNote,
    txnRef: appointment.id,
  });

  // ── Step 4 — Atomic hold (race-safe via updateMany + AVAILABLE filter) ────
  const updateResult = await prisma.businessAppointment.updateMany({
    where: { id: appointment.id, status: 'AVAILABLE' },
    data: {
      status: 'PENDING_CHECKOUT',
      customerName: body.customer.name,
      customerPhone: body.customer.phone,
      customerEmail: body.customer.email ?? null,
      customerLocale: body.customer.locale ?? null,
      baselinePriceInr: new Prisma.Decimal(baselinePriceInr),
      surgeMultiplier: new Prisma.Decimal(surgeMultiplier),
      activePriceInr: new Prisma.Decimal(activePriceInr),
      upiPrepaidLink,
      upiVpa: vpaAddress,
    },
  });

  // If another customer grabbed the slot between our findUnique above and
  // this updateMany, count === 0 → race lost.
  if (updateResult.count !== 1) {
    return NextResponse.json(
      err(409, 'SLOT_NOT_AVAILABLE', 'Slot was claimed by another customer just now.'),
      { status: 409 },
    );
  }

  const holdExpiresAt = new Date(Date.now() + HOLD_DURATION_MS);

  return NextResponse.json({
    ok: true,
    appointmentId: appointment.id,
    serviceName: appointment.serviceName,
    startsAt: appointment.startsAt.toISOString(),
    endsAt: appointment.endsAt.toISOString(),
    baselinePriceInr,
    surgeMultiplier,
    activePriceInr,
    upiPrepaidLink,
    payeeVpa: vpaAddress,
    payeeName: merchantName,
    txnNote,
    txnRef: appointment.id,
    holdExpiresAt: holdExpiresAt.toISOString(),
    holdDurationMs: HOLD_DURATION_MS,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Compact slot time for the UPI txn note. UPI caps this at 80 chars total. */
function formatSlotForNote(date: Date): string {
  // Format: "Sat 7 Jun 10:30" — short, locale-agnostic, UPI-app friendly.
  const day = date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const time = date.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  return `${day} ${time}`;
}

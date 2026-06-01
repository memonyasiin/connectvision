// ═════════════════════════════════════════════════════════════════════════════
// GET /api/booking/status — PUBLIC poll endpoint (MODULE 4)
// ─────────────────────────────────────────────────────────────────────────────
// Consumed by SlotPicker's `held` state to detect when the customer's
// UPI payment lands and the server flips status PENDING_CHECKOUT → CONFIRMED.
//
// QUERY
//   ?ref=<appointmentId>   — required
//
// RESPONSE (200)
//   {
//     ok: true,
//     status: 'PENDING_CHECKOUT' | 'CONFIRMED' | 'AVAILABLE' | 'CANCELLED' | ...
//     confirmedAt?: string,        // ISO when CONFIRMED
//     expiresAt?:   string,        // ISO when the soft hold lapses (PENDING only)
//   }
//
// PRIVACY
//   No customer PII in the response — only the row's status + timing.
//   Customer name / phone / VPA / payer details are NOT exposed.
//
// CACHE
//   `no-store` — polling endpoint, freshness is the whole point.
//
// RATE LIMIT
//   The endpoint is public + Prisma-hitting. SlotPicker polls at 3s
//   intervals for at most 5 minutes (= 100 hits per held slot). At scale
//   this should sit behind Cloudflare's free rate-limit rules
//   (e.g. 600 req/min/IP). We don't enforce in-app — keeps the route hot
//   path purely SELECT.
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Soft-hold ceiling — mirrors HOLD_DURATION_MS in /api/booking/route.ts.
// Duplicated here intentionally: the constant is short, and importing
// from another route file creates a fragile cross-route dep.
const HOLD_DURATION_MS = 5 * 60 * 1000;

export async function GET(req: Request): Promise<NextResponse> {
  const url = new URL(req.url);
  const ref = url.searchParams.get('ref')?.trim();
  if (!ref) {
    return NextResponse.json(
      { ok: false, status: 400, error: 'MISSING_REF', detail: 'Query param `ref` is required.' },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const row = await prisma.businessAppointment.findUnique({
    where: { id: ref },
    select: {
      status: true,
      updatedAt: true,           // surrogate for "hold started" timestamp
      upiCapturedAt: true,
    },
  });
  if (!row) {
    return NextResponse.json(
      { ok: false, status: 404, error: 'NOT_FOUND', detail: 'Appointment not found.' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  // Soft-hold expiry is computed from the row's updatedAt (the timestamp
  // updated by the hold transaction). The server doesn't actively release
  // expired holds here — that's a separate cron concern; this endpoint
  // just hints at it for the client UI countdown.
  let expiresAt: string | undefined;
  if (row.status === 'PENDING_CHECKOUT') {
    expiresAt = new Date(row.updatedAt.getTime() + HOLD_DURATION_MS).toISOString();
  }

  return NextResponse.json(
    {
      ok: true,
      status: row.status,
      ...(row.upiCapturedAt ? { confirmedAt: row.upiCapturedAt.toISOString() } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}

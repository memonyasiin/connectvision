// ═════════════════════════════════════════════════════════════════════════════
// ConnectVision OS — Surge Pricing & UPI Intent Builder (MODULE 3)
// ─────────────────────────────────────────────────────────────────────────────
// Two pure, dependency-free utilities consumed by the public booking flow:
//
//   1. `computeSurgeMultiplier(slotStart, opts)`   →  number 1.00–2.50
//      Time-of-week + booking-velocity heuristics. Deterministic — same
//      inputs always produce the same multiplier, so the customer sees
//      the same price the server bills.
//
//   2. `buildUpiIntent({ vpa, payeeName, amountInr, ... })` →  string
//      Generates an `upi://` deep-link that opens the customer's installed
//      UPI app (GPay, PhonePe, Paytm, BHIM, etc.) pre-filled with the
//      merchant's VPA + locked amount. No Razorpay / Cashfree / NPCI API
//      call required — works directly with every Indian UPI app.
//
// PURE / NO SIDE EFFECTS
//   Both functions are isomorphic. Safe to import from client components
//   (no `fetch`, no `Date.now()` randomness, no Node-only deps).
//
// FAILURE POSTURE
//   `computeSurgeMultiplier` cannot throw — inputs are clamped and
//   missing fields default to baseline. `buildUpiIntent` throws only
//   if the VPA is empty (programmer error, not user input).
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 1 ▸ Surge multiplier
// ─────────────────────────────────────────────────────────────────────────────
// The platform supports a SOFT surge cap at 2.5x. Beyond that the customer
// experience tilts predatory — the operator can always raise baseline price
// instead. Bands and multiplier effects below are calibrated for Indian
// salon / clinic / boutique demand patterns:
//
//   Weekend  (Sat 6, Sun 0)               × 1.20
//   Weekday  peak evening (18:00–20:59)   × 1.30
//   Weekday  lunch (12:00–13:59)          × 1.10
//   Velocity ≥ 10 recent bookings         × 1.20
//   Velocity ≥  5 recent bookings         × 1.10
//   Festival override (operator-supplied) × user-defined (default 1.50)
//
// Multipliers COMPOUND — a Sunday evening at 7pm with 12 recent bookings
// computes as 1.20 × 1.30 × 1.20 = 1.872 → rounded to 1.87.
//
// Final clamp: [1.00, 2.50].

export const SURGE_MIN = 1.0;
export const SURGE_MAX = 2.5;

export interface SurgeOptions {
  /**
   * Count of confirmed bookings for the SAME service in the trailing
   * hour-of-week window (e.g. last 4 weeks' Fridays 7-8pm combined).
   * Drives the velocity bump. Default 0 = no velocity signal.
   */
  recentBookingCount?: number;
  /**
   * Festival multiplier override. When set, this SUPERSEDES every other
   * multiplier (operators flag Diwali / Eid / Christmas slots manually
   * via this knob). Capped to SURGE_MAX inside this function.
   */
  festivalOverride?: number;
}

/**
 * Pure deterministic surge multiplier for a single slot start time.
 *
 * @example
 *   computeSurgeMultiplier(new Date('2026-06-07T19:00:00+05:30'))
 *   // Sunday 7pm IST → 1.2 × 1.3 = 1.56
 */
export function computeSurgeMultiplier(slotStart: Date, options: SurgeOptions = {}): number {
  // Festival override is the trump card — short-circuit early.
  if (typeof options.festivalOverride === 'number' && options.festivalOverride > 1) {
    return clampSurge(options.festivalOverride);
  }

  let multiplier = 1.0;

  // Day-of-week buckets — use local time, NOT UTC. The slot's startsAt is
  // already the displayed time so we want its local hour/day.
  const day = slotStart.getDay(); // 0 = Sun, 6 = Sat
  const hour = slotStart.getHours();
  const isWeekend = day === 0 || day === 6;
  const isWeekday = !isWeekend;

  if (isWeekend) {
    multiplier *= 1.2;
  }

  // Peak evening 18:00–20:59 — compounds with weekend bump.
  if (hour >= 18 && hour < 21) {
    multiplier *= 1.3;
  }

  // Weekday lunch 12:00–13:59 (small bump — only the time-rich crowd
  // books mid-day on weekdays so demand is finite).
  if (isWeekday && hour >= 12 && hour < 14) {
    multiplier *= 1.1;
  }

  // Velocity heuristic — recent same-slot bookings indicate hot demand.
  const recent = Math.max(0, options.recentBookingCount ?? 0);
  if (recent >= 10) multiplier *= 1.2;
  else if (recent >= 5) multiplier *= 1.1;

  return clampSurge(multiplier);
}

function clampSurge(raw: number): number {
  const bounded = Math.min(SURGE_MAX, Math.max(SURGE_MIN, raw));
  // Round to 2 decimals — matches Prisma's Decimal(4,2) column precision.
  return Math.round(bounded * 100) / 100;
}

/**
 * Resolve a baseline price + surge multiplier into the customer-billed
 * final price. Round HALF-UP at the rupee — UPI intents don't accept
 * paise fractions reliably across every Indian bank app, so we bill in
 * whole rupees with the rounded-up edge always favoring the merchant.
 */
export function computeActivePriceInr(baselinePriceInr: number, multiplier: number): number {
  if (!Number.isFinite(baselinePriceInr) || baselinePriceInr <= 0) return 0;
  const raw = baselinePriceInr * multiplier;
  return Math.round(raw + 0.0001); // +0.0001 forces a deterministic half-up
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 ▸ UPI intent builder — opens the customer's UPI app pre-filled
// ─────────────────────────────────────────────────────────────────────────────
// Spec: https://www.npci.org.in/PDF/npci/upi/UPI-Linking-Specs.pdf
//
// Required params:
//   pa — payee VPA (e.g. merchant@hdfcbank)
//   pn — payee name (URL-encoded)
//   am — amount (string with up to 2 decimals)
//   cu — currency code (always "INR" on UPI)
//
// Recommended params we set:
//   tn — transaction note (URL-encoded service name + time)
//   tr — transaction reference id (correlation key for reconciliation)
//
// Returns an `upi://pay?...` URI. On mobile this opens the installed UPI
// app; on desktop browsers it surfaces a no-handler error (the booking UI
// should fall back to rendering a QR code of this same URI for desktop).

export interface UpiIntentInput {
  /** Merchant VPA — required. Format: localpart@bankhandle. */
  vpa: string;
  /** Display name shown in the customer's UPI app. */
  payeeName: string;
  /** Amount in INR. Rounded to whole rupees inside the builder. */
  amountInr: number;
  /** Short human-readable description (≤ 80 chars after URL-encoding). */
  txnNote: string;
  /**
   * Optional reference id — typically the BusinessAppointment.id. Echoed
   * back by the UPI app on successful payment for reconciliation.
   */
  txnRef?: string;
  /**
   * Optional callback URL the UPI app will redirect to after payment.
   * Most apps ignore this; included for spec completeness.
   */
  callbackUrl?: string;
}

const TXN_NOTE_MAX = 80;

export function buildUpiIntent(input: UpiIntentInput): string {
  const vpa = input.vpa.trim();
  if (vpa === '') {
    throw new Error('buildUpiIntent: vpa is required.');
  }
  const params = new URLSearchParams();
  params.set('pa', vpa);
  params.set('pn', input.payeeName.trim().slice(0, 99));
  params.set('am', String(Math.max(0, Math.round(input.amountInr))));
  params.set('cu', 'INR');
  params.set('tn', input.txnNote.trim().slice(0, TXN_NOTE_MAX));
  if (input.txnRef) params.set('tr', input.txnRef.trim().slice(0, 35));
  if (input.callbackUrl) params.set('url', input.callbackUrl);
  return `upi://pay?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 ▸ Helper — friendly multiplier label for the booking UI surge badge
// ─────────────────────────────────────────────────────────────────────────────

export interface SurgeLabel {
  /** Compact label, e.g. "1.5×", "Peak", "Surge". */
  short: string;
  /** Long-form, e.g. "1.5× peak-hour pricing". */
  long: string;
  /** Tailwind color hint for the badge — caller maps to actual class. */
  tone: 'neutral' | 'amber' | 'rose';
}

export function describeSurge(multiplier: number): SurgeLabel {
  const m = clampSurge(multiplier);
  if (m <= 1.05) {
    return { short: 'Base', long: 'Baseline pricing', tone: 'neutral' };
  }
  if (m <= 1.35) {
    return {
      short: `${m.toFixed(2)}×`,
      long: `${m.toFixed(2)}× peak-hour pricing`,
      tone: 'amber',
    };
  }
  return {
    short: `${m.toFixed(2)}× surge`,
    long: `${m.toFixed(2)}× festival/peak surge`,
    tone: 'rose',
  };
}

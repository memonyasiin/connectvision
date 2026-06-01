'use client';

// ═════════════════════════════════════════════════════════════════════════════
// SlotPicker — interactive booking grid (MODULE 3 client island)
// ─────────────────────────────────────────────────────────────────────────────
// Three-pane interaction model:
//
//   Pane 1  Day tabs                — horizontal scroll of next 7 days
//   Pane 2  Slot list (per day)     — vertical list of slot cards
//   Pane 3  Customer-details form  — appears when a slot is selected;
//                                     submit → POST /api/booking →
//                                     UPI deep-link button
//
// PRICING DISPLAY
//   Each slot card shows: time-of-day, duration, service name, baseline
//   strikethrough (if surge > 1.05), active price, and a surge badge
//   colored by `surgeTone` (neutral / amber / rose).
//
// HOLD UX
//   Submitting locks the slot for 5 minutes. We display the
//   `holdExpiresAt` countdown live + render a primary "Pay ₹X via UPI"
//   button that opens the `upi://` intent. On desktop browsers (no
//   UPI handler) we surface a "Open on your phone" hint with the same
//   intent encoded as a copyable string.
//
// STATE
//   `selectedDate`            — which day's slot list shows
//   `selectedSlotId`          — which slot is being booked (form opens)
//   `customer`                — three controlled form fields
//   `holdState`               — discriminated union: idle / submitting /
//                               held / error — drives the form/CTA copy
// ═════════════════════════════════════════════════════════════════════════════

import { useEffect, useMemo, useState, type ChangeEvent } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// View-model types — must mirror what the server emits in page.tsx
// ─────────────────────────────────────────────────────────────────────────────

export interface AvailableSlot {
  id: string;
  startsAtIso: string;
  endsAtIso: string;
  durationMin: number;
  serviceName: string;
  serviceCategory: string | null;
  baselinePriceInr: number;
  surgeMultiplier: number;
  activePriceInr: number;
  surgeLabelShort: string;
  surgeLabelLong: string;
  surgeTone: 'neutral' | 'amber' | 'rose';
}

interface SlotPickerProps {
  slots: readonly AvailableSlot[];
  tenantSubdomain: string;
  businessName: string;
  /** True iff merchant has not set up VPA — disables the booking form. */
  bookingDisabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hold state — discriminated union models the full booking lifecycle
// ─────────────────────────────────────────────────────────────────────────────

type Locale = 'en-IN' | 'hi-IN' | 'hi-IN-Latn';

interface HeldDetails {
  appointmentId: string;
  serviceName: string;
  startsAt: Date;
  activePriceInr: number;
  baselinePriceInr: number;
  surgeMultiplier: number;
  upiPrepaidLink: string;
  payeeVpa: string;
  payeeName: string;
  txnNote: string;
  holdExpiresAt: Date;
}

interface ConfirmedDetails {
  appointmentId: string;
  serviceName: string;
  startsAt: Date;
  activePriceInr: number;
  confirmedAt: Date;
}

type HoldState =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'held'; details: HeldDetails }
  | { kind: 'confirmed'; details: ConfirmedDetails }
  | { kind: 'error'; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function isoDateKey(iso: string): string {
  // Stable bucket key: YYYY-MM-DD in local time.
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDayTab(iso: string): { weekday: string; dayNum: string } {
  const d = new Date(iso);
  return {
    weekday: d.toLocaleDateString('en-IN', { weekday: 'short' }),
    dayNum: String(d.getDate()),
  };
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatPrice(inr: number): string {
  return `₹${inr.toLocaleString('en-IN')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function SlotPicker({
  slots,
  tenantSubdomain,
  businessName,
  bookingDisabled = false,
}: SlotPickerProps) {
  // ── Group slots by day ──────────────────────────────────────────────────
  const grouped = useMemo(() => {
    const map = new Map<string, AvailableSlot[]>();
    for (const s of slots) {
      const key = isoDateKey(s.startsAtIso);
      const list = map.get(key) ?? [];
      list.push(s);
      map.set(key, list);
    }
    return map;
  }, [slots]);

  const dayKeys = useMemo(() => Array.from(grouped.keys()), [grouped]);
  const [selectedDayKey, setSelectedDayKey] = useState<string>(dayKeys[0] ?? '');
  const [selectedSlotId, setSelectedSlotId] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [locale, setLocale] = useState<Locale>('hi-IN-Latn');

  // Booking lifecycle
  const [holdState, setHoldState] = useState<HoldState>({ kind: 'idle' });

  // Hold countdown — re-render every second when we have an active hold.
  const [now, setNow] = useState<number>(() => Date.now());
  useEffect(() => {
    if (holdState.kind !== 'held') return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [holdState.kind]);

  // Status polling — every 3s during 'held' state. When the server flips
  // status → CONFIRMED (the UPI webhook landed), transition to the
  // confirmed celebration view. Cleanly tears down when state changes
  // or the hold expires.
  useEffect(() => {
    if (holdState.kind !== 'held') return;
    const heldDetails = holdState.details;
    let cancelled = false;

    async function pollStatus() {
      try {
        const res = await fetch(
          `/api/booking/status?ref=${encodeURIComponent(heldDetails.appointmentId)}`,
          { cache: 'no-store' },
        );
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          ok: boolean;
          status?: string;
          confirmedAt?: string;
        };
        if (cancelled) return;
        if (data.ok && data.status === 'CONFIRMED' && data.confirmedAt) {
          setHoldState({
            kind: 'confirmed',
            details: {
              appointmentId: heldDetails.appointmentId,
              serviceName: heldDetails.serviceName,
              startsAt: heldDetails.startsAt,
              activePriceInr: heldDetails.activePriceInr,
              confirmedAt: new Date(data.confirmedAt),
            },
          });
        }
      } catch {
        // Silent — transient network blips during polling are expected on
        // flaky mobile networks. The next tick will retry.
      }
    }

    // Fire immediately + then every 3 seconds.
    void pollStatus();
    const id = window.setInterval(() => void pollStatus(), 3000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [holdState]);

  const visibleSlots = grouped.get(selectedDayKey) ?? [];
  const selectedSlot = visibleSlots.find((s) => s.id === selectedSlotId) ?? null;
  const formValid = name.trim().length >= 2 && phone.replace(/\D/g, '').length >= 10;
  const canSubmit =
    !!selectedSlot && formValid && !bookingDisabled && holdState.kind !== 'submitting';

  async function submitHold() {
    if (!selectedSlot) return;
    setHoldState({ kind: 'submitting' });
    try {
      const res = await fetch('/api/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'hold',
          appointmentId: selectedSlot.id,
          tenantSubdomain,
          customer: {
            name: name.trim(),
            phone: phone.trim(),
            email: email.trim() || undefined,
            locale,
          },
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok || typeof data !== 'object' || data === null || !('ok' in data) || (data as { ok: unknown }).ok !== true) {
        const detail = (data as { detail?: string } | null)?.detail ?? `Hold failed (${res.status}).`;
        setHoldState({ kind: 'error', message: detail });
        return;
      }
      // Double-cast via `unknown` — after the !ok narrowing, TS can only
      // see `object & Record<'ok', unknown>` which doesn't overlap with
      // the specific success shape. The runtime check above guarantees
      // shape, but TS can't infer that statically.
      const d = data as unknown as {
        appointmentId: string;
        serviceName: string;
        startsAt: string;
        activePriceInr: number;
        baselinePriceInr: number;
        surgeMultiplier: number;
        upiPrepaidLink: string;
        payeeVpa: string;
        payeeName: string;
        txnNote: string;
        holdExpiresAt: string;
      };
      setHoldState({
        kind: 'held',
        details: {
          appointmentId: d.appointmentId,
          serviceName: d.serviceName,
          startsAt: new Date(d.startsAt),
          activePriceInr: d.activePriceInr,
          baselinePriceInr: d.baselinePriceInr,
          surgeMultiplier: d.surgeMultiplier,
          upiPrepaidLink: d.upiPrepaidLink,
          payeeVpa: d.payeeVpa,
          payeeName: d.payeeName,
          txnNote: d.txnNote,
          holdExpiresAt: new Date(d.holdExpiresAt),
        },
      });
    } catch (err) {
      setHoldState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network fault.',
      });
    }
  }

  // ── Confirmed state: terminal success view ─────────────────────────────
  if (holdState.kind === 'confirmed') {
    return (
      <ConfirmedPanel
        details={holdState.details}
        onReset={() => {
          setHoldState({ kind: 'idle' });
          setSelectedSlotId(null);
        }}
      />
    );
  }

  // ── Held state: render the payment panel exclusively ───────────────────
  if (holdState.kind === 'held') {
    return (
      <HeldPaymentPanel
        details={holdState.details}
        now={now}
        businessName={businessName}
        onReset={() => {
          setHoldState({ kind: 'idle' });
          setSelectedSlotId(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Day tabs ─────────────────────────────────────────────────────── */}
      <div className="overflow-x-auto -mx-5 md:mx-0">
        <div className="flex gap-2 px-5 md:px-0">
          {dayKeys.map((key) => {
            const sample = grouped.get(key)?.[0];
            if (!sample) return null;
            const { weekday, dayNum } = formatDayTab(sample.startsAtIso);
            const isActive = key === selectedDayKey;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelectedDayKey(key);
                  setSelectedSlotId(null);
                }}
                className={`
                  shrink-0 px-4 py-3 rounded-xl border text-center min-w-[68px]
                  transition-colors
                  ${
                    isActive
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-slate-400'
                  }
                `}
              >
                <div className="text-[10px] font-semibold uppercase tracking-wider opacity-80">
                  {weekday}
                </div>
                <div className="text-lg font-bold tabular-nums">{dayNum}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Slot grid for selected day ────────────────────────────────────── */}
      <div className="grid sm:grid-cols-2 gap-3">
        {visibleSlots.map((slot) => (
          <SlotCard
            key={slot.id}
            slot={slot}
            isSelected={selectedSlotId === slot.id}
            onClick={() => setSelectedSlotId(slot.id)}
          />
        ))}
      </div>

      {/* ── Customer details form (inline) ──────────────────────────────── */}
      {selectedSlot ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">
            Your details
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            We use these only for the booking — never shared, never spammed.
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <FormInput
              label="Full name"
              value={name}
              onChange={setName}
              placeholder="Your name"
              autoComplete="name"
            />
            <FormInput
              label="Phone (UPI-linked)"
              value={phone}
              onChange={setPhone}
              placeholder="+91 98765 43210"
              autoComplete="tel"
              inputMode="tel"
            />
            <FormInput
              label="Email (optional)"
              value={email}
              onChange={setEmail}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <LocaleSelect value={locale} onChange={setLocale} />
          </div>

          {holdState.kind === 'error' ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-800">
              {holdState.message}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="text-sm text-slate-600">
              {formatPrice(selectedSlot.activePriceInr)} via UPI
              {selectedSlot.surgeMultiplier > 1.05 ? (
                <span className="text-xs text-slate-400 ml-2">
                  ({selectedSlot.surgeLabelShort})
                </span>
              ) : null}
            </div>
            <button
              type="button"
              onClick={submitHold}
              disabled={!canSubmit}
              className="
                inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold
                bg-slate-900 text-white hover:bg-slate-800
                disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed
                transition-colors shadow-sm
              "
            >
              {holdState.kind === 'submitting' ? 'Holding slot…' : 'Continue to payment →'}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SlotCard
// ─────────────────────────────────────────────────────────────────────────────

function SlotCard({
  slot,
  isSelected,
  onClick,
}: {
  slot: AvailableSlot;
  isSelected: boolean;
  onClick: () => void;
}) {
  const showSurge = slot.surgeMultiplier > 1.05;
  const toneClass: Record<AvailableSlot['surgeTone'], string> = {
    neutral: 'bg-slate-100 text-slate-600',
    amber: 'bg-amber-100 text-amber-800',
    rose: 'bg-rose-100 text-rose-800',
  };
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        text-left rounded-2xl border p-4 transition-all
        ${
          isSelected
            ? 'border-slate-900 bg-slate-900 text-white shadow-md'
            : 'border-slate-200 bg-white hover:border-slate-400 hover:shadow-sm'
        }
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-base font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
            {formatSlotTime(slot.startsAtIso)}
          </div>
          <div className={`text-xs ${isSelected ? 'text-white/70' : 'text-slate-500'}`}>
            {slot.serviceName} · {slot.durationMin} min
          </div>
        </div>
        <div className="text-right shrink-0">
          {showSurge ? (
            <div
              className={`inline-block text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full mb-1 ${
                isSelected ? 'bg-white/15 text-white' : toneClass[slot.surgeTone]
              }`}
            >
              {slot.surgeLabelShort}
            </div>
          ) : null}
          <div className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-slate-900'}`}>
            {formatPrice(slot.activePriceInr)}
          </div>
          {showSurge ? (
            <div className={`text-[11px] line-through ${isSelected ? 'text-white/50' : 'text-slate-400'}`}>
              {formatPrice(slot.baselinePriceInr)}
            </div>
          ) : null}
        </div>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FormInput / LocaleSelect
// ─────────────────────────────────────────────────────────────────────────────

function FormInput({
  label,
  value,
  onChange,
  placeholder,
  autoComplete,
  inputMode,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'text' | 'tel' | 'email';
}) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(e: ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        inputMode={inputMode}
        className="
          mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5
          text-sm text-slate-900 placeholder:text-slate-400
          focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900
          transition-colors
        "
      />
    </label>
  );
}

function LocaleSelect({
  value,
  onChange,
}: {
  value: Locale;
  onChange: (v: Locale) => void;
}) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      Preferred language
      <select
        value={value}
        onChange={(e: ChangeEvent<HTMLSelectElement>) => onChange(e.target.value as Locale)}
        className="
          mt-1.5 block w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5
          text-sm text-slate-900
          focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900
          transition-colors
        "
      >
        <option value="hi-IN-Latn">Hinglish</option>
        <option value="hi-IN">हिन्दी</option>
        <option value="en-IN">English</option>
      </select>
    </label>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HeldPaymentPanel — terminal screen after a successful hold
// ─────────────────────────────────────────────────────────────────────────────

function HeldPaymentPanel({
  details,
  now,
  businessName,
  onReset,
}: {
  details: HeldDetails;
  now: number;
  businessName: string;
  onReset: () => void;
}) {
  const msLeft = Math.max(0, details.holdExpiresAt.getTime() - now);
  const secondsLeft = Math.floor(msLeft / 1000);
  const expired = msLeft <= 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 md:p-8 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-2">
        Slot held — pay to confirm
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-slate-900">
        {details.serviceName}
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        {details.startsAt.toLocaleString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}
      </p>

      {/* ── Price summary ────────────────────────────────────────────────── */}
      <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-slate-500">Amount due</span>
          <span className="text-2xl font-bold tabular-nums text-slate-900">
            {formatPrice(details.activePriceInr)}
          </span>
        </div>
        {details.surgeMultiplier > 1.05 ? (
          <div className="mt-1.5 text-xs text-slate-500 text-right">
            Baseline {formatPrice(details.baselinePriceInr)} ·{' '}
            {details.surgeMultiplier.toFixed(2)}× surge
          </div>
        ) : null}
      </div>

      {/* ── Hold countdown ────────────────────────────────────────────────── */}
      <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            expired ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
          }`}
        />
        {expired ? (
          <span>
            Hold expired — slot has been released.{' '}
            <button onClick={onReset} className="underline font-semibold">
              Pick another time
            </button>
          </span>
        ) : (
          <span>
            Hold expires in <b className="tabular-nums">{formatCountdown(secondsLeft)}</b>{' '}
            — complete payment before then.
          </span>
        )}
      </div>

      {/* ── UPI deep-link button ──────────────────────────────────────────── */}
      <div className="mt-6 space-y-3">
        <a
          href={expired ? '#' : details.upiPrepaidLink}
          aria-disabled={expired}
          onClick={(e) => {
            if (expired) e.preventDefault();
          }}
          className={`
            block w-full text-center px-6 py-4 rounded-xl text-base font-semibold
            transition-colors shadow-sm
            ${
              expired
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-600 text-white hover:bg-emerald-500'
            }
          `}
        >
          {expired ? 'Hold expired' : `Pay ${formatPrice(details.activePriceInr)} via UPI`}
        </a>
        <p className="text-[11px] text-slate-500 text-center leading-relaxed">
          On a phone: tap the button to open GPay / PhonePe / Paytm / BHIM
          pre-filled with{' '}
          <code className="font-mono text-slate-700">{details.payeeVpa}</code>.
          <br />
          On desktop: scan the UPI QR with your phone&apos;s UPI app.
        </p>
      </div>

      {/* ── Cancel link ───────────────────────────────────────────────────── */}
      <div className="mt-6 pt-4 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-slate-500 hover:text-slate-700 underline"
        >
          Cancel and pick another slot
        </button>
      </div>

      {/* ── Reconciliation note ────────────────────────────────────────────── */}
      <div className="mt-5 text-[11px] text-slate-400 text-center font-mono">
        Ref · {details.appointmentId.slice(-12)}
      </div>

      <div className="sr-only">Business: {businessName}</div>
    </div>
  );
}

function formatCountdown(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// ConfirmedPanel — terminal success screen after UPI webhook lands
// ─────────────────────────────────────────────────────────────────────────────
// Reached when the polling effect detects the server-side status flip
// PENDING_CHECKOUT → CONFIRMED. Shows the confirmed booking details, the
// captured timestamp, and an emerald celebration aesthetic.

function ConfirmedPanel({
  details,
  onReset,
}: {
  details: ConfirmedDetails;
  onReset: () => void;
}) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:p-8 shadow-sm text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500 text-white mb-5 shadow-lg shadow-emerald-500/30">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-7 h-7"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
        Payment captured · Booking confirmed
      </div>
      <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-slate-900">
        {details.serviceName}
      </h2>
      <p className="mt-2 text-sm text-slate-700">
        {details.startsAt.toLocaleString('en-IN', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })}
      </p>

      {/* ── Receipt card ─────────────────────────────────────────────────── */}
      <div className="mt-6 mx-auto max-w-sm rounded-xl border border-emerald-300/50 bg-white p-4 text-left">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-slate-500">Captured</span>
          <span className="text-base font-bold tabular-nums text-slate-900">
            {formatPrice(details.activePriceInr)}
          </span>
        </div>
        <div className="flex items-baseline justify-between text-xs text-slate-500">
          <span>Confirmed at</span>
          <span className="font-mono text-slate-700">
            {details.confirmedAt.toLocaleTimeString('en-IN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: true,
            })}
          </span>
        </div>
        <div className="mt-2 pt-2 border-t border-slate-100 flex items-baseline justify-between text-xs">
          <span className="text-slate-500">Reference</span>
          <span className="font-mono text-slate-700">
            {details.appointmentId.slice(-12)}
          </span>
        </div>
      </div>

      {/* ── WhatsApp confirmation hint ────────────────────────────────────── */}
      <p className="mt-5 text-xs text-emerald-700 max-w-md mx-auto leading-relaxed">
        A confirmation message is on its way to your WhatsApp. See you at the
        appointment.
      </p>

      {/* ── Book-again CTA ───────────────────────────────────────────────── */}
      <div className="mt-6">
        <button
          type="button"
          onClick={onReset}
          className="
            inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold
            text-emerald-800 bg-white border border-emerald-200 hover:bg-emerald-50
            transition-colors
          "
        >
          Book another slot
        </button>
      </div>
    </div>
  );
}

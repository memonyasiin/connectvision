'use client';

// ═════════════════════════════════════════════════════════════════════════════
// CheckoutClient — Razorpay modal + state machine + license reveal (MODULE 8)
// ─────────────────────────────────────────────────────────────────────────────
// State machine:
//
//   idle ─────── tap "Pay" ──────► creating-order
//                                       │
//                                       ▼
//                          ┌── mock ────► verifying (skip modal)
//                          │
//                          └── live ────► razorpay-open
//                                            │
//                            (Razorpay handler fires)
//                                            │
//                                            ▼
//                                        verifying
//                                            │
//                              ┌─────────────┴─────────────┐
//                              ▼                           ▼
//                           success                       error
//
// MOCK MODE
//   When /api/checkout/order returns `mode: 'mock'` (Razorpay env not
//   configured), we skip opening Razorpay's modal and POST directly to
//   /verify with a synthetic payment id + 'mock' signature. Demos the
//   full flow without a billing account.
//
// LICENSE KEY DISPLAY
//   Revealed in the success panel with a one-tap copy button. Customers
//   should save this key — it's the proof-of-purchase the deployed theme
//   uses for runtime verification against the future ConnectVision-PHP
//   license server.
// ═════════════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';

// ─────────────────────────────────────────────────────────────────────────────
// Bootstrap data passed from the server-rendered shell
// ─────────────────────────────────────────────────────────────────────────────

export interface CheckoutBootstrap {
  draftId: string;
  themeSlug: string;
  themeName: string;
  themePriceInr: number;
  themeMrpInr: number | null;
  themeCategoryLabel: string;
  themeCategoryColor: string;
  themeCategoryGlyph: string;
  businessName: string;
  tagline: string | null;
  primaryColor: string;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  licenseKey: string | null;
  purchasedAt: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Razorpay global — minimal typing so we don't depend on the npm SDK
// ─────────────────────────────────────────────────────────────────────────────

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email?: string; contact?: string };
  theme?: { color?: string };
  handler: (response: RazorpayResponse) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

const RAZORPAY_SCRIPT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';

async function loadRazorpayScript(): Promise<void> {
  if (typeof window === 'undefined' || window.Razorpay) return;
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${RAZORPAY_SCRIPT_SRC}"]`);
    if (existing) {
      // Already in DOM — wait for global to populate.
      const check = window.setInterval(() => {
        if (window.Razorpay) {
          window.clearInterval(check);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(check);
        if (!window.Razorpay) reject(new Error('Razorpay script present but global never appeared'));
      }, 10_000);
      return;
    }
    const script = document.createElement('script');
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Razorpay checkout.js'));
    document.head.appendChild(script);
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// State machine
// ─────────────────────────────────────────────────────────────────────────────

type CheckoutState =
  | { kind: 'idle' }
  | { kind: 'creating-order' }
  | { kind: 'razorpay-open'; orderId: string; mode: 'live' | 'mock' }
  | { kind: 'verifying' }
  | { kind: 'success'; licenseKey: string; purchasedAt: string }
  | { kind: 'error'; message: string };

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export function CheckoutClient({ bootstrap }: { bootstrap: CheckoutBootstrap }) {
  // If the draft is already PURCHASED on first load, skip straight to
  // success — handles refreshes after a previously successful purchase.
  const [state, setState] = useState<CheckoutState>(() => {
    if (bootstrap.status === 'PURCHASED' && bootstrap.licenseKey) {
      return {
        kind: 'success',
        licenseKey: bootstrap.licenseKey,
        purchasedAt: bootstrap.purchasedAt ?? new Date().toISOString(),
      };
    }
    return { kind: 'idle' };
  });

  async function startCheckout() {
    setState({ kind: 'creating-order' });

    // ── Step 1 — create Razorpay order on our server ──────────────────
    let orderData: {
      ok: boolean;
      mode?: 'live' | 'mock';
      razorpayOrderId?: string;
      razorpayKeyId?: string;
      amountInr?: number;
      themeName?: string;
      prefill?: { name: string; email?: string; contact?: string };
      detail?: string;
    };
    try {
      const res = await fetch('/api/checkout/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftId: bootstrap.draftId }),
      });
      orderData = await res.json();
      if (!res.ok || !orderData.ok) {
        setState({ kind: 'error', message: orderData.detail ?? `Order creation failed (HTTP ${res.status}).` });
        return;
      }
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Network fault during order creation.',
      });
      return;
    }
    if (!orderData.razorpayOrderId || !orderData.mode) {
      setState({ kind: 'error', message: 'Server returned an incomplete order payload.' });
      return;
    }

    // ── Step 2a — MOCK MODE: skip Razorpay modal entirely ──────────────
    if (orderData.mode === 'mock') {
      await runVerify({
        razorpayOrderId: orderData.razorpayOrderId,
        razorpayPaymentId: `pay_mock_${Date.now().toString(36)}`,
        razorpaySignature: 'mock',
      });
      return;
    }

    // ── Step 2b — LIVE MODE: load + open Razorpay modal ───────────────
    if (
      !orderData.razorpayKeyId ||
      typeof orderData.amountInr !== 'number' ||
      !orderData.themeName ||
      !orderData.prefill
    ) {
      setState({ kind: 'error', message: 'Server returned an incomplete live-mode payload.' });
      return;
    }
    try {
      await loadRazorpayScript();
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Could not load Razorpay checkout.js',
      });
      return;
    }
    if (!window.Razorpay) {
      setState({ kind: 'error', message: 'Razorpay global is unavailable.' });
      return;
    }

    setState({ kind: 'razorpay-open', orderId: orderData.razorpayOrderId, mode: 'live' });

    const rzp = new window.Razorpay({
      key:         orderData.razorpayKeyId,
      amount:      orderData.amountInr * 100,
      currency:    'INR',
      name:        'ConnectVision',
      description: `Lifetime licence · ${orderData.themeName}`,
      order_id:    orderData.razorpayOrderId,
      prefill:     orderData.prefill,
      theme:       { color: bootstrap.themeCategoryColor },
      handler: (response) => {
        void runVerify({
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        });
      },
      modal: {
        ondismiss: () => setState({ kind: 'idle' }),
      },
    });
    rzp.open();
  }

  async function runVerify(args: {
    razorpayOrderId: string;
    razorpayPaymentId: string;
    razorpaySignature: string;
  }) {
    setState({ kind: 'verifying' });
    try {
      const res = await fetch('/api/checkout/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draftId: bootstrap.draftId,
          ...args,
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok || typeof data !== 'object' || data === null || (data as { ok?: unknown }).ok !== true) {
        const d = data as { detail?: string } | null;
        setState({
          kind: 'error',
          message: d?.detail ?? `Verification failed (HTTP ${res.status}).`,
        });
        return;
      }
      const ok = data as unknown as { licenseKey: string; purchasedAt: string };
      setState({ kind: 'success', licenseKey: ok.licenseKey, purchasedAt: ok.purchasedAt });
    } catch (e) {
      setState({
        kind: 'error',
        message: e instanceof Error ? e.message : 'Network fault during verification.',
      });
    }
  }

  // ── Render branches ───────────────────────────────────────────────────
  if (state.kind === 'success') {
    return <SuccessPanel bootstrap={bootstrap} licenseKey={state.licenseKey} purchasedAt={state.purchasedAt} />;
  }

  return (
    <div className="grid lg:grid-cols-12 gap-8 lg:gap-10">
      {/* ── Order summary ───────────────────────────────────────────────── */}
      <section className="lg:col-span-7 space-y-5">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
            Checkout · Step 4 of 4
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-950">
            One step from going live
          </h1>
          <p className="mt-1 text-sm text-slate-600 max-w-xl">
            Review the cart, complete payment via UPI / card / net-banking,
            and walk out with your licence key + theme bundle.
          </p>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-white p-5 md:p-6">
          <div className="flex items-start gap-4">
            <span
              className="inline-flex items-center justify-center w-10 h-10 rounded-md text-lg font-bold text-white shrink-0"
              style={{ background: bootstrap.themeCategoryColor }}
            >
              {bootstrap.themeCategoryGlyph}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-base font-semibold text-slate-900">
                {bootstrap.themeName}
              </div>
              <div className="text-xs text-slate-500">
                {bootstrap.themeCategoryLabel} · Lifetime licence
              </div>
              <div className="text-xs text-slate-600 mt-1">
                Customised for <span className="font-semibold text-slate-800">{bootstrap.businessName}</span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-2xl font-bold text-emerald-900 tabular-nums">
                ₹{bootstrap.themePriceInr.toLocaleString('en-IN')}
              </div>
              {bootstrap.themeMrpInr && bootstrap.themeMrpInr > bootstrap.themePriceInr ? (
                <div className="text-xs text-slate-400 line-through tabular-nums">
                  ₹{bootstrap.themeMrpInr.toLocaleString('en-IN')}
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* ── Pay CTA ──────────────────────────────────────────────────── */}
        {state.kind === 'error' ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <b className="block mb-1">Payment didn&apos;t complete</b>
            {state.message}
          </div>
        ) : null}

        <button
          type="button"
          onClick={startCheckout}
          disabled={state.kind === 'creating-order' || state.kind === 'razorpay-open' || state.kind === 'verifying'}
          className="
            w-full inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-semibold
            bg-emerald-900 text-white hover:bg-emerald-800
            disabled:bg-stone-200 disabled:text-stone-500 disabled:cursor-not-allowed
            transition-colors shadow-md shadow-emerald-900/20
            disabled:shadow-none
          "
        >
          {state.kind === 'creating-order' ? 'Creating order…' :
           state.kind === 'razorpay-open' ? 'Razorpay open — complete payment in the popup' :
           state.kind === 'verifying'     ? 'Verifying payment…' :
           `Pay ₹${bootstrap.themePriceInr.toLocaleString('en-IN')} via UPI / card`}
        </button>
        <p className="text-[11px] text-center text-slate-500">
          Secured by Razorpay · GST invoice mailed instantly on capture
        </p>
      </section>

      {/* ── Personalised receipt-style sidebar ──────────────────────────── */}
      <aside className="lg:col-span-5">
        <div className="lg:sticky lg:top-24 rounded-2xl border border-stone-200 bg-white p-5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-3">
            Your draft
          </div>
          <div className="h-1 rounded-full" style={{ background: bootstrap.primaryColor }} />
          <div className="mt-4 text-base font-semibold text-slate-900 truncate">
            {bootstrap.businessName}
          </div>
          {bootstrap.tagline ? (
            <div className="text-xs italic text-slate-500 truncate">
              {bootstrap.tagline}
            </div>
          ) : null}

          <dl className="mt-4 pt-4 border-t border-stone-100 space-y-1.5 text-xs">
            {bootstrap.contactEmail ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Email</dt>
                <dd className="font-mono text-slate-700 truncate">{bootstrap.contactEmail}</dd>
              </div>
            ) : null}
            {bootstrap.contactPhone ? (
              <div className="flex items-center justify-between gap-3">
                <dt className="text-slate-500">Phone</dt>
                <dd className="font-mono text-slate-700">{bootstrap.contactPhone}</dd>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <dt className="text-slate-500">Brand colour</dt>
              <dd className="flex items-center gap-2 font-mono text-slate-700">
                <span
                  className="inline-block w-3.5 h-3.5 rounded border border-stone-300"
                  style={{ background: bootstrap.primaryColor }}
                />
                {bootstrap.primaryColor}
              </dd>
            </div>
          </dl>

          <div className="mt-4 pt-4 border-t border-stone-100">
            <Link
              href={`/customize/${bootstrap.themeSlug}` as Route}
              className="text-xs text-slate-500 hover:text-emerald-700 transition-colors"
            >
              ← Edit details
            </Link>
          </div>
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SuccessPanel — license reveal + copy button + next steps
// ─────────────────────────────────────────────────────────────────────────────

function SuccessPanel({
  bootstrap,
  licenseKey,
  purchasedAt,
}: {
  bootstrap: CheckoutBootstrap;
  licenseKey: string;
  purchasedAt: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(licenseKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2_000);
    } catch {
      // Older browsers — no clipboard API. Customer can select + copy manually.
    }
  }
  const purchasedDate = new Date(purchasedAt);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 md:p-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 text-white mb-5 shadow-lg shadow-emerald-600/30">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
            <path d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
          Payment captured · Licence issued
        </div>
        <h2 className="mt-3 text-2xl md:text-3xl font-bold tracking-tight text-emerald-950">
          {bootstrap.themeName} is yours
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Customised for <b>{bootstrap.businessName}</b> ·{' '}
          {purchasedDate.toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true,
          })}
        </p>
      </div>

      {/* ── Licence key reveal ──────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
          Your lifetime licence key
        </div>
        <div className="mt-3 flex items-center gap-3">
          <code className="flex-1 font-mono text-base md:text-lg font-bold tracking-wider text-emerald-900 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 select-all break-all">
            {licenseKey}
          </code>
          <button
            type="button"
            onClick={copy}
            className="
              inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold
              text-emerald-800 bg-emerald-100 hover:bg-emerald-200
              transition-colors
            "
          >
            {copied ? '✓ Copied' : 'Copy'}
          </button>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
          Save this key — the deployed theme uses it for runtime licence
          verification. Lose it and you&apos;ll need to email support to
          re-issue.
        </p>
      </div>

      {/* ── Next steps ──────────────────────────────────────────────────── */}
      <div className="mt-5 rounded-2xl border border-stone-200 bg-white p-6">
        <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-3">
          What happens next
        </div>
        <ol className="space-y-3 text-sm text-slate-700">
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">1</span>
            <span>A GST-compliant invoice is on its way to your inbox.</span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">2</span>
            <span>
              Your customised theme bundle (<code className="font-mono text-xs">{bootstrap.themeName}.zip</code>)
              will appear in the customer dashboard within a minute.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] flex items-center justify-center">3</span>
            <span>
              Need a different theme later? Re-customise as many times as you
              like — your lifetime licence covers them all.
            </span>
          </li>
        </ol>
      </div>

      <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
        <Link
          href={`/dashboard?draft=${bootstrap.draftId}` as Route}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-emerald-900 hover:bg-emerald-800 transition-colors shadow-sm"
        >
          View in my dashboard →
        </Link>
        <Link
          href={'/themes' as Route}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-700 bg-white border border-stone-200 hover:border-stone-400 transition-colors"
        >
          Browse more themes
        </Link>
      </div>
    </div>
  );
}

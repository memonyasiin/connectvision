'use client';

// ═════════════════════════════════════════════════════════════════════════════
// RecomputeButton — fires the server action that re-runs the scanner
// ─────────────────────────────────────────────────────────────────────────────
// Three visual states:
//   - idle:        "Recompute now" — fresh, ready to fire
//   - submitting:  spinner + dimmed text — request in flight
//   - done:        emerald check + summary chip — last result
//   - error:       rose pill with the upstream detail
//
// useTransition() keeps the button responsive across the server-action
// round-trip without forcing a full client-side re-fetch of the page —
// the action's `revalidatePath('/admin/workforce')` triggers Next's
// router cache invalidation and the surrounding RSC re-renders with
// fresh data when the user next navigates (or we trigger router.refresh()).
// ═════════════════════════════════════════════════════════════════════════════

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { recomputeWorkforceAction, type RecomputeResult } from './actions';

export function RecomputeButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [lastResult, setLastResult] = useState<RecomputeResult | null>(null);

  function trigger() {
    startTransition(async () => {
      const result = await recomputeWorkforceAction();
      setLastResult(result);
      if (result.ok) {
        // Force the surrounding RSC to re-render with the new flag state.
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      {lastResult && lastResult.ok && lastResult.summary ? (
        <div className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          {lastResult.summary.overdueAbsentCount} overdue ·{' '}
          {lastResult.summary.ghostStateCount} ghost ·{' '}
          ₹{Math.round(lastResult.summary.totalPenaltyInr).toLocaleString('en-IN')} pending
        </div>
      ) : null}

      {lastResult && !lastResult.ok ? (
        <div
          className="hidden md:inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/10 text-rose-300 border border-rose-500/30 max-w-xs truncate"
          title={lastResult.detail ?? `HTTP ${lastResult.status}`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
          Recompute failed
        </div>
      ) : null}

      <button
        type="button"
        onClick={trigger}
        disabled={pending}
        className="
          inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold
          bg-indigo-500 text-white hover:bg-indigo-400
          disabled:bg-white/5 disabled:text-slate-500 disabled:cursor-not-allowed
          transition-colors shadow-lg shadow-indigo-500/20
          disabled:shadow-none
        "
      >
        {pending ? (
          <>
            <Spinner />
            Scanning…
          </>
        ) : (
          <>
            <RefreshGlyph />
            Recompute now
          </>
        )}
      </button>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="w-4 h-4 animate-spin"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
    >
      <circle cx="12" cy="12" r="9" opacity="0.25" />
      <path d="M21 12a9 9 0 0 1-9 9" strokeLinecap="round" />
    </svg>
  );
}

function RefreshGlyph() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 15-6.7M21 12a9 9 0 0 1-15 6.7" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </svg>
  );
}

'use client';

// ═════════════════════════════════════════════════════════════════════════════
// MerchantMatrixCard — per-tenant glass card with compliance ring
// ─────────────────────────────────────────────────────────────────────────────
// Client component because the compliance ring uses a stroke-dashoffset
// CSS transition that needs to mount-then-animate (server-rendered SVG
// would arrive in its final state with no animation).
//
// VPA / GSTIN MASKING
//   Both are sensitive identifiers. Default-masked in the card to prevent
//   over-the-shoulder leakage on shared screens. Tap the value to toggle
//   reveal — local state only, no telemetry.
//
// LAYOUT
//   - 1px slate-700 ring + black-glass background
//   - Indigo accent ring on hover
//   - Compliance ring: 64px SVG, animated on mount from 0 → score
//   - "Last activity" relative timestamp recomputed on hover (cheap)
// ═════════════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import type { MerchantMatrixRow } from './page';

interface MerchantMatrixCardProps {
  merchant: MerchantMatrixRow;
}

export function MerchantMatrixCard({ merchant }: MerchantMatrixCardProps) {
  const [revealVpa, setRevealVpa] = useState(false);
  const [revealGstin, setRevealGstin] = useState(false);

  return (
    <article
      className="
        group relative rounded-2xl border border-white/10 bg-white/[0.025]
        hover:border-indigo-400/40 hover:bg-white/[0.045]
        backdrop-blur-md p-5 transition-all duration-200
      "
    >
      {/* ── Top row: identity + compliance ring ─────────────────────────── */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-slate-100 truncate">
            {merchant.name}
          </div>
          <div className="text-xs text-slate-500 truncate mt-0.5 font-mono">
            {merchant.email}
          </div>
          {merchant.primarySubdomain ? (
            <div className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-mono text-indigo-300/80">
              <span className="w-1 h-1 rounded-full bg-indigo-400" />
              {merchant.primarySubdomain}.connectvision.io
            </div>
          ) : (
            <div className="mt-2 text-[11px] font-mono text-slate-600 italic">
              no domain provisioned
            </div>
          )}
        </div>
        <ComplianceRing score={merchant.complianceRating} />
      </div>

      {/* ── Sovereign identity fields ────────────────────────────────────── */}
      <dl className="space-y-2 text-xs border-t border-white/5 pt-4">
        <IdentityRow
          label="GSTIN"
          value={merchant.gstinString}
          revealed={revealGstin}
          onToggle={() => setRevealGstin((v) => !v)}
          maskFn={maskGstin}
        />
        <IdentityRow
          label="UPI VPA"
          value={merchant.vpaAddress}
          revealed={revealVpa}
          onToggle={() => setRevealVpa((v) => !v)}
          maskFn={maskVpa}
        />
        <div className="flex items-center justify-between text-slate-400">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-slate-500">
            Tenants
          </dt>
          <dd className="font-mono text-slate-200">
            {merchant.domainCount}
          </dd>
        </div>
        <div className="flex items-center justify-between text-slate-400">
          <dt className="font-mono uppercase tracking-wider text-[10px] text-slate-500">
            Last active
          </dt>
          <dd className="font-mono text-slate-300">
            <RelativeTime date={merchant.lastActivityAt} />
          </dd>
        </div>
      </dl>

      {/* ── Map link (if present) ────────────────────────────────────────── */}
      {merchant.mapsUrl ? (
        <a
          href={merchant.mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="
            mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium
            text-emerald-300 hover:text-emerald-200 transition-colors
          "
        >
          <span className="w-1 h-1 rounded-full bg-emerald-400" />
          Maps listing
        </a>
      ) : null}
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ComplianceRing — animated SVG (64px) showing 0–100 score
// ─────────────────────────────────────────────────────────────────────────────

function ComplianceRing({ score }: { score: number }) {
  const clamped = Math.max(0, Math.min(100, score));
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  // Animate from 0 → score on mount (stroke-dashoffset transition).
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    // RAF ensures the initial 0 paint commits before the transition target
    // is applied — otherwise React batches both and there's no animation.
    const id = requestAnimationFrame(() => setProgress(clamped));
    return () => cancelAnimationFrame(id);
  }, [clamped]);

  const ringColor =
    clamped >= 80 ? '#34d399' // emerald-400
      : clamped >= 60 ? '#fbbf24' // amber-400
        : clamped >= 30 ? '#fb923c' // orange-400
          : '#f87171'; // red-400

  const offset = circumference * (1 - progress / 100);

  return (
    <div className="relative shrink-0" aria-label={`Compliance score ${clamped}/100`}>
      <svg width={64} height={64} viewBox="0 0 64 64" className="-rotate-90">
        <circle
          cx={32}
          cy={32}
          r={radius}
          fill="transparent"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={4}
        />
        <circle
          cx={32}
          cy={32}
          r={radius}
          fill="transparent"
          stroke={ringColor}
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1100ms cubic-bezier(0.16,1,0.3,1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-sm font-bold text-slate-100 tabular-nums">
          {Math.round(clamped)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// IdentityRow — masked sensitive field with tap-to-reveal
// ─────────────────────────────────────────────────────────────────────────────

interface IdentityRowProps {
  label: string;
  value: string | null;
  revealed: boolean;
  onToggle: () => void;
  maskFn: (raw: string) => string;
}

function IdentityRow({ label, value, revealed, onToggle, maskFn }: IdentityRowProps) {
  const display = value === null
    ? 'unset'
    : revealed ? value : maskFn(value);
  const isUnset = value === null;
  return (
    <div className="flex items-center justify-between text-slate-400">
      <dt className="font-mono uppercase tracking-wider text-[10px] text-slate-500">
        {label}
      </dt>
      <dd>
        {isUnset ? (
          <span className="font-mono text-slate-600 italic">{display}</span>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="
              font-mono text-slate-200 hover:text-indigo-300
              transition-colors cursor-pointer select-text
            "
            title={revealed ? 'Click to mask' : 'Click to reveal'}
          >
            {display}
          </button>
        )}
      </dd>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Masking utilities — keep the first + last visible-ish chars, dot the middle
// ─────────────────────────────────────────────────────────────────────────────

function maskGstin(raw: string): string {
  // GSTIN is 15 chars. Show first 2 (state code) + last 1 (checksum).
  if (raw.length < 6) return raw;
  return `${raw.slice(0, 2)}••••••••••••${raw.slice(-1)}`;
}

function maskVpa(raw: string): string {
  // localpart@bank — mask the localpart, keep the bank handle.
  const at = raw.indexOf('@');
  if (at <= 0) return raw;
  const local = raw.slice(0, at);
  const bank = raw.slice(at);
  const head = local.slice(0, Math.min(2, local.length));
  return `${head}${'•'.repeat(Math.max(2, local.length - 2))}${bank}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// RelativeTime — cheap "5m ago" formatter without a library
// ─────────────────────────────────────────────────────────────────────────────

function RelativeTime({ date }: { date: Date }) {
  // Client-side render only — server render shows raw ISO so hydration
  // doesn't mismatch on the time-since calculation.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  if (now === null) {
    return <span suppressHydrationWarning>—</span>;
  }
  const deltaSec = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (deltaSec < 60) return <>just now</>;
  if (deltaSec < 3600) return <>{Math.floor(deltaSec / 60)}m ago</>;
  if (deltaSec < 86400) return <>{Math.floor(deltaSec / 3600)}h ago</>;
  if (deltaSec < 2592000) return <>{Math.floor(deltaSec / 86400)}d ago</>;
  return <>{Math.floor(deltaSec / 2592000)}mo ago</>;
}

// ═════════════════════════════════════════════════════════════════════════════
// /admin/onboard — Sovereign Merchant Onboarding (MODULE 2 entry point)
// ─────────────────────────────────────────────────────────────────────────────
// Thin server shell that wraps the client-side `OnboardingWizard`. The page
// itself stays server-rendered (no `'use client'` here) so the head + nav
// chrome ship in the initial HTML; the wizard hydrates underneath as the
// single interactive island.
//
// AUTH NOTE
//   This admin route does not yet enforce auth at the page layer (the
//   project hasn't wired Auth.js or a session middleware yet). The
//   underlying POST /api/admin/merchants/onboard route uses the three-path
//   service-token model so a malicious browser-side hit still has to clear
//   the validation token. For production, add a middleware-level admin
//   session check at this path before public DNS exposure.
// ═════════════════════════════════════════════════════════════════════════════

import { OnboardingWizard } from './OnboardingWizard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export default function AdminOnboardPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Same dual radial-gradient backdrop as /admin/matrix so the two
          admin surfaces feel like one connected control hub. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 30% 0%, rgba(67,56,202,0.18) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 50% at 70% 100%, rgba(16,185,129,0.10) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 py-12 md:py-16">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="mb-10 md:mb-14 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80 mb-3">
            ConnectVision OS · Sovereign Onboarding
          </div>
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
            Zero-friction merchant intake
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Three steps. Identity, sovereign identifiers, atomic write. Land
            with a starting compliance score of 60 the moment you submit.
          </p>
        </header>

        {/* ── Wizard island ──────────────────────────────────────────── */}
        <OnboardingWizard />

        {/* ── Footer stamp ────────────────────────────────────────────── */}
        <footer className="mt-16 pt-6 border-t border-white/5 text-xs text-slate-500 flex items-center justify-between">
          <span>ConnectVision OS · Sovereign Multi-Tenant SaaS</span>
          <a
            href="/admin/matrix"
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Back to matrix
          </a>
        </footer>
      </div>
    </main>
  );
}

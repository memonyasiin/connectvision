// ═════════════════════════════════════════════════════════════════════════════
// /admin/matrix — Sovereign Multi-Tenant Control Hub (MODULE 1 UI)
// ─────────────────────────────────────────────────────────────────────────────
// Single-pane view across every Merchant on the platform. Renders three
// surfaces in vertical sequence:
//
//   1. KPI strip      — platform-wide health snapshot
//   2. Merchant grid  — per-tenant glass cards with compliance ring, GSTIN,
//                       VPA, domain count, last-activity timestamp
//   3. Category bar   — High-Five theme registry distribution + capacity
//
// SERVER COMPONENT
//   This page is a React Server Component. Prisma client runs server-side;
//   no `'use client'` directive at the top so the bundle stays small. The
//   single client-component child (`ComplianceRing` in MerchantMatrixCard)
//   is opt-in via its `'use client'` boundary and exists only for the SVG
//   stroke-dashoffset animation.
//
// FAILURE POSTURE
//   - Prisma reachability: any DB exception renders a soft "Backend
//     unavailable — showing cached/empty matrix" panel rather than 500.
//   - Empty tenants: each surface degrades cleanly to a zero-state pitch
//     so the page is still demoable on a fresh database.
//
// THEME
//   Dark glassmorphism on slate-950 base with indigo + emerald accents.
//   Matches the platform's "ConnectVision OS" admin aesthetic.
// ═════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/prisma';
import { THEME_CATEGORIES, THEME_CATEGORY_COUNT } from '@/themes/_categories';
import { MerchantMatrixCard } from './MerchantMatrixCard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Data shape — what the UI actually consumes from the Prisma queries
// ─────────────────────────────────────────────────────────────────────────────

interface MerchantMatrixRow {
  id: string;
  name: string;
  email: string;
  gstinString: string | null;
  vpaAddress: string | null;
  mapsUrl: string | null;
  /** Number 0–100; converted from Prisma Decimal at the query boundary. */
  complianceRating: number;
  domainCount: number;
  /** Primary domain subdomain for display — null if no domains yet. */
  primarySubdomain: string | null;
  /** Latest of merchant + any domain `updatedAt` — used for "active" sort. */
  lastActivityAt: Date;
}

interface MatrixKpis {
  merchantCount: number;
  domainCount: number;
  averageCompliance: number;
  verifiedMerchantCount: number; // compliance >= 60
}

// ─────────────────────────────────────────────────────────────────────────────
// Data fetchers — isolated so a Prisma fault degrades the page cleanly
// ─────────────────────────────────────────────────────────────────────────────

async function loadMatrix(): Promise<{
  merchants: MerchantMatrixRow[];
  kpis: MatrixKpis;
  backendOk: boolean;
}> {
  try {
    const merchantsRaw = await prisma.merchant.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 60,
      select: {
        id: true,
        name: true,
        email: true,
        gstinString: true,
        vpaAddress: true,
        mapsUrl: true,
        complianceRating: true,
        updatedAt: true,
        domains: {
          select: { subdomain: true, updatedAt: true },
          orderBy: { updatedAt: 'desc' },
        },
      },
    });

    const merchants: MerchantMatrixRow[] = merchantsRaw.map((m) => {
      const primary = m.domains[0];
      const latestDomainAt = m.domains.reduce<Date>(
        (acc, d) => (d.updatedAt > acc ? d.updatedAt : acc),
        m.updatedAt,
      );
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        gstinString: m.gstinString,
        vpaAddress: m.vpaAddress,
        mapsUrl: m.mapsUrl,
        // Prisma Decimal → number via toString, then parseFloat (avoids the
        // BigInt path that Decimal#toNumber takes when the value exceeds 2^53).
        complianceRating: Number.parseFloat(m.complianceRating.toString()),
        domainCount: m.domains.length,
        primarySubdomain: primary ? primary.subdomain : null,
        lastActivityAt: latestDomainAt,
      };
    });

    const merchantCount = merchants.length;
    const domainCount = merchants.reduce((sum, m) => sum + m.domainCount, 0);
    const verifiedMerchantCount = merchants.filter((m) => m.complianceRating >= 60).length;
    const averageCompliance =
      merchantCount === 0
        ? 0
        : merchants.reduce((sum, m) => sum + m.complianceRating, 0) / merchantCount;

    return {
      merchants,
      kpis: {
        merchantCount,
        domainCount,
        averageCompliance: Math.round(averageCompliance * 10) / 10,
        verifiedMerchantCount,
      },
      backendOk: true,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[admin/matrix] Prisma fault — degrading to empty matrix:', err);
    return {
      merchants: [],
      kpis: {
        merchantCount: 0,
        domainCount: 0,
        averageCompliance: 0,
        verifiedMerchantCount: 0,
      },
      backendOk: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminMatrixPage() {
  const { merchants, kpis, backendOk } = await loadMatrix();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Subtle radial glow backdrop — pure CSS, server-rendered. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 30% 0%, rgba(67,56,202,0.18) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 50% at 70% 100%, rgba(16,185,129,0.10) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80 mb-3">
              ConnectVision OS · Admin Matrix
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Sovereign Control Hub
            </h1>
            <p className="mt-3 text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed">
              Every merchant on the platform, in one pane. Compliance,
              tenancy, NPCI settlement targets, and {THEME_CATEGORY_COUNT}-category
              theme distribution — refreshed live on every page load.
            </p>
          </div>
          {!backendOk ? (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Backend unreachable — showing empty matrix
            </div>
          ) : null}
        </header>

        {/* ── KPI strip ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-12">
          <KpiTile label="Merchants" value={kpis.merchantCount} accent="indigo" />
          <KpiTile label="Tenant domains" value={kpis.domainCount} accent="emerald" />
          <KpiTile
            label="Avg. compliance"
            value={kpis.averageCompliance}
            suffix="/100"
            accent="amber"
          />
          <KpiTile
            label="Verified (≥60)"
            value={kpis.verifiedMerchantCount}
            accent="rose"
          />
        </section>

        {/* ── Merchant matrix grid ───────────────────────────────────── */}
        <section className="mb-14">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">
              Merchants
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              showing {merchants.length} of {kpis.merchantCount}
            </span>
          </div>

          {merchants.length === 0 ? (
            <EmptyState
              title="No merchants on the platform yet"
              detail="Onboarding flow lives at /admin/onboard. Drop a GSTIN string in there and a Merchant row will land here on next render."
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
              {merchants.map((m) => (
                <MerchantMatrixCard key={m.id} merchant={m} />
              ))}
            </div>
          )}
        </section>

        {/* ── High-Five theme distribution ───────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">
              High-Five Theme Registry
            </h2>
            <span className="text-xs text-slate-500 font-mono">
              {THEME_CATEGORY_COUNT} verticals · marketplace tier
            </span>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {THEME_CATEGORIES.map((cat) => (
              <article
                key={cat.id}
                className="group rounded-2xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.04] backdrop-blur-sm p-5 transition-colors"
              >
                <div className="flex items-center justify-between mb-3">
                  <span
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-lg font-bold"
                    style={{
                      background: `${cat.primaryColor}1f`,
                      color: cat.primaryColor,
                    }}
                  >
                    {cat.glyph}
                  </span>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                    {cat.surface}
                  </span>
                </div>
                <div className="text-sm font-semibold text-slate-100">
                  {cat.label}
                </div>
                <p className="mt-1.5 text-xs text-slate-400 leading-relaxed">
                  {cat.tagline}
                </p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {cat.bestFor.slice(0, 2).map((fit) => (
                    <span
                      key={fit}
                      className="text-[10px] font-medium uppercase tracking-wide px-2 py-0.5 rounded-full bg-white/5 text-slate-300"
                    >
                      {fit}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* ── Footer stamp ────────────────────────────────────────────── */}
        <footer className="mt-16 pt-6 border-t border-white/5 text-xs text-slate-500 flex items-center justify-between">
          <span>ConnectVision OS · Sovereign Multi-Tenant SaaS</span>
          <span className="font-mono">{new Date().toISOString().slice(0, 19)}Z</span>
        </footer>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline subcomponents — small, page-scoped, no separate-file overhead
// ─────────────────────────────────────────────────────────────────────────────

interface KpiTileProps {
  label: string;
  value: number;
  suffix?: string;
  accent: 'indigo' | 'emerald' | 'amber' | 'rose';
}

const ACCENT_CLASS: Record<KpiTileProps['accent'], { text: string; dot: string }> = {
  indigo:  { text: 'text-indigo-300',  dot: 'bg-indigo-400' },
  emerald: { text: 'text-emerald-300', dot: 'bg-emerald-400' },
  amber:   { text: 'text-amber-300',   dot: 'bg-amber-400' },
  rose:    { text: 'text-rose-300',    dot: 'bg-rose-400' },
};

function KpiTile({ label, value, suffix, accent }: KpiTileProps) {
  const a = ACCENT_CLASS[accent];
  const displayValue = Number.isInteger(value) ? value.toLocaleString('en-IN') : value.toFixed(1);
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.03] backdrop-blur-sm p-5">
      <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${a.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
        {label}
      </div>
      <div className="mt-3 text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
        {displayValue}
        {suffix ? <span className="text-base text-slate-500 ml-0.5">{suffix}</span> : null}
      </div>
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        {detail}
      </p>
    </div>
  );
}

export type { MerchantMatrixRow };

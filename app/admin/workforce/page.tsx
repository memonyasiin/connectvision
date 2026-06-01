// ═════════════════════════════════════════════════════════════════════════════
// /admin/workforce — Workforce Telemetry Dashboard (MODULE 5)
// ─────────────────────────────────────────────────────────────────────────────
// The anti-fraud control plane. Visualises the data that the background
// scanner at /api/admin/workforce produces:
//
//   1. KPI strip          active employees · GHOST_STATE count · OVERDUE_ABSENT
//                          count · pending penalty INR
//   2. GHOST_STATE alerts  red-bordered cards — current shifts with zero
//                          productive input in the last 30 minutes
//   3. OVERDUE_ABSENT      table of leave rows past their end-date with no
//                          secondary auth — pre-stamped penalty INR
//   4. Today's activity    per-employee productivity rollup
//
// READ-ONLY POSTURE
//   This page never writes to the DB. It uses the same helpers as the
//   background scanner (`detectGhostState`, `autoFlagOverdueAbsent`,
//   `computePerDayPenalty`) to classify rows IN MEMORY. To actually
//   persist flags, the operator hits the "Recompute now" button which
//   triggers the existing /api/admin/workforce POST via a server action.
//
// MULTI-TENANT
//   Scoped to the operator's merchant once auth is wired (TODO marker
//   below). For now the page renders the platform-wide view — a future
//   middleware layer must inject `merchantId` into the page's scope.
//
// THEME
//   Matches /admin/matrix + /admin/onboard — dark slate-950 with dual
//   radial-gradient backdrop, glass cards, indigo/emerald/amber/rose
//   accent tones per surface urgency.
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import {
  autoFlagOverdueAbsent,
  computePerDayPenalty,
  detectGhostState,
  type AttendanceRowLike,
  type WorkforceTickLike,
} from '@/lib/workforcePenalty';
import { RecomputeButton } from './RecomputeButton';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const GHOST_WINDOW_MINUTES = 30;
const ACTIVITY_WINDOW_HOURS = 8; // "today" rollup horizon

// ─────────────────────────────────────────────────────────────────────────────
// View-model shapes — what the JSX actually consumes
// ─────────────────────────────────────────────────────────────────────────────

interface GhostStateRow {
  employeeId: string;
  employeeName: string;
  role: string | null;
  inputEventsInWindow: number;
  productiveMinutes: number;
  windowMinutes: number;
  lastActivityAt: Date | null;
}

interface OverdueAbsentRow {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  role: string | null;
  leaveEnd: Date;
  daysOverdue: number;
  penaltyInr: number;
  reason: string;
  alreadyStamped: boolean; // true if penaltyAmountInr already persisted
}

interface ProductivityRow {
  employeeId: string;
  employeeName: string;
  role: string | null;
  totalFocusMinutes: number;
  productiveMinutes: number;
  productivePct: number;
  lastActivityAt: Date | null;
}

interface WorkforceSnapshot {
  generatedAt: Date;
  activeEmployees: number;
  ghosts: GhostStateRow[];
  overdue: OverdueAbsentRow[];
  today: ProductivityRow[];
  pendingPenaltyInr: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data loader — single Prisma round-trip per concern, computes view-models
// ─────────────────────────────────────────────────────────────────────────────

async function loadWorkforceSnapshot(): Promise<{
  snapshot: WorkforceSnapshot;
  backendOk: boolean;
}> {
  const now = new Date();
  try {
    // ── 1. Active employees ─────────────────────────────────────────────
    const activeEmployees = await prisma.employee.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        role: true,
        monthlySalaryInr: true,
      },
      orderBy: { name: 'asc' },
    });
    const employeeMap = new Map(activeEmployees.map((e) => [e.id, e]));

    // ── 2. Recent workforce ticks (ghost detection + activity window) ───
    // Pull the larger ACTIVITY_WINDOW_HOURS slice in one read; ghost
    // detection narrows the same data to its own 30-min window in memory.
    const since = new Date(now.getTime() - ACTIVITY_WINDOW_HOURS * 60 * 60 * 1000);
    const recentTicks = await prisma.cV_WorkforceLedger.findMany({
      where: {
        recordedAt: { gte: since },
        employeeId: { in: Array.from(employeeMap.keys()) },
      },
      select: {
        employeeId: true,
        recordedAt: true,
        inputEventCount: true,
        isProductive: true,
        focusDurationMs: true,
      },
      orderBy: { recordedAt: 'desc' },
    });

    // Group by employee for both downstream rollups.
    const ticksByEmployee = new Map<string, typeof recentTicks>();
    for (const t of recentTicks) {
      const arr = ticksByEmployee.get(t.employeeId) ?? [];
      arr.push(t);
      ticksByEmployee.set(t.employeeId, arr);
    }
    // Also seed empty arrays for employees with zero recent ticks — the
    // ghost detector needs them to fire on "no-data" employees too.
    for (const e of activeEmployees) {
      if (!ticksByEmployee.has(e.id)) ticksByEmployee.set(e.id, []);
    }

    // ── 3. Open attendance rows (could be currently OVERDUE_ABSENT) ─────
    const openLeaves = await prisma.cV_AttendanceLedger.findMany({
      where: {
        actualReturnedAt: null,
        status: { in: ['APPROVED', 'ON_LEAVE', 'OVERDUE_ABSENT', 'EXTENDED_BY_AUTH'] },
      },
      include: {
        employee: {
          select: { id: true, name: true, role: true, monthlySalaryInr: true },
        },
      },
    });

    // ── 4. Build GHOST_STATE rows ───────────────────────────────────────
    const ghosts: GhostStateRow[] = [];
    for (const [employeeId, ticks] of ticksByEmployee.entries()) {
      const decision = detectGhostState(
        ticks as readonly WorkforceTickLike[],
        GHOST_WINDOW_MINUTES,
        now,
      );
      if (!decision.isGhost) continue;
      const emp = employeeMap.get(employeeId);
      if (!emp) continue;
      const lastAt = ticks.length > 0 ? ticks[0]?.recordedAt ?? null : null;
      ghosts.push({
        employeeId,
        employeeName: emp.name,
        role: emp.role,
        inputEventsInWindow: decision.inputEventsInWindow,
        productiveMinutes: decision.productiveMinutes,
        windowMinutes: decision.windowMinutes,
        lastActivityAt: lastAt,
      });
    }
    ghosts.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    // ── 5. Build OVERDUE_ABSENT rows (uses in-memory classifier) ────────
    const overdue: OverdueAbsentRow[] = [];
    let pendingPenaltyInr = 0;
    for (const row of openLeaves) {
      const decision = autoFlagOverdueAbsent(row as unknown as AttendanceRowLike, now);
      if (!decision.shouldFlagOverdue) continue;
      const monthlyDecimal = row.employee.monthlySalaryInr;
      const monthly = monthlyDecimal ? Number.parseFloat(monthlyDecimal.toString()) : 0;
      const penalty = computePerDayPenalty(monthly, decision.daysOverdue);
      overdue.push({
        attendanceId: row.id,
        employeeId: row.employee.id,
        employeeName: row.employee.name,
        role: row.employee.role,
        leaveEnd: row.leaveEnd,
        daysOverdue: decision.daysOverdue,
        penaltyInr: penalty.totalInr,
        reason: decision.reason,
        alreadyStamped:
          row.penaltyAmountInr !== null &&
          Number.parseFloat(row.penaltyAmountInr.toString()) > 0,
      });
      pendingPenaltyInr += penalty.totalInr;
    }
    overdue.sort((a, b) => b.daysOverdue - a.daysOverdue);

    // ── 6. Today's productivity rollup ──────────────────────────────────
    const today: ProductivityRow[] = [];
    for (const emp of activeEmployees) {
      const ticks = ticksByEmployee.get(emp.id) ?? [];
      let totalFocusMs = 0;
      let productiveMs = 0;
      let lastAt: Date | null = null;
      for (const t of ticks) {
        totalFocusMs += t.focusDurationMs;
        if (t.isProductive) productiveMs += t.focusDurationMs;
        if (!lastAt || t.recordedAt > lastAt) lastAt = t.recordedAt;
      }
      const totalMin = Math.round(totalFocusMs / 60_000);
      const productiveMin = Math.round(productiveMs / 60_000);
      const pct = totalFocusMs > 0 ? Math.round((productiveMs / totalFocusMs) * 100) : 0;
      today.push({
        employeeId: emp.id,
        employeeName: emp.name,
        role: emp.role,
        totalFocusMinutes: totalMin,
        productiveMinutes: productiveMin,
        productivePct: pct,
        lastActivityAt: lastAt,
      });
    }
    today.sort((a, b) => b.productiveMinutes - a.productiveMinutes);

    return {
      snapshot: {
        generatedAt: now,
        activeEmployees: activeEmployees.length,
        ghosts,
        overdue,
        today,
        pendingPenaltyInr: Math.round(pendingPenaltyInr * 100) / 100,
      },
      backendOk: true,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[admin/workforce] Prisma fault:', err);
    return {
      snapshot: {
        generatedAt: now,
        activeEmployees: 0,
        ghosts: [],
        overdue: [],
        today: [],
        pendingPenaltyInr: 0,
      },
      backendOk: false,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function AdminWorkforcePage() {
  const { snapshot, backendOk } = await loadWorkforceSnapshot();

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      {/* Dual radial backdrop — matches /admin/matrix + /admin/onboard. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-40"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 30% 0%, rgba(67,56,202,0.18) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 60% 50% at 70% 100%, rgba(225,29,72,0.10) 0%, transparent 60%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-5 md:px-8 py-12 md:py-16">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="mb-10 md:mb-14 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300/80 mb-3">
              ConnectVision OS · Workforce Hub
            </div>
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Anti-fraud control plane
            </h1>
            <p className="mt-3 text-sm md:text-base text-slate-400 max-w-2xl leading-relaxed">
              Ghost-state detection, overdue-absent auto-flagging, and
              deterministic payroll penalty computation — refreshed live on
              every page load.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!backendOk ? (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Backend unreachable
              </div>
            ) : null}
            <RecomputeButton />
          </div>
        </header>

        {/* ── KPI strip ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-12">
          <KpiTile label="Active workers" value={snapshot.activeEmployees} accent="indigo" />
          <KpiTile
            label="Ghost-state alerts"
            value={snapshot.ghosts.length}
            accent="rose"
            urgent={snapshot.ghosts.length > 0}
          />
          <KpiTile
            label="Overdue absent"
            value={snapshot.overdue.length}
            accent="amber"
            urgent={snapshot.overdue.length > 0}
          />
          <KpiTile
            label="Pending penalties"
            value={snapshot.pendingPenaltyInr}
            prefix="₹"
            accent="emerald"
            formatter="inr"
          />
        </section>

        {/* ── GHOST STATE alerts ─────────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeader
            title="Ghost-state alerts"
            subtitle={`Shifts marked active with zero productive input in the last ${GHOST_WINDOW_MINUTES} minutes.`}
            countBadge={snapshot.ghosts.length}
            urgent={snapshot.ghosts.length > 0}
          />
          {snapshot.ghosts.length === 0 ? (
            <EmptyPanel
              title="No ghost-state alerts right now"
              detail={`Every active worker has at least one productive input event in the last ${GHOST_WINDOW_MINUTES} minutes.`}
              tone="emerald"
            />
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {snapshot.ghosts.map((g) => (
                <GhostStateCard key={g.employeeId} row={g} />
              ))}
            </div>
          )}
        </section>

        {/* ── OVERDUE ABSENT table ───────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeader
            title="Overdue absent"
            subtitle="Leave rows past their end-date with no secondary authorization. Penalty stamped as (monthly salary ÷ 30) × days."
            countBadge={snapshot.overdue.length}
            urgent={snapshot.overdue.length > 0}
          />
          {snapshot.overdue.length === 0 ? (
            <EmptyPanel
              title="No overdue-absent rows"
              detail="Every approved leave has either returned on time or carries a valid secondary authorization."
              tone="emerald"
            />
          ) : (
            <OverdueTable rows={snapshot.overdue} />
          )}
        </section>

        {/* ── Today's productivity ───────────────────────────────────── */}
        <section className="mb-12">
          <SectionHeader
            title="Today's productivity"
            subtitle={`Rolled up from CV_WorkforceLedger over the last ${ACTIVITY_WINDOW_HOURS}h.`}
            countBadge={snapshot.today.length}
          />
          {snapshot.today.length === 0 ? (
            <EmptyPanel
              title="No telemetry yet"
              detail="No CV_WorkforceLedger rows in the activity window. Install the desktop agent on a worker's machine to start seeing data."
              tone="slate"
            />
          ) : (
            <ProductivityTable rows={snapshot.today} />
          )}
        </section>

        {/* ── Footer stamp ────────────────────────────────────────────── */}
        <footer className="mt-16 pt-6 border-t border-white/5 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/matrix"
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Matrix
            </Link>
            <span>·</span>
            <Link
              href="/admin/onboard"
              className="text-slate-400 hover:text-white transition-colors"
            >
              Onboard merchant
            </Link>
          </div>
          <span className="font-mono">
            scanned · {snapshot.generatedAt.toISOString().slice(11, 19)}Z
          </span>
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
  prefix?: string;
  accent: 'indigo' | 'emerald' | 'amber' | 'rose';
  urgent?: boolean;
  formatter?: 'inr' | 'int';
}

const ACCENT_CLASS: Record<KpiTileProps['accent'], { text: string; dot: string; bg: string }> = {
  indigo:  { text: 'text-indigo-300',  dot: 'bg-indigo-400',  bg: 'border-white/5' },
  emerald: { text: 'text-emerald-300', dot: 'bg-emerald-400', bg: 'border-white/5' },
  amber:   { text: 'text-amber-300',   dot: 'bg-amber-400',   bg: 'border-amber-500/30' },
  rose:    { text: 'text-rose-300',    dot: 'bg-rose-400',    bg: 'border-rose-500/40' },
};

function KpiTile({ label, value, prefix, accent, urgent = false, formatter = 'int' }: KpiTileProps) {
  const a = ACCENT_CLASS[accent];
  const display =
    formatter === 'inr'
      ? value.toLocaleString('en-IN', { maximumFractionDigits: 0 })
      : value.toLocaleString('en-IN');
  return (
    <div
      className={`
        rounded-2xl border ${urgent ? a.bg : 'border-white/5'}
        ${urgent ? 'bg-white/[0.045]' : 'bg-white/[0.03]'}
        backdrop-blur-sm p-5 transition-colors
      `}
    >
      <div className={`flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] ${a.text}`}>
        <span
          className={`w-1.5 h-1.5 rounded-full ${a.dot} ${urgent ? 'animate-pulse' : ''}`}
        />
        {label}
      </div>
      <div className="mt-3 text-3xl md:text-4xl font-bold text-white tabular-nums tracking-tight">
        {prefix ?? ''}
        {display}
      </div>
    </div>
  );
}

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  countBadge?: number;
  urgent?: boolean;
}

function SectionHeader({ title, subtitle, countBadge, urgent = false }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div>
        <h2 className="text-lg md:text-xl font-semibold tracking-tight flex items-center gap-2.5">
          {title}
          {typeof countBadge === 'number' ? (
            <span
              className={`
                text-[11px] font-mono px-2 py-0.5 rounded-md
                ${
                  urgent
                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                    : 'bg-white/5 text-slate-400'
                }
              `}
            >
              {countBadge}
            </span>
          ) : null}
        </h2>
        <p className="mt-1 text-xs text-slate-500 max-w-2xl leading-relaxed">{subtitle}</p>
      </div>
    </div>
  );
}

interface EmptyPanelProps {
  title: string;
  detail: string;
  tone: 'emerald' | 'slate';
}

function EmptyPanel({ title, detail, tone }: EmptyPanelProps) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-500/20 bg-emerald-500/5'
      : 'border-white/10 bg-white/[0.02]';
  return (
    <div className={`rounded-2xl border border-dashed ${toneClass} p-8 text-center`}>
      <div className="text-sm font-semibold text-slate-200">{title}</div>
      <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        {detail}
      </p>
    </div>
  );
}

function GhostStateCard({ row }: { row: GhostStateRow }) {
  return (
    <article className="rounded-2xl border border-rose-500/30 bg-rose-500/[0.04] backdrop-blur-sm p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <div className="text-base font-semibold text-slate-100 truncate">
            {row.employeeName}
          </div>
          {row.role ? (
            <div className="text-xs text-slate-500 mt-0.5">{row.role}</div>
          ) : null}
        </div>
        <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-200 border border-rose-500/30 shrink-0">
          GHOST
        </span>
      </div>
      <dl className="space-y-1.5 text-xs border-t border-rose-500/10 pt-3">
        <Row
          label="Input events"
          value={`${row.inputEventsInWindow} in ${row.windowMinutes}m`}
          accent
        />
        <Row label="Productive" value={`${row.productiveMinutes} min`} />
        <Row
          label="Last activity"
          value={row.lastActivityAt ? formatRelative(row.lastActivityAt) : 'no data'}
        />
      </dl>
    </article>
  );
}

function OverdueTable({ rows }: { rows: readonly OverdueAbsentRow[] }) {
  return (
    <div className="rounded-2xl border border-amber-500/20 bg-white/[0.025] backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 border-b border-white/5">
              <th className="text-left px-5 py-3">Employee</th>
              <th className="text-left px-5 py-3">Leave ended</th>
              <th className="text-right px-5 py-3">Days</th>
              <th className="text-right px-5 py-3">Penalty</th>
              <th className="text-left px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.attendanceId} className="border-t border-white/5">
                <td className="px-5 py-3">
                  <div className="text-slate-100 font-medium">{r.employeeName}</div>
                  {r.role ? (
                    <div className="text-xs text-slate-500">{r.role}</div>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-slate-300 font-mono text-xs">
                  {r.leaveEnd.toISOString().slice(0, 10)}
                </td>
                <td className="px-5 py-3 text-right text-slate-100 font-mono tabular-nums">
                  {r.daysOverdue}
                </td>
                <td className="px-5 py-3 text-right text-amber-300 font-semibold tabular-nums">
                  ₹{r.penaltyInr.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                </td>
                <td className="px-5 py-3">
                  {r.alreadyStamped ? (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                      <span className="w-1 h-1 rounded-full bg-emerald-400" />
                      STAMPED
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-amber-300">
                      <span className="w-1 h-1 rounded-full bg-amber-400" />
                      PENDING
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ProductivityTable({ rows }: { rows: readonly ProductivityRow[] }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.025] backdrop-blur-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-semibold uppercase tracking-[0.15em] text-slate-500 border-b border-white/5">
              <th className="text-left px-5 py-3">Employee</th>
              <th className="text-right px-5 py-3">Focus</th>
              <th className="text-right px-5 py-3">Productive</th>
              <th className="text-right px-5 py-3">%</th>
              <th className="text-left px-5 py-3">Last activity</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.employeeId} className="border-t border-white/5">
                <td className="px-5 py-3">
                  <div className="text-slate-100 font-medium">{r.employeeName}</div>
                  {r.role ? (
                    <div className="text-xs text-slate-500">{r.role}</div>
                  ) : null}
                </td>
                <td className="px-5 py-3 text-right text-slate-200 font-mono tabular-nums">
                  {formatMinutes(r.totalFocusMinutes)}
                </td>
                <td className="px-5 py-3 text-right text-slate-200 font-mono tabular-nums">
                  {formatMinutes(r.productiveMinutes)}
                </td>
                <td
                  className={`px-5 py-3 text-right font-mono tabular-nums font-semibold ${
                    r.productivePct >= 70
                      ? 'text-emerald-300'
                      : r.productivePct >= 40
                        ? 'text-amber-300'
                        : 'text-rose-300'
                  }`}
                >
                  {r.productivePct}%
                </td>
                <td className="px-5 py-3 text-xs text-slate-400">
                  {r.lastActivityAt ? formatRelative(r.lastActivityAt) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="font-mono uppercase tracking-wider text-[10px] text-slate-500">
        {label}
      </dt>
      <dd className={`font-mono text-xs ${accent ? 'text-rose-200 font-semibold' : 'text-slate-200'}`}>
        {value}
      </dd>
    </div>
  );
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function formatRelative(at: Date): string {
  const delta = Math.max(0, Date.now() - at.getTime());
  const sec = Math.floor(delta / 1000);
  if (sec < 60) return 'just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

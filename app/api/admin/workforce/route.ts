// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/workforce — Anti-fraud workforce report + auto-flagger
// ─────────────────────────────────────────────────────────────────────────────
// Single endpoint that:
//   1. Scans all active CV_AttendanceLedger rows
//   2. Auto-flags OVERDUE_ABSENT for rows that crossed leaveEnd without a
//      valid secondary authorization token (or whose token expired)
//   3. Computes per-day payroll penalty per affected employee
//   4. Scans CV_WorkforceLedger to detect "ghost-state" employees
//   5. Emits a telemetry POST to Pataa CRM with the summary
//   6. Returns a JSON payload the admin dashboard can render
//
// Designed to be safe to call on a cron OR ad-hoc — flagging is idempotent
// (status is recomputed each invocation, not appended).

import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { validateServiceToken } from '@/lib/vercelProxy';
import {
  autoFlagOverdueAbsent,
  computePerDayPenalty,
  detectGhostState,
  type AttendanceRowLike,
} from '@/lib/workforcePenalty';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── Response shape ───────────────────────────────────────────────────────────

interface OverdueRow {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  leaveEnd: string;
  daysOverdue: number;
  penaltyInr: number;
  reason: string;
}

interface GhostRow {
  employeeId: string;
  employeeName: string;
  inputEventsInWindow: number;
  productiveMinutes: number;
  windowMinutes: number;
}

interface WorkforceReport {
  generatedAt: string;
  overdueAbsentCount: number;
  ghostStateCount: number;
  totalPenaltyInr: number;
  overdue: OverdueRow[];
  ghosts: GhostRow[];
}

// ── Telemetry feed (Pataa CRM) ───────────────────────────────────────────────

async function pushTelemetryToPataa(report: WorkforceReport): Promise<void> {
  const base = process.env.PATAA_CRM_BASE_URL;
  const token = process.env.PATAA_CRM_SYNC_TOKEN;
  if (!base || !token) return;
  try {
    await fetch(`${base}/api/crm/telemetry/workforce`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'X-Source-Platform': 'connectvision',
      },
      body: JSON.stringify(report),
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    /* telemetry is best-effort */
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  // Service auth — three valid paths, ANY one passes:
  //   1. Bearer ${CRON_SECRET}                  Vercel cron convention. Vercel
  //                                             auto-injects this header on
  //                                             scheduled invocations — the
  //                                             cron platform cannot send a
  //                                             custom header name, so this
  //                                             path must remain.
  //   2. Bearer ${INTERNAL_SECRET}              Manual admin-dashboard / curl.
  //   3. X-ConnectVision-Validation-Token       Project-standard service-to-
  //                                             service auth (constant-time
  //                                             compare via validateServiceToken).
  //                                             Used by the Flutter client,
  //                                             internal tools, and any
  //                                             external trigger that CAN set
  //                                             custom headers.
  // If NEITHER secret is configured (dev), the route runs unauthenticated.
  const cronSecret     = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;
  const cvToken        = process.env.CV_VALIDATION_TOKEN;

  if (cronSecret || internalSecret || cvToken) {
    const authHeader = req.headers.get('authorization') ?? '';
    const cronAuthOk     = !!cronSecret     && authHeader === `Bearer ${cronSecret}`;
    const internalAuthOk = !!internalSecret && authHeader === `Bearer ${internalSecret}`;
    const cvAuthOk       = !!cvToken        && validateServiceToken(req).ok;
    if (!cronAuthOk && !internalAuthOk && !cvAuthOk) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }

  const now = new Date();

  // ── Step 1+2 — load attendance rows that COULD be overdue. ────────────────
  // We intentionally include EXTENDED_BY_AUTH so an expired secondary auth
  // token gets re-flagged on this pass.
  const attendanceRows = await prisma.cV_AttendanceLedger.findMany({
    where: {
      status: { in: ['APPROVED', 'ON_LEAVE', 'OVERDUE_ABSENT', 'EXTENDED_BY_AUTH'] },
      actualReturnedAt: null,
    },
    include: { employee: true },
  });

  const overdue: OverdueRow[] = [];
  let totalPenaltyInr = 0;

  // Buffered DB ops — flush once at the end to keep this fast on cron.
  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const row of attendanceRows) {
    const decision = autoFlagOverdueAbsent(row as unknown as AttendanceRowLike, now);

    // Persist status / flag transitions when they differ from current state.
    if (decision.nextStatus && decision.nextStatus !== row.status) {
      writes.push(
        prisma.cV_AttendanceLedger.update({
          where: { id: row.id },
          data: {
            status: decision.nextStatus,
            flaggedAt: decision.shouldFlagOverdue ? now : null,
            flaggedReason: decision.shouldFlagOverdue ? decision.reason : null,
          },
        }),
      );
    }

    if (!decision.shouldFlagOverdue) continue;

    const monthlySalary = row.employee.monthlySalaryInr
      ? Number(row.employee.monthlySalaryInr.toString())
      : 0;
    const penalty = computePerDayPenalty(monthlySalary, decision.daysOverdue);

    overdue.push({
      attendanceId: row.id,
      employeeId: row.employeeId,
      employeeName: row.employee.name,
      leaveEnd: new Date(row.leaveEnd).toISOString(),
      daysOverdue: decision.daysOverdue,
      penaltyInr: penalty.totalInr,
      reason: decision.reason,
    });
    totalPenaltyInr += penalty.totalInr;

    // Stamp penalty audit on the row so payroll closure can reconcile.
    writes.push(
      prisma.cV_AttendanceLedger.update({
        where: { id: row.id },
        data: {
          penaltyDaysApplied: penalty.daysApplied,
          penaltyAmountInr: penalty.totalInr,
        },
      }),
    );
  }

  // ── Step 3 — ghost-state detection. ───────────────────────────────────────
  // Look at the last 30 minutes of workforce telemetry per active employee.
  const since = new Date(now.getTime() - 30 * 60 * 1000);
  const recentTicks = await prisma.cV_WorkforceLedger.findMany({
    where: { recordedAt: { gte: since } },
    include: { employee: true },
  });

  // Group by employeeId.
  const byEmployee = new Map<string, typeof recentTicks>();
  for (const t of recentTicks) {
    const arr = byEmployee.get(t.employeeId) ?? [];
    arr.push(t);
    byEmployee.set(t.employeeId, arr);
  }

  // Also consider active employees with ZERO telemetry rows — they're the
  // canonical ghost case (checked in but software never started reporting).
  const activeEmployees = await prisma.employee.findMany({ where: { active: true } });
  for (const e of activeEmployees) {
    if (!byEmployee.has(e.id)) byEmployee.set(e.id, []);
  }

  const ghosts: GhostRow[] = [];
  for (const [employeeId, ticks] of byEmployee.entries()) {
    const decision = detectGhostState(ticks, 30, now);
    if (!decision.isGhost) continue;
    const employee = ticks[0]?.employee
      ?? activeEmployees.find((e) => e.id === employeeId);
    if (!employee) continue;
    ghosts.push({
      employeeId,
      employeeName: employee.name,
      inputEventsInWindow: decision.inputEventsInWindow,
      productiveMinutes: decision.productiveMinutes,
      windowMinutes: decision.windowMinutes,
    });
  }

  // Flush all DB writes in a single transaction.
  if (writes.length > 0) await prisma.$transaction(writes);

  const report: WorkforceReport = {
    generatedAt: now.toISOString(),
    overdueAbsentCount: overdue.length,
    ghostStateCount: ghosts.length,
    totalPenaltyInr: Math.round(totalPenaltyInr * 100) / 100,
    overdue,
    ghosts,
  };

  // Step 5 — telemetry to Pataa CRM (fire-and-forget).
  void pushTelemetryToPataa(report);

  return NextResponse.json(report);
}

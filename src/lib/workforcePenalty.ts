// ─────────────────────────────────────────────────────────────────────────────
// Workforce penalty & anti-fraud auto-flagger
// ─────────────────────────────────────────────────────────────────────────────
// Pure functions — no Prisma dependency at the type level. This keeps the
// calculator unit-testable without spinning up a DB. The route handler
// (`/api/admin/workforce`) is responsible for loading rows + persisting
// the flags computed here.
//
// Two responsibilities:
//   1. autoFlagOverdueAbsent(row)
//        Given an attendance ledger row, decide whether it's currently
//        in OVERDUE_ABSENT state and, if so, how many days it has been.
//   2. computePerDayPenalty(monthlySalary, daysOverdue)
//        Standard per-day deduction = monthlySalary / 30. Capped at the
//        actual monthly salary so a single overdue spell can't drive the
//        payroll negative.

import type { LeaveStatus } from '@prisma/client';

export interface AttendanceRowLike {
  id: string;
  leaveEnd: Date | string;
  actualReturnedAt: Date | string | null;
  status: LeaveStatus;
  secondaryAuthToken: string | null;
  secondaryAuthExtendsTo: Date | string | null;
}

export interface AutoFlagDecision {
  /** Whether this row currently meets OVERDUE_ABSENT criteria. */
  shouldFlagOverdue: boolean;
  /** New status to persist (null = no change). */
  nextStatus: LeaveStatus | null;
  /** Days overdue if flagged; 0 otherwise. */
  daysOverdue: number;
  /** Human reason — stored in `flaggedReason` for audit. */
  reason: string;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function toDate(v: Date | string | null): Date | null {
  if (v === null) return null;
  if (v instanceof Date) return v;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * Decide whether the leave row should be auto-flagged. The rule:
 *
 *   - If the employee has already returned (`actualReturnedAt`), no flag.
 *   - If a verifiable secondary auth token exists AND
 *     `secondaryAuthExtendsTo` covers `now()`, no flag (EXTENDED_BY_AUTH).
 *   - Otherwise, if `leaveEnd < now()` AND status was APPROVED / ON_LEAVE,
 *     auto-flag OVERDUE_ABSENT.
 *
 * The decision is pure: the caller persists the status + flaggedAt cols.
 */
export function autoFlagOverdueAbsent(
  row: AttendanceRowLike,
  now: Date = new Date(),
): AutoFlagDecision {
  const leaveEnd = toDate(row.leaveEnd);
  const returned = toDate(row.actualReturnedAt);
  const extendsTo = toDate(row.secondaryAuthExtendsTo);

  // Already returned — explicit RETURNED status is the correct end-state.
  if (returned) {
    return { shouldFlagOverdue: false, nextStatus: 'RETURNED', daysOverdue: 0, reason: 'returned' };
  }

  // Verified secondary authorization actively extends the leave.
  if (row.secondaryAuthToken && extendsTo && extendsTo.getTime() >= now.getTime()) {
    return {
      shouldFlagOverdue: false,
      nextStatus: row.status === 'EXTENDED_BY_AUTH' ? null : 'EXTENDED_BY_AUTH',
      daysOverdue: 0,
      reason: 'secondary_auth_active',
    };
  }

  if (!leaveEnd) {
    return { shouldFlagOverdue: false, nextStatus: null, daysOverdue: 0, reason: 'no_leave_end' };
  }

  if (leaveEnd.getTime() >= now.getTime()) {
    return { shouldFlagOverdue: false, nextStatus: null, daysOverdue: 0, reason: 'within_window' };
  }

  // OVERDUE — only auto-flag rows that were once legitimately on leave.
  if (row.status !== 'APPROVED' && row.status !== 'ON_LEAVE' && row.status !== 'OVERDUE_ABSENT' && row.status !== 'EXTENDED_BY_AUTH') {
    return { shouldFlagOverdue: false, nextStatus: null, daysOverdue: 0, reason: 'status_not_eligible' };
  }

  // Whole-day count, floored — partial days don't trigger penalty.
  const daysOverdue = Math.floor((now.getTime() - leaveEnd.getTime()) / ONE_DAY_MS);

  return {
    shouldFlagOverdue: true,
    nextStatus: 'OVERDUE_ABSENT',
    daysOverdue: Math.max(1, daysOverdue),
    reason: row.secondaryAuthToken
      ? 'secondary_auth_expired'
      : 'leave_end_passed_no_secondary_auth',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Penalty calculation
// ─────────────────────────────────────────────────────────────────────────────

const STANDARD_DAYS_IN_MONTH = 30;

export interface PenaltyResult {
  perDayInr: number;
  daysApplied: number;
  totalInr: number;
}

/**
 * Standard per-day penalty: salary / 30 days. Total is capped so a single
 * overdue spell can't deduct more than the monthly salary itself.
 */
export function computePerDayPenalty(
  monthlySalaryInr: number,
  daysOverdue: number,
): PenaltyResult {
  if (!Number.isFinite(monthlySalaryInr) || monthlySalaryInr <= 0) {
    return { perDayInr: 0, daysApplied: 0, totalInr: 0 };
  }
  const perDay = monthlySalaryInr / STANDARD_DAYS_IN_MONTH;
  const days = Math.max(0, Math.floor(daysOverdue));
  const uncapped = perDay * days;
  const total = Math.min(monthlySalaryInr, uncapped);
  return {
    perDayInr: round2(perDay),
    daysApplied: days,
    totalInr: round2(total),
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Ghost-state detection (Phase 4 anti-fraud)
// ─────────────────────────────────────────────────────────────────────────────
// "Ghost working" = the employee is checked-in but contributing zero
// productive activity. The rule is intentionally simple so it's auditable:
//   - within the last `windowMin` minutes
//   - the workforce ledger has either zero rows OR sum(inputEventCount) === 0
//   - AND the shift is currently active (within working hours)

export interface WorkforceTickLike {
  recordedAt: Date | string;
  inputEventCount: number;
  isProductive: boolean;
}

export interface GhostStateDecision {
  isGhost: boolean;
  productiveMinutes: number;
  inputEventsInWindow: number;
  windowMinutes: number;
  reason: string;
}

export function detectGhostState(
  ticks: readonly WorkforceTickLike[],
  windowMin: number = 30,
  now: Date = new Date(),
): GhostStateDecision {
  const windowStart = now.getTime() - windowMin * 60 * 1000;
  let inputEvents = 0;
  let productiveMs = 0;
  for (const t of ticks) {
    const at = toDate(t.recordedAt);
    if (!at) continue;
    if (at.getTime() < windowStart) continue;
    inputEvents += t.inputEventCount;
    if (t.isProductive) productiveMs += 60_000; // each tick assumed to span ~1 min
  }
  const productiveMinutes = Math.round(productiveMs / 60_000);
  return {
    isGhost: inputEvents === 0,
    productiveMinutes,
    inputEventsInWindow: inputEvents,
    windowMinutes: windowMin,
    reason: inputEvents === 0
      ? `zero_input_events_in_${windowMin}min`
      : `${inputEvents}_input_events_in_${windowMin}min`,
  };
}

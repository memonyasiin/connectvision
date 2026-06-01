import type { AppointmentStatus } from '@prisma/client';

// ─────────────────────────────────────────────────────────────────────────────
// Wire shapes — Prisma payloads serialized to JSON-safe types for the
// server → client component boundary.
// ─────────────────────────────────────────────────────────────────────────────

export interface AppointmentRow {
  id: string;
  startsAt: string | Date;
  endsAt: string | Date;
  durationMin: number;
  serviceName: string;
  status: AppointmentStatus;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  customerLocale: string | null;
  upiAmountInr: number | null;
  upiRefId: string | null;
  upiCapturedAt: string | Date | null;
  pataaCustomerId: string | null;
  notes: string | null;
}

/**
 * Employee shift status. Distinct from Prisma's `LeaveStatus` because
 * the CalendarGrid renders per-shift state (not per-leave-row state).
 *
 *   SCHEDULED         — shift booked, not yet started
 *   AWAITING_CHECKIN  — within grace window, employee hasn't punched in
 *   ON_SHIFT          — active + producing input events
 *   OVERDUE_ABSENT    — past grace, no check-in (matches AttendanceLedger flag)
 *   GHOST_STATE       — checked in but zero productivity in window (anti-fraud)
 *   COMPLETED         — shift ended cleanly
 *   ON_LEAVE          — approved leave covering this shift
 */
export type RosterStatus =
  | 'SCHEDULED'
  | 'AWAITING_CHECKIN'
  | 'ON_SHIFT'
  | 'OVERDUE_ABSENT'
  | 'GHOST_STATE'
  | 'COMPLETED'
  | 'ON_LEAVE';

export interface EmployeeRosterRow {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: string | null;
  shiftStart: string | Date;
  shiftEnd: string | Date;
  status: RosterStatus;
  checkInAt: string | Date | null;
  checkOutAt: string | Date | null;
  /** Last `inputEventCount`-positive workforce ledger tick for ghost detection. */
  lastActivityAt: string | Date | null;
  /** 0–100 productivity score for the current shift. */
  productivityScore: number | null;
  /** Aggregate input events the workforce ledger has counted this shift. */
  inputEventsThisShift: number;
  /** Optional Pataa Workops linkage id. */
  pataaEmployeeId: string | null;
}

export type { AppointmentStatus };

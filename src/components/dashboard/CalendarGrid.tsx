'use client';

// ─────────────────────────────────────────────────────────────────────────────
// CalendarGrid — admin scheduling + workforce grid
// ─────────────────────────────────────────────────────────────────────────────
// 7-day week view. Two data streams sharing the same time-slot grid:
//
//   appointments   → customer bookings (BusinessAppointment)
//   employeeRosters → staff shifts     (CV_AttendanceLedger-derived)
//
// Slots are colour-coded with the canonical 3-state taxonomy:
//
//   Active / Confirmed       → Emerald   (appointment.CONFIRMED OR roster.ON_SHIFT)
//   Pending Verification     → Amber     (appointment.PENDING_CHECKOUT OR roster.AWAITING_CHECKIN)
//   Overdue Absent / Ghost   → Rose      (roster.OVERDUE_ABSENT OR roster.GHOST_STATE)
//
// Click an appointment → AppointmentDrawer; click a roster slot → RosterDrawer.

import { useMemo, useState } from 'react';
import type { Locale } from '@/lib/translations';
import { t, resolveLocale } from '@/lib/translations';
import { AppointmentDrawer } from './AppointmentDrawer';
import { RosterDrawer } from './RosterDrawer';
import type { AppointmentRow, AppointmentStatus, EmployeeRosterRow, RosterStatus } from './CalendarGrid.types';

export interface CalendarGridProps {
  appointments: AppointmentRow[];
  employeeRosters?: EmployeeRosterRow[];
  /** Locale for ALL chrome. Defaults Hinglish. */
  locale?: Locale;
  /** First day of the week to display. Defaults to start of current week. */
  weekStart?: Date;
  /**
   * Pataa CRM URL template. `{{id}}` is replaced with the customer's
   * `pataaCustomerId`. String prop so it crosses the server→client boundary.
   */
  pataaCustomerUrlTemplate?: string;
  /** Half-open time window for the grid rows (24h). */
  workdayStartHour?: number;
  workdayEndHour?: number;
}

// ── Status → cell classes ────────────────────────────────────────────────────

const APPT_CELL: Record<AppointmentStatus, string> = {
  AVAILABLE:        'border-dashed border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:bg-slate-50',
  PENDING_CHECKOUT: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-1 ring-inset ring-amber-100',
  CONFIRMED:        'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-100',
  COMPLETED:        'border-slate-200 bg-slate-100 text-slate-600',
  CANCELLED:        'border-rose-200 bg-rose-50 text-rose-700',
  NO_SHOW:          'border-rose-200 bg-rose-50 text-rose-700',
};

const APPT_DOT: Record<AppointmentStatus, string> = {
  AVAILABLE:        'bg-slate-300',
  PENDING_CHECKOUT: 'bg-amber-500',
  CONFIRMED:        'bg-emerald-500',
  COMPLETED:        'bg-slate-400',
  CANCELLED:        'bg-rose-500',
  NO_SHOW:          'bg-rose-500',
};

const ROSTER_CELL: Record<RosterStatus, string> = {
  SCHEDULED:        'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 ring-1 ring-inset ring-slate-100',
  AWAITING_CHECKIN: 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 ring-1 ring-inset ring-amber-100',
  ON_SHIFT:         'border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-100 ring-1 ring-inset ring-emerald-100',
  OVERDUE_ABSENT:   'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 ring-2 ring-inset ring-rose-200',
  GHOST_STATE:      'border-rose-300 bg-rose-50 text-rose-900 hover:bg-rose-100 ring-2 ring-inset ring-rose-200',
  COMPLETED:        'border-slate-200 bg-slate-100 text-slate-600',
  ON_LEAVE:         'border-sky-200 bg-sky-50 text-sky-800',
};

const ROSTER_DOT: Record<RosterStatus, string> = {
  SCHEDULED:        'bg-slate-400',
  AWAITING_CHECKIN: 'bg-amber-500',
  ON_SHIFT:         'bg-emerald-500',
  OVERDUE_ABSENT:   'bg-rose-500',
  GHOST_STATE:      'bg-rose-500',
  COMPLETED:        'bg-slate-400',
  ON_LEAVE:         'bg-sky-500',
};

// ── Date utilities (no dayjs dep) ────────────────────────────────────────────

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  const dayOfWeek = out.getDay();
  const offset = (dayOfWeek + 6) % 7;
  out.setDate(out.getDate() - offset);
  return out;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

function fmtDay(d: Date, locale: Locale): string {
  const intlLocale = locale === 'hi-IN' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(intlLocale, { weekday: 'short' }).format(d);
}

function fmtDate(d: Date, locale: Locale): string {
  const intlLocale = locale === 'hi-IN' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(intlLocale, { day: 'numeric', month: 'short' }).format(d);
}

function fmtTime(d: Date, locale: Locale): string {
  const intlLocale = locale === 'hi-IN' ? 'hi-IN' : 'en-IN';
  return new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', minute: '2-digit', hour12: true }).format(d);
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Group both stream types by day-key once per render.
interface DayBucket {
  appointments: AppointmentRow[];
  rosters: EmployeeRosterRow[];
}

function groupByDay(
  appts: readonly AppointmentRow[],
  rosters: readonly EmployeeRosterRow[],
): Map<string, DayBucket> {
  const out = new Map<string, DayBucket>();
  const ensure = (key: string): DayBucket => {
    let b = out.get(key);
    if (!b) { b = { appointments: [], rosters: [] }; out.set(key, b); }
    return b;
  };
  for (const a of appts) {
    const d = new Date(a.startsAt);
    ensure(dayKey(d)).appointments.push(a);
  }
  for (const r of rosters) {
    const d = new Date(r.shiftStart);
    ensure(dayKey(d)).rosters.push(r);
  }
  for (const b of out.values()) {
    b.appointments.sort((a, c) => new Date(a.startsAt).getTime() - new Date(c.startsAt).getTime());
    b.rosters.sort((a, c) => new Date(a.shiftStart).getTime() - new Date(c.shiftStart).getTime());
  }
  return out;
}

// ─────────────────────────────────────────────────────────────────────────────

type Selection =
  | { kind: 'appointment'; id: string }
  | { kind: 'roster'; id: string }
  | null;

export function CalendarGrid({
  appointments,
  employeeRosters = [],
  locale: localeProp,
  weekStart: weekStartProp,
  pataaCustomerUrlTemplate,
  workdayStartHour = 8,
  workdayEndHour = 21,
}: CalendarGridProps) {
  const locale = resolveLocale(localeProp);
  const weekStart = useMemo(() => startOfWeek(weekStartProp ?? new Date()), [weekStartProp]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const today = useMemo(() => startOfDay(new Date()), []);

  const grouped = useMemo(
    () => groupByDay(appointments, employeeRosters),
    [appointments, employeeRosters],
  );

  const [selected, setSelected] = useState<Selection>(null);
  const selectedAppointment = useMemo(
    () => (selected?.kind === 'appointment' ? appointments.find((a) => a.id === selected.id) ?? null : null),
    [appointments, selected],
  );
  const selectedRoster = useMemo(
    () => (selected?.kind === 'roster' ? employeeRosters.find((r) => r.id === selected.id) ?? null : null),
    [employeeRosters, selected],
  );

  const drawerLocale = useMemo<Locale>(
    () => resolveLocale(selectedAppointment?.customerLocale ?? locale),
    [selectedAppointment, locale],
  );

  // Anti-fraud highlight counts (drives the header strip badge).
  const ghostCount = employeeRosters.filter((r) => r.status === 'GHOST_STATE' || r.status === 'OVERDUE_ABSENT').length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header strip */}
      <div className="flex items-baseline justify-between gap-4 border-b border-slate-100 px-6 py-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{t(locale, 'calendar.title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {t(locale, 'calendar.week_of', { date: fmtDate(weekStart, locale) })}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {ghostCount > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-200">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
              {ghostCount} ghost / overdue
            </span>
          ) : null}
          <Legend locale={locale} />
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="grid min-w-[920px] grid-cols-[80px_repeat(7,minmax(0,1fr))]">
          {/* Day headers */}
          <div className="border-b border-slate-100 bg-slate-50/60 px-2 py-3" />
          {days.map((d) => {
            const isToday = sameDay(d, today);
            return (
              <div
                key={d.toISOString()}
                className={`border-b border-slate-100 px-3 py-3 text-center ${
                  isToday ? 'bg-emerald-50/40' : 'bg-slate-50/60'
                }`}
              >
                <div className={`text-xs font-semibold uppercase tracking-wider ${isToday ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {fmtDay(d, locale)}
                </div>
                <div className={`mt-0.5 text-sm font-semibold ${isToday ? 'text-emerald-800' : 'text-slate-700'}`}>
                  {fmtDate(d, locale)}
                </div>
              </div>
            );
          })}

          {/* Time rows */}
          {Array.from({ length: workdayEndHour - workdayStartHour }, (_, i) => i + workdayStartHour).map((hour) => (
            <TimeRow
              key={hour}
              hour={hour}
              days={days}
              grouped={grouped}
              locale={locale}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      <AppointmentDrawer
        appointment={selectedAppointment}
        locale={drawerLocale}
        onClose={() => setSelected(null)}
        pataaCustomerUrlTemplate={pataaCustomerUrlTemplate}
      />
      <RosterDrawer
        roster={selectedRoster}
        locale={locale}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

// ── Single time row ──────────────────────────────────────────────────────────

function TimeRow({
  hour,
  days,
  grouped,
  locale,
  onSelect,
}: {
  hour: number;
  days: readonly Date[];
  grouped: Map<string, DayBucket>;
  locale: Locale;
  onSelect: (sel: Selection) => void;
}) {
  return (
    <>
      <div className="flex items-start justify-end border-b border-slate-50 px-2 py-2 text-xs font-medium text-slate-400">
        {fmtTime(new Date(2000, 0, 1, hour, 0), locale)}
      </div>
      {days.map((day) => {
        const key = dayKey(day);
        const bucket = grouped.get(key) ?? { appointments: [], rosters: [] };
        const apptsHere = bucket.appointments.filter((r) => new Date(r.startsAt).getHours() === hour);
        const rostersHere = bucket.rosters.filter((r) => new Date(r.shiftStart).getHours() === hour);

        return (
          <div key={`${key}-${hour}`} className="min-h-[64px] border-b border-l border-slate-50 p-1.5">
            {apptsHere.length + rostersHere.length === 0 ? null : (
              <div className="flex flex-col gap-1">
                {rostersHere.map((row) => (
                  <RosterSlot key={`r-${row.id}`} row={row} locale={locale} onSelect={onSelect} />
                ))}
                {apptsHere.map((row) => (
                  <AppointmentSlot key={`a-${row.id}`} row={row} locale={locale} onSelect={onSelect} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}

function AppointmentSlot({
  row,
  locale,
  onSelect,
}: {
  row: AppointmentRow;
  locale: Locale;
  onSelect: (sel: Selection) => void;
}) {
  const start = new Date(row.startsAt);
  const end = new Date(row.endsAt);
  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: 'appointment', id: row.id })}
      className={`group flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left text-xs transition ${APPT_CELL[row.status]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium">
          {fmtTime(start, locale)} – {fmtTime(end, locale)}
        </span>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${APPT_DOT[row.status]}`} aria-hidden />
      </div>
      <div className="line-clamp-1 font-semibold">{row.serviceName}</div>
      {row.customerName ? (
        <div className="line-clamp-1 text-[11px] opacity-80">{row.customerName}</div>
      ) : null}
    </button>
  );
}

function RosterSlot({
  row,
  locale,
  onSelect,
}: {
  row: EmployeeRosterRow;
  locale: Locale;
  onSelect: (sel: Selection) => void;
}) {
  const start = new Date(row.shiftStart);
  const end = new Date(row.shiftEnd);
  return (
    <button
      type="button"
      onClick={() => onSelect({ kind: 'roster', id: row.id })}
      className={`group flex w-full flex-col gap-0.5 rounded-md border px-2 py-1.5 text-left text-xs transition ${ROSTER_CELL[row.status]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] font-medium">
          {fmtTime(start, locale)} – {fmtTime(end, locale)}
        </span>
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${ROSTER_DOT[row.status]}`} aria-hidden />
      </div>
      <div className="line-clamp-1 font-semibold">{row.employeeName}</div>
      <div className="line-clamp-1 text-[11px] opacity-80">
        {row.employeeRole ?? 'staff'} · {row.status === 'GHOST_STATE' ? '⚠ ghost' : row.status === 'OVERDUE_ABSENT' ? '⚠ overdue' : 'shift'}
      </div>
    </button>
  );
}

function Legend({ locale }: { locale: Locale }) {
  return (
    <div className="flex items-center gap-3 text-xs">
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
        {t(locale, 'appointment.status.confirmed')}
      </span>
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden />
        {t(locale, 'appointment.status.pending')}
      </span>
      <span className="inline-flex items-center gap-1.5 text-slate-500">
        <span className="h-2 w-2 rounded-full bg-rose-500" aria-hidden />
        {locale === 'hi-IN' ? 'अनुपस्थित / सक्रिय नहीं' : locale === 'hi-IN-Latn' ? 'Overdue / Ghost' : 'Overdue / Ghost'}
      </span>
    </div>
  );
}

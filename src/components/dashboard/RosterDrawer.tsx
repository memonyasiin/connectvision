'use client';

import { useEffect } from 'react';
import type { Locale } from '@/lib/translations';
import type { EmployeeRosterRow, RosterStatus } from './CalendarGrid.types';

interface RosterDrawerProps {
  roster: EmployeeRosterRow | null;
  locale: Locale;
  onClose: () => void;
}

const STATUS_LABEL: Record<RosterStatus, { en: string; hi: string; hl: string }> = {
  SCHEDULED:        { en: 'Scheduled',         hi: 'निर्धारित',         hl: 'Scheduled' },
  AWAITING_CHECKIN: { en: 'Awaiting check-in', hi: 'पहुँचने का इंतज़ार', hl: 'Check-in pending' },
  ON_SHIFT:         { en: 'On shift',          hi: 'ड्यूटी पर',          hl: 'Shift pe' },
  OVERDUE_ABSENT:   { en: 'Overdue absent',    hi: 'अनधिकृत अनुपस्थित', hl: 'Overdue absent' },
  GHOST_STATE:      { en: 'Ghost state',       hi: 'सक्रिय नहीं',        hl: 'Bina kaam ke active' },
  COMPLETED:        { en: 'Completed',         hi: 'पूर्ण',              hl: 'Ho gaya' },
  ON_LEAVE:         { en: 'On leave',          hi: 'अवकाश',              hl: 'Leave pe' },
};

const STATUS_BADGE_CLASSES: Record<RosterStatus, string> = {
  SCHEDULED:        'bg-slate-50 text-slate-600 ring-slate-200',
  AWAITING_CHECKIN: 'bg-amber-50 text-amber-700 ring-amber-200',
  ON_SHIFT:         'bg-emerald-50 text-emerald-700 ring-emerald-200',
  OVERDUE_ABSENT:   'bg-rose-50 text-rose-700 ring-rose-200',
  GHOST_STATE:      'bg-rose-50 text-rose-700 ring-rose-200',
  COMPLETED:        'bg-slate-100 text-slate-600 ring-slate-200',
  ON_LEAVE:         'bg-sky-50 text-sky-700 ring-sky-200',
};

function pickStatusLabel(status: RosterStatus, locale: Locale): string {
  const label = STATUS_LABEL[status];
  switch (locale) {
    case 'hi-IN':      return label.hi;
    case 'hi-IN-Latn': return label.hl;
    default:           return label.en;
  }
}

function formatTimeRange(start: Date, end: Date, locale: Locale): string {
  const intlLocale = locale === 'hi-IN' ? 'hi-IN' : 'en-IN';
  const fmt = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatRelative(dt: Date | string | null): string | null {
  if (!dt) return null;
  const d = typeof dt === 'string' ? new Date(dt) : dt;
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1)   return 'just now';
  if (min < 60)  return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24)   return `${hr}h ago`;
  return d.toLocaleDateString();
}

export function RosterDrawer({ roster, locale, onClose }: RosterDrawerProps) {
  useEffect(() => {
    if (!roster) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [roster, onClose]);

  if (!roster) return null;

  const isGhostOrAbsent = roster.status === 'GHOST_STATE' || roster.status === 'OVERDUE_ABSENT';
  const productivity = roster.productivityScore ?? 0;

  return (
    <>
      <div
        role="button"
        aria-label="Close"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
      />
      <aside
        role="dialog"
        aria-modal="true"
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Employee shift</p>
            <h2 className="mt-1 text-xl font-semibold text-slate-900">{roster.employeeName}</h2>
            {roster.employeeRole ? (
              <p className="mt-0.5 text-sm text-slate-500">{roster.employeeRole}</p>
            ) : null}
            <p className="mt-2 text-sm text-slate-500">
              {formatTimeRange(new Date(roster.shiftStart), new Date(roster.shiftEnd), locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Status pill */}
          <div className="mb-6">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${STATUS_BADGE_CLASSES[roster.status]}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {pickStatusLabel(roster.status, locale)}
            </span>
          </div>

          {/* Anti-fraud banner */}
          {isGhostOrAbsent ? (
            <div className="mb-6 rounded-lg border border-rose-200 bg-rose-50/70 p-4">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <div>
                  <div className="font-semibold text-rose-900">
                    {roster.status === 'GHOST_STATE' ? 'Ghost-state detected' : 'Overdue / unauthorised absence'}
                  </div>
                  <div className="mt-1 text-sm text-rose-800/90">
                    {roster.status === 'GHOST_STATE'
                      ? 'Zero productive input recorded in the last 30 minutes during an active shift.'
                      : 'Shift began without a check-in. Approved leave does not cover this slot.'}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {/* Productivity score */}
          <Section heading="Productivity (this shift)">
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-mono text-2xl font-semibold text-slate-900">{productivity.toFixed(0)}</span>
                <span className="text-xs text-slate-400">/ 100</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full transition-[width] duration-500 ${
                    productivity >= 70 ? 'bg-emerald-500' : productivity >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, productivity))}%` }}
                />
              </div>
              <div className="text-xs text-slate-500">
                {roster.inputEventsThisShift.toLocaleString()} input events recorded
              </div>
            </div>
          </Section>

          {/* Check-in / out audit */}
          <Section heading="Check-in audit">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-slate-500">Checked in</dt>
              <dd className="font-medium text-slate-900">
                {roster.checkInAt ? formatRelative(roster.checkInAt) : <span className="italic text-slate-400">—</span>}
              </dd>
              <dt className="text-slate-500">Checked out</dt>
              <dd className="font-medium text-slate-900">
                {roster.checkOutAt ? formatRelative(roster.checkOutAt) : <span className="italic text-slate-400">—</span>}
              </dd>
              <dt className="text-slate-500">Last activity</dt>
              <dd className="font-medium text-slate-900">
                {roster.lastActivityAt ? formatRelative(roster.lastActivityAt) : <span className="italic text-slate-400">—</span>}
              </dd>
            </dl>
          </Section>

          {/* Pataa Workops link */}
          {roster.pataaEmployeeId ? (
            <Section heading="Pataa Workops">
              <a
                href={`https://pataainternational.com/pataaworkops/employees/${encodeURIComponent(roster.pataaEmployeeId)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Open in Workops
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              </a>
            </Section>
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{heading}</h3>
      {children}
    </section>
  );
}

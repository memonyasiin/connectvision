'use client';

import { useEffect } from 'react';
import type { Locale } from '@/lib/translations';
import { t, type TranslationKey } from '@/lib/translations';
import type { AppointmentRow } from './CalendarGrid.types';

interface AppointmentDrawerProps {
  appointment: AppointmentRow | null;
  locale: Locale;
  onClose: () => void;
  /**
   * Optional Pataa CRM deep-link template. `{{id}}` is replaced with the
   * customer's `pataaCustomerId`. String (not function) so this prop can
   * cross the server→client component boundary cleanly.
   */
  pataaCustomerUrlTemplate?: string;
}

const STATUS_BADGE: Record<AppointmentRow['status'], { label: string; classes: string }> = {
  AVAILABLE:        { label: 'available',  classes: 'bg-slate-100 text-slate-600 ring-slate-200' },
  PENDING_CHECKOUT: { label: 'pending',    classes: 'bg-amber-50 text-amber-700 ring-amber-200' },
  CONFIRMED:        { label: 'confirmed',  classes: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  COMPLETED:        { label: 'completed',  classes: 'bg-slate-50 text-slate-500 ring-slate-200' },
  CANCELLED:        { label: 'cancelled',  classes: 'bg-rose-50 text-rose-700 ring-rose-200' },
  NO_SHOW:          { label: 'no_show',    classes: 'bg-rose-50 text-rose-700 ring-rose-200' },
};

function formatTimeRange(start: Date, end: Date, locale: Locale): string {
  const intlLocale = locale === 'hi-IN' ? 'hi-IN' : 'en-IN';
  const fmt = new Intl.DateTimeFormat(intlLocale, { hour: 'numeric', minute: '2-digit', hour12: true });
  return `${fmt.format(start)} – ${fmt.format(end)}`;
}

function formatInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function AppointmentDrawer({ appointment, locale, onClose, pataaCustomerUrlTemplate }: AppointmentDrawerProps) {
  // ESC to close — operator dashboards are keyboard-heavy.
  useEffect(() => {
    if (!appointment) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [appointment, onClose]);

  if (!appointment) return null;

  // Cast: every value of `STATUS_BADGE.label` is by construction the suffix
  // of a real `appointment.status.*` key in the translations dictionary.
  const statusKey = `appointment.status.${STATUS_BADGE[appointment.status].label}` as TranslationKey;
  const badge = STATUS_BADGE[appointment.status];
  const upiAmount = typeof appointment.upiAmountInr === 'number' ? appointment.upiAmountInr : null;
  const hasPayment = appointment.status === 'CONFIRMED' && upiAmount !== null;

  return (
    <>
      {/* Scrim */}
      <div
        role="button"
        aria-label="Close drawer"
        tabIndex={-1}
        onClick={onClose}
        className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t(locale, 'drawer.heading')}
        className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {t(locale, 'drawer.heading')}
            </p>
            <h2 className="mt-1 font-semibold text-slate-900" style={{ fontSize: 22, lineHeight: 1.2 }}>
              {appointment.serviceName}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {formatTimeRange(new Date(appointment.startsAt), new Date(appointment.endsAt), locale)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label={t(locale, 'drawer.close')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Status pill */}
          <div className="mb-6">
            <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset ${badge.classes}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden />
              {t(locale, statusKey)}
            </span>
          </div>

          {/* Customer */}
          <Section heading={t(locale, 'drawer.customer')}>
            {appointment.customerName ? (
              <div className="space-y-1">
                <div className="text-sm font-medium text-slate-900">{appointment.customerName}</div>
                {appointment.customerPhone ? (
                  <div className="text-sm text-slate-600">{appointment.customerPhone}</div>
                ) : null}
                {appointment.customerEmail ? (
                  <div className="text-sm text-slate-600">{appointment.customerEmail}</div>
                ) : null}
              </div>
            ) : (
              <div className="text-sm italic text-slate-400">—</div>
            )}
          </Section>

          {/* Service / duration */}
          <Section heading={t(locale, 'drawer.service')}>
            <div className="text-sm text-slate-900">{appointment.serviceName}</div>
            <div className="mt-1 text-sm text-slate-500">
              {t(locale, 'drawer.duration')}: {appointment.durationMin} min
            </div>
          </Section>

          {/* Payment */}
          <Section heading={t(locale, 'drawer.payment')}>
            {hasPayment ? (
              <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-4">
                <div className="text-sm font-semibold text-emerald-800">
                  {t(locale, 'drawer.payment_received', { amount: formatInr(upiAmount!) })}
                </div>
                {appointment.upiRefId ? (
                  <div className="mt-2 flex items-center gap-2 text-xs text-emerald-900/70">
                    <span className="font-medium uppercase tracking-wide">{t(locale, 'drawer.upi_ref')}</span>
                    <code className="rounded bg-white px-1.5 py-0.5 font-mono text-emerald-900">{appointment.upiRefId}</code>
                  </div>
                ) : null}
              </div>
            ) : appointment.status === 'PENDING_CHECKOUT' ? (
              <div className="rounded-lg border border-amber-100 bg-amber-50/60 p-4 text-sm text-amber-800">
                {t(locale, 'drawer.payment_pending')}
              </div>
            ) : (
              <div className="text-sm italic text-slate-400">{t(locale, 'drawer.no_payment_yet')}</div>
            )}
          </Section>

          {/* Pataa CRM linkage */}
          {appointment.pataaCustomerId && pataaCustomerUrlTemplate ? (
            <Section heading="Pataa CRM">
              <a
                href={pataaCustomerUrlTemplate.replace('{{id}}', encodeURIComponent(appointment.pataaCustomerId))}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                {t(locale, 'drawer.pataa_link')}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 17L17 7M17 7H8M17 7v9" />
                </svg>
              </a>
            </Section>
          ) : null}

          {/* Notes */}
          {appointment.notes ? (
            <Section heading={t(locale, 'drawer.notes')}>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{appointment.notes}</p>
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

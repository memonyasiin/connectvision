'use client';

import { useBuild } from '@/contexts/BuildContext';
import { CLINIC_CONTACT } from './_sampleContent';

const THEME_ID = 'medical-clinical';
const VARIANT_ID = 'minimal';

export function FooterMinimal() {
  const { currentConfig } = useBuild();
  const { businessName } = currentConfig;
  const year = new Date().getFullYear();
  const contact = CLINIC_CONTACT;

  return (
    <footer
      data-theme={THEME_ID}
      data-section-kind="footer"
      data-variant={VARIANT_ID}
      className="border-t border-slate-200 px-5 md:px-10 pt-12 pb-8"
      style={{ background: '#ffffff' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand + reception */}
          <div className="md:col-span-1">
            <div className="text-xl font-semibold text-slate-900 leading-tight">
              {businessName}
            </div>
            <div className="mt-3 text-sm text-slate-600 leading-relaxed">
              <a
                href={`tel:${contact.phone.replace(/\s/g, '')}`}
                className="block tabular-nums hover:underline"
                style={{ color: 'var(--primary-color)' }}
              >
                {contact.phone}
              </a>
              <a
                href={`mailto:${contact.email}`}
                className="block hover:underline"
                style={{ color: 'var(--primary-color)' }}
              >
                {contact.email}
              </a>
            </div>
          </div>

          {/* Hours */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Hours
            </h4>
            <dl className="space-y-1.5 text-sm">
              {contact.hours.map((row) => (
                <div key={row.day}>
                  <dt className="font-medium text-slate-700">{row.day}</dt>
                  <dd className={row.emergencyOnly ? 'text-rose-700 italic text-xs' : 'text-slate-500 text-xs'}>
                    {row.time}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Address */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
              Visit
            </h4>
            <address className="not-italic text-sm leading-relaxed text-slate-600">
              {contact.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div>{contact.cityLine}</div>
            </address>
          </div>

          {/* Emergency */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-700 mb-3">
              Emergency
            </h4>
            <a
              href={`tel:${contact.emergencyPhone.replace(/\s/g, '')}`}
              className="block text-lg font-semibold tabular-nums text-rose-700 hover:underline"
            >
              {contact.emergencyPhone}
            </a>
            <p className="mt-2 text-xs text-slate-500 leading-relaxed">
              24-hour line for existing patients. New patients call reception first.
            </p>
          </div>
        </div>

        {/* Compliance + bottom bar */}
        <div className="mt-10 pt-6 border-t border-slate-200 space-y-4">
          <p className="text-[11px] leading-relaxed text-slate-500">
            <strong className="font-semibold text-slate-700">Compliance · </strong>
            {contact.registrationLine}
          </p>
          <p className="text-[11px] leading-relaxed text-slate-500 italic">
            Disclaimer: Content on this site is informational only and is not a substitute for professional
            medical advice, diagnosis, or treatment. Always seek the advice of a qualified medical
            practitioner.
          </p>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-slate-400 pt-3 border-t border-slate-100">
            <div>© {year} {businessName}. All rights reserved.</div>
            <div className="flex gap-5">
              <a href="#" className="hover:text-slate-700 transition-colors">Privacy</a>
              <a href="#" className="hover:text-slate-700 transition-colors">Patient terms</a>
              <a href="#" className="hover:text-slate-700 transition-colors">Cancellation policy</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

'use client';

import { useBuild } from '@/contexts/BuildContext';
import { SKINCARE_CONTACT, SKINCARE_SOCIAL } from './_sampleContent';

const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'wide';

export function FooterWide() {
  const { currentConfig } = useBuild();
  const { businessName, tagline } = currentConfig;
  const year = new Date().getFullYear();

  return (
    <footer
      data-theme={THEME_ID}
      data-section-kind="footer"
      data-variant={VARIANT_ID}
      className="border-t border-[#e8e1c9] pt-14 pb-8 px-5 md:px-10"
      style={{ background: '#fbfaf7' }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand column */}
          <div className="lg:col-span-1">
            <div
              className="font-heading text-2xl font-bold leading-tight"
              style={{ color: 'var(--primary-color)' }}
            >
              {businessName}
            </div>
            {tagline ? (
              <p className="mt-2 text-sm text-[#94918a]">{tagline}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap gap-2">
              {SKINCARE_SOCIAL.map((s) => (
                <a
                  key={s.platform}
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e1c9] text-[#4a5560] hover:bg-white hover:text-[color:var(--primary-color)] transition-colors"
                  aria-label={s.label}
                >
                  <span className="text-xs font-semibold">
                    {s.platform.charAt(0).toUpperCase()}
                  </span>
                </a>
              ))}
            </div>
          </div>

          {/* Visit column */}
          <div>
            <h4
              className="font-heading text-base font-semibold mb-3"
              style={{ color: 'var(--primary-color)' }}
            >
              Visit
            </h4>
            <address className="not-italic text-sm leading-relaxed text-[#4a5560]">
              {SKINCARE_CONTACT.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div className="mt-1">{SKINCARE_CONTACT.cityLine}</div>
            </address>
          </div>

          {/* Hours column */}
          <div>
            <h4
              className="font-heading text-base font-semibold mb-3"
              style={{ color: 'var(--primary-color)' }}
            >
              Hours
            </h4>
            <dl className="space-y-1.5 text-sm text-[#4a5560]">
              {SKINCARE_CONTACT.hours.map((row) => (
                <div key={row.day}>
                  <dt className="font-medium">{row.day}</dt>
                  <dd className="text-[#94918a]">{row.time}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Newsletter column */}
          <div>
            <h4
              className="font-heading text-base font-semibold mb-3"
              style={{ color: 'var(--primary-color)' }}
            >
              Newsletter
            </h4>
            <p className="text-sm text-[#4a5560] mb-3">
              Skincare tips + first dibs on new treatments. No spam.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                /* SaaS-tier wiring lands in MODULE 3+ — currently no-op. */
              }}
            >
              <input
                type="email"
                placeholder="you@example.com"
                aria-label="Email address"
                className="flex-1 min-w-0 rounded-md border border-[#e8e1c9] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--primary-color)] focus:border-transparent"
                required
              />
              <button
                type="submit"
                className="rounded-md px-4 py-2 text-sm font-semibold text-white transition-transform duration-150 hover:-translate-y-0.5"
                style={{ background: 'var(--primary-color)' }}
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#e8e1c9] flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-[#94918a]">
          <div>© {year} {businessName}. All rights reserved.</div>
          <div className="flex gap-5">
            <a href="#" className="hover:text-[color:var(--primary-color)] transition-colors">
              Privacy
            </a>
            <a href="#" className="hover:text-[color:var(--primary-color)] transition-colors">
              Terms
            </a>
            <a href="#" className="hover:text-[color:var(--primary-color)] transition-colors">
              Refund policy
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.

// ═════════════════════════════════════════════════════════════════════════════
// Retail Modern — FooterMinimal variant
// ─────────────────────────────────────────────────────────────────────────────
// Ink-on-canvas footer with three columns: brand mark + tagline, link list,
// contact strip. Subtle 1px hairline border at top — no heavy shadows.
// ═════════════════════════════════════════════════════════════════════════════

import { RETAIL_INK, RETAIL_SUBTLE, RETAIL_PRIMARY } from './_common';

export interface FooterMinimalLink {
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterMinimalProps {
  businessName: string;
  tagline?: string;
  links?: readonly FooterMinimalLink[];
  /** Compact contact triplet — phone / email / address. */
  phone?: string;
  email?: string;
  address?: string;
  /** Optional copyright year. Defaults to the current year. */
  year?: number;
}

export function FooterMinimal({
  businessName,
  tagline,
  links = [],
  phone,
  email,
  address,
  year,
}: FooterMinimalProps) {
  const displayYear = year ?? new Date().getFullYear();

  return (
    <footer className="border-t border-slate-200 bg-white px-5 md:px-10 py-14">
      <div className="max-w-6xl mx-auto grid md:grid-cols-12 gap-10">
        {/* ── Brand column ──────────────────────────────────────────────── */}
        <div className="md:col-span-5">
          <div
            className="text-xl font-semibold tracking-tight"
            style={{ color: RETAIL_INK }}
          >
            {businessName}
          </div>
          {tagline ? (
            <p
              className="mt-3 text-sm leading-relaxed max-w-sm"
              style={{ color: RETAIL_SUBTLE }}
            >
              {tagline}
            </p>
          ) : null}
        </div>

        {/* ── Link column ───────────────────────────────────────────────── */}
        <div className="md:col-span-3">
          {links.length > 0 ? (
            <ul className="space-y-2.5">
              {links.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    {...(l.external
                      ? { target: '_blank', rel: 'noopener noreferrer' }
                      : {})}
                    className="text-sm transition-colors hover:underline"
                    style={{ color: RETAIL_INK }}
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {/* ── Contact column ────────────────────────────────────────────── */}
        <div className="md:col-span-4 space-y-2 text-sm" style={{ color: RETAIL_SUBTLE }}>
          {phone ? <div>{phone}</div> : null}
          {email ? (
            <div>
              <a
                href={`mailto:${email}`}
                className="hover:underline"
                style={{ color: RETAIL_PRIMARY }}
              >
                {email}
              </a>
            </div>
          ) : null}
          {address ? <div className="leading-relaxed">{address}</div> : null}
        </div>
      </div>

      {/* ── Copyright strip ───────────────────────────────────────────────── */}
      <div
        className="max-w-6xl mx-auto mt-12 pt-6 border-t border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs"
        style={{ color: RETAIL_SUBTLE }}
      >
        <div>
          © {displayYear} {businessName}. All rights reserved.
        </div>
        <div className="flex items-center gap-2">
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{ background: RETAIL_PRIMARY }}
          />
          Powered by ConnectVision OS
        </div>
      </div>
    </footer>
  );
}

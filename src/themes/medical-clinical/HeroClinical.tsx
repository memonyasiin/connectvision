'use client';

import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { ClinicCta, TrustBadge } from './_common';
import { CLINIC_TRUST_SIGNALS } from './_sampleContent';

const SECTION_ID = 'sec-hero';
const THEME_ID = 'medical-clinical';
const VARIANT_ID = 'clinical';

export function HeroClinical() {
  const { currentConfig } = useBuild();
  const { businessName, tagline, description } = currentConfig;
  const sectionRef = useActivityTracker({ sectionId: SECTION_ID, sectionKind: 'hero' });

  return (
    <section
      ref={sectionRef}
      data-theme={THEME_ID}
      data-section-kind="hero"
      data-variant={VARIANT_ID}
      className="px-5 md:px-10 py-20 md:py-28 border-b border-slate-200"
      style={{
        background:
          'linear-gradient(135deg, #ffffff 0%, #f1f5f9 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.3fr_1fr] gap-10 lg:gap-16 items-center">
        <div>
          <div
            className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-medium"
            style={{
              background: 'color-mix(in srgb, var(--primary-color) 8%, white)',
              color: 'var(--primary-color)',
            }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: 'var(--primary-color)' }} aria-hidden />
            Accepting new patients
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight text-slate-900">
            {businessName}
          </h1>

          {tagline ? (
            <p className="mt-4 text-lg md:text-xl text-slate-600 leading-snug">
              {tagline}
            </p>
          ) : null}

          {description ? (
            <p className="mt-5 text-base md:text-lg leading-relaxed text-slate-600 max-w-[58ch]">
              {description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <ClinicCta
              sectionId={SECTION_ID}
              intent="book-appointment"
              productTag="hero-book"
              variant="primary"
              size="lg"
              label="Book appointment"
            />
            <ClinicCta
              sectionId={SECTION_ID}
              intent="support"
              productTag="emergency"
              variant="emergency"
              size="lg"
              label="Emergency"
            />
          </div>
        </div>

        {/* Trust signals panel */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-4">
            Why patients trust us
          </h3>
          <div className="flex flex-wrap gap-2">
            {CLINIC_TRUST_SIGNALS.map((sig) => (
              <TrustBadge
                key={sig.id}
                label={sig.label}
                qualifier={sig.qualifier}
                size="sm"
              />
            ))}
          </div>
          <p className="mt-5 pt-5 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
            All consultations conducted by MBBS / MD / DCH / MDS-qualified
            practitioners, registered with the Maharashtra Medical Council.
            Reports issued on the clinic letterhead with digital signature.
          </p>
        </div>
      </div>
    </section>
  );
}

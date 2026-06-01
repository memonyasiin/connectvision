'use client';

import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { BrandCta } from './_common';

const SECTION_ID = 'sec-hero';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'split';

export function HeroSplit() {
  const { currentConfig } = useBuild();
  const { businessName, tagline, description } = currentConfig;
  const sectionRef = useActivityTracker({ sectionId: SECTION_ID, sectionKind: 'hero' });

  return (
    <section
      ref={sectionRef}
      data-theme={THEME_ID}
      data-section-kind="hero"
      data-variant={VARIANT_ID}
      className="px-5 md:px-10 py-16 md:py-24"
      style={{
        background:
          'linear-gradient(135deg, #ffffff 0%, color-mix(in srgb, var(--primary-color) 8%, #ffffff) 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 md:gap-16 items-center">
        {/* Content column */}
        <div>
          <h1
            className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold leading-[1.05] tracking-tight"
            style={{ color: 'var(--primary-color)' }}
          >
            {businessName}
          </h1>

          {tagline ? (
            <p
              className="mt-3 font-heading text-lg md:text-xl lg:text-2xl font-medium leading-snug"
              style={{ color: '#D4AF37' }}
            >
              {tagline}
            </p>
          ) : null}

          {description ? (
            <p className="mt-5 text-base md:text-[17px] leading-relaxed text-[#4a5560] max-w-[52ch]">
              {description}
            </p>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            <BrandCta
              sectionId={SECTION_ID}
              intent="general-enquiry"
              variant="primary"
              size="md"
              label="Chat on WhatsApp"
            />
            <BrandCta
              sectionId={SECTION_ID}
              intent="book-appointment"
              variant="outline"
              size="md"
              label="Book a slot"
            />
          </div>
        </div>

        {/* Media column — gradient placeholder when no logo / hero image */}
        <div
          className="aspect-[4/5] rounded-3xl overflow-hidden shadow-[0_24px_80px_-32px_rgba(0,0,0,0.3)]"
          style={{
            background:
              'linear-gradient(160deg, color-mix(in srgb, var(--primary-color) 18%, transparent), rgba(212, 175, 55, 0.22))',
          }}
        />
      </div>
    </section>
  );
}

// Registration handled centrally in `src/themes/_registry.tsx` via the
// static seed map (avoids circular-import TDZ with the dispatcher).

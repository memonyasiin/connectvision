'use client';

import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { BrandCta } from './_common';

const SECTION_ID = 'sec-hero';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'centered';

export function HeroCentered() {
  const { currentConfig } = useBuild();
  const { businessName, tagline, description } = currentConfig;
  const sectionRef = useActivityTracker({ sectionId: SECTION_ID, sectionKind: 'hero' });

  return (
    <section
      ref={sectionRef}
      data-theme={THEME_ID}
      data-section-kind="hero"
      data-variant={VARIANT_ID}
      className="px-5 md:px-10 py-24 md:py-36 text-center"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--primary-color) 14%, #ffffff) 0%, #ffffff 70%)',
      }}
    >
      <div className="max-w-3xl mx-auto">
        <h1
          className="font-heading text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.02] tracking-tighter"
          style={{ color: 'var(--primary-color)' }}
        >
          {businessName}
        </h1>

        {tagline ? (
          <p
            className="mt-5 font-heading text-xl md:text-2xl font-medium leading-snug"
            style={{ color: '#D4AF37' }}
          >
            {tagline}
          </p>
        ) : null}

        {description ? (
          <p className="mt-7 mx-auto max-w-[60ch] text-base md:text-lg leading-loose text-[#4a5560]">
            {description}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <BrandCta
            sectionId={SECTION_ID}
            intent="book-appointment"
            variant="primary"
            size="lg"
            label="Book your slot"
          />
          <BrandCta
            sectionId={SECTION_ID}
            intent="general-enquiry"
            variant="outline"
            size="lg"
            label="Ask on WhatsApp"
          />
        </div>
      </div>
    </section>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.

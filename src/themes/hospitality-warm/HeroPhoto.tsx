'use client';

import Image from 'next/image';
import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { WarmCta } from './_common';
import { RESTAURANT_HERO_PHOTO } from './_sampleContent';

const SECTION_ID = 'sec-hero';
const THEME_ID = 'hospitality-warm';
const VARIANT_ID = 'photo';

export function HeroPhoto() {
  const { currentConfig } = useBuild();
  const { businessName, tagline, description } = currentConfig;
  const sectionRef = useActivityTracker({ sectionId: SECTION_ID, sectionKind: 'hero' });

  return (
    <section
      ref={sectionRef}
      data-theme={THEME_ID}
      data-section-kind="hero"
      data-variant={VARIANT_ID}
      className="relative overflow-hidden min-h-[88vh] flex items-center px-5 md:px-10 py-24"
    >
      {/* Full-bleed background photo */}
      <Image
        src={RESTAURANT_HERO_PHOTO}
        alt=""
        fill
        sizes="100vw"
        priority
        className="object-cover -z-10"
        unoptimized
      />

      {/* Gradient overlay for legibility */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'linear-gradient(135deg, rgba(20,15,8,0.7) 0%, rgba(20,15,8,0.35) 60%, rgba(20,15,8,0.6) 100%)',
        }}
      />

      <div className="relative z-10 max-w-3xl mx-auto md:mx-0 text-center md:text-left">
        {/* Eyebrow ornament */}
        <div
          className="inline-flex items-center gap-3 mb-6 text-xs uppercase tracking-[0.3em] text-amber-200"
        >
          <span className="h-px w-8 bg-amber-200/60" aria-hidden />
          Awadhi · Open fire · Slow food
          <span className="h-px w-8 bg-amber-200/60" aria-hidden />
        </div>

        <h1
          className="text-5xl md:text-7xl lg:text-8xl font-light leading-[1.02] tracking-tight text-white"
          style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
        >
          {businessName}
        </h1>

        {tagline ? (
          <p
            className="mt-5 text-xl md:text-2xl italic text-amber-100/90 font-light"
            style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
          >
            {tagline}
          </p>
        ) : null}

        {description ? (
          <p className="mt-7 text-base md:text-lg leading-relaxed text-white/80 max-w-[58ch] mx-auto md:mx-0">
            {description}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap justify-center md:justify-start gap-3">
          <WarmCta
            sectionId={SECTION_ID}
            intent="book-appointment"
            productTag="reservation"
            variant="on-photo"
            size="lg"
            label="Reserve a table"
          />
          <WarmCta
            sectionId={SECTION_ID}
            intent="product-info"
            productTag="menu"
            variant="on-photo"
            size="lg"
            className="!bg-transparent !text-white !border !border-white/40 !shadow-none hover:!bg-white/10"
            label="View the menu"
          />
        </div>

        {/* Hours strip */}
        <div className="mt-12 inline-flex flex-wrap items-center gap-x-6 gap-y-2 text-xs uppercase tracking-wider text-white/60">
          <span>Tue – Sun · 7 pm – 11 pm</span>
          <span className="hidden md:inline">·</span>
          <span>Closed Mondays</span>
        </div>
      </div>
    </section>
  );
}

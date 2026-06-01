'use client';

// Hero — fitness category, dark stencil layout with stat block.
// Demonstrates ThemeForest-style theme injection on a contrasting palette.

import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker } from '@/hooks/useActivityTracker';
import { BoldCta } from './_common';
import { FITNESS_STATS } from './_sampleContent';

const SECTION_ID = 'sec-hero';
const THEME_ID = 'fitness-bold';
const VARIANT_ID = 'bold';

export function HeroBold() {
  const { currentConfig } = useBuild();
  const { businessName, tagline, description } = currentConfig;
  const sectionRef = useActivityTracker({ sectionId: SECTION_ID, sectionKind: 'hero' });

  return (
    <section
      ref={sectionRef}
      data-theme={THEME_ID}
      data-section-kind="hero"
      data-variant={VARIANT_ID}
      className="relative overflow-hidden px-5 md:px-10 py-24 md:py-36"
      style={{
        background:
          'radial-gradient(120% 100% at 100% 0%, color-mix(in srgb, var(--primary-color) 35%, #0a0a0a) 0%, #050505 70%)',
        color: '#f5f5f5',
        isolation: 'isolate',
      }}
    >
      {/* Diagonal accent stripe */}
      <div
        aria-hidden
        className="pointer-events-none absolute top-[-20%] right-[-10%] h-[140%] w-[60%] z-0"
        style={{
          background:
            'linear-gradient(115deg, transparent 40%, var(--primary-color) 50%, transparent 60%)',
          opacity: 0.18,
          transform: 'skewX(-15deg)',
        }}
      />

      {/* Industrial grid texture */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 60%, black 0%, transparent 75%)',
        }}
      />

      <div className="relative z-10 max-w-6xl mx-auto grid lg:grid-cols-[1.4fr_1fr] gap-12 lg:gap-20 items-center">
        <div>
          {/* Eyebrow pill */}
          <div
            className="inline-block mb-6 px-4 py-2 text-[11px] font-bold uppercase rounded-full"
            style={{
              border: '1px solid color-mix(in srgb, var(--primary-color) 60%, transparent)',
              background: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
              color: 'var(--primary-color)',
              letterSpacing: '0.18em',
            }}
          >
            New Members · 7-Day Free Trial
          </div>

          <h1
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold uppercase leading-[0.95] tracking-tighter text-white"
          >
            {businessName}
          </h1>

          {tagline ? (
            <p
              className="mt-5 text-lg md:text-2xl font-semibold uppercase leading-snug"
              style={{ color: 'var(--primary-color)', letterSpacing: '0.04em' }}
            >
              {tagline}
            </p>
          ) : null}

          {description ? (
            <p className="mt-7 text-sm md:text-base leading-relaxed text-white/70 max-w-[52ch]">
              {description}
            </p>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3">
            <BoldCta
              sectionId={SECTION_ID}
              intent="book-appointment"
              productTag="free-trial"
              size="lg"
              variant="filled"
              label="Claim free trial"
            />
            <BoldCta
              sectionId={SECTION_ID}
              intent="general-enquiry"
              productTag="tour"
              size="lg"
              variant="ghost"
              label="Book a tour"
            />
          </div>
        </div>

        {/* Stat block */}
        <div
          className="grid grid-cols-2 gap-4 p-8 rounded-md border border-white/10"
          style={{
            background: 'rgba(255,255,255,0.03)',
            backdropFilter: 'blur(12px)',
          }}
        >
          {FITNESS_STATS.map((stat) => (
            <div key={stat.id} className="py-2">
              <div
                className="font-extrabold leading-none mb-2"
                style={{
                  fontSize: 'clamp(28px, 3vw, 42px)',
                  color: 'var(--primary-color)',
                }}
              >
                {stat.value}
              </div>
              <div className="text-[11px] font-bold uppercase text-white/55" style={{ letterSpacing: '0.16em' }}>
                {stat.label}
              </div>
              {stat.sublabel ? (
                <div className="text-[10px] text-white/30 mt-0.5">{stat.sublabel}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

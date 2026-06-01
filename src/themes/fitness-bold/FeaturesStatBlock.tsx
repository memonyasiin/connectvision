'use client';

// Features — fitness category, standalone 4-KPI tile block. Reuses the
// shared FITNESS_STATS source so the hero block + this section never drift.

import { BoldHeading, BoldShell } from './_common';
import { FITNESS_STATS } from './_sampleContent';

const SECTION_ID = 'sec-features';
const THEME_ID = 'fitness-bold';
const VARIANT_ID = 'stat-block';

export function FeaturesStatBlock() {
  return (
    <BoldShell id="features" sectionId={SECTION_ID} background="gradient">
      <div data-theme={THEME_ID} data-section-kind="features" data-variant={VARIANT_ID}>
        <BoldHeading
          eyebrow="Why us"
          title="Numbers don't lie"
          subtitle="The receipts. Verified members. Open every hour, every day, every year."
        />

        <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-px bg-white/5 border border-white/10">
          {FITNESS_STATS.map((stat) => (
            <div
              key={stat.id}
              className="relative p-6 md:p-8 bg-black hover:bg-white/[0.02] transition-colors"
            >
              <div
                className="font-extrabold leading-none mb-3"
                style={{
                  fontSize: 'clamp(36px, 4vw, 64px)',
                  color: 'var(--primary-color)',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {stat.value}
              </div>
              <div
                className="text-xs md:text-sm font-bold uppercase text-white"
                style={{ letterSpacing: '0.16em' }}
              >
                {stat.label}
              </div>
              {stat.sublabel ? (
                <div className="text-xs text-white/40 mt-1">{stat.sublabel}</div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </BoldShell>
  );
}

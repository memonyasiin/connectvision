'use client';

// Testimonials — fitness category, offset card stack with per-card rotation.
// High visual energy that contrasts with skincare's calm carousel.

import { BoldHeading, BoldShell } from './_common';
import { FITNESS_TESTIMONIALS, type GymTestimonial } from './_sampleContent';

const SECTION_ID = 'sec-testimonials';
const THEME_ID = 'fitness-bold';
const VARIANT_ID = 'card-stack';

function TestimonialCard({ item }: { item: GymTestimonial }) {
  return (
    <article
      className="relative rounded-md p-7 md:p-8 border border-white/10 bg-[#0f0f0f] shadow-2xl transition-transform duration-200 hover:!rotate-0 hover:scale-[1.02]"
      style={{
        transform: `rotate(${item.rotation}deg)`,
        background:
          'linear-gradient(160deg, #0f0f0f 0%, color-mix(in srgb, var(--primary-color) 6%, #0f0f0f) 100%)',
      }}
    >
      {/* Decorative achievement badge */}
      <div
        className="inline-block mb-5 px-3 py-1 text-[10px] font-bold uppercase rounded-sm"
        style={{
          background: 'color-mix(in srgb, var(--primary-color) 18%, transparent)',
          color: 'var(--primary-color)',
          letterSpacing: '0.12em',
        }}
      >
        {item.achievement}
      </div>

      <blockquote className="text-base md:text-lg leading-relaxed text-white/85 mb-6">
        “{item.quote}”
      </blockquote>

      <footer className="pt-5 border-t border-white/10">
        <div className="text-sm font-bold uppercase text-white" style={{ letterSpacing: '0.04em' }}>
          {item.authorName}
        </div>
        <div className="text-xs text-white/40 mt-0.5">{item.memberSince}</div>
      </footer>
    </article>
  );
}

export function TestimonialsCardStack() {
  return (
    <BoldShell id="testimonials" sectionId={SECTION_ID} background="stripe">
      <div data-theme={THEME_ID} data-section-kind="testimonials" data-variant={VARIANT_ID}>
        <BoldHeading
          eyebrow="Receipts"
          title="Real members. Real results."
          subtitle="Six months in, the only people you should be listening to are the ones who showed up."
          align="center"
          className="mb-14 md:mb-16"
        />

        <div className="grid gap-7 md:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          {FITNESS_TESTIMONIALS.map((item) => (
            <TestimonialCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </BoldShell>
  );
}

'use client';

import { RatingStars, SectionHeading, SectionShell } from './_common';
import { SKINCARE_TESTIMONIALS, type TestimonialItem } from './_sampleContent';

const SECTION_ID = 'sec-testimonials';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'grid';

function TestimonialCard({ item }: { item: TestimonialItem }) {
  return (
    <article className="flex flex-col rounded-2xl border border-[#e8e1c9] bg-white p-6 md:p-7 shadow-sm hover:shadow-md transition-shadow">
      <RatingStars rating={item.rating} className="mb-4" />

      <blockquote className="font-heading text-lg leading-relaxed text-[#1a1a1a] flex-1">
        “{item.quote}”
      </blockquote>

      <footer className="mt-6 pt-5 border-t border-[#e8e1c9]">
        <div
          className="font-semibold text-base"
          style={{ color: 'var(--primary-color)' }}
        >
          {item.authorName}
        </div>
        <div className="text-sm text-[#94918a]">{item.authorLocation}</div>
      </footer>
    </article>
  );
}

export function TestimonialsGrid() {
  return (
    <SectionShell id="testimonials" sectionId={SECTION_ID} background="gradient">
      <SectionHeading
        eyebrow="Word of mouth"
        title="What clients say after their first month"
      />

      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {SKINCARE_TESTIMONIALS.slice(0, 6).map((item) => (
          <TestimonialCard key={item.id} item={item} />
        ))}
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.

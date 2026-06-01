'use client';

import { useState } from 'react';
import { RatingStars, SectionHeading, SectionShell } from './_common';
import { SKINCARE_TESTIMONIALS } from './_sampleContent';

const SECTION_ID = 'sec-testimonials';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'carousel';

export function TestimonialsCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = SKINCARE_TESTIMONIALS;
  const current = items[activeIndex] ?? items[0];
  if (!current) return null;

  const goPrev = () => setActiveIndex((i) => (i - 1 + items.length) % items.length);
  const goNext = () => setActiveIndex((i) => (i + 1) % items.length);

  return (
    <SectionShell id="testimonials" sectionId={SECTION_ID} background="gradient">
      <SectionHeading
        eyebrow="Word of mouth"
        title="What clients say after their first month"
      />

      <div className="mt-12 max-w-3xl mx-auto">
        <article
          className="rounded-3xl border border-[#e8e1c9] bg-white px-8 md:px-12 py-10 md:py-14 shadow-sm"
          aria-live="polite"
        >
          <div className="mb-5">
            <RatingStars rating={current.rating} />
          </div>

          {/* Decorative opening quote mark */}
          <span
            className="absolute font-heading text-7xl leading-none opacity-10 -mt-3 -ml-2"
            style={{ color: 'var(--primary-color)' }}
            aria-hidden="true"
          >
            “
          </span>

          <blockquote
            className="font-heading text-xl md:text-2xl leading-relaxed text-[#1a1a1a]"
            style={{ minHeight: '6em' }}
          >
            {current.quote}
          </blockquote>

          <footer className="mt-6 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div
                className="font-semibold text-base"
                style={{ color: 'var(--primary-color)' }}
              >
                {current.authorName}
              </div>
              <div className="text-sm text-[#94918a]">{current.authorLocation}</div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e8e1c9] text-[#4a5560] hover:bg-[#fbfaf7] transition-colors"
                aria-label="Previous testimonial"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={goNext}
                className="flex h-10 w-10 items-center justify-center rounded-full text-white transition-transform hover:-translate-y-0.5"
                style={{ background: 'var(--primary-color)' }}
                aria-label="Next testimonial"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>
          </footer>
        </article>

        {/* Pagination dots */}
        <div className="mt-6 flex justify-center gap-2">
          {items.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveIndex(i)}
              aria-label={`Show testimonial ${i + 1}`}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === activeIndex ? 28 : 8,
                background: i === activeIndex
                  ? 'var(--primary-color)'
                  : 'rgba(0,0,0,0.15)',
              }}
            />
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.

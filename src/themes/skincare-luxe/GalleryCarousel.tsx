'use client';

import Image from 'next/image';
import { SectionHeading, SectionShell } from './_common';
import { SKINCARE_GALLERY } from './_sampleContent';

const SECTION_ID = 'sec-gallery';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'carousel';

export function GalleryCarousel() {
  return (
    <SectionShell id="gallery" sectionId={SECTION_ID}>
      <SectionHeading
        eyebrow="Gallery"
        title="Moments from the studio"
        subtitle="Scroll through the space."
      />

      {/* Native scroll-snap carousel — no JS needed. Tabs on a mouse work
          via grab + drag; touch devices flick naturally. */}
      <div className="mt-12 -mx-5 md:-mx-10 px-5 md:px-10">
        <div
          className="flex gap-4 md:gap-6 overflow-x-auto snap-x snap-mandatory pb-6 [scrollbar-width:thin]"
          style={{ scrollbarColor: 'rgba(212,175,55,0.4) transparent' }}
        >
          {SKINCARE_GALLERY.map((img) => (
            <figure
              key={img.id}
              className="relative flex-shrink-0 w-[78vw] sm:w-[60vw] md:w-[420px] aspect-[3/4] rounded-2xl overflow-hidden snap-center shadow-md"
            >
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 768px) 420px, 78vw"
                className="object-cover"
                unoptimized
              />
            </figure>
          ))}
        </div>
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.

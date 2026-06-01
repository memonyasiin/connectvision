'use client';

import Image from 'next/image';
import { SectionHeading, SectionShell } from './_common';
import { SKINCARE_GALLERY } from './_sampleContent';

const SECTION_ID = 'sec-gallery';
const THEME_ID = 'skincare-luxe';
const VARIANT_ID = 'masonry';

const ASPECT_CLASS = {
  tall:   'aspect-[3/4]',
  wide:   'aspect-[16/10]',
  square: 'aspect-square',
} as const;

export function GalleryMasonry() {
  return (
    <SectionShell id="gallery" sectionId={SECTION_ID}>
      <SectionHeading
        eyebrow="Gallery"
        title="Inside the studio"
        subtitle="A few quiet moments from our space — and the rituals we host inside it."
      />

      {/* CSS columns gives true masonry layout without a JS library. */}
      <div className="mt-12 columns-2 md:columns-3 gap-4 md:gap-5 [column-fill:_balance]">
        {SKINCARE_GALLERY.map((img) => (
          <figure
            key={img.id}
            className="mb-4 md:mb-5 break-inside-avoid overflow-hidden rounded-2xl group relative shadow-sm hover:shadow-xl transition-shadow"
          >
            <div className={`relative ${ASPECT_CLASS[img.aspect]} bg-[#f3eee0]`}>
              <Image
                src={img.src}
                alt={img.alt}
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized
              />
            </div>
          </figure>
        ))}
      </div>
    </SectionShell>
  );
}

// Registered via the static seed in `src/themes/_registry.tsx`.

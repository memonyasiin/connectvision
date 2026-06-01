'use client';

import Image from 'next/image';
import { WarmHeading, WarmShell } from './_common';
import { RESTAURANT_GALLERY } from './_sampleContent';

const SECTION_ID = 'sec-gallery';
const THEME_ID = 'hospitality-warm';
const VARIANT_ID = 'grid-4col';

export function GalleryGrid4Col() {
  return (
    <WarmShell id="gallery" sectionId={SECTION_ID} background="cream">
      <div data-theme={THEME_ID} data-section-kind="gallery" data-variant={VARIANT_ID}>
        <WarmHeading
          eyebrow="Visual menu"
          title="From the kitchen"
          subtitle="Photographs taken in our dining room. No styling, no stock."
        />

        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {RESTAURANT_GALLERY.map((shot) => (
            <figure
              key={shot.id}
              className="relative aspect-square overflow-hidden rounded-md bg-amber-50/50 group"
            >
              <Image
                src={shot.src}
                alt={shot.alt}
                fill
                sizes="(min-width: 768px) 25vw, 50vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
                unoptimized
              />
              {/* Subtle warm overlay on hover with caption */}
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-stone-900/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                <span className="text-xs font-medium text-white/90 italic" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                  {shot.alt}
                </span>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </WarmShell>
  );
}

'use client';

import { TagChip, WarmHeading, WarmShell } from './_common';
import {
  MENU_CATEGORIES,
  MENU_ITEMS,
  TAG_LABEL,
  type MenuItem,
} from './_sampleContent';

const SECTION_ID = 'sec-menu';
const THEME_ID = 'hospitality-warm';
const VARIANT_ID = 'list';

function formatPriceInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function MenuRow({ item }: { item: MenuItem }) {
  return (
    <div
      data-product-tag={item.id}
      className="group flex items-baseline justify-between gap-4 py-5 border-b border-dotted border-stone-300 last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-3 flex-wrap mb-1">
          <h4
            className="text-lg font-medium text-stone-900"
            style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
          >
            {item.name}
          </h4>
          <div className="flex flex-wrap gap-1.5">
            {(item.tags ?? []).map((t) => (
              <TagChip key={t} tag={t} label={TAG_LABEL[t]} />
            ))}
          </div>
        </div>
        <p className="text-sm text-stone-600 leading-relaxed">
          {item.description}
        </p>
      </div>

      <div
        className="text-base font-semibold flex-shrink-0 tabular-nums whitespace-nowrap"
        style={{ color: 'var(--primary-color)' }}
      >
        {formatPriceInr(item.priceInr)}
      </div>
    </div>
  );
}

export function MenuList() {
  return (
    <WarmShell id="menu" sectionId={SECTION_ID} background="white">
      <div data-theme={THEME_ID} data-section-kind="menu" data-variant={VARIANT_ID}>
        <WarmHeading
          eyebrow="The menu"
          title="Plates of the season"
          subtitle="A short, seasonal card. Pick and we'll cook."
        />

        <div className="mt-12 max-w-3xl mx-auto space-y-12">
          {MENU_CATEGORIES.map((cat) => {
            const itemsInCat = MENU_ITEMS.filter((i) => i.categoryId === cat.id);
            if (itemsInCat.length === 0) return null;
            return (
              <div key={cat.id}>
                <div className="text-center mb-2">
                  <h3
                    className="text-2xl md:text-3xl font-light text-stone-900 tracking-tight"
                    style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
                  >
                    {cat.label}
                  </h3>
                  {cat.blurb ? (
                    <p className="text-sm italic text-stone-500 mt-1" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
                      {cat.blurb}
                    </p>
                  ) : null}
                  <div className="mt-3 mb-1 h-px w-12 mx-auto" style={{ background: 'var(--primary-color)', opacity: 0.4 }} aria-hidden />
                </div>
                <div>
                  {itemsInCat.map((item) => (
                    <MenuRow key={item.id} item={item} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </WarmShell>
  );
}

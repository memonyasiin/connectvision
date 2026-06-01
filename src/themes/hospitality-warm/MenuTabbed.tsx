'use client';

import { useMemo, useState } from 'react';
import { TagChip, WarmCta, WarmHeading, WarmShell } from './_common';
import {
  MENU_CATEGORIES,
  MENU_ITEMS,
  TAG_LABEL,
  type MenuItem,
} from './_sampleContent';

const SECTION_ID = 'sec-menu';
const THEME_ID = 'hospitality-warm';
const VARIANT_ID = 'tabbed';

function formatPriceInr(amount: number): string {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function ItemCard({ item }: { item: MenuItem }) {
  return (
    <article
      data-product-tag={item.id}
      className="group flex flex-col h-full p-6 rounded-lg border border-amber-200/40 bg-white hover:border-amber-300 hover:shadow-md transition-all"
    >
      <div className="flex items-baseline justify-between gap-4 mb-2">
        <h3
          className="text-xl font-medium text-stone-900 leading-snug"
          style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
        >
          {item.name}
        </h3>
        <span
          className="text-base font-semibold flex-shrink-0 tabular-nums"
          style={{ color: 'var(--primary-color)' }}
        >
          {formatPriceInr(item.priceInr)}
        </span>
      </div>

      <p className="text-sm text-stone-600 leading-relaxed flex-1 mb-4">
        {item.description}
      </p>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {(item.tags ?? []).map((t) => (
            <TagChip key={t} tag={t} label={TAG_LABEL[t]} />
          ))}
        </div>
        <WarmCta
          sectionId={SECTION_ID}
          intent="book-appointment"
          productTag={item.id}
          variant="outline"
          size="sm"
          className="!py-1 !px-3 !text-[11px]"
          label="Order"
        />
      </div>
    </article>
  );
}

export function MenuTabbed() {
  const defaultCategory = MENU_CATEGORIES[0]?.id ?? '';
  const [activeId, setActiveId] = useState(defaultCategory);

  const activeCategory = useMemo(
    () => MENU_CATEGORIES.find((c) => c.id === activeId),
    [activeId],
  );

  const visibleItems = useMemo(
    () => MENU_ITEMS.filter((i) => i.categoryId === activeId),
    [activeId],
  );

  return (
    <WarmShell id="menu" sectionId={SECTION_ID} background="cream">
      <div data-theme={THEME_ID} data-section-kind="menu" data-variant={VARIANT_ID}>
        <WarmHeading
          eyebrow="The menu"
          title="Plates of the season"
          subtitle="A short, seasonal card. Spices ground fresh every morning. We change the menu when the produce changes."
        />

        {/* Tabs */}
        <div className="mt-12 mb-8 overflow-x-auto -mx-5 md:mx-0 px-5 md:px-0">
          <div role="tablist" className="inline-flex gap-1 p-1 rounded-full bg-white border border-amber-200/60 min-w-max">
            {MENU_CATEGORIES.map((cat) => {
              const isActive = cat.id === activeId;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveId(cat.id)}
                  className="px-5 py-2.5 text-sm font-medium rounded-full transition-all whitespace-nowrap"
                  style={
                    isActive
                      ? { background: 'var(--primary-color)', color: 'white' }
                      : { color: '#57534e' }
                  }
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category blurb */}
        {activeCategory?.blurb ? (
          <div className="text-center text-sm italic text-stone-500 mb-8" style={{ fontFamily: '"Cormorant Garamond", serif' }}>
            {activeCategory.blurb}
          </div>
        ) : null}

        {/* Items grid */}
        {visibleItems.length === 0 ? (
          <div className="text-center text-stone-500 py-12 italic">
            Nothing on the menu for this category yet.
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </WarmShell>
  );
}

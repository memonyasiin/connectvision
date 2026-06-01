// ─────────────────────────────────────────────────────────────────────────────
// Section Component Registry (Tier 2)
// ─────────────────────────────────────────────────────────────────────────────
// One declarative matrix mapping  IndustryCategory → SectionKind → Variant[].
// Both the public dispatcher (renders the active variant) and the editor UI
// (lists available variants for the current category) read from here.
//
// Adding a new variant is one entry:
//   - Drop the component file in `src/sections/<category>/<kind>/`
//   - Add a row in REGISTRY below
//
// That's it. No central switch statements, no per-kind dispatchers to update.

import type { ComponentType } from 'react';
import type { IndustryCategory } from '@/contexts/BuildContext';

// ── Variants imported eagerly. They're small client components and we want
//    Turbopack to tree-shake unused ones at the chunk level, not lazy-load
//    every variant swap (which would jank the editor experience).
import { HeroSplit }    from './skincare/hero/HeroSplit';
import { HeroCentered } from './skincare/hero/HeroCentered';
// fitness/hero/HeroBold removed — fitness category now flows through the
// MODULE 1 dispatcher (src/themes/_registry.tsx → fitness-bold).

export type SectionKind = 'hero' | 'services' | 'features' | 'gallery' | 'testimonials' | 'contact' | 'footer';

export interface VariantEntry {
  /** Variant slug used in BusinessData.heroVariant (etc). */
  id: string;
  /** Human-readable label for the editor swap UI. */
  label: string;
  /** Short description shown under the label. */
  description: string;
  /** The actual section component. Receives no props — pulls everything from BuildContext. */
  component: ComponentType;
}

/**
 * Category → Kind → Variants. Categories without entries for a kind fall
 * back to skincare's catalog (handled by the dispatcher).
 */
export const REGISTRY: Record<
  IndustryCategory,
  Partial<Record<SectionKind, readonly VariantEntry[]>>
> = {
  skincare: {
    hero: [
      { id: 'split',    label: 'Split',    description: 'Headline + CTA left, media right. Conversion-tested for service businesses.',  component: HeroSplit    },
      { id: 'centered', label: 'Centered', description: 'Center-aligned bold statement on a soft brand gradient.',                       component: HeroCentered },
    ],
  },
  fitness: {
    // Empty — fitness now routes through the MODULE 1 dispatcher
    // (src/themes/_registry.tsx). Kept as an empty slot so the union type
    // matches and the legacy fallback path stays no-op for this category.
  },
  restaurant: {
    // Placeholder — adding entries here will surface variants in the editor
    // for the restaurant category. Build files under `src/sections/restaurant/<kind>/`.
  },
  corporate: {
    // Placeholder — same as restaurant.
  },
  medical: {
    // Placeholder — components live in the MODULE 1+ registry, not the
    // legacy sections/_registry. Kept as an empty slot so the union type
    // matches; the new `sections/_dispatcher.tsx` already routes the
    // 'medical' category through the new dispatcher when the theme lands.
  },
};

/**
 * Look up a specific variant. Falls back to the first available variant in
 * the category (or skincare's first) if the requested id doesn't exist —
 * ensures category-switch never lands on an empty render.
 */
export function resolveVariant(
  category: IndustryCategory,
  kind: SectionKind,
  variantId: string,
): VariantEntry | null {
  const categoryVariants = REGISTRY[category]?.[kind] ?? [];
  const found = categoryVariants.find((v) => v.id === variantId);
  if (found) return found;
  // Fall back: first in current category, then first in skincare.
  if (categoryVariants[0]) return categoryVariants[0];
  return REGISTRY.skincare[kind]?.[0] ?? null;
}

/** All available variants for a category + kind (drives the editor swap UI). */
export function listVariants(
  category: IndustryCategory,
  kind: SectionKind,
): readonly VariantEntry[] {
  return REGISTRY[category]?.[kind] ?? [];
}

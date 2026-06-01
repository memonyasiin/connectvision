// Hospitality / Restaurants module.
//
// Placeholder shell — falls back to skincare variants until the
// restaurant-specific section files land under
// `src/sections/restaurant/<kind>/`. The structure here is the contract
// against which those files will be plugged in.

import type { CategoryThemeModule } from './types';

export const HOSPITALITY_MODULE: CategoryThemeModule = {
  id: 'restaurant',
  label: 'Hospitality & Restaurants',
  tagline: 'Dynamic active service listings + digital menus. Warm palette, photo-first heroes.',
  defaults: {
    primaryColor: '#b45309', // amber-700 — appetite-stimulating, restaurant industry default
    heroVariant: 'split',
    darkMode: false,
  },
  supportedSections: ['hero', 'services', 'gallery', 'contact', 'footer'],
  variants: {
    // Variants are intentionally empty — they wire in as files land under
    // `src/sections/restaurant/`. The dispatcher falls back to skincare's
    // catalog (per `_registry.ts` resolveVariant) until then so the
    // category is selectable without runtime errors.
  },
};

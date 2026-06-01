// Fitness / Athletics module.
//
// High-contrast, dark-mode default. Saturated red as the recommended
// primary, oversized stencil typography, aggressive CTA copy.

// HeroBold component now lives under the MODULE 1 dispatcher in
// src/themes/fitness-bold/. This Phase-4.1 module is consumed only by the
// Phase-4.1 editor-side category picker; the actual render goes through
// `@/themes/_registry`. Importing from the new location keeps both in sync.
import { HeroBold } from '@/themes/fitness-bold/HeroBold';
import type { CategoryThemeModule } from './types';

export const FITNESS_MODULE: CategoryThemeModule = {
  id: 'fitness',
  label: 'Fitness & Athletics',
  tagline: 'High-contrast dark-mode tokens. Stencil headlines, stat blocks, free-trial CTAs.',
  defaults: {
    primaryColor: '#ef4444',
    heroVariant: 'bold',
    darkMode: true,
  },
  supportedSections: ['hero', 'features', 'testimonials', 'contact', 'footer'],
  variants: {
    hero: [
      {
        id: 'bold',
        label: 'Bold Dark',
        description: 'Near-black background, diagonal accent stripe, oversized stencil headline + 4-stat block.',
        component: HeroBold,
      },
    ],
  },
};

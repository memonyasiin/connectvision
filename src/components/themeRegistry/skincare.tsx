// Skincare / Luxury Wellness module.
//
// Premium-feeling palette, gold accent baked into hero variants, defaults
// to the light "split" layout which converts well for service businesses.

import { HeroSplit }    from '@/sections/skincare/hero/HeroSplit';
import { HeroCentered } from '@/sections/skincare/hero/HeroCentered';
import type { CategoryThemeModule } from './types';

export const SKINCARE_MODULE: CategoryThemeModule = {
  id: 'skincare',
  label: 'Skincare & Luxury Wellness',
  tagline: 'Premium responsive grids. Gold + earth tones. Conversion-tested for spa, salon, and skincare brands.',
  defaults: {
    primaryColor: '#1c4d2a',
    heroVariant: 'split',
    darkMode: false,
  },
  supportedSections: ['hero', 'services', 'gallery', 'testimonials', 'contact', 'footer'],
  variants: {
    hero: [
      {
        id: 'split',
        label: 'Split',
        description: 'Headline + CTA left, media right. The default for service businesses.',
        component: HeroSplit,
      },
      {
        id: 'centered',
        label: 'Centered',
        description: 'Bold center-aligned statement on a soft brand gradient.',
        component: HeroCentered,
      },
    ],
  },
};

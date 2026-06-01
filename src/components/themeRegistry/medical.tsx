// Medical / Professional Consultations module.
//
// Strict transactional time-slot structures (used heavily by the calendar +
// appointment booking flows). Clinical palette — desaturated blues for trust,
// generous whitespace.

import type { CategoryThemeModule } from './types';

export const MEDICAL_MODULE: CategoryThemeModule = {
  id: 'corporate', // maps onto the existing 'corporate' IndustryCategory slot
  label: 'Medical & Professional Consultations',
  tagline: 'Strict appointment time-slot UI. Clinical palette, trust-building copy.',
  defaults: {
    primaryColor: '#0e7490', // cyan-700 — desaturated medical blue
    heroVariant: 'centered',
    darkMode: false,
  },
  supportedSections: ['hero', 'services', 'testimonials', 'contact', 'footer'],
  variants: {
    // Placeholder — will plug in `src/sections/corporate/hero/HeroClinical.tsx`
    // etc. when those files land.
  },
};

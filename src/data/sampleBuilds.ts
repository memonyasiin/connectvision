// ─────────────────────────────────────────────────────────────────────────────
// Sample Builds — pre-filled BusinessData per theme
// ─────────────────────────────────────────────────────────────────────────────
// Every shipped ThemeManifest must have a corresponding SampleBuild here.
// They power:
//   - The "live demo" iframe on each theme's detail page
//   - The `/site/<slug>` route's instant render before a tenant signs up
//   - The editor's "Try with our sample data" button
//   - Marketplace screenshots (taken from these renders, never hand-edited)
//
// Keep the content realistic — Indian business names, INR pricing, valid
// phone formats — so the live demos read as real-world references not
// lorem-ipsum.

import type { SampleBuild } from '@/themes/_types';

export const SAMPLE_BUILDS: readonly SampleBuild[] = [
  // ── Skincare ──────────────────────────────────────────────────────────────
  {
    slug: 'memon-beauty',
    themeId: 'skincare-luxe',
    data: {
      businessName: 'Memon Beauty',
      tagline: 'Skincare, simplified.',
      description:
        'Premium skincare crafted in small batches. Honest formulations, fast results. Visit our Mumbai studio or get on a WhatsApp consult in under five minutes.',
      primaryColor: '#1c4d2a',
      selectedCategory: 'skincare',
      heroVariant: 'split',
      whatsappTarget: '+919702601111',
    },
  },

  // ── Fitness ───────────────────────────────────────────────────────────────
  {
    slug: 'powerhouse-gym',
    themeId: 'fitness-bold',
    data: {
      businessName: 'Powerhouse Gym',
      tagline: 'Forge yourself.',
      description:
        'Heavy iron. Real coaches. No nonsense. Open 24/7 in Bandra West with 12+ trainers, 40+ weekly classes, and a free 7-day trial for new members.',
      primaryColor: '#ef4444',
      selectedCategory: 'fitness',
      heroVariant: 'bold',
      whatsappTarget: '+919702601111',
    },
  },

  // ── Hospitality ───────────────────────────────────────────────────────────
  {
    slug: 'rasoi-by-anand',
    themeId: 'hospitality-warm',
    data: {
      businessName: 'Rasoi by Anand',
      tagline: 'Awadhi kitchen. Open fire. Slow food.',
      description:
        'Mughlai and Awadhi tasting plates by Chef Anand Sharma. Tucked into a 36-seat Bandra dining room. Reserve a table via WhatsApp or scan the QR for the live menu.',
      primaryColor: '#b45309',
      selectedCategory: 'restaurant',
      heroVariant: 'photo',
      whatsappTarget: '+919702601111',
    },
  },

  // ── Medical ───────────────────────────────────────────────────────────────
  {
    slug: 'sunshine-clinic',
    themeId: 'medical-clinical',
    data: {
      businessName: 'Sunshine Clinic',
      tagline: 'General medicine, paediatrics, and dermatology.',
      description:
        'NABH-accredited family clinic in Andheri East. Six consultants across three specialities. Walk-ins welcome 9 am – 9 pm. Online appointment booking + WhatsApp consult.',
      primaryColor: '#0e7490',
      selectedCategory: 'medical',
      heroVariant: 'clinical',
      whatsappTarget: '+919702601111',
    },
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

export function getSampleBuildBySlug(slug: string): SampleBuild | null {
  return SAMPLE_BUILDS.find((b) => b.slug === slug) ?? null;
}

export function getSampleBuildByThemeId(themeId: string): SampleBuild | null {
  return SAMPLE_BUILDS.find((b) => b.themeId === themeId) ?? null;
}

export function listSampleBuilds(): readonly SampleBuild[] {
  return SAMPLE_BUILDS;
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme Manifest Catalog
// ─────────────────────────────────────────────────────────────────────────────
// THIS is the file the Marketplace Tier reads. Adding a theme requires:
//
//   1. New entry below
//   2. Component files under `src/themes/<id>/`
//   3. `registerThemeBlock(...)` calls in those files (or a barrel)
//   4. Preview assets in `public/themes/<id>/`
//   5. Sample data in `src/data/sampleBuilds.ts`
//
// No DB, no fetch — the array is the source of truth. The Envato wrapper
// build ships this file verbatim; the SaaS Tier overlays additional
// per-tenant customisations on top via Prisma without mutating this list.

import type { ThemeManifest, IndustryCategory } from '@/themes/_types';

export const THEME_MANIFESTS: readonly ThemeManifest[] = [
  // ── Skincare ──────────────────────────────────────────────────────────────
  {
    id: 'skincare-luxe',
    name: 'Skincare Luxe',
    category: 'skincare',
    tagline: 'Premium gold-accented theme for skincare, salon, and luxury wellness brands.',
    description:
      'Hero + services + gallery + testimonials + contact. Conversion-tested gold-on-white palette with Playfair Display headings. Floating WhatsApp CTA. Live preview updates as the visitor types in the editor.',
    priceInr: 1999,
    license: 'regular',
    thumbnailUrl: '/themes/skincare-luxe/thumb.png',
    screenshotUrls: [
      '/themes/skincare-luxe/screen-1.png',
      '/themes/skincare-luxe/screen-2.png',
      '/themes/skincare-luxe/screen-3.png',
    ],
    liveDemoSlug: 'memon-beauty',
    tags: ['skincare', 'salon', 'spa', 'beauty', 'luxury', 'gold', 'whatsapp-cta'],
    defaultPalette: {
      primary: '#1c4d2a', accent: '#D4AF37',
      background: '#fbfaf7', foreground: '#1a1a1a',
      muted: '#4a5560', surface: '#f3eee0',
    },
    defaultTypography: { headingFont: 'Playfair Display', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400 },
    defaultVariants: {
      hero: 'split', services: 'grid-3col', gallery: 'masonry',
      testimonials: 'carousel', contact: 'split-map', footer: 'minimal',
    },
    supportedSections: ['hero', 'services', 'gallery', 'testimonials', 'contact', 'footer'],
    variants: {
      hero: [
        { id: 'split',    label: 'Split',    description: 'Headline + CTA left, media right. Conversion-tested for service businesses.' },
        { id: 'centered', label: 'Centered', description: 'Center-aligned bold statement on a soft brand gradient.' },
      ],
      services: [
        { id: 'grid-3col', label: 'Grid (3 cols)', description: 'Three-column card layout.' },
        { id: 'list-icons', label: 'Icon list',     description: 'Vertical list with leading icons.' },
      ],
      gallery: [
        { id: 'masonry',  label: 'Masonry',  description: 'Pinterest-style mixed-height grid.' },
        { id: 'carousel', label: 'Carousel', description: 'Single-row horizontal scroll.' },
      ],
      testimonials: [
        { id: 'carousel', label: 'Carousel', description: 'Quote-card carousel with author photo.' },
        { id: 'grid',     label: 'Grid',     description: 'Static three-column grid of reviews.' },
      ],
      contact: [
        { id: 'split-map', label: 'Split + map', description: 'Form left, embedded map right.' },
        { id: 'minimal',   label: 'Minimal',     description: 'Centered phone + WhatsApp + email block.' },
      ],
      footer: [
        { id: 'minimal', label: 'Minimal', description: 'Single-row links + WhatsApp.' },
        { id: 'wide',    label: 'Wide',    description: 'Four-column footer with newsletter signup.' },
      ],
    },
    author: { name: 'Pataa International', profileUrl: 'https://pataainternational.com' },
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-05-30T00:00:00.000Z',
    schemaVersion: 1,
  },

  // ── Fitness ───────────────────────────────────────────────────────────────
  {
    id: 'fitness-bold',
    name: 'Fitness Bold',
    category: 'fitness',
    tagline: 'High-contrast dark-mode theme for gyms, CrossFit boxes, and sports academies.',
    description:
      'Near-black background with diagonal accent stripe, four-tile stat block, oversized stencil headlines, and a "Claim Free Trial" CTA designed to convert at first scroll. Includes weekly class schedule + social-heavy footer.',
    priceInr: 2299,
    license: 'regular',
    thumbnailUrl: '/themes/fitness-bold/thumb.png',
    screenshotUrls: [
      '/themes/fitness-bold/screen-1.png',
      '/themes/fitness-bold/screen-2.png',
    ],
    liveDemoSlug: 'powerhouse-gym',
    tags: ['gym', 'fitness', 'crossfit', 'sports', 'dark', 'bold', 'stencil'],
    defaultPalette: {
      primary: '#ef4444', accent: '#fbbf24',
      background: '#0a0a0a', foreground: '#f5f5f5',
      muted: '#737373', surface: '#1f1f1f',
    },
    defaultTypography: { headingFont: 'Oswald', bodyFont: 'Inter', headingWeight: 800, bodyWeight: 400 },
    defaultVariants: {
      hero: 'bold', features: 'stat-block', schedule: 'week-grid',
      testimonials: 'card-stack', contact: 'minimal', footer: 'social-heavy',
    },
    supportedSections: ['hero', 'features', 'schedule', 'testimonials', 'contact', 'footer'],
    variants: {
      hero: [
        { id: 'bold', label: 'Bold Dark', description: 'Stencil + stat block + diagonal stripe. High-contrast first-scroll converter.' },
      ],
      features: [
        { id: 'stat-block', label: 'Stat block', description: 'Four KPI tiles with monospace numerals.' },
      ],
      schedule: [
        { id: 'week-grid', label: 'Week grid', description: 'Mon-Sun × time-slot class schedule.' },
      ],
      testimonials: [
        { id: 'card-stack', label: 'Card stack', description: 'Quote cards in offset stack — high visual energy.' },
      ],
      contact: [
        { id: 'minimal', label: 'Minimal', description: 'WhatsApp + phone CTA only.' },
      ],
      footer: [
        { id: 'social-heavy', label: 'Social heavy', description: 'Instagram-first footer with reel embeds.' },
      ],
    },
    author: { name: 'Pataa International', profileUrl: 'https://pataainternational.com' },
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-05-30T00:00:00.000Z',
    schemaVersion: 1,
  },

  // ── Hospitality ───────────────────────────────────────────────────────────
  {
    id: 'hospitality-warm',
    name: 'Hospitality Warm',
    category: 'restaurant',
    tagline: 'Photo-first theme for restaurants, cafés, and cloud kitchens.',
    description:
      'Warm amber palette with Cormorant Garamond serif headings. Full-bleed hero photo, tabbed digital menu, reservation form, and TripAdvisor-style review block.',
    priceInr: 1899,
    license: 'regular',
    thumbnailUrl: '/themes/hospitality-warm/thumb.png',
    screenshotUrls: [
      '/themes/hospitality-warm/screen-1.png',
      '/themes/hospitality-warm/screen-2.png',
    ],
    liveDemoSlug: 'rasoi-by-anand',
    tags: ['restaurant', 'cafe', 'menu', 'reservation', 'warm', 'serif', 'photo'],
    defaultPalette: {
      primary: '#b45309', accent: '#dc2626',
      background: '#fefcf7', foreground: '#1c1917',
      muted: '#78716c', surface: '#fef3c7',
    },
    defaultTypography: { headingFont: 'Cormorant Garamond', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400 },
    defaultVariants: {
      hero: 'photo', menu: 'tabbed', gallery: 'grid-4col',
      contact: 'split-map', footer: 'minimal',
    },
    supportedSections: ['hero', 'menu', 'gallery', 'contact', 'footer'],
    variants: {
      hero: [
        { id: 'photo', label: 'Photo background', description: 'Full-bleed hero photo with overlaid CTA.' },
      ],
      menu: [
        { id: 'tabbed', label: 'Tabbed',  description: 'Categories as tabs, items as cards with prices.' },
        { id: 'list',   label: 'List',    description: 'Single-column scrollable list — fastest load.' },
      ],
      gallery: [
        { id: 'grid-4col', label: 'Grid (4 cols)', description: 'Even four-column photo grid.' },
      ],
      contact: [
        { id: 'split-map', label: 'Split + map', description: 'Reservation form left, map right.' },
      ],
      footer: [
        { id: 'minimal', label: 'Minimal', description: 'Hours + address + WhatsApp.' },
      ],
    },
    author: { name: 'Pataa International', profileUrl: 'https://pataainternational.com' },
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-05-30T00:00:00.000Z',
    schemaVersion: 1,
  },

  // ── Medical ───────────────────────────────────────────────────────────────
  {
    id: 'medical-clinical',
    name: 'Medical Clinical',
    category: 'medical',
    tagline: 'Trust-first theme for clinics, doctors, dentists, and professional consultants.',
    description:
      'Desaturated cyan palette with generous whitespace. Appointment slot grid, doctor roster cards, insurance panel, and BMI calculator widget. Built around strict transactional time-slot UX.',
    priceInr: 2499,
    license: 'regular',
    thumbnailUrl: '/themes/medical-clinical/thumb.png',
    screenshotUrls: [
      '/themes/medical-clinical/screen-1.png',
      '/themes/medical-clinical/screen-2.png',
    ],
    liveDemoSlug: 'sunshine-clinic',
    tags: ['clinic', 'doctor', 'medical', 'appointment', 'professional', 'trust', 'cyan'],
    defaultPalette: {
      primary: '#0e7490', accent: '#0891b2',
      background: '#ffffff', foreground: '#0f172a',
      muted: '#64748b', surface: '#f1f5f9',
    },
    defaultTypography: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400 },
    defaultVariants: {
      hero: 'clinical', services: 'grid-3col', schedule: 'slot-grid',
      roster: 'doctor-cards', contact: 'split-map', footer: 'minimal',
    },
    supportedSections: ['hero', 'services', 'schedule', 'roster', 'contact', 'footer'],
    variants: {
      hero: [
        { id: 'clinical', label: 'Clinical', description: 'Hero with appointment booking CTA + trust signals (years, NABH, registrations).' },
      ],
      services: [
        { id: 'grid-3col', label: 'Grid (3 cols)', description: 'Treatment categories as cards.' },
      ],
      schedule: [
        { id: 'slot-grid', label: 'Slot grid', description: '30-min slot grid across the week.' },
      ],
      roster: [
        { id: 'doctor-cards', label: 'Doctor cards', description: 'Per-doctor card with qualifications + availability.' },
      ],
      contact: [
        { id: 'split-map', label: 'Split + map', description: 'Address + map + emergency phone.' },
      ],
      footer: [
        { id: 'minimal', label: 'Minimal', description: 'Compliance disclaimers + working hours.' },
      ],
    },
    author: { name: 'Pataa International', profileUrl: 'https://pataainternational.com' },
    createdAt: '2026-05-30T00:00:00.000Z',
    updatedAt: '2026-05-30T00:00:00.000Z',
    schemaVersion: 1,
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

export function getThemeById(id: string): ThemeManifest | null {
  return THEME_MANIFESTS.find((t) => t.id === id) ?? null;
}

export function listThemes(): readonly ThemeManifest[] {
  return THEME_MANIFESTS;
}

export function listThemesByCategory(category: IndustryCategory): readonly ThemeManifest[] {
  return THEME_MANIFESTS.filter((t) => t.category === category);
}

/**
 * Convenience: the theme that owns a given liveDemoSlug. Used by the
 * /site/[subdomain] route to coerce a tenant subdomain into a manifest.
 */
export function getThemeByDemoSlug(slug: string): ThemeManifest | null {
  return THEME_MANIFESTS.find((t) => t.liveDemoSlug === slug) ?? null;
}

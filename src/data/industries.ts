// ─────────────────────────────────────────────────────────────────────────────
// Industries — vertical metadata
// ─────────────────────────────────────────────────────────────────────────────
// One row per IndustryCategory. Drives:
//   - Marketplace filter pills (icon + label)
//   - Editor's "switch industry" picker
//   - AI-suggest defaults (palette, typography, dark-mode preference)
//   - Onboarding subcategory drop-down
//
// Pure static data — no React, no DB. Safe to import in API routes and
// edge functions.

import type {
  IndustryCategory,
  ThemePalette,
  ThemeTypography,
} from '@/themes/_types';

export interface IndustryMeta {
  id: IndustryCategory;
  label: string;
  tagline: string;
  /** Sub-categories for marketplace filtering + onboarding wizard. */
  subcategories: readonly string[];
  /** Recommended palette for the vertical — drives BuildContext defaults. */
  recommendedPalette: ThemePalette;
  /** Recommended typography pairing. */
  recommendedTypography: ThemeTypography;
  /** Whether the typical render is dark-mode-first. */
  darkModeDefault: boolean;
  /** lucide-react icon name for the catalogue filter pill. */
  iconName: string;
}

export const INDUSTRIES: readonly IndustryMeta[] = [
  {
    id: 'skincare',
    label: 'Skincare & Wellness',
    tagline: 'Spa, salon, dermatology, ayurveda, skincare brands.',
    subcategories: ['skincare', 'haircare', 'spa', 'massage', 'ayurveda', 'nail-studio'],
    recommendedPalette: {
      primary:    '#1c4d2a',
      accent:     '#D4AF37',
      background: '#fbfaf7',
      foreground: '#1a1a1a',
      muted:      '#4a5560',
      surface:    '#f3eee0',
    },
    recommendedTypography: { headingFont: 'Playfair Display', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400 },
    darkModeDefault: false,
    iconName: 'sparkles',
  },
  {
    id: 'fitness',
    label: 'Fitness & Athletics',
    tagline: 'Gyms, CrossFit boxes, yoga studios, sports academies.',
    subcategories: ['gym', 'crossfit', 'yoga', 'martial-arts', 'sports', 'personal-training'],
    recommendedPalette: {
      primary:    '#ef4444',
      accent:     '#fbbf24',
      background: '#0a0a0a',
      foreground: '#f5f5f5',
      muted:      '#737373',
      surface:    '#1f1f1f',
    },
    recommendedTypography: { headingFont: 'Oswald', bodyFont: 'Inter', headingWeight: 800, bodyWeight: 400 },
    darkModeDefault: true,
    iconName: 'dumbbell',
  },
  {
    id: 'restaurant',
    label: 'Restaurants & Hospitality',
    tagline: 'Restaurants, cafés, cloud kitchens, catering, bars.',
    subcategories: ['restaurant', 'cafe', 'cloud-kitchen', 'catering', 'bar', 'bakery'],
    recommendedPalette: {
      primary:    '#b45309',
      accent:     '#dc2626',
      background: '#fefcf7',
      foreground: '#1c1917',
      muted:      '#78716c',
      surface:    '#fef3c7',
    },
    recommendedTypography: { headingFont: 'Cormorant Garamond', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400 },
    darkModeDefault: false,
    iconName: 'utensils',
  },
  {
    id: 'medical',
    label: 'Medical & Professional Consultations',
    tagline: 'Clinics, doctors, dentists, lawyers, CAs, consultants.',
    subcategories: ['clinic', 'doctor', 'dentist', 'lawyer', 'ca', 'consultant', 'physiotherapist'],
    recommendedPalette: {
      primary:    '#0e7490',
      accent:     '#0891b2',
      background: '#ffffff',
      foreground: '#0f172a',
      muted:      '#64748b',
      surface:    '#f1f5f9',
    },
    recommendedTypography: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 600, bodyWeight: 400 },
    darkModeDefault: false,
    iconName: 'stethoscope',
  },
  {
    id: 'corporate',
    label: 'Corporate & B2B',
    tagline: 'Agencies, SaaS landing, consultancies, B2B services.',
    subcategories: ['agency', 'saas', 'consulting', 'b2b', 'enterprise', 'real-estate'],
    recommendedPalette: {
      primary:    '#3b82f6',
      accent:     '#8b5cf6',
      background: '#ffffff',
      foreground: '#0f172a',
      muted:      '#64748b',
      surface:    '#f8fafc',
    },
    recommendedTypography: { headingFont: 'Inter', bodyFont: 'Inter', headingWeight: 700, bodyWeight: 400 },
    darkModeDefault: false,
    iconName: 'briefcase',
  },
];

// ── Lookups ──────────────────────────────────────────────────────────────────

export function getIndustry(id: IndustryCategory): IndustryMeta | null {
  return INDUSTRIES.find((i) => i.id === id) ?? null;
}

export function listIndustries(): readonly IndustryMeta[] {
  return INDUSTRIES;
}

export function findIndustryBySubcategory(sub: string): IndustryMeta | null {
  return INDUSTRIES.find((i) => i.subcategories.includes(sub)) ?? null;
}

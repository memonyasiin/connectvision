// ═════════════════════════════════════════════════════════════════════════════
// ConnectVision OS — High-Five Multi-Category Theme Registry (MODULE 1)
// ─────────────────────────────────────────────────────────────────────────────
// Canonical metadata source for the five sovereign industry verticals the
// platform ships as ThemeForest-distributable marketplace templates.
//
// DECOUPLING NOTE
//   This registry is intentionally INDEPENDENT of `src/contexts/BuildContext`
//   and the legacy `src/components/themeRegistry/index.ts` dispatcher. Those
//   carry a Phase-1-era `IndustryCategory` union with naming drift
//   (skincare/fitness/restaurant/corporate/medical — five keys but only four
//   distinct theme modules). The High-Five registry is the new authoritative
//   shape and the admin matrix UI + marketplace surfaces read from here.
//
// HOW NEW CATEGORIES ARE ADDED
//   1. Add a value to `ThemeCategoryId`
//   2. Append a fully-shaped entry to `THEME_CATEGORIES`
//   3. Create `src/themes/<slug>/` with at least an `index.ts` barrel
//   4. (Optional) wire to the legacy dispatcher if backwards compat needed
//
// EMBEDDING IN OTHER SURFACES
//   - `app/admin/matrix/page.tsx`  reads `THEME_CATEGORIES` for the
//                                   category-distribution chart.
//   - `app/marketplace/themes/`    will read this for the category-picker
//                                   grid once MODULE 2 hooks it in.
//
// COLOR PALETTE PROVENANCE
//   Each `primaryColor` is the matching theme's signature accent —
//   pulled from `src/themes/<slug>/_common.tsx` so the marketplace
//   preview chip matches the rendered hero.
// ═════════════════════════════════════════════════════════════════════════════

export type ThemeCategoryId =
  | 'skincare-luxe'
  | 'fitness-bold'
  | 'hospitality-warm'
  | 'medical-clinical'
  | 'retail-modern';

export interface ThemeCategoryMeta {
  /** Stable slug — matches the directory under `src/themes/`. */
  id: ThemeCategoryId;
  /** Human-readable label for the marketplace + admin chooser. */
  label: string;
  /** One-line vertical pitch. Shown beneath the label in cards. */
  tagline: string;
  /** Signature accent color — drives the marketplace preview chip. */
  primaryColor: `#${string}`;
  /** Light/dark surface default the theme renders against. */
  surface: 'light' | 'dark' | 'warm-cream' | 'cool-white';
  /** Single-glyph identifier used in compact UIs (no SVG imports needed). */
  glyph: string;
  /** Target audience hint for the matrix dashboard's "fit" badge. */
  bestFor: readonly string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// THE FIVE
// ─────────────────────────────────────────────────────────────────────────────

export const THEME_CATEGORIES: readonly ThemeCategoryMeta[] = [
  {
    id: 'skincare-luxe',
    label: 'Skincare Luxe',
    tagline: 'Premium cosmetics, dermatology, and serum boutiques',
    primaryColor: '#1c4d2a',
    surface: 'cool-white',
    glyph: '✦',
    bestFor: ['skincare brands', 'cosmetic clinics', 'serum boutiques'],
  },
  {
    id: 'fitness-bold',
    label: 'Fitness Bold',
    tagline: 'High-intensity gyms, CrossFit boxes, athletic studios',
    primaryColor: '#dc2626',
    surface: 'dark',
    glyph: '◢',
    bestFor: ['gyms', 'CrossFit boxes', 'athletic studios'],
  },
  {
    id: 'hospitality-warm',
    label: 'Hospitality Warm',
    tagline: 'Restaurants, cafes, boutique hotels — warm tones, serif type',
    primaryColor: '#b45309',
    surface: 'warm-cream',
    glyph: '❦',
    bestFor: ['restaurants', 'cafes', 'boutique hotels'],
  },
  {
    id: 'medical-clinical',
    label: 'Medical Clinical',
    tagline: 'Clinics, multi-specialty hospitals, diagnostic labs',
    primaryColor: '#0e7490',
    surface: 'cool-white',
    glyph: '✚',
    bestFor: ['clinics', 'hospitals', 'diagnostic labs'],
  },
  {
    id: 'retail-modern',
    label: 'Retail Modern',
    tagline: 'Boutiques, electronics, jewellery — modern minimalism',
    primaryColor: '#4338ca',
    surface: 'light',
    glyph: '◇',
    bestFor: ['boutiques', 'electronics retailers', 'jewellery stores'],
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Lookups — small pure helpers consumed by both the marketplace and admin UIs
// ─────────────────────────────────────────────────────────────────────────────

/** Map keyed by `id` for O(1) lookup. Frozen — do not mutate at runtime. */
export const THEME_CATEGORY_BY_ID: Readonly<Record<ThemeCategoryId, ThemeCategoryMeta>> =
  Object.freeze(
    THEME_CATEGORIES.reduce<Record<ThemeCategoryId, ThemeCategoryMeta>>((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {} as Record<ThemeCategoryId, ThemeCategoryMeta>),
  );

/** Type guard — narrows an arbitrary string to a known category id. */
export function isThemeCategoryId(input: string): input is ThemeCategoryId {
  return input in THEME_CATEGORY_BY_ID;
}

/** Defensive resolver — returns the matching meta or the default category. */
export function resolveThemeCategory(input: string | null | undefined): ThemeCategoryMeta {
  if (input && isThemeCategoryId(input)) return THEME_CATEGORY_BY_ID[input];
  // Default → skincare-luxe (first in array; matches platform's flagship vertical).
  const fallback = THEME_CATEGORIES[0];
  if (!fallback) {
    // Unreachable — THEME_CATEGORIES is a readonly const tuple — but TS
    // narrowing on `.at`/`[0]` returns `T | undefined`. Throwing keeps the
    // contract simple for callers.
    throw new Error('THEME_CATEGORIES is empty — registry corrupted.');
  }
  return fallback;
}

/** Total count — kept as a derived export so consumers can render "X themes". */
export const THEME_CATEGORY_COUNT: number = THEME_CATEGORIES.length;

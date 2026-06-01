// ═════════════════════════════════════════════════════════════════════════════
// ConnectVision OS — Public Marketplace Catalog Manifest (MODULE 6)
// ─────────────────────────────────────────────────────────────────────────────
// Curated launch lineup per ConnectVision-Marketplace-Plan.doc §4:
// "Pick 3 industries to launch with: Beauty/Salon, Restaurant, Services" —
// extended here to all 5 High-Five categories so every vertical has one
// flagship marketplace SKU at launch.
//
// PRICING — per doc §4: ₹999–₹4999 one-time. Three bands:
//   Tier-1 (one-page) — ₹999–₹1999
//   Tier-2 (multi-page) — ₹2499–₹2999
//   Tier-3 (booking + admin shell) — ₹3499+
//
// EVERY THEME LINKS TO
//   - A `categoryId` from THEME_CATEGORIES (drives badge color + glyph)
//   - A `previewPath` that points to the existing
//     /marketplace/themes/[themeId]/preview route (already shipped in
//     MODULE 1) so the detail page can iframe it without new infra.
//
// EXTENSIBILITY
//   New themes drop in as additional MARKETPLACE_THEMES entries — no other
//   file changes required for the catalog grid + detail page to render
//   them. The /customize/[slug] flow (future MODULE) reads from the same
//   manifest.
// ═════════════════════════════════════════════════════════════════════════════

import type { ThemeCategoryId } from '@/themes/_categories';

export interface MarketplaceTheme {
  /** Stable slug — used in URLs: /themes/<slug> and /customize/<slug>. */
  slug: string;
  /** Display name shown in the catalog card + detail hero. */
  name: string;
  /** Short tagline rendered under the name in cards. */
  tagline: string;
  /** Long-form description on the detail page (3–5 sentences). */
  description: string;
  /** Maps to the High-Five registry — drives badge color + glyph. */
  categoryId: ThemeCategoryId;
  /** One-time price in INR (whole rupees, ₹999–₹4999 range per plan §4). */
  priceInr: number;
  /** Optional MRP shown struck-through next to priceInr. */
  mrpInr?: number;
  /** Hero preview image URL — typically an Unsplash editorial shot. */
  previewImageSrc: string;
  /** Alt text for the preview image (a11y + lighthouse). */
  previewImageAlt: string;
  /** Path to the existing /marketplace/themes/[themeId]/preview route. */
  previewPath: string;
  /** What this theme includes (3–6 short bullet points for the detail page). */
  features: readonly string[];
  /** Optional "best for" line in the card sidebar — one short clause. */
  bestFor: string;
  /** Marks the SKU as the launch flagship (gets the gold "FEATURED" pill). */
  featured?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 launch themes — one per High-Five vertical
// ─────────────────────────────────────────────────────────────────────────────

export const MARKETPLACE_THEMES: readonly MarketplaceTheme[] = [
  // ── Skincare-Luxe ──────────────────────────────────────────────────────
  {
    slug: 'memon-beauty',
    name: 'Memon Beauty',
    tagline: 'Editorial luxury for skincare and cosmetics brands',
    description:
      'A premium skincare-brand template with split-hero typography, a curated services grid, and a testimonial carousel calibrated for trust signals. Customisable accent palette + brand mark in one click.',
    categoryId: 'skincare-luxe',
    priceInr: 2499,
    mrpInr: 3999,
    previewImageSrc:
      'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=1600&q=80',
    previewImageAlt:
      'Soft botanicals and ceramic skincare bottles on a marble surface.',
    previewPath: '/marketplace/themes/memon-beauty/preview',
    features: [
      'Editorial split hero with the brand mark + serif headline',
      '6-tile services grid with hover lift + per-tile WhatsApp deep-link',
      'Testimonial carousel with avatar + verified-purchase chip',
      'Booking calendar embed (works with MODULE 3 slot system)',
      'Wide footer with newsletter capture + Instagram strip',
    ],
    bestFor: 'Skincare brands, cosmetic clinics, serum boutiques',
    featured: true,
  },

  // ── Fitness-Bold ───────────────────────────────────────────────────────
  {
    slug: 'powerhouse-fit',
    name: 'Powerhouse Fit',
    tagline: 'High-impact dark theme for gyms and athletic studios',
    description:
      'Aggressive typography, dark canvas, red-accent CTAs — the no-nonsense aesthetic gyms and CrossFit boxes need. Schedule grid + trainer roster + stat-block features come pre-wired.',
    categoryId: 'fitness-bold',
    priceInr: 1999,
    mrpInr: 2999,
    previewImageSrc:
      'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80',
    previewImageAlt: 'Dark gym interior with heavy weights and harsh lighting.',
    previewPath: '/marketplace/themes/powerhouse-fit/preview',
    features: [
      'Bold hero with full-bleed dark photo + uppercase weight numbers',
      'Weekly schedule grid (Mon–Sun classes per time-slot)',
      'Trainer cards with credentials + Instagram links',
      'Membership tier comparison table',
      'Social-heavy footer with Strava + Instagram embeds',
    ],
    bestFor: 'Gyms, CrossFit boxes, athletic studios',
  },

  // ── Hospitality-Warm ───────────────────────────────────────────────────
  {
    slug: 'rasoi-warmth',
    name: 'Rasoi Warmth',
    tagline: 'Warm-cream restaurant template with serif headlines',
    description:
      'Cream canvas with amber accents and Cormorant Garamond headings — the template restaurants and cafes consistently buy from us. Includes a tabbed menu with dietary chips and a table-reservation form.',
    categoryId: 'hospitality-warm',
    priceInr: 2999,
    mrpInr: 3999,
    previewImageSrc:
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80',
    previewImageAlt:
      'Warm restaurant interior with soft pendant lights over wooden tables.',
    previewPath: '/marketplace/themes/rasoi-warmth/preview',
    features: [
      'Photo hero with reservation CTA + opening-hours strip',
      'Tabbed menu (Starters / Mains / Desserts / Drinks) with dietary chips',
      'Gallery grid: 4-col photo wall with lightbox',
      'Split-map contact section with directions',
      'Minimal footer with social + WhatsApp reservation link',
    ],
    bestFor: 'Restaurants, cafes, boutique hotels',
  },

  // ── Medical-Clinical ──────────────────────────────────────────────────
  {
    slug: 'sunshine-clinic',
    name: 'Sunshine Clinic',
    tagline: 'Trust-first clinical template for healthcare practices',
    description:
      'Calm cyan accents, generous whitespace, and a doctor-roster section that lists credentials prominently. Designed to clear the "I trust this clinic" bar in the first 5 seconds.',
    categoryId: 'medical-clinical',
    priceInr: 3499,
    mrpInr: 4999,
    previewImageSrc:
      'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1600&q=80',
    previewImageAlt:
      'Modern clinical reception with soft natural light and minimal decor.',
    previewPath: '/marketplace/themes/sunshine-clinic/preview',
    features: [
      'Clinical hero with calming photo + emergency contact chip',
      'Doctor roster cards with MBBS / MD credentials + speciality tags',
      'Slot-grid booking with insurance carrier badges',
      'Services grid (consultation / diagnostics / day-care)',
      'Split-map contact with NABH / NABL trust badges',
    ],
    bestFor: 'Clinics, multi-specialty hospitals, diagnostic labs',
  },

  // ── Retail-Modern (the new 5th from MODULE 1) ─────────────────────────
  {
    slug: 'atelier-indigo',
    name: 'Atelier Indigo',
    tagline: 'Modern boutique template — indigo accents on warm off-white',
    description:
      'Minimalist editorial layout for boutiques, electronics, and jewellery stores. The flagship for the High-Five retail vertical — premium without being austere.',
    categoryId: 'retail-modern',
    priceInr: 1999,
    mrpInr: 2999,
    previewImageSrc:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80',
    previewImageAlt:
      'A curated retail boutique display with neatly folded apparel.',
    previewPath: '/marketplace/themes/atelier-indigo/preview',
    features: [
      'Editorial split hero with primary product photo',
      'Generous whitespace + rounded-2xl cards (no heavy shadows)',
      'Optional shoppable Instagram grid',
      'Footer with newsletter + 3-column link tree',
      'Indigo accent palette swappable to any tenant brand color',
    ],
    bestFor: 'Boutiques, electronics retailers, jewellery stores',
  },
] as const;

// ─────────────────────────────────────────────────────────────────────────────
// Lookups
// ─────────────────────────────────────────────────────────────────────────────

export const MARKETPLACE_THEME_BY_SLUG: Readonly<Record<string, MarketplaceTheme>> =
  Object.freeze(
    MARKETPLACE_THEMES.reduce<Record<string, MarketplaceTheme>>((acc, t) => {
      acc[t.slug] = t;
      return acc;
    }, {}),
  );

export function findThemeBySlug(slug: string): MarketplaceTheme | undefined {
  return MARKETPLACE_THEME_BY_SLUG[slug];
}

/** Themes in the same category, excluding the given slug. Used by the
 *  detail page's "Related themes" rail. */
export function relatedThemes(
  categoryId: ThemeCategoryId,
  excludeSlug: string,
  limit = 3,
): readonly MarketplaceTheme[] {
  return MARKETPLACE_THEMES.filter(
    (t) => t.categoryId === categoryId && t.slug !== excludeSlug,
  ).slice(0, limit);
}

/** All distinct categoryIds represented in the catalog. Used by the
 *  catalog page's filter chip strip. */
export function listCatalogCategoryIds(): readonly ThemeCategoryId[] {
  const seen = new Set<ThemeCategoryId>();
  const out: ThemeCategoryId[] = [];
  for (const t of MARKETPLACE_THEMES) {
    if (!seen.has(t.categoryId)) {
      seen.add(t.categoryId);
      out.push(t.categoryId);
    }
  }
  return out;
}

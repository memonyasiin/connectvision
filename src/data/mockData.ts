// ─────────────────────────────────────────────────────────────────────────────
// mockData — Unified Marketplace static-memory aggregator
// ─────────────────────────────────────────────────────────────────────────────
// THE file the Marketplace Tier reads. Re-exports the three primary data
// sources (industries, theme manifests, sample builds) + provides the
// search / filter / sort helpers the catalogue page needs.
//
// Mandate compliance:
//   - Zero server-only imports (no Prisma, no node:* modules)
//   - Zero React imports
//   - Zero fetch calls — everything resolves synchronously from the bundled
//     constant arrays
//
// This makes the file safe to:
//   - Ship inside the Envato wrapper (no backend dependencies, no review flag)
//   - Import from edge functions, server components, and client components
//   - Cache at the CDN with a year-long TTL

export { INDUSTRIES, getIndustry, listIndustries, findIndustryBySubcategory } from './industries';
export type { IndustryMeta } from './industries';

export {
  THEME_MANIFESTS,
  getThemeById,
  listThemes,
  listThemesByCategory,
  getThemeByDemoSlug,
} from './themeManifest';

export {
  SAMPLE_BUILDS,
  getSampleBuildBySlug,
  getSampleBuildByThemeId,
  listSampleBuilds,
} from './sampleBuilds';

import { THEME_MANIFESTS } from './themeManifest';
import { INDUSTRIES } from './industries';
import type { ThemeManifest, IndustryCategory } from '@/themes/_types';

// ── Marketplace catalogue queries ────────────────────────────────────────────

export interface ThemeSearchFilters {
  category?: IndustryCategory;
  /** Inclusive INR price bounds. */
  minPriceInr?: number;
  maxPriceInr?: number;
  /** Match any of the supplied tags (OR). */
  tagsAny?: readonly string[];
  /** Match all of the supplied tags (AND). */
  tagsAll?: readonly string[];
}

export type ThemeSortKey =
  | 'newest'
  | 'oldest'
  | 'price-asc'
  | 'price-desc'
  | 'name-asc';

/**
 * Filter + sort the catalogue. Free-text query matches against name,
 * tagline, and tags. Empty query is allowed — useful for category browsing.
 *
 * Pure — same input always returns the same output. Safe to memoize on the
 * caller side with React.useMemo or server-side.
 */
export function searchThemes(
  query: string = '',
  filters: ThemeSearchFilters = {},
  sort: ThemeSortKey = 'newest',
): readonly ThemeManifest[] {
  const q = query.trim().toLowerCase();
  let results = THEME_MANIFESTS.filter((t) => {
    if (filters.category && t.category !== filters.category) return false;
    if (typeof filters.minPriceInr === 'number' && t.priceInr < filters.minPriceInr) return false;
    if (typeof filters.maxPriceInr === 'number' && t.priceInr > filters.maxPriceInr) return false;
    if (filters.tagsAny && filters.tagsAny.length > 0) {
      if (!filters.tagsAny.some((tag) => t.tags.includes(tag))) return false;
    }
    if (filters.tagsAll && filters.tagsAll.length > 0) {
      if (!filters.tagsAll.every((tag) => t.tags.includes(tag))) return false;
    }
    if (q) {
      const haystack = `${t.name} ${t.tagline} ${t.tags.join(' ')}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });

  results = [...results].sort((a, b) => {
    switch (sort) {
      case 'newest':     return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      case 'oldest':     return Date.parse(a.createdAt) - Date.parse(b.createdAt);
      case 'price-asc':  return a.priceInr - b.priceInr;
      case 'price-desc': return b.priceInr - a.priceInr;
      case 'name-asc':   return a.name.localeCompare(b.name);
    }
  });

  return results;
}

/** Editorial "featured" picks — currently the newest theme per category. */
export function getFeaturedThemes(): readonly ThemeManifest[] {
  const byCategory = new Map<IndustryCategory, ThemeManifest>();
  for (const t of THEME_MANIFESTS) {
    const existing = byCategory.get(t.category);
    if (!existing || Date.parse(t.createdAt) > Date.parse(existing.createdAt)) {
      byCategory.set(t.category, t);
    }
  }
  // Preserve INDUSTRIES declaration order for stable rendering.
  return INDUSTRIES
    .map((i) => byCategory.get(i.id))
    .filter((t): t is ThemeManifest => Boolean(t));
}

/** Cheapest theme — useful for "starting from ₹X" copy on the landing. */
export function getCheapestThemePriceInr(): number {
  if (THEME_MANIFESTS.length === 0) return 0;
  return THEME_MANIFESTS.reduce(
    (min, t) => (t.priceInr < min ? t.priceInr : min),
    Number.POSITIVE_INFINITY,
  );
}

/** Unique tag universe — drives the filter sidebar's tag cloud. */
export function listAllTags(): readonly string[] {
  const seen = new Set<string>();
  for (const t of THEME_MANIFESTS) {
    for (const tag of t.tags) seen.add(tag);
  }
  return Array.from(seen).sort();
}

/** Counts per category — drives the catalogue's category-filter chips. */
export function countThemesByCategory(): Record<IndustryCategory, number> {
  const counts: Record<IndustryCategory, number> = {
    skincare: 0, fitness: 0, restaurant: 0, corporate: 0, medical: 0,
  };
  for (const t of THEME_MANIFESTS) counts[t.category]++;
  return counts;
}

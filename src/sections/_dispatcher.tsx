'use client';

// ─────────────────────────────────────────────────────────────────────────────
// SectionRenderer — generic dispatcher.
// ─────────────────────────────────────────────────────────────────────────────
// Reads (selectedCategory, heroVariant, …) from BuildContext, resolves the
// matching component, and renders it. The component itself pulls all its
// data from BuildContext, so the dispatcher passes no props.
//
// Resolution order (post MODULE 2):
//   1. NEW MODULE 1 dispatcher — `@/themes/_registry` — keyed by themeId.
//      Categories with a ported theme prefer this.
//   2. LEGACY `./_registry` — keyed by category. Categories without a
//      ported theme (fitness/restaurant/corporate until MODULE 3+) fall
//      back here. Removed when all categories have themes.

import { useBuild, type IndustryCategory } from '@/contexts/BuildContext';
import { resolveVariant, type SectionKind as LegacySectionKind } from './_registry';
import { resolveThemeBlockWithFallback } from '@/themes/_registry';
import type { SectionKind as ThemeSectionKind } from '@/themes/_types';

// Category → preferred themeId in the new registry. MODULE 3+ adds more
// rows here as each theme's component suite lands.
const CATEGORY_TO_THEME_ID: Partial<Record<IndustryCategory, string>> = {
  skincare:   'skincare-luxe',
  fitness:    'fitness-bold',
  restaurant: 'hospitality-warm',
  medical:    'medical-clinical',
  // Corporate has no dedicated theme yet — aliases onto medical-clinical
  // since both verticals share the trust-first clinical aesthetic.
  corporate:  'medical-clinical',
};

export interface SectionRendererProps {
  kind: ThemeSectionKind & LegacySectionKind;
}

export function SectionRenderer({ kind }: SectionRendererProps) {
  const { currentConfig } = useBuild();
  const { selectedCategory } = currentConfig;

  const variantId =
    kind === 'hero' ? currentConfig.heroVariant :
    'default';

  // ── 1. New MODULE 1 dispatcher ─────────────────────────────────────────────
  const themeId = CATEGORY_TO_THEME_ID[selectedCategory];
  if (themeId) {
    const resolved = resolveThemeBlockWithFallback(themeId, kind, variantId);
    if (resolved) {
      const Component = resolved.component;
      return <Component />;
    }
  }

  // ── 2. Legacy category-keyed registry (until all themes ported) ───────────
  const legacy = resolveVariant(selectedCategory, kind, variantId);
  if (legacy) {
    const Component = legacy.component;
    return <Component />;
  }

  return null;
}

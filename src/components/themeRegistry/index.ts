// ─────────────────────────────────────────────────────────────────────────────
// Theme Registry — central dispatcher
// ─────────────────────────────────────────────────────────────────────────────
// Maps `IndustryCategory` → `CategoryThemeModule`. The editor + onboarding
// flows + `/site/[subdomain]` consume this single file to:
//
//   - present the industry picker (`listCategories()`)
//   - seed BuildContext defaults on category change (`resolveDefaults()`)
//   - look up a section variant component (`resolveCategoryVariant()`)
//
// New categories require:
//   1. Add a value to the `IndustryCategory` union (BuildContext.tsx)
//   2. Create `<industry>.tsx` here exporting a `CategoryThemeModule`
//   3. Add the entry to `CATEGORY_MODULES` below.

import type { IndustryCategory } from '@/contexts/BuildContext';
import type { SectionKind } from '@/sections/_registry';
import type { CategoryThemeModule, ThemeVariantSpec } from './types';

import { SKINCARE_MODULE }    from './skincare';
import { FITNESS_MODULE }     from './fitness';
import { HOSPITALITY_MODULE } from './hospitality';
import { MEDICAL_MODULE }     from './medical';

export const CATEGORY_MODULES: Record<IndustryCategory, CategoryThemeModule> = {
  skincare:   SKINCARE_MODULE,
  fitness:    FITNESS_MODULE,
  restaurant: HOSPITALITY_MODULE,
  corporate:  MEDICAL_MODULE,
  // 'medical' is a synonym slot for the MEDICAL_MODULE — the MODULE 1
  // canonical category. Both keys resolve to the same module so legacy
  // BuildContext consumers keep working alongside MODULE 1+ consumers.
  medical:    MEDICAL_MODULE,
};

/** Read-only list for the editor's category picker. */
export function listCategories(): readonly CategoryThemeModule[] {
  return Object.values(CATEGORY_MODULES);
}

/** Snapshot of the category's recommended defaults — used on category swap. */
export function resolveDefaults(category: IndustryCategory) {
  return CATEGORY_MODULES[category].defaults;
}

/**
 * Look up a variant component within a category. Falls back to the first
 * variant in the category, then to skincare's first variant — same fallback
 * chain as `_registry.resolveVariant` so behaviour is identical regardless
 * of which lookup path is used.
 */
export function resolveCategoryVariant(
  category: IndustryCategory,
  kind: SectionKind,
  variantId: string,
): ThemeVariantSpec | null {
  const moduleVariants = CATEGORY_MODULES[category].variants[kind] ?? [];
  const found = moduleVariants.find((v) => v.id === variantId);
  if (found) return found;
  if (moduleVariants[0]) return moduleVariants[0];
  const fallback = CATEGORY_MODULES.skincare.variants[kind] ?? [];
  return fallback[0] ?? null;
}

export type { CategoryThemeModule, ThemeVariantSpec } from './types';

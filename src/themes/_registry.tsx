// ─────────────────────────────────────────────────────────────────────────────
// Theme Registry — Unified Dispatcher
// ─────────────────────────────────────────────────────────────────────────────
// The runtime API the editor + tenant renderer use to resolve a
// (theme, kind, variant) triple to a React component.
//
// Two layers:
//
//   1. MANIFEST layer (pure data) — re-exports from `src/data/themeManifest`
//      and provides shorthand variant lookups. Has zero React content;
//      safe to consume from server, edge, and Envato wrapper.
//
//   2. COMPONENT layer — a process-local Map populated by theme files
//      via `registerThemeBlock()`. MODULE 1 ships the API with an empty
//      registry; MODULE 2 (the theme implementation files) registers the
//      actual components.
//
// Why a registration pattern (vs. direct imports here)?
//   - Themes can be tree-shaken by Turbopack at the chunk level when a
//     specific theme is rendered (only the registered blocks for that
//     theme end up in the response chunk).
//   - The marketplace bundle ships ALL manifests but only the components
//     for the currently-selected theme — keeps the marketplace catalogue
//     page well under the Vercel edge function size limit.
//   - Future-proofs against dynamic theme loading (CDN-served themes, user-
//     uploaded themes, A/B-test variant rotation).

import type { ComponentType } from 'react';
import type {
  IndustryCategory,
  SectionKind,
  ThemeManifest,
  ThemeVariantSpec,
} from './_types';
import { buildBlockKey } from './_types';

import {
  THEME_MANIFESTS,
  getThemeById,
  listThemes,
  listThemesByCategory,
  getThemeByDemoSlug,
} from '@/data/themeManifest';

// ── Static block imports ─────────────────────────────────────────────────────
// The variant components are 'use client' modules. SSR cannot rely on their
// module-level `registerThemeBlock(...)` side-effects firing because the
// server never evaluates the bodies of client modules. We seed the registry
// from this dispatcher file (which is environment-agnostic) so the lookup
// works identically in both SSR and CSR.
//
// MODULE 3+ adds new theme imports here.

import { HeroSplit            as SkincareLuxe_HeroSplit }            from './skincare-luxe/HeroSplit';
import { HeroCentered         as SkincareLuxe_HeroCentered }         from './skincare-luxe/HeroCentered';
import { ServicesGrid3Col     as SkincareLuxe_ServicesGrid3Col }     from './skincare-luxe/ServicesGrid3Col';
import { ServicesListIcons    as SkincareLuxe_ServicesListIcons }    from './skincare-luxe/ServicesListIcons';
import { GalleryMasonry       as SkincareLuxe_GalleryMasonry }       from './skincare-luxe/GalleryMasonry';
import { GalleryCarousel      as SkincareLuxe_GalleryCarousel }      from './skincare-luxe/GalleryCarousel';
import { TestimonialsCarousel as SkincareLuxe_TestimonialsCarousel } from './skincare-luxe/TestimonialsCarousel';
import { TestimonialsGrid     as SkincareLuxe_TestimonialsGrid }     from './skincare-luxe/TestimonialsGrid';
import { ContactSplitMap      as SkincareLuxe_ContactSplitMap }      from './skincare-luxe/ContactSplitMap';
import { ContactMinimal       as SkincareLuxe_ContactMinimal }       from './skincare-luxe/ContactMinimal';
import { FooterMinimal        as SkincareLuxe_FooterMinimal }        from './skincare-luxe/FooterMinimal';
import { FooterWide           as SkincareLuxe_FooterWide }           from './skincare-luxe/FooterWide';

import { HeroBold              as FitnessBold_HeroBold }              from './fitness-bold/HeroBold';
import { FeaturesStatBlock     as FitnessBold_FeaturesStatBlock }     from './fitness-bold/FeaturesStatBlock';
import { ScheduleWeekGrid      as FitnessBold_ScheduleWeekGrid }      from './fitness-bold/ScheduleWeekGrid';
import { TestimonialsCardStack as FitnessBold_TestimonialsCardStack } from './fitness-bold/TestimonialsCardStack';
import { ContactMinimal        as FitnessBold_ContactMinimal }        from './fitness-bold/ContactMinimal';
import { FooterSocialHeavy     as FitnessBold_FooterSocialHeavy }     from './fitness-bold/FooterSocialHeavy';

import { HeroPhoto             as HospitalityWarm_HeroPhoto }         from './hospitality-warm/HeroPhoto';
import { MenuTabbed            as HospitalityWarm_MenuTabbed }        from './hospitality-warm/MenuTabbed';
import { MenuList              as HospitalityWarm_MenuList }          from './hospitality-warm/MenuList';
import { GalleryGrid4Col       as HospitalityWarm_GalleryGrid4Col }   from './hospitality-warm/GalleryGrid4Col';
import { ContactSplitMap       as HospitalityWarm_ContactSplitMap }   from './hospitality-warm/ContactSplitMap';
import { FooterMinimal         as HospitalityWarm_FooterMinimal }     from './hospitality-warm/FooterMinimal';

import { HeroClinical          as MedicalClinical_HeroClinical }      from './medical-clinical/HeroClinical';
import { ServicesGrid3Col      as MedicalClinical_ServicesGrid3Col }  from './medical-clinical/ServicesGrid3Col';
import { ScheduleSlotGrid      as MedicalClinical_ScheduleSlotGrid }  from './medical-clinical/ScheduleSlotGrid';
import { RosterDoctorCards     as MedicalClinical_RosterDoctorCards } from './medical-clinical/RosterDoctorCards';
import { ContactSplitMap       as MedicalClinical_ContactSplitMap }   from './medical-clinical/ContactSplitMap';
import { FooterMinimal         as MedicalClinical_FooterMinimal }     from './medical-clinical/FooterMinimal';

// ── Re-exports — single import surface for consumers ─────────────────────────

export {
  THEME_MANIFESTS,
  getThemeById,
  listThemes,
  listThemesByCategory,
  getThemeByDemoSlug,
};

export type { ThemeManifest, ThemeVariantSpec, IndustryCategory, SectionKind } from './_types';

// ── Manifest-level variant lookups ───────────────────────────────────────────

/**
 * List the variants offered by a theme for a given section kind. Returns
 * empty array when the theme doesn't implement that kind — callers should
 * use this to decide whether to render the section at all.
 */
export function listVariantsForKind(
  themeId: string,
  kind: SectionKind,
): readonly ThemeVariantSpec[] {
  const theme = getThemeById(themeId);
  if (!theme) return [];
  return theme.variants[kind] ?? [];
}

/**
 * Resolve the recommended default variant id for a (theme, kind) pair.
 * Falls back to the first variant in the catalogue if `defaultVariants`
 * doesn't specify one — guarantees a non-null id when at least one
 * variant exists.
 */
export function resolveDefaultVariantId(
  themeId: string,
  kind: SectionKind,
): string | null {
  const theme = getThemeById(themeId);
  if (!theme) return null;
  const declared = theme.defaultVariants[kind];
  if (declared) return declared;
  const first = theme.variants[kind]?.[0];
  return first?.id ?? null;
}

/**
 * Look up a variant spec (label + description + thumbnail) without forcing
 * a component import. Useful for editor swap UI rendering.
 */
export function getVariantSpec(
  themeId: string,
  kind: SectionKind,
  variantId: string,
): ThemeVariantSpec | null {
  const variants = listVariantsForKind(themeId, kind);
  return variants.find((v) => v.id === variantId) ?? null;
}

// ── Component layer (process-local) ──────────────────────────────────────────
// Themes register themselves at module-load time via `registerThemeBlock`.
// The resolver returns `null` for unregistered blocks — callers should
// handle this gracefully (render nothing rather than crash) so a theme
// catalog entry can ship before its component implementation lands.

// Storage lives on globalThis so it's reachable from any point in module
// evaluation — including from imports that fire BEFORE this file's body
// has executed (the static-import chain re-enters here mid-evaluation
// when variant files call registerThemeBlock at module-load time).
// `let _BLOCK_REGISTRY` would TDZ in that window; globalThis cannot.
declare global {
  // eslint-disable-next-line no-var
  var __cv_block_registry: Map<string, ComponentType> | undefined;
}

function getBlockRegistry(): Map<string, ComponentType> {
  if (!globalThis.__cv_block_registry) {
    globalThis.__cv_block_registry = new Map<string, ComponentType>();
    seedStaticBlocks(globalThis.__cv_block_registry);
  }
  return globalThis.__cv_block_registry;
}

// ── Static seed — runs once at first access, on BOTH server and client ───────
// Variant files use 'use client', so their module-level
// `registerThemeBlock(...)` side-effects don't fire on the server. Seeding
// from this dispatcher (which is environment-agnostic) makes SSR + CSR
// resolve identically.
function seedStaticBlocks(registry: Map<string, ComponentType>): void {
  registry.set(buildBlockKey('skincare-luxe', 'hero',         'split'),     SkincareLuxe_HeroSplit);
  registry.set(buildBlockKey('skincare-luxe', 'hero',         'centered'),  SkincareLuxe_HeroCentered);
  registry.set(buildBlockKey('skincare-luxe', 'services',     'grid-3col'), SkincareLuxe_ServicesGrid3Col);
  registry.set(buildBlockKey('skincare-luxe', 'services',     'list-icons'),SkincareLuxe_ServicesListIcons);
  registry.set(buildBlockKey('skincare-luxe', 'gallery',      'masonry'),   SkincareLuxe_GalleryMasonry);
  registry.set(buildBlockKey('skincare-luxe', 'gallery',      'carousel'),  SkincareLuxe_GalleryCarousel);
  registry.set(buildBlockKey('skincare-luxe', 'testimonials', 'carousel'),  SkincareLuxe_TestimonialsCarousel);
  registry.set(buildBlockKey('skincare-luxe', 'testimonials', 'grid'),      SkincareLuxe_TestimonialsGrid);
  registry.set(buildBlockKey('skincare-luxe', 'contact',      'split-map'), SkincareLuxe_ContactSplitMap);
  registry.set(buildBlockKey('skincare-luxe', 'contact',      'minimal'),   SkincareLuxe_ContactMinimal);
  registry.set(buildBlockKey('skincare-luxe', 'footer',       'minimal'),   SkincareLuxe_FooterMinimal);
  registry.set(buildBlockKey('skincare-luxe', 'footer',       'wide'),      SkincareLuxe_FooterWide);

  // ── fitness-bold ──────────────────────────────────────────────────────────
  registry.set(buildBlockKey('fitness-bold',  'hero',         'bold'),         FitnessBold_HeroBold);
  registry.set(buildBlockKey('fitness-bold',  'features',     'stat-block'),   FitnessBold_FeaturesStatBlock);
  registry.set(buildBlockKey('fitness-bold',  'schedule',     'week-grid'),    FitnessBold_ScheduleWeekGrid);
  registry.set(buildBlockKey('fitness-bold',  'testimonials', 'card-stack'),   FitnessBold_TestimonialsCardStack);
  registry.set(buildBlockKey('fitness-bold',  'contact',      'minimal'),      FitnessBold_ContactMinimal);
  registry.set(buildBlockKey('fitness-bold',  'footer',       'social-heavy'), FitnessBold_FooterSocialHeavy);

  // ── hospitality-warm ──────────────────────────────────────────────────────
  registry.set(buildBlockKey('hospitality-warm', 'hero',    'photo'),     HospitalityWarm_HeroPhoto);
  registry.set(buildBlockKey('hospitality-warm', 'menu',    'tabbed'),    HospitalityWarm_MenuTabbed);
  registry.set(buildBlockKey('hospitality-warm', 'menu',    'list'),      HospitalityWarm_MenuList);
  registry.set(buildBlockKey('hospitality-warm', 'gallery', 'grid-4col'), HospitalityWarm_GalleryGrid4Col);
  registry.set(buildBlockKey('hospitality-warm', 'contact', 'split-map'), HospitalityWarm_ContactSplitMap);
  registry.set(buildBlockKey('hospitality-warm', 'footer',  'minimal'),   HospitalityWarm_FooterMinimal);

  // ── medical-clinical ──────────────────────────────────────────────────────
  registry.set(buildBlockKey('medical-clinical', 'hero',     'clinical'),     MedicalClinical_HeroClinical);
  registry.set(buildBlockKey('medical-clinical', 'services', 'grid-3col'),    MedicalClinical_ServicesGrid3Col);
  registry.set(buildBlockKey('medical-clinical', 'schedule', 'slot-grid'),    MedicalClinical_ScheduleSlotGrid);
  registry.set(buildBlockKey('medical-clinical', 'roster',   'doctor-cards'), MedicalClinical_RosterDoctorCards);
  registry.set(buildBlockKey('medical-clinical', 'contact',  'split-map'),    MedicalClinical_ContactSplitMap);
  registry.set(buildBlockKey('medical-clinical', 'footer',   'minimal'),      MedicalClinical_FooterMinimal);
}

/**
 * Register a React component for a (theme, kind, variant) triple. Called
 * by theme implementation files (one per variant) at module-load time.
 *
 * @example
 *   // src/themes/skincare-luxe/HeroSplit.tsx
 *   registerThemeBlock('skincare-luxe', 'hero', 'split', HeroSplit);
 */
export function registerThemeBlock(
  themeId: string,
  kind: SectionKind,
  variantId: string,
  component: ComponentType,
): void {
  getBlockRegistry().set(buildBlockKey(themeId, kind, variantId), component);
}

/**
 * Resolve a component for a (theme, kind, variant) triple. Returns `null`
 * when the block isn't registered yet — caller should render nothing
 * rather than crash. This makes the system tolerant of catalog-vs-code
 * drift (a manifest can advertise a variant before its file ships).
 */
export function resolveThemeBlock(
  themeId: string,
  kind: SectionKind,
  variantId: string,
): ComponentType | null {
  return getBlockRegistry().get(buildBlockKey(themeId, kind, variantId)) ?? null;
}

/**
 * Resolve with sensible fallbacks:
 *   1. Exact (theme, kind, variantId) match
 *   2. (theme, kind, theme's defaultVariant) match
 *   3. First registered variant for (theme, kind)
 *   4. null
 *
 * Use this in the tenant renderer when you want a "best-effort" render
 * that survives the user persisting a now-deleted variant id.
 */
export function resolveThemeBlockWithFallback(
  themeId: string,
  kind: SectionKind,
  variantId: string,
): { component: ComponentType; resolvedVariantId: string } | null {
  const direct = resolveThemeBlock(themeId, kind, variantId);
  if (direct) return { component: direct, resolvedVariantId: variantId };

  const defaultId = resolveDefaultVariantId(themeId, kind);
  if (defaultId && defaultId !== variantId) {
    const def = resolveThemeBlock(themeId, kind, defaultId);
    if (def) return { component: def, resolvedVariantId: defaultId };
  }

  // Last resort: any registered variant for (theme, kind).
  for (const v of listVariantsForKind(themeId, kind)) {
    const c = resolveThemeBlock(themeId, kind, v.id);
    if (c) return { component: c, resolvedVariantId: v.id };
  }

  return null;
}

/** Whether a block has been registered. Diagnostic helper. */
export function hasThemeBlock(
  themeId: string,
  kind: SectionKind,
  variantId: string,
): boolean {
  return getBlockRegistry().has(buildBlockKey(themeId, kind, variantId));
}

/**
 * Diagnostic: list all currently-registered (theme, kind, variant) keys.
 * Used by the dev-mode coverage report that flags manifest entries
 * without matching component registrations.
 */
export function listRegisteredBlocks(): readonly string[] {
  return Array.from(getBlockRegistry().keys()).sort();
}

/**
 * Diagnostic: manifest entries that DON'T have a corresponding component
 * registered. Empty array = full coverage.
 */
export function listMissingBlocks(): readonly {
  themeId: string;
  kind: SectionKind;
  variantId: string;
}[] {
  const missing: { themeId: string; kind: SectionKind; variantId: string }[] = [];
  for (const theme of THEME_MANIFESTS) {
    for (const kind of Object.keys(theme.variants) as SectionKind[]) {
      const variants = theme.variants[kind] ?? [];
      for (const v of variants) {
        if (!hasThemeBlock(theme.id, kind, v.id)) {
          missing.push({ themeId: theme.id, kind, variantId: v.id });
        }
      }
    }
  }
  return missing;
}

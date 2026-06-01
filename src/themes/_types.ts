// ─────────────────────────────────────────────────────────────────────────────
// ConnectVision Theme Registry — type contracts
// ─────────────────────────────────────────────────────────────────────────────
// Pure type module. ZERO runtime exports except the `INDUSTRY_CATEGORIES`
// frozen tuple (kept here so it sits alongside the union type that mirrors
// it). No React imports — this file is safe to load from server routes,
// edge functions, marketplace catalogue pages, and the Envato wrapper
// bundle without dragging in the React tree.
//
// The registry's role is to enumerate WHAT exists (themes, variants,
// industries, palettes). Component implementations register themselves
// via `registerThemeBlock()` in `_registry.tsx` — never imported here.

// ── Industry vertical ────────────────────────────────────────────────────────

export type IndustryCategory =
  | 'skincare'
  | 'fitness'
  | 'restaurant'
  | 'corporate'
  | 'medical';

export const INDUSTRY_CATEGORIES: readonly IndustryCategory[] = [
  'skincare',
  'fitness',
  'restaurant',
  'corporate',
  'medical',
] as const;

export function isIndustryCategory(value: unknown): value is IndustryCategory {
  return typeof value === 'string'
    && (INDUSTRY_CATEGORIES as readonly string[]).includes(value);
}

// ── Section kind ─────────────────────────────────────────────────────────────
// The full union of section kinds the marketplace supports. Not every
// theme implements every kind — `ThemeManifest.supportedSections` declares
// which ones are real.

export type SectionKind =
  | 'hero'
  | 'features'
  | 'services'
  | 'gallery'
  | 'menu'         // restaurants
  | 'schedule'     // fitness, medical
  | 'roster'       // medical
  | 'testimonials'
  | 'cta'
  | 'contact'
  | 'footer';

export const SECTION_KINDS: readonly SectionKind[] = [
  'hero',
  'features',
  'services',
  'gallery',
  'menu',
  'schedule',
  'roster',
  'testimonials',
  'cta',
  'contact',
  'footer',
] as const;

export function isSectionKind(value: unknown): value is SectionKind {
  return typeof value === 'string'
    && (SECTION_KINDS as readonly string[]).includes(value);
}

// ── Variant ──────────────────────────────────────────────────────────────────
// A pre-built layout option for a (theme, sectionKind) pair. Editor presents
// these as the swap-UI choices. Variant ids are STABLE — once shipped they
// can't be renamed without breaking saved BuildSchemas.

export interface ThemeVariantSpec {
  id: string;
  label: string;
  description: string;
  /** Optional industry tags for AI-suggest. */
  bestFor?: readonly string[];
  /** Static thumbnail for the swap UI (served from /public/themes/<id>/). */
  thumbnailUrl?: string;
}

// ── Palette + typography ────────────────────────────────────────────────────

export interface ThemePalette {
  primary:    `#${string}`;
  accent:     `#${string}`;
  background: `#${string}`;
  foreground: `#${string}`;
  muted:      `#${string}`;
  surface:    `#${string}`;
}

export interface ThemeTypography {
  /** Google Fonts family name, e.g. "Playfair Display". */
  headingFont: string;
  bodyFont:    string;
  /** Optional alternate weight pairings. */
  headingWeight?: 400 | 500 | 600 | 700 | 800;
  bodyWeight?:    300 | 400 | 500;
}

// ── Theme manifest ───────────────────────────────────────────────────────────
// One ThemeManifest per shipped theme. Drives:
//   - Marketplace catalogue cards (price, screenshots, tags)
//   - Editor's variant swap UI (variants per kind)
//   - BuildContext seed defaults when a theme is applied
//   - Tenant SSR (default variant per kind if user hasn't customized)

export interface ThemeAuthor {
  name: string;
  profileUrl?: string;
}

export type ThemeLicense = 'regular' | 'extended' | 'enterprise';

export interface ThemeManifest {
  /** Stable slug used as the theme id everywhere. NEVER rename post-publish. */
  id: string;
  /** Marketplace-display name. */
  name: string;
  category: IndustryCategory;
  /** One-line tagline shown on catalogue cards. */
  tagline: string;
  /** Long description (Markdown allowed) for detail pages. */
  description: string;
  /** One-time purchase price in INR. */
  priceInr: number;
  license: ThemeLicense;
  /** Card thumbnail (served from /public/themes/<id>/thumb.png). */
  thumbnailUrl: string;
  /** Carousel screenshots for the detail page. */
  screenshotUrls: readonly string[];
  /** Subdomain used for the live demo (matches a key in `SAMPLE_BUILDS`). */
  liveDemoSlug: string;
  /** Searchable tags. */
  tags: readonly string[];
  /** Default brand palette — drives BuildContext defaults on apply. */
  defaultPalette: ThemePalette;
  /** Default typography pairing. */
  defaultTypography: ThemeTypography;
  /** Per-kind default variant id — what loads when this theme is first applied. */
  defaultVariants: Partial<Record<SectionKind, string>>;
  /** Section kinds the theme implements at least one variant for. */
  supportedSections: readonly SectionKind[];
  /** Variants offered per kind (drives editor swap UI). */
  variants: Partial<Record<SectionKind, readonly ThemeVariantSpec[]>>;
  /** Author attribution for the marketplace. */
  author: ThemeAuthor;
  /** ISO 8601 timestamps. */
  createdAt: string;
  updatedAt: string;
  /** Schema version — bump on any breaking variant-id change. */
  schemaVersion: 1;
}

// ── SampleBuild ──────────────────────────────────────────────────────────────
// A pre-filled BusinessData snapshot the marketplace + editor uses to render
// instant, realistic previews. Decoupled from the BuildContext's runtime
// BusinessData type so this module stays React-free.

export interface SampleBusinessData {
  businessName: string;
  tagline: string;
  description: string;
  primaryColor: `#${string}`;
  selectedCategory: IndustryCategory;
  /** Variant id for the hero section. Other kinds default per manifest. */
  heroVariant: string;
  /** Pre-resolved WhatsApp deep-link target (E.164). */
  whatsappTarget: string | null;
}

export interface SampleBuild {
  /** Matches `liveDemoSlug` on the corresponding ThemeManifest. */
  slug: string;
  themeId: string;
  data: SampleBusinessData;
}

// ── Block lookup key ─────────────────────────────────────────────────────────
// Internal helper used by `_registry.tsx` to canonicalize component-registry
// keys. Exported so theme authors can derive the same key if they need to
// pre-register components from a barrel file.

export function buildBlockKey(themeId: string, kind: SectionKind, variantId: string): string {
  return `${themeId}::${kind}::${variantId}`;
}

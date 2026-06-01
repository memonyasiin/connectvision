// ─────────────────────────────────────────────────────────────────────────────
// Theme Registry — shared types
// ─────────────────────────────────────────────────────────────────────────────
// The themeRegistry is a higher-level abstraction over `src/sections/`. Each
// module declares the industry's recommended defaults + lists the section
// kinds and variants it supports. The dispatcher (index.ts) uses these to:
//
//   - seed BuildContext when an editor switches industry
//   - drive the editor "category palette" picker
//   - provide an SSR-safe `coerceCategory` for `/site/[subdomain]` payloads

import type { ComponentType } from 'react';
import type { HeroVariant, IndustryCategory } from '@/contexts/BuildContext';
import type { SectionKind } from '@/sections/_registry';

export interface ThemeVariantSpec {
  id: string;
  label: string;
  description: string;
  component: ComponentType;
}

export interface CategoryThemeModule {
  /** Stable id — matches `IndustryCategory`. */
  id: IndustryCategory;
  /** Editor-visible label. */
  label: string;
  /** One-line vertical pitch. */
  tagline: string;
  /** Default brand palette for this vertical. */
  defaults: {
    primaryColor: `#${string}`;
    heroVariant: HeroVariant;
    /** Whether the typical render is dark-mode-first (drives editor preview). */
    darkMode: boolean;
  };
  /** Section kinds this vertical currently supports. */
  supportedSections: readonly SectionKind[];
  /** Available variants per section kind. */
  variants: Partial<Record<SectionKind, readonly ThemeVariantSpec[]>>;
}

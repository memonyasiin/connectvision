'use client';

// ─────────────────────────────────────────────────────────────────────────────
// BuildContext — centralized state for the live website builder.
// ─────────────────────────────────────────────────────────────────────────────
// One context. One state object (`currentConfig`). One unified mutator
// (`updateConfig`). Side-effects (CSS var sync + localStorage persistence)
// are co-located here so consumers stay clueless about wiring.
//
//   ┌──────────────── Tier 1 — Type Definition
//   │ BusinessData + FunnelContext shape
//   │
//   ├──────────────── Tier 2 — Context Architecture
//   │ <BuildProvider> exposes { currentConfig, updateConfig }
//   │
//   ├──────────────── Tier 3 — CSS Variable Sync
//   │ useEffect on currentConfig.primaryColor → --primary-color
//   │
//   └──────────────── Tier 4 — localStorage cache
//     Hydration-safe restore on mount + write on every state mutation
//
// Hydration model: initial render uses DEFAULT_CONFIG on both server and
// client (matching markup → no React mismatch warnings). After mount, a
// useEffect reads localStorage and calls setCurrentConfig with the cached
// values. There's a one-frame flash of defaults on cold reload — acceptable
// for an editor; eliminate later via a cookie/edge-rendered initial state.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Tier 1 — Type Definition
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Hero layout variants surfaced to the editor's swap UI. `bold` is the
 * fitness-vertical default (dark canvas, oversized stencil headline).
 */
export type HeroVariant = 'split' | 'centered' | 'bold';

/**
 * Industry verticals the platform supports — same set the legacy
 * `src/components/themeRegistry` + `src/sections/_registry` are keyed by.
 * Declared as a `const` tuple so the union type is auto-derived AND the
 * runtime `INDUSTRY_CATEGORIES` array can iterate them with TS-narrowed
 * element types.
 */
export const INDUSTRY_CATEGORIES = [
  'skincare',
  'fitness',
  'restaurant',
  'corporate',
  'medical',
] as const;

export type IndustryCategory = typeof INDUSTRY_CATEGORIES[number];

/**
 * Runtime state for the visitor-side funnel. Drives the Tier-5 WhatsApp
 * widget + AI agent: scroll depth answers "is the visitor engaged?",
 * activeSectionId answers "what are they looking at right now?", lastIntent
 * answers "what did they tap?", whatsappTarget is the pre-resolved
 * deep-link destination.
 *
 * `sessionDurationMs / clickDepth / lastProductTag` were added in MODULE 1
 * for the hyper-contextual WA deep-link payload (see waDeepLink.ts) — every
 * theme's `_common.tsx` patches these on each CTA tap.
 */
export interface FunnelContext {
  /** Max scroll depth percentage observed this session (0–100). */
  scrollDepthPct: number;
  /** id of the most-recently-entered section, via IntersectionObserver. */
  activeSectionId: string | null;
  /** Last `data-track-intent` value captured by a click. */
  lastIntent: string | null;
  /** Pre-resolved WhatsApp number for the floating CTA (E.164). */
  whatsappTarget: string | null;
  /** Milliseconds since the session started — derived from useActivityTracker. */
  sessionDurationMs: number;
  /** Cumulative CTA click count this session. */
  clickDepth: number;
  /** Product/service tag attached to the most-recently-tapped CTA. */
  lastProductTag: string | null;
}

/**
 * The full editable state of one tenant's site. Everything an editor can
 * tweak lives here; the rest is derived.
 *
 * `selectedCategory` was added in MODULE 1 — drives both the theme
 * dispatcher (which theme module to mount) and the editor's category-
 * picker UI (which variants to list).
 */
export interface BusinessData {
  businessName: string;
  tagline: string;
  description: string;
  primaryColor: `#${string}`;
  selectedCategory: IndustryCategory;
  heroVariant: HeroVariant;
  funnelContext: FunnelContext;
}

// ─────────────────────────────────────────────────────────────────────────────
// Defaults + persistence
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'cv:build:v1';

export const DEFAULT_CONFIG: BusinessData = {
  businessName: 'Memonyasiin Beauty',
  tagline: 'Skincare, simplified.',
  description:
    'Premium skincare crafted in small batches. Honest formulations, fast results. Visit us in Mumbai or get on a WhatsApp consult in under five minutes.',
  primaryColor: '#1c4d2a',
  selectedCategory: 'skincare',
  heroVariant: 'split',
  funnelContext: {
    scrollDepthPct: 0,
    activeSectionId: null,
    lastIntent: null,
    whatsappTarget: '+919702601111',
    sessionDurationMs: 0,
    clickDepth: 0,
    lastProductTag: null,
  },
};

/**
 * Read the cached config from localStorage. Returns `null` on first run, on
 * SSR, on quota errors, or on schema mismatch. The merge against
 * DEFAULT_CONFIG guarantees forward-compatible reads even if older clients
 * persisted a smaller object shape.
 */
function loadFromStorage(): BusinessData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BusinessData>;
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      funnelContext: {
        ...DEFAULT_CONFIG.funnelContext,
        ...(parsed.funnelContext ?? {}),
      },
    };
  } catch {
    return null;
  }
}

function saveToStorage(data: BusinessData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // QuotaExceededError / private-mode storage block — silently drop.
    // Persistence is best-effort, never load-bearing for correctness.
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2 — Context Architecture
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildContextValue {
  /** Current immutable snapshot of the editable schema. */
  currentConfig: BusinessData;
  /** Unified handler. Shallow-merges into top-level fields. */
  updateConfig: (updates: Partial<BusinessData>) => void;
  /**
   * Granular funnel updater — merges into `funnelContext` without forcing
   * callers to spread the whole `funnelContext` object. Hot-path safe.
   */
  updateFunnel: (patch: Partial<FunnelContext>) => void;
  /** Wipes localStorage cache and resets to DEFAULT_CONFIG. */
  resetConfig: () => void;
}

const BuildContext = createContext<BuildContextValue | null>(null);

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildProviderProps {
  /** Optional seed overrides on top of DEFAULT_CONFIG (e.g. server-rendered tenant data). */
  initial?: Partial<BusinessData>;
  children: ReactNode;
}

export function BuildProvider({ initial, children }: BuildProviderProps) {
  // Same value on SSR and first client render — no hydration mismatch.
  // The localStorage restore is moved to a post-mount effect below.
  const [currentConfig, setCurrentConfig] = useState<BusinessData>(() => ({
    ...DEFAULT_CONFIG,
    ...initial,
    funnelContext: {
      ...DEFAULT_CONFIG.funnelContext,
      ...(initial?.funnelContext ?? {}),
    },
  }));

  // ── Unified update handler ────────────────────────────────────────────────
  const updateConfig = useCallback((updates: Partial<BusinessData>) => {
    setCurrentConfig((prev) => ({
      ...prev,
      ...updates,
      // Deep-merge funnelContext so a partial patch (`{ scrollDepthPct: 50 }`)
      // doesn't wipe `whatsappTarget` / `activeSectionId` / `lastIntent`.
      funnelContext: updates.funnelContext
        ? { ...prev.funnelContext, ...updates.funnelContext }
        : prev.funnelContext,
    }));
  }, []);

  const updateFunnel = useCallback((patch: Partial<FunnelContext>) => {
    setCurrentConfig((prev) => ({
      ...prev,
      funnelContext: { ...prev.funnelContext, ...patch },
    }));
  }, []);

  const resetConfig = useCallback(() => {
    if (typeof window !== 'undefined') {
      try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
    }
    setCurrentConfig({
      ...DEFAULT_CONFIG,
      funnelContext: { ...DEFAULT_CONFIG.funnelContext },
    });
  }, []);

  // ── Tier 4 — Restore from localStorage AFTER mount (avoids SSR mismatch) ──
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const stored = loadFromStorage();
    if (stored) setCurrentConfig(stored);
  }, []);

  // ── Tier 3 — CSS variable sync on primaryColor change ─────────────────────
  // Writes the brand-primary value to the document root so themed CSS
  // (`color: var(--primary-color)`) repaints without React doing any work.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.style.setProperty('--primary-color', currentConfig.primaryColor);
    // Keep legacy --cv-color-primary in sync so existing stylesheets that
    // were authored against the old token name continue to theme correctly.
    root.style.setProperty('--cv-color-primary', currentConfig.primaryColor);
  }, [currentConfig.primaryColor]);

  // ── Tier 4 — Persist on any state mutation (rAF-debounced) ────────────────
  // requestAnimationFrame coalesces rapid-fire writes (e.g. dragging a colour
  // picker) into one localStorage round-trip per paint. Mitigates main-thread
  // jank on slow disks/private mode.
  const writeFrameRef = useRef<number | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (writeFrameRef.current !== null) {
      window.cancelAnimationFrame(writeFrameRef.current);
    }
    writeFrameRef.current = window.requestAnimationFrame(() => {
      saveToStorage(currentConfig);
      writeFrameRef.current = null;
    });
    return () => {
      if (writeFrameRef.current !== null) {
        window.cancelAnimationFrame(writeFrameRef.current);
        writeFrameRef.current = null;
      }
    };
  }, [currentConfig]);

  return (
    <BuildContext.Provider value={{ currentConfig, updateConfig, updateFunnel, resetConfig }}>
      {children}
    </BuildContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Access the active build configuration.
 *
 * @example
 * const { currentConfig, updateConfig } = useBuild();
 * updateConfig({ businessName: 'Memon Beauty' });
 */
export function useBuild(): BuildContextValue {
  const ctx = useContext(BuildContext);
  if (!ctx) throw new Error('useBuild must be used inside <BuildProvider>');
  return ctx;
}

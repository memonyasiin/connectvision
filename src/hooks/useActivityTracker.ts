'use client';

// ─────────────────────────────────────────────────────────────────────────────
// useActivityTracker (Tier 5)
// ─────────────────────────────────────────────────────────────────────────────
// Lightweight client-side tracker that records:
//   - scroll-depth per section (via IntersectionObserver)
//   - active section dwell time (entered → exited stopwatch)
//   - click intents (sections with `data-track-intent` on inner elements)
//
// State lives in a module-scoped store so every section's tracker writes to
// the same singleton. The Tier 5 WhatsApp widget reads the snapshot at click
// time and embeds it into the wa.me deep-link payload, giving the LLM agent
// rich context before it greets the visitor.

import { useEffect, useRef } from 'react';

interface SectionStat {
  sectionId: string;
  sectionKind: string;
  enteredAt: number | null;
  totalDwellMs: number;
  maxScrollDepthPct: number;
  intents: string[];
}

interface ActivitySnapshot {
  startedAt: number;
  scrollDepthPct: number;
  activeSections: string[];
  sectionStats: Record<string, SectionStat>;
  intents: string[];
  referrer: string;
  pageUrl: string;
}

class ActivityStore {
  private snapshot: ActivitySnapshot = {
    startedAt: Date.now(),
    scrollDepthPct: 0,
    activeSections: [],
    sectionStats: {},
    intents: [],
    referrer: typeof document !== 'undefined' ? document.referrer : '',
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
  };

  getSnapshot(): ActivitySnapshot {
    return this.snapshot;
  }

  noteSectionEnter(sectionId: string, sectionKind: string) {
    const stat = this.ensureSection(sectionId, sectionKind);
    if (stat.enteredAt === null) stat.enteredAt = Date.now();
    if (!this.snapshot.activeSections.includes(sectionId)) {
      this.snapshot.activeSections = [...this.snapshot.activeSections, sectionId];
    }
  }

  noteSectionExit(sectionId: string) {
    const stat = this.snapshot.sectionStats[sectionId];
    if (stat?.enteredAt !== null && stat?.enteredAt !== undefined) {
      stat.totalDwellMs += Date.now() - stat.enteredAt;
      stat.enteredAt = null;
    }
    this.snapshot.activeSections = this.snapshot.activeSections.filter((id) => id !== sectionId);
  }

  noteSectionScrollDepth(sectionId: string, pct: number) {
    const stat = this.snapshot.sectionStats[sectionId];
    if (!stat) return;
    if (pct > stat.maxScrollDepthPct) stat.maxScrollDepthPct = pct;
    if (pct > this.snapshot.scrollDepthPct) this.snapshot.scrollDepthPct = pct;
  }

  noteIntent(sectionId: string, intent: string) {
    const stat = this.snapshot.sectionStats[sectionId];
    if (stat) stat.intents.push(intent);
    this.snapshot.intents.push(`${sectionId}:${intent}`);
  }

  private ensureSection(sectionId: string, sectionKind: string): SectionStat {
    let stat = this.snapshot.sectionStats[sectionId];
    if (!stat) {
      stat = {
        sectionId,
        sectionKind,
        enteredAt: null,
        totalDwellMs: 0,
        maxScrollDepthPct: 0,
        intents: [],
      };
      this.snapshot.sectionStats = { ...this.snapshot.sectionStats, [sectionId]: stat };
    }
    return stat;
  }
}

// Singleton — one tracker per page load.
let _store: ActivityStore | null = null;
function getStore(): ActivityStore {
  if (!_store) _store = new ActivityStore();
  return _store;
}

/** Read the current activity snapshot (e.g. when a widget is about to fire). */
export function getActivitySnapshot(): ActivitySnapshot {
  return getStore().getSnapshot();
}

export interface UseActivityTrackerOptions {
  sectionId: string;
  sectionKind: string;
}

/**
 * Returns a ref to attach to the section's outer element. The hook wires up
 * IntersectionObserver + click-delegation for `[data-track-intent]` children.
 *
 * @example
 * const ref = useActivityTracker({ sectionId: 'hero-1', sectionKind: 'hero' });
 * return <section ref={ref}>...</section>;
 */
export function useActivityTracker({ sectionId, sectionKind }: UseActivityTrackerOptions) {
  const elRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const store = getStore();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            store.noteSectionEnter(sectionId, sectionKind);
            // Depth ≈ visible ratio scaled to %.
            store.noteSectionScrollDepth(sectionId, Math.round(entry.intersectionRatio * 100));
          } else {
            store.noteSectionExit(sectionId);
          }
        }
      },
      // 10 thresholds gives smooth 0–100% depth telemetry.
      { threshold: Array.from({ length: 11 }, (_, i) => i / 10) },
    );
    io.observe(el);

    const onClick = (ev: Event) => {
      const target = ev.target as HTMLElement | null;
      const intentEl = target?.closest('[data-track-intent]') as HTMLElement | null;
      if (!intentEl) return;
      const intent = intentEl.dataset.trackIntent;
      if (intent) store.noteIntent(sectionId, intent);
    };
    el.addEventListener('click', onClick, { capture: true });

    return () => {
      io.disconnect();
      el.removeEventListener('click', onClick, { capture: true });
      store.noteSectionExit(sectionId);
    };
  }, [sectionId, sectionKind]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return elRef as any;
}

'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Hospitality Warm — shared warm-tone primitives
// ─────────────────────────────────────────────────────────────────────────────
// NOT registered with the dispatcher. Restaurant variants compose from
// these — single source for the brand CTA, serif headings, warm-cream
// shells, and the "from ₹XX" price chip.

import type { ReactNode } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker, getActivitySnapshot } from '@/hooks/useActivityTracker';
import { buildWaDeepLink, type WaIntent } from '@/lib/waDeepLink';

// ── Warm CTA — amber accent on cream/transparent surface ────────────────────

export interface WarmCtaProps {
  sectionId: string;
  intent: WaIntent;
  productTag?: string;
  /** Custom prefilled WhatsApp body (e.g. reservation form values). */
  prefillBody?: string;
  label?: string;
  variant?: 'filled' | 'outline' | 'on-photo';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<WarmCtaProps['size']>, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-7 py-3 text-sm',
  lg: 'px-9 py-4 text-base',
};

const INTENT_DEFAULT_LABEL: Record<WaIntent, string> = {
  'general-enquiry':   'Message us',
  'book-appointment':  'Reserve a table',
  'request-quote':     'Ask about catering',
  'product-info':      'See the menu',
  'support':           'Get help',
};

export function WarmCta({
  sectionId,
  intent,
  productTag,
  prefillBody,
  label,
  variant = 'filled',
  size = 'md',
  className = '',
  children,
}: WarmCtaProps) {
  const { currentConfig, updateFunnel } = useBuild();
  const { businessName, funnelContext } = currentConfig;
  const phone = funnelContext.whatsappTarget;

  const onClick = () => {
    if (!phone) return;
    const snap = getActivitySnapshot();
    const sessionDurationMs = Date.now() - snap.startedAt;
    updateFunnel({
      scrollDepthPct: snap.scrollDepthPct,
      activeSectionId: sectionId,
      lastIntent: `${sectionId}:${intent}`,
      sessionDurationMs,
      clickDepth: snap.clickDepth + 1,
      lastProductTag: productTag ?? snap.lastProductTag,
    });
    const { href: defaultHref } = buildWaDeepLink({
      phone,
      intent,
      sectionId,
      businessName,
      productTag,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      activity: {
        scrollDepthPct: snap.scrollDepthPct,
        sessionDurationMs,
        clickDepth: snap.clickDepth + 1,
        activeSectionId: sectionId,
        lastProductTag: snap.lastProductTag ?? undefined,
      },
    });

    // If the caller supplied a prefillBody (e.g. reservation form data),
    // build a custom wa.me URL with that body instead of the default greeting.
    let href = defaultHref;
    if (prefillBody) {
      const cleanPhone = phone.replace(/[^\d+]/g, '').replace(/^\+/, '');
      href = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(prefillBody)}`;
    }

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({ phone, sectionId, snapshot: snap, intent, productTag })],
        { type: 'application/json' },
      );
      navigator.sendBeacon('/api/waa/prime', blob);
    }
    window.open(href, '_blank', 'noopener,noreferrer');
  };

  const base =
    'inline-flex items-center justify-center font-semibold tracking-wide ' +
    'transition-all duration-150 ease-out cursor-pointer ' +
    'disabled:cursor-not-allowed disabled:opacity-40 ' +
    'hover:-translate-y-0.5 active:translate-y-0';

  // Warm theme uses softer rounded-md corners (not pills, not sharp rects).
  const radius = 'rounded-md';

  let variantClasses = '';
  let inlineStyle: React.CSSProperties | undefined = undefined;
  if (variant === 'filled') {
    variantClasses = 'text-white shadow-lg';
    inlineStyle = {
      background: 'var(--primary-color)',
      boxShadow: '0 10px 30px -10px color-mix(in srgb, var(--primary-color) 60%, transparent)',
    };
  } else if (variant === 'outline') {
    variantClasses = 'border bg-transparent';
    inlineStyle = {
      borderColor: 'var(--primary-color)',
      color: 'var(--primary-color)',
    };
  } else {
    // on-photo — white-on-translucent for hero overlays
    variantClasses = 'bg-white/95 text-stone-900 backdrop-blur-sm shadow-2xl hover:bg-white';
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!phone}
      data-track-intent={`${sectionId}-${intent}`}
      data-product-tag={productTag}
      className={`${base} ${radius} ${SIZE_CLASSES[size]} ${variantClasses} ${className}`}
      style={inlineStyle}
    >
      {children ?? label ?? INTENT_DEFAULT_LABEL[intent]}
    </button>
  );
}

// ── Serif section heading — Cormorant Garamond style ─────────────────────────

export interface WarmHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  invert?: boolean; // for on-photo (light text on dark bg)
  className?: string;
}

export function WarmHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  invert = false,
  className = '',
}: WarmHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  const titleColor = invert ? 'text-white' : 'text-stone-900';
  const subColor   = invert ? 'text-white/75' : 'text-stone-600';
  const eyebrowColor = invert ? 'text-amber-200' : '';

  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow ? (
        <div
          className={`mb-3 text-xs font-medium italic ${eyebrowColor}`}
          style={!invert ? { color: 'var(--primary-color)' } : undefined}
        >
          — {eyebrow} —
        </div>
      ) : null}
      <h2
        className={`text-4xl md:text-5xl lg:text-6xl font-light leading-[1.05] tracking-tight ${titleColor}`}
        style={{ fontFamily: '"Cormorant Garamond", "Playfair Display", serif' }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={`mt-4 text-base md:text-lg leading-relaxed ${subColor} max-w-prose`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ── Warm section shell ───────────────────────────────────────────────────────

export interface WarmShellProps {
  id?: string;
  sectionId?: string;
  background?: 'cream' | 'white' | 'darker';
  children: ReactNode;
  className?: string;
}

export function WarmShell({
  id,
  sectionId,
  background = 'cream',
  children,
  className = '',
}: WarmShellProps) {
  const sectionRef = useActivityTracker({
    sectionId: sectionId ?? id ?? 'unknown',
    sectionKind: 'hero',
  });

  const bg =
    background === 'white'
      ? '#ffffff'
      : background === 'darker'
        ? '#fef3c7' // amber-100 — used for accent sections
        : '#fefcf7'; // cream — default

  return (
    <section
      ref={sectionRef}
      id={id}
      style={{ background }}
      className={`py-16 md:py-24 px-5 md:px-10 ${className}`}
    >
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

// ── Dietary tag chip ─────────────────────────────────────────────────────────

const TAG_STYLES: Record<string, string> = {
  vegetarian:      'bg-emerald-50 text-emerald-800 border-emerald-200',
  vegan:           'bg-emerald-50 text-emerald-800 border-emerald-200',
  jain:            'bg-emerald-50 text-emerald-800 border-emerald-200',
  'gluten-free':   'bg-sky-50 text-sky-800 border-sky-200',
  'contains-nuts': 'bg-amber-50 text-amber-800 border-amber-200',
  spicy:           'bg-rose-50 text-rose-800 border-rose-200',
  'chef-pick':     'bg-amber-100 text-amber-900 border-amber-300 font-semibold',
};

export function TagChip({ tag, label }: { tag: string; label: string }) {
  const cls = TAG_STYLES[tag] ?? 'bg-stone-100 text-stone-700 border-stone-200';
  return (
    <span className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-sm border ${cls}`}>
      {label}
    </span>
  );
}

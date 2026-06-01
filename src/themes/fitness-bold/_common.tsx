'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Fitness Bold — shared dark-mode primitives
// ─────────────────────────────────────────────────────────────────────────────
// NOT registered with the dispatcher. Each Fitness Bold variant composes
// from these — single source of truth for the rectangular hard-edge CTA,
// stencil section headings, and gridded dark section shells.
//
// Why a separate `_common.tsx` instead of reusing skincare-luxe's? The
// visual languages diverge sharply: gym = uppercase + monospace numerals
// + rectangular buttons, skincare = title case + Playfair + rounded pills.
// Sharing primitives would force conditional styling that's harder to read
// than two focused files.

import type { ReactNode } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker, getActivitySnapshot } from '@/hooks/useActivityTracker';
import { buildWaDeepLink, type WaIntent } from '@/lib/waDeepLink';

// ── Rectangular CTA — gym energy ─────────────────────────────────────────────

export interface BoldCtaProps {
  sectionId: string;
  intent: WaIntent;
  productTag?: string;
  label?: string;
  /** Visual style — filled brand (default) or outlined ghost. */
  variant?: 'filled' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<BoldCtaProps['size']>, string> = {
  sm: 'px-4 py-2.5 text-xs tracking-wider',
  md: 'px-7 py-3.5 text-sm tracking-wider',
  lg: 'px-9 py-4.5 text-base tracking-wider',
};

const INTENT_DEFAULT_LABEL: Record<WaIntent, string> = {
  'general-enquiry':   'Message us',
  'book-appointment':  'Claim free trial',
  'request-quote':     'Get rates',
  'product-info':      'See classes',
  'support':           'Get help',
};

export function BoldCta({
  sectionId,
  intent,
  productTag,
  label,
  variant = 'filled',
  size = 'md',
  className = '',
  children,
}: BoldCtaProps) {
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
    const { href } = buildWaDeepLink({
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
    'inline-flex items-center justify-center font-bold uppercase ' +
    'transition-transform duration-150 ease-out cursor-pointer ' +
    'disabled:cursor-not-allowed disabled:opacity-40 ' +
    'hover:-translate-y-0.5 active:translate-y-0';

  const variantClasses =
    variant === 'filled'
      ? 'text-white border-none'
      : 'text-white border border-white/25 bg-transparent';

  const inlineStyle =
    variant === 'filled'
      ? {
          background: 'var(--primary-color)',
          boxShadow: '0 12px 32px -8px color-mix(in srgb, var(--primary-color) 60%, transparent)',
          letterSpacing: '0.08em',
        }
      : { letterSpacing: '0.08em' };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!phone}
      data-track-intent={`${sectionId}-${intent}`}
      data-product-tag={productTag}
      className={`${base} ${SIZE_CLASSES[size]} ${variantClasses} ${className}`}
      style={inlineStyle}
    >
      {children ?? label ?? INTENT_DEFAULT_LABEL[intent]}
    </button>
  );
}

// ── Stencil section heading ──────────────────────────────────────────────────

export interface BoldHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function BoldHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className = '',
}: BoldHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow ? (
        <div
          className="mb-3 inline-block px-3 py-1 text-[10px] font-bold uppercase"
          style={{
            color: 'var(--primary-color)',
            border: '1px solid color-mix(in srgb, var(--primary-color) 60%, transparent)',
            background: 'color-mix(in srgb, var(--primary-color) 10%, transparent)',
            letterSpacing: '0.2em',
          }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        className="text-3xl md:text-5xl lg:text-6xl font-extrabold uppercase leading-[0.95] tracking-tighter text-white"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-sm md:text-base leading-relaxed text-white/60 max-w-prose">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ── Dark section shell ───────────────────────────────────────────────────────

export interface BoldShellProps {
  id?: string;
  sectionId?: string;
  /** Background variant — solid black, subtle gradient, or accent-stripe. */
  background?: 'black' | 'gradient' | 'stripe';
  children: ReactNode;
  className?: string;
}

export function BoldShell({
  id,
  sectionId,
  background = 'black',
  children,
  className = '',
}: BoldShellProps) {
  const sectionRef = useActivityTracker({
    sectionId: sectionId ?? id ?? 'unknown',
    sectionKind: 'hero',
  });

  const bg =
    background === 'gradient'
      ? 'linear-gradient(180deg, #050505 0%, color-mix(in srgb, var(--primary-color) 8%, #050505) 100%)'
      : background === 'stripe'
        ? 'radial-gradient(80% 60% at 80% 50%, color-mix(in srgb, var(--primary-color) 20%, #0a0a0a), #050505)'
        : '#050505';

  return (
    <section
      ref={sectionRef}
      id={id}
      style={{ background }}
      className={`relative py-16 md:py-24 px-5 md:px-10 overflow-hidden ${className}`}
    >
      {/* Subtle grid texture — industrial gym feel without an image asset. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0 opacity-50"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse at 50% 50%, black 0%, transparent 80%)',
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

// ── Difficulty pill — used by Schedule + Class cards ─────────────────────────

export function DifficultyPill({
  level,
  dotColor,
}: {
  level: string;
  dotColor: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/70">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dotColor }} aria-hidden />
      {level.replace('-', ' ')}
    </span>
  );
}

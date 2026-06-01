'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Skincare Luxe — shared component primitives
// ─────────────────────────────────────────────────────────────────────────────
// NOT registered with the dispatcher. These are internal helpers the 12
// shipped variants compose from — single source of truth for the
// brand-CTA button, the section-heading typography pairing, the rating
// stars row, etc.

import type { ReactNode } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker, getActivitySnapshot } from '@/hooks/useActivityTracker';
import { buildWaDeepLink, type WaIntent } from '@/lib/waDeepLink';

// ── WhatsApp CTA — used by every variant that surfaces a primary CTA ─────────
export interface BrandCtaProps {
  sectionId: string;
  intent: WaIntent;
  productTag?: string;
  /** Visible button text. Falls back to a sensible default per intent. */
  label?: string;
  /** Visual style — gold accent or solid primary. */
  variant?: 'primary' | 'gold' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<BrandCtaProps['size']>, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-7 py-3.5 text-base',
  lg: 'px-9 py-4 text-lg',
};

const INTENT_DEFAULT_LABEL: Record<WaIntent, string> = {
  'general-enquiry':   'Chat on WhatsApp',
  'book-appointment':  'Book a slot',
  'request-quote':     'Request a quote',
  'product-info':      'Ask about products',
  'support':           'Get support',
};

export function BrandCta({
  sectionId,
  intent,
  productTag,
  label,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: BrandCtaProps) {
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
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold ' +
    'transition-transform duration-150 ease-out shadow-[0_10px_28px_-12px_rgba(0,0,0,0.25)] ' +
    'hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50';

  const variantClasses =
    variant === 'gold'
      ? 'bg-[#D4AF37] text-white'
      : variant === 'outline'
        ? 'border border-current text-[color:var(--primary-color)] bg-transparent shadow-none'
        : 'text-white';

  const inlineStyle =
    variant === 'primary'
      ? { background: 'var(--primary-color)' }
      : undefined;

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

// ── Section heading — Playfair Display + brand-primary colour ────────────────
export interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className = '',
}: SectionHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow ? (
        <div
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: '#D4AF37' }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        className="font-heading text-3xl md:text-4xl lg:text-5xl font-bold leading-tight tracking-tight"
        style={{ color: 'var(--primary-color)' }}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base md:text-lg leading-relaxed text-[#4a5560]">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ── Rating stars — used by testimonials ──────────────────────────────────────
export function RatingStars({ rating, className = '' }: { rating: number; className?: string }) {
  return (
    <div className={`inline-flex gap-0.5 ${className}`} aria-label={`Rated ${rating} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < rating ? '#D4AF37' : 'none'}
          stroke="#D4AF37"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

// ── Themed section container — consistent paddings + max-width ───────────────
export function SectionShell({
  id,
  sectionId,
  background = 'transparent',
  children,
  className = '',
}: {
  id?: string;
  sectionId?: string;
  background?: 'transparent' | 'cream' | 'gradient';
  children: ReactNode;
  className?: string;
}) {
  const sectionRef = useActivityTracker({
    sectionId: sectionId ?? id ?? 'unknown',
    sectionKind: 'hero',
  });

  const bg =
    background === 'cream'
      ? '#fbfaf7'
      : background === 'gradient'
        ? 'linear-gradient(180deg, #ffffff 0%, color-mix(in srgb, var(--primary-color) 4%, #ffffff) 100%)'
        : 'transparent';

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

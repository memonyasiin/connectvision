'use client';

// ─────────────────────────────────────────────────────────────────────────────
// Medical Clinical — shared clinical primitives
// ─────────────────────────────────────────────────────────────────────────────
// NOT registered with the dispatcher. Each medical variant composes from
// these. Visual language is trust-first: generous whitespace, Inter
// throughout (no serifs — serif feels too decorative for clinical
// settings), desaturated cyan primary, subtle hairline borders, strong
// contrast for accessibility.

import type { ReactNode } from 'react';
import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker, getActivitySnapshot } from '@/hooks/useActivityTracker';
import { buildWaDeepLink, type WaIntent } from '@/lib/waDeepLink';

// ── Clinical CTA ─────────────────────────────────────────────────────────────

export interface ClinicCtaProps {
  sectionId: string;
  intent: WaIntent;
  productTag?: string;
  prefillBody?: string;
  label?: string;
  variant?: 'primary' | 'outline' | 'emergency';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: ReactNode;
}

const SIZE_CLASSES: Record<NonNullable<ClinicCtaProps['size']>, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-3.5 text-base',
};

const INTENT_DEFAULT_LABEL: Record<WaIntent, string> = {
  'general-enquiry':   'Send a message',
  'book-appointment':  'Book appointment',
  'request-quote':     'Request estimate',
  'product-info':      'See services',
  'support':           'Get support',
};

export function ClinicCta({
  sectionId,
  intent,
  productTag,
  prefillBody,
  label,
  variant = 'primary',
  size = 'md',
  className = '',
  children,
}: ClinicCtaProps) {
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
    'inline-flex items-center justify-center gap-2 font-medium tracking-wide rounded-md ' +
    'transition-all duration-150 cursor-pointer ' +
    'disabled:cursor-not-allowed disabled:opacity-40 ' +
    'hover:-translate-y-0.5 active:translate-y-0 ' +
    'focus:outline-none focus:ring-2 focus:ring-offset-2';

  let variantClasses = '';
  let inlineStyle: React.CSSProperties | undefined = undefined;
  if (variant === 'primary') {
    variantClasses = 'text-white';
    inlineStyle = {
      background: 'var(--primary-color)',
      boxShadow: '0 4px 12px -4px color-mix(in srgb, var(--primary-color) 50%, transparent)',
    };
  } else if (variant === 'outline') {
    variantClasses = 'border bg-white';
    inlineStyle = {
      borderColor: 'var(--primary-color)',
      color: 'var(--primary-color)',
    };
  } else {
    // emergency — solid red for visual urgency
    variantClasses = 'text-white bg-rose-600 hover:bg-rose-700';
  }

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

// ── Clinical heading — Inter, no serif ───────────────────────────────────────

export interface ClinicHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function ClinicHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  className = '',
}: ClinicHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow ? (
        <div
          className="mb-3 text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ color: 'var(--primary-color)' }}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        className="text-3xl md:text-4xl lg:text-5xl font-semibold leading-tight tracking-tight text-slate-900"
      >
        {title}
      </h2>
      {subtitle ? (
        <p className="mt-4 text-base md:text-lg leading-relaxed text-slate-600">
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ── Clinical section shell ───────────────────────────────────────────────────

export interface ClinicShellProps {
  id?: string;
  sectionId?: string;
  background?: 'white' | 'slate';
  children: ReactNode;
  className?: string;
}

export function ClinicShell({
  id,
  sectionId,
  background = 'white',
  children,
  className = '',
}: ClinicShellProps) {
  const sectionRef = useActivityTracker({
    sectionId: sectionId ?? id ?? 'unknown',
    sectionKind: 'hero',
  });

  const bg = background === 'slate' ? '#f8fafc' : '#ffffff';

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

// ── Trust badge — used by HeroClinical + ContactSplitMap ────────────────────

export function TrustBadge({
  label,
  qualifier,
  size = 'md',
}: {
  label: string;
  qualifier?: string;
  size?: 'sm' | 'md';
}) {
  const padding = size === 'sm' ? 'px-3 py-1.5' : 'px-4 py-2';
  const labelText = size === 'sm' ? 'text-xs' : 'text-sm';
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white ${padding}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: 'var(--primary-color)' }}
        aria-hidden
      >
        <path d="M12 2L4 6v6c0 5.5 3.84 10.74 8 12 4.16-1.26 8-6.5 8-12V6l-8-4z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
      <span className={`${labelText} font-semibold text-slate-800`}>{label}</span>
      {qualifier ? (
        <span className={`${size === 'sm' ? 'text-[10px]' : 'text-xs'} text-slate-400`}>
          {qualifier}
        </span>
      ) : null}
    </div>
  );
}

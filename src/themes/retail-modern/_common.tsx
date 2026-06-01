// ═════════════════════════════════════════════════════════════════════════════
// Retail Modern — shared primitives
// ─────────────────────────────────────────────────────────────────────────────
// 5th vertical in the High-Five registry. Aesthetic: indigo accent on warm
// off-white, generous whitespace, sans-serif headings with tight tracking,
// rounded-2xl cards with subtle 1px borders (no heavy shadows).
//
// DECOUPLING NOTE
//   Unlike the other four themes (skincare-luxe, fitness-bold,
//   hospitality-warm, medical-clinical), Retail Modern primitives accept
//   their config via PROPS rather than reading `useBuild()`. This is
//   deliberate so the theme stays renderable in pure-frontend
//   marketplace-tier contexts (ThemeForest preview, static-export pages)
//   AND inside the Sovereign SaaS shell when wired with live tenant
//   config later. No `'use client'` directive — pure server-renderable.
// ═════════════════════════════════════════════════════════════════════════════

import type { ReactNode, CSSProperties } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Brand tokens — match `THEME_CATEGORIES.retail-modern.primaryColor`
// ─────────────────────────────────────────────────────────────────────────────

export const RETAIL_PRIMARY = '#4338ca';      // indigo-700
export const RETAIL_PRIMARY_SOFT = '#eef2ff'; // indigo-50
export const RETAIL_INK = '#1e1b4b';          // near-black with indigo tint
export const RETAIL_SUBTLE = '#64748b';       // slate-500
export const RETAIL_CANVAS = '#fafaf9';       // stone-50 — light warm canvas

// ─────────────────────────────────────────────────────────────────────────────
// Section shell — generous padding, max-width container, optional inverted bg
// ─────────────────────────────────────────────────────────────────────────────

export interface RetailShellProps {
  id?: string;
  /** Background mode — drives canvas + text contrast. */
  background?: 'canvas' | 'ink' | 'soft';
  children: ReactNode;
  className?: string;
}

export function RetailShell({
  id,
  background = 'canvas',
  children,
  className = '',
}: RetailShellProps) {
  const bg =
    background === 'ink'
      ? RETAIL_INK
      : background === 'soft'
        ? RETAIL_PRIMARY_SOFT
        : RETAIL_CANVAS;
  return (
    <section
      id={id}
      style={{ background: bg }}
      className={`py-20 md:py-28 px-5 md:px-10 ${className}`}
    >
      <div className="max-w-6xl mx-auto">{children}</div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Eyebrow + title + subtitle stack
// ─────────────────────────────────────────────────────────────────────────────

export interface RetailHeadingProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'left' | 'center';
  invert?: boolean;
  className?: string;
}

export function RetailHeading({
  eyebrow,
  title,
  subtitle,
  align = 'left',
  invert = false,
  className = '',
}: RetailHeadingProps) {
  const alignClass = align === 'center' ? 'text-center mx-auto' : 'text-left';
  const titleColor = invert ? 'text-white' : '';
  const subColor   = invert ? 'text-white/70' : 'text-slate-600';
  const eyebrowColor = invert ? 'text-indigo-300' : '';

  const titleStyle: CSSProperties | undefined = invert
    ? undefined
    : { color: RETAIL_INK };

  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {eyebrow ? (
        <div
          className={`mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] ${eyebrowColor}`}
          style={!invert ? { color: RETAIL_PRIMARY } : undefined}
        >
          {eyebrow}
        </div>
      ) : null}
      <h2
        className={`text-4xl md:text-5xl lg:text-6xl font-semibold leading-[1.05] tracking-tight ${titleColor}`}
        style={titleStyle}
      >
        {title}
      </h2>
      {subtitle ? (
        <p className={`mt-5 text-base md:text-lg leading-relaxed ${subColor} max-w-prose`}>
          {subtitle}
        </p>
      ) : null}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CTA — anchor-based so it works as a server component
// ─────────────────────────────────────────────────────────────────────────────

export interface RetailCtaProps {
  href: string;
  label: string;
  variant?: 'primary' | 'outline' | 'on-photo';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  /** Optional rel for external links. */
  external?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<RetailCtaProps['size']>, string> = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-7 py-3 text-sm',
  lg: 'px-9 py-4 text-base',
};

export function RetailCta({
  href,
  label,
  variant = 'primary',
  size = 'md',
  className = '',
  external = false,
}: RetailCtaProps) {
  const base =
    'inline-flex items-center justify-center font-semibold tracking-wide ' +
    'rounded-xl transition-all duration-200 ease-out ' +
    'hover:-translate-y-0.5 active:translate-y-0';

  let variantClasses = '';
  let inlineStyle: CSSProperties | undefined;
  if (variant === 'primary') {
    variantClasses = 'text-white shadow-md';
    inlineStyle = {
      background: RETAIL_PRIMARY,
      boxShadow: `0 10px 24px -10px ${RETAIL_PRIMARY}66`,
    };
  } else if (variant === 'outline') {
    variantClasses = 'border bg-transparent';
    inlineStyle = { borderColor: RETAIL_PRIMARY, color: RETAIL_PRIMARY };
  } else {
    variantClasses = 'bg-white/95 text-slate-900 backdrop-blur-sm shadow-lg hover:bg-white';
  }

  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={`${base} ${SIZE_CLASSES[size]} ${variantClasses} ${className}`}
      style={inlineStyle}
    >
      {label}
    </a>
  );
}

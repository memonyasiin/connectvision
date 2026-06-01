// ═════════════════════════════════════════════════════════════════════════════
// Retail Modern — HeroPhoto variant
// ─────────────────────────────────────────────────────────────────────────────
// Editorial hero: full-bleed product photo on the right, ink-on-canvas
// content stack on the left. CTA points to the merchant's primary contact
// channel (WhatsApp deep link or storefront URL — caller decides).
//
// Why a static `next/image`-free <img>?
//   Marketplace-tier rendering ships into ThemeForest previews that may
//   not have Next.js available. Using a vanilla <img loading="lazy"> keeps
//   the file portable. The Sovereign SaaS shell can swap to <Image> when
//   embedding in tenant pages — this hero exposes `imageSrc` as a prop.
// ═════════════════════════════════════════════════════════════════════════════

import { RetailShell, RetailHeading, RetailCta } from './_common';

export interface HeroPhotoProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  imageSrc: string;
  imageAlt: string;
  /** Primary CTA — typically a WhatsApp deep link or storefront URL. */
  ctaHref: string;
  ctaLabel: string;
  /** Optional secondary outline CTA. */
  secondaryHref?: string;
  secondaryLabel?: string;
}

export function HeroPhoto({
  eyebrow,
  title,
  subtitle,
  imageSrc,
  imageAlt,
  ctaHref,
  ctaLabel,
  secondaryHref,
  secondaryLabel,
}: HeroPhotoProps) {
  return (
    <RetailShell background="canvas" id="hero">
      <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
        {/* ── Content stack ─────────────────────────────────────────────── */}
        <div className="lg:col-span-6">
          <RetailHeading
            eyebrow={eyebrow}
            title={title}
            subtitle={subtitle}
            align="left"
          />
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <RetailCta href={ctaHref} label={ctaLabel} size="lg" />
            {secondaryHref && secondaryLabel ? (
              <RetailCta
                href={secondaryHref}
                label={secondaryLabel}
                size="lg"
                variant="outline"
              />
            ) : null}
          </div>
        </div>

        {/* ── Hero photo ────────────────────────────────────────────────── */}
        <div className="lg:col-span-6">
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 shadow-[0_20px_60px_-30px_rgba(67,56,202,0.35)]">
            <img
              src={imageSrc}
              alt={imageAlt}
              loading="lazy"
              decoding="async"
              className="w-full h-[420px] md:h-[520px] object-cover"
            />
            {/* Subtle inset highlight — premium editorial feel. */}
            <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/30 rounded-3xl" />
          </div>
        </div>
      </div>
    </RetailShell>
  );
}

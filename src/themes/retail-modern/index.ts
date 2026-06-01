// ═════════════════════════════════════════════════════════════════════════════
// Retail Modern — barrel + sample content for marketplace preview
// ─────────────────────────────────────────────────────────────────────────────
// Re-exports the public components and ships a representative sample-content
// snapshot so the marketplace preview can render a fully-realised demo
// without the operator wiring real data first.
// ═════════════════════════════════════════════════════════════════════════════

export { HeroPhoto } from './HeroPhoto';
export type { HeroPhotoProps } from './HeroPhoto';

export { FooterMinimal } from './FooterMinimal';
export type { FooterMinimalProps, FooterMinimalLink } from './FooterMinimal';

export {
  RetailShell,
  RetailHeading,
  RetailCta,
  RETAIL_PRIMARY,
  RETAIL_PRIMARY_SOFT,
  RETAIL_INK,
  RETAIL_SUBTLE,
  RETAIL_CANVAS,
} from './_common';
export type {
  RetailShellProps,
  RetailHeadingProps,
  RetailCtaProps,
} from './_common';

// ─────────────────────────────────────────────────────────────────────────────
// Sample content — drives the marketplace preview when no tenant config is
// bound. Keep field shapes aligned with the component prop interfaces above.
// ─────────────────────────────────────────────────────────────────────────────

export const RETAIL_MODERN_SAMPLE = {
  hero: {
    eyebrow: 'New Spring Drop',
    title: 'Modern essentials, made for everyday.',
    subtitle:
      'Boutique apparel and accessories curated for the way you actually live — minimalist, comfortable, built to last.',
    imageSrc:
      'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=80',
    imageAlt: 'A curated retail boutique display with neatly folded apparel.',
    ctaHref: '#shop',
    ctaLabel: 'Shop the collection',
    secondaryHref: '#story',
    secondaryLabel: 'Our story',
  },
  footer: {
    businessName: 'Atelier Indigo',
    tagline:
      'Modern boutique retail — thoughtfully sourced, ethically made, delivered next-day across India.',
    links: [
      { label: 'Shop', href: '#shop' },
      { label: 'Lookbook', href: '#lookbook' },
      { label: 'Care guide', href: '#care' },
      { label: 'Returns', href: '#returns' },
    ],
    phone: '+91 98765 43210',
    email: 'hello@atelier-indigo.example',
    address: '14, Linking Road, Bandra West, Mumbai 400050',
  },
} as const;

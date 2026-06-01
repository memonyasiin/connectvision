// ─────────────────────────────────────────────────────────────────────────────
// Skincare Luxe — theme barrel
// ─────────────────────────────────────────────────────────────────────────────
// Side-effect imports for every variant. Each variant file has a top-level
// `registerThemeBlock(...)` call that runs at module evaluation time —
// these imports guarantee evaluation happens (pure re-export syntax is
// tree-shaken by Turbopack/webpack when no symbol is consumed).
//
// Net effect: importing this barrel populates the dispatcher's
// BLOCK_REGISTRY with all 12 skincare-luxe blocks.

import './HeroSplit';
import './HeroCentered';
import './ServicesGrid3Col';
import './ServicesListIcons';
import './GalleryMasonry';
import './GalleryCarousel';
import './TestimonialsCarousel';
import './TestimonialsGrid';
import './ContactSplitMap';
import './ContactMinimal';
import './FooterMinimal';
import './FooterWide';

// Named re-exports — for the variant-preview catalogue page that needs
// to render a single variant in isolation for ThemeForest reviewers.
// Bundler will keep these because they're consumed by named imports.
export { HeroSplit }            from './HeroSplit';
export { HeroCentered }         from './HeroCentered';
export { ServicesGrid3Col }     from './ServicesGrid3Col';
export { ServicesListIcons }    from './ServicesListIcons';
export { GalleryMasonry }       from './GalleryMasonry';
export { GalleryCarousel }      from './GalleryCarousel';
export { TestimonialsCarousel } from './TestimonialsCarousel';
export { TestimonialsGrid }     from './TestimonialsGrid';
export { ContactSplitMap }      from './ContactSplitMap';
export { ContactMinimal }       from './ContactMinimal';
export { FooterMinimal }        from './FooterMinimal';
export { FooterWide }           from './FooterWide';

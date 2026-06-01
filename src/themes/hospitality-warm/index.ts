// ─────────────────────────────────────────────────────────────────────────────
// Hospitality Warm — theme barrel
// ─────────────────────────────────────────────────────────────────────────────
// Side-effect imports trigger module evaluation. Component REGISTRATION
// happens centrally in `@/themes/_registry.tsx` via the static seed —
// MODULE 2 post-mortem covers why centralized registration is required
// (circular-import TDZ would bite otherwise).

import './HeroPhoto';
import './MenuTabbed';
import './MenuList';
import './GalleryGrid4Col';
import './ContactSplitMap';
import './FooterMinimal';

export { HeroPhoto }         from './HeroPhoto';
export { MenuTabbed }        from './MenuTabbed';
export { MenuList }          from './MenuList';
export { GalleryGrid4Col }   from './GalleryGrid4Col';
export { ContactSplitMap }   from './ContactSplitMap';
export { FooterMinimal }     from './FooterMinimal';

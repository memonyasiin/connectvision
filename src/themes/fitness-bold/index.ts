// ─────────────────────────────────────────────────────────────────────────────
// Fitness Bold — theme barrel
// ─────────────────────────────────────────────────────────────────────────────
// Side-effect imports trigger module evaluation; named re-exports give the
// variant-preview catalogue page single-variant access. Component
// REGISTRATION happens in `@/themes/_registry.tsx` via the static seed
// (see MODULE 2 post-mortem for why centralized registration is required
// — circular-import TDZ would bite otherwise).

import './HeroBold';
import './FeaturesStatBlock';
import './ScheduleWeekGrid';
import './TestimonialsCardStack';
import './ContactMinimal';
import './FooterSocialHeavy';

export { HeroBold }              from './HeroBold';
export { FeaturesStatBlock }     from './FeaturesStatBlock';
export { ScheduleWeekGrid }      from './ScheduleWeekGrid';
export { TestimonialsCardStack } from './TestimonialsCardStack';
export { ContactMinimal }        from './ContactMinimal';
export { FooterSocialHeavy }     from './FooterSocialHeavy';

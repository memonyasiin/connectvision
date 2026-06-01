// ─────────────────────────────────────────────────────────────────────────────
// Medical Clinical — theme barrel
// ─────────────────────────────────────────────────────────────────────────────
// Side-effect imports trigger module evaluation. Component REGISTRATION
// happens centrally in `@/themes/_registry.tsx` via the static seed
// (MODULE 2 post-mortem covers why centralized registration is required —
// circular-import TDZ would bite otherwise).

import './HeroClinical';
import './ServicesGrid3Col';
import './ScheduleSlotGrid';
import './RosterDoctorCards';
import './ContactSplitMap';
import './FooterMinimal';

export { HeroClinical }      from './HeroClinical';
export { ServicesGrid3Col }  from './ServicesGrid3Col';
export { ScheduleSlotGrid }  from './ScheduleSlotGrid';
export { RosterDoctorCards } from './RosterDoctorCards';
export { ContactSplitMap }   from './ContactSplitMap';
export { FooterMinimal }     from './FooterMinimal';

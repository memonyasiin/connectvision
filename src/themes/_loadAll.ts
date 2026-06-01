// ─────────────────────────────────────────────────────────────────────────────
// Theme registration entrypoint
// ─────────────────────────────────────────────────────────────────────────────
// Single import side-effects every shipped theme's variants into the
// dispatcher's BLOCK_REGISTRY. Pull this from `app/layout.tsx` exactly once
// and the runtime resolver works for every (theme, kind, variant) triple
// the catalogue advertises.
//
// MODULE 3+ adds more `import '@/themes/<theme-id>'` lines here as new
// themes ship. There is no other change required — manifests, dispatcher,
// and consumers all keep working unchanged.

import '@/themes/skincare-luxe';
import '@/themes/fitness-bold';
import '@/themes/hospitality-warm';
import '@/themes/medical-clinical';

export {}; // Pure side-effect module — no re-exports.

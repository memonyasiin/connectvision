# ConnectVision SaaS

> All-in-One Business Operating System for SMBs. AI website builder + multi-tenant SaaS gateway.

## What this is

ConnectVision is a Next.js 15 + TypeScript application designed around a 5-tiered enterprise architecture:

1. **Centralized State & Dynamic UI Injection Engine** — `BuildContext` holds an immutable schema of business metadata. Color/typography changes write to CSS custom properties; text changes route through granular selector hooks so unrelated components never re-render.

2. **Modular Section Swapper** — Each page sector (hero, services, features, testimonials, contact, footer) has 3–5 pre-coded layout variants. The parent dispatcher renders the variant indicated by `selectedVariantId` in the schema. No absolute-positioned canvas, no layout regressions.

3. **Cross-Platform Unified Ecosystem Hook (Pataa Core Sync)** — Generated tenant sites POST every lead to `/api/crm-sync/lead`, which forwards to Pataa CRM (`pataainternational.com/api/crm/leads/intake`) and mirrors to Pataa Workops. Single intake surface; tenant builds never hold CRM credentials.

4. **Micro-Hosting + Hybrid Delivery** — Export to clean `.zip` for developers; one-click subdomain deploy (`<tenant>.connectvision.io`) for non-technical clients via Cloudflare DNS + edge runtime.

5. **Zero-Click Contextual AI Sales Agent + PataaWaa WhatsApp Engine** — Client-side `useActivityTracker` records scroll depth, dwell time, click intents. The WhatsApp CTA bundles all of it into a context-aware `wa.me` deep-link with a `[CV:...]` tag. `/api/waa/webhook` receives the inbound message, parses the tag, calls the LLM agent, and pipes confirmed bookings back to Pataa CRM.

## Quick start

```bash
npm install
cp .env.example .env.local   # then fill in
npm run dev                  # http://localhost:3100
```

Open `http://localhost:3100` and edit the floating panel in the bottom-right to see live theming + variant swapping in action.

## Directory tree

```
ConnectVision-SaaS/
├── app/                                  # Next.js App Router
│   ├── layout.tsx                        # Root layout — wraps everything in <BuildProvider>
│   ├── page.tsx                          # Demo landing with live-edit panel
│   ├── globals.css                       # CSS var defaults
│   ├── (marketing)/                      # Public ConnectVision marketing site
│   │   ├── themes/page.tsx               # Theme catalog
│   │   ├── pricing/page.tsx
│   │   └── about/page.tsx
│   ├── (builder)/                        # Authed editor
│   │   ├── customize/[themeId]/page.tsx  # Personalization form + live preview
│   │   ├── preview/[buildId]/page.tsx    # Full-screen preview
│   │   └── dashboard/page.tsx            # Owner dashboard (subs, exports, licenses)
│   ├── (rendered)/                       # Multi-tenant tenant sites
│   │   └── [subdomain]/page.tsx          # <tenant>.connectvision.io entry
│   └── api/
│       ├── builds/                       # CRUD for BuildSchema persistence
│       ├── crm-sync/
│       │   └── lead/route.ts             # Tier 3 — Pataa CRM lead intake
│       ├── deploy/                       # Tier 4 — subdomain provisioning
│       ├── export/                       # Tier 4 — .zip generation (JSZip)
│       └── waa/
│           ├── prime/route.ts            # Activity snapshot beacon
│           └── webhook/route.ts          # Tier 5 — PataaWaa inbound webhook
│
├── src/
│   ├── contexts/
│   │   └── BuildContext.tsx              # ⭐ Tier 1 — split read/write contexts + selectors
│   ├── types/
│   │   └── build.ts                      # BuildSchema, BrandColor, SectionConfig, …
│   ├── lib/
│   │   ├── cssVarInjector.ts             # Tier 1 — CSS custom property writer
│   │   ├── crmBridge.ts                  # Tier 3 — Pataa CRM + Workops forwarder
│   │   ├── waDeepLink.ts                 # Tier 5 — wa.me builder with [CV:...] tag
│   │   └── exportZip.ts                  # Tier 4 — bundle to downloadable .zip
│   ├── hooks/
│   │   └── useActivityTracker.ts         # Tier 5 — IntersectionObserver-based tracker
│   ├── sections/                         # Tier 2 — modular section library
│   │   ├── hero/
│   │   │   ├── index.tsx                 # Variant dispatcher
│   │   │   ├── meta.ts                   # Variant registry
│   │   │   ├── HeroSplit.tsx
│   │   │   └── HeroCentered.tsx
│   │   ├── services/
│   │   ├── features/
│   │   ├── testimonials/
│   │   ├── contact/
│   │   └── footer/
│   ├── components/
│   │   ├── builder/                      # Editor UI (color picker, section swapper)
│   │   ├── chat/
│   │   │   └── WaWidget.tsx              # Floating WhatsApp widget (Tier 5)
│   │   └── shared/
│   └── data/
│       ├── defaultSchema.ts              # Seed schema
│       └── variants/                     # Per-section variant catalogs
│
├── package.json
├── tsconfig.json                         # strict + noUncheckedIndexedAccess
├── next.config.mjs                       # typedRoutes + image domains
├── tailwind.config.ts                    # cv-* CSS-var-backed colors
├── postcss.config.mjs
├── .env.example
└── README.md
```

## Tier-by-tier behavior

| Tier | What changes | What re-renders | Cost |
|---|---|---|---|
| 1 — color/font edit | `--cv-color-*` / `--cv-font-*` | nothing (browser repaints from CSS) | O(1) DOM mutation |
| 1 — text field edit (e.g. businessName) | selector hooks consuming THAT slice | only components that read it | O(consumers) |
| 2 — variant swap | `sections[i].selectedVariantId` | the one section's dispatcher | O(1) |
| 3 — form submit | lead intake to Pataa CRM | n/a | one upstream POST |
| 4 — export / deploy | server-side bundle | n/a | offline |
| 5 — WhatsApp click | wa.me opens; beacon to /api/waa/prime | nothing | one beacon + native nav |

## Next milestones

- [ ] Persist BuildSchema to MySQL (`/api/builds/*`)
- [ ] Services + Contact + Footer section variants (3 each minimum)
- [ ] Razorpay subscription checkout for the `<tenant>.connectvision.io` plan
- [ ] Cloudflare API integration for subdomain provisioning (`/api/deploy`)
- [ ] JSZip exporter that compiles the schema → static HTML/CSS bundle
- [ ] AI-suggest endpoint that takes an industry + business name and fills the schema

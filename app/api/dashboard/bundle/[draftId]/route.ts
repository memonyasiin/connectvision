// ═════════════════════════════════════════════════════════════════════════════
// GET /api/dashboard/bundle/[draftId] — Theme bundle .zip download (MODULE 13)
// ─────────────────────────────────────────────────────────────────────────────
// Delivers a real, downloadable .zip for any PURCHASED CustomizationDraft.
// Closes the customer-facing "Download bundle [SOON]" placeholder on
// /dashboard and completes the marketplace value loop (purchase → license
// key → actual file delivery).
//
// BUNDLE CONTENTS
//   index.html       — fully self-contained personalised landing page
//                       (Tailwind via CDN, customer's data inlined, brand
//                       colour via CSS variable, no JavaScript needed).
//   styles.css       — minimal extra stylesheet for layout polish
//   README.md        — deploy instructions for non-tech buyers (just open
//                       index.html in a browser, OR deploy to Vercel /
//                       Netlify via the bundled config).
//   vercel.json      — one-click Vercel deploy config
//   netlify.toml     — alternate Netlify deploy config
//   LICENSE.txt      — licence key + terms reminder
//
// SCOPE LIMITS (intentional, per MODULE 13 brief)
//   - Single-page HTML — not the full React/Next dynamic theme. The
//     customer gets a usable static site they can deploy in minutes.
//   - No JS — keeps the bundle small + works on any static host
//     (including catbox / GitHub Pages / S3 / their own laptop).
//   - When MODULE 14 ships, we can swap the single-file template for a
//     full Next.js static-export bundle (more complex, also bigger).
//
// AUTH
//   PUBLIC route — anyone holding a draftId can attempt download. The
//   server gates by `status === 'PURCHASED'`. The draftId is a cuid
//   (unguessable) so the auth posture is "if you know the id, you
//   bought it (or someone you trust shared the link with you)". Adequate
//   for an MVP marketplace; harden via session cookie in a later module.
//
// RUNTIME
//   nodejs — needs Prisma + jszip + binary streaming. Not edge-compatible.
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import JSZip from 'jszip';
import { prisma } from '@/lib/prisma';
import { findThemeBySlug, type MarketplaceTheme } from '@/data/themeMarketplaceCatalog';
import { THEME_CATEGORY_BY_ID, type ThemeCategoryMeta } from '@/themes/_categories';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Service shape — what the customer entered in the wizard (MODULE 7)
// ─────────────────────────────────────────────────────────────────────────────

interface DraftService {
  name: string;
  description?: string;
  priceInr?: number;
}

function coerceServices(raw: unknown): DraftService[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s): s is Record<string, unknown> => s !== null && typeof s === 'object')
    .map((s) => ({
      name: typeof s['name'] === 'string' ? s['name'] : '',
      ...(typeof s['description'] === 'string' ? { description: s['description'] } : {}),
      ...(typeof s['priceInr'] === 'number' ? { priceInr: s['priceInr'] } : {}),
    }))
    .filter((s) => s.name.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers — escape user-supplied strings before they hit HTML
// ─────────────────────────────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Filename-safe slug from the business name. */
function safeFileSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'site';
}

// ─────────────────────────────────────────────────────────────────────────────
// Template builders
// ─────────────────────────────────────────────────────────────────────────────

interface BuilderInput {
  businessName: string;
  tagline: string | null;
  aboutText: string | null;
  primaryColor: string;
  logoUrl: string | null;
  services: DraftService[];
  contactPhone: string | null;
  contactEmail: string | null;
  contactAddress: string | null;
  theme: MarketplaceTheme;
  category: ThemeCategoryMeta;
  licenseKey: string;
  purchasedAt: Date;
}

function buildIndexHtml(input: BuilderInput): string {
  const eBusiness = escapeHtml(input.businessName);
  const eTagline = input.tagline ? escapeHtml(input.tagline) : '';
  const eAbout = input.aboutText ? escapeHtml(input.aboutText) : '';
  const ePhone = input.contactPhone ? escapeHtml(input.contactPhone) : '';
  const eEmail = input.contactEmail ? escapeHtml(input.contactEmail) : '';
  const eAddress = input.contactAddress ? escapeHtml(input.contactAddress) : '';
  const eColor = escapeHtml(input.primaryColor);
  const eLogoSrc = input.logoUrl ? escapeHtml(input.logoUrl) : '';
  const eThemeName = escapeHtml(input.theme.name);
  const eCategoryLabel = escapeHtml(input.category.label);

  const servicesHtml = input.services.length === 0 ? '' : `
    <section class="services" id="services">
      <div class="container">
        <h2>Our services</h2>
        <div class="services-grid">
          ${input.services.map((s) => `
            <article class="service-card">
              <h3>${escapeHtml(s.name)}</h3>
              ${s.description ? `<p>${escapeHtml(s.description)}</p>` : ''}
              ${typeof s.priceInr === 'number' ? `<div class="price">₹${s.priceInr.toLocaleString('en-IN')}</div>` : ''}
            </article>
          `).join('\n')}
        </div>
      </div>
    </section>
  `;

  const contactHtml = (ePhone || eEmail || eAddress) ? `
    <section class="contact" id="contact">
      <div class="container">
        <h2>Get in touch</h2>
        <div class="contact-grid">
          ${ePhone ? `<div class="contact-item"><strong>Phone</strong><a href="tel:${ePhone.replace(/[^\d+]/g, '')}">${ePhone}</a></div>` : ''}
          ${eEmail ? `<div class="contact-item"><strong>Email</strong><a href="mailto:${eEmail}">${eEmail}</a></div>` : ''}
          ${eAddress ? `<div class="contact-item"><strong>Address</strong><span>${eAddress}</span></div>` : ''}
        </div>
      </div>
    </section>
  ` : '';

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${eBusiness}</title>
  ${eTagline ? `<meta name="description" content="${eTagline}" />` : ''}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="./styles.css" />
  <style>
    :root {
      --primary: ${eColor};
      --primary-soft: ${eColor}1a;
    }
  </style>
</head>
<body>
  <!-- Brand stripe -->
  <div class="brand-stripe" aria-hidden="true"></div>

  <header class="site-header">
    <div class="container header-inner">
      <a href="#top" class="brand">
        ${eLogoSrc
          ? `<img src="${eLogoSrc}" alt="${eBusiness} logo" class="brand-logo" onerror="this.style.display='none'" />`
          : `<span class="brand-glyph">${eBusiness.charAt(0)}</span>`}
        <span class="brand-name">${eBusiness}</span>
      </a>
      <nav class="site-nav">
        ${input.services.length ? `<a href="#services">Services</a>` : ''}
        ${(ePhone || eEmail || eAddress) ? `<a href="#contact">Contact</a>` : ''}
      </nav>
    </div>
  </header>

  <main id="top">
    <!-- Hero -->
    <section class="hero">
      <div class="container">
        <div class="hero-eyebrow">${eCategoryLabel}</div>
        <h1>${eBusiness}</h1>
        ${eTagline ? `<p class="tagline">${eTagline}</p>` : ''}
        ${eAbout ? `<p class="about">${eAbout}</p>` : ''}
        <div class="hero-ctas">
          ${ePhone ? `<a href="tel:${ePhone.replace(/[^\d+]/g, '')}" class="btn btn-primary">Call us</a>` : ''}
          ${(ePhone || eEmail || eAddress) ? `<a href="#contact" class="btn btn-outline">Find us</a>` : ''}
        </div>
      </div>
    </section>

    ${servicesHtml}
    ${contactHtml}
  </main>

  <footer class="site-footer">
    <div class="container">
      <div>© ${new Date().getFullYear()} ${eBusiness}. All rights reserved.</div>
      <div class="footer-meta">
        Powered by <a href="https://connectvision.us" target="_blank" rel="noopener">ConnectVision</a>
        · <em>${eThemeName}</em>
      </div>
    </div>
  </footer>
</body>
</html>
`;
}

const STYLES_CSS = `/* ConnectVision bundled theme — generated stylesheet */
*, *::before, *::after { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  color: #1a1a1a;
  background: #fafaf9;
  line-height: 1.6;
}
a { color: var(--primary); text-decoration: none; }
a:hover { text-decoration: underline; }

.container { max-width: 1100px; margin: 0 auto; padding: 0 24px; }

.brand-stripe { height: 4px; background: var(--primary); }

.site-header {
  background: #fff;
  border-bottom: 1px solid #e7e5e4;
  position: sticky; top: 0; z-index: 30;
  backdrop-filter: blur(10px);
}
.header-inner { display: flex; justify-content: space-between; align-items: center; height: 64px; }
.brand { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 1.1rem; color: #1a1a1a; }
.brand-glyph {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px; border-radius: 6px;
  background: var(--primary); color: #fff; font-weight: 800;
}
.brand-logo { width: 32px; height: 32px; object-fit: cover; border-radius: 6px; }
.site-nav { display: flex; gap: 28px; font-size: 0.95rem; color: #525252; }

.hero {
  padding: 80px 0;
  background: linear-gradient(180deg, var(--primary-soft) 0%, transparent 100%);
}
.hero-eyebrow {
  display: inline-block; font-size: 0.75rem; letter-spacing: 0.18em;
  font-weight: 700; text-transform: uppercase;
  color: var(--primary); margin-bottom: 16px;
}
.hero h1 {
  font-size: clamp(2.5rem, 6vw, 4rem); font-weight: 800; line-height: 1.05;
  margin: 0 0 18px; letter-spacing: -0.02em;
}
.tagline { font-size: 1.25rem; color: #404040; margin: 0 0 24px; font-style: italic; }
.about { font-size: 1rem; color: #525252; max-width: 60ch; margin: 0 0 32px; }

.hero-ctas { display: flex; gap: 12px; flex-wrap: wrap; }
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 28px; border-radius: 12px;
  font-weight: 600; font-size: 0.95rem;
  text-decoration: none; transition: transform 0.15s ease;
}
.btn:hover { transform: translateY(-1px); text-decoration: none; }
.btn-primary { background: var(--primary); color: #fff; }
.btn-outline { background: transparent; border: 1.5px solid var(--primary); color: var(--primary); }

.services { padding: 80px 0; background: #fff; }
.services h2, .contact h2 {
  font-size: 2rem; font-weight: 700; margin: 0 0 40px;
  letter-spacing: -0.02em;
}
.services-grid {
  display: grid; gap: 20px;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}
.service-card {
  padding: 28px;
  background: #fafaf9; border: 1px solid #e7e5e4;
  border-radius: 16px; transition: border-color 0.15s ease;
}
.service-card:hover { border-color: var(--primary); }
.service-card h3 { margin: 0 0 8px; font-size: 1.2rem; font-weight: 700; }
.service-card p { margin: 0 0 12px; color: #525252; font-size: 0.95rem; }
.service-card .price {
  display: inline-block; font-weight: 700; font-size: 1.1rem;
  color: var(--primary);
}

.contact { padding: 80px 0; background: #fafaf9; }
.contact-grid {
  display: grid; gap: 24px;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
}
.contact-item {
  padding: 24px; background: #fff;
  border: 1px solid #e7e5e4; border-radius: 12px;
  display: flex; flex-direction: column; gap: 6px;
}
.contact-item strong {
  font-size: 0.7rem; letter-spacing: 0.15em;
  text-transform: uppercase; color: #737373;
}

.site-footer {
  padding: 32px 0; border-top: 1px solid #e7e5e4;
  background: #f5f5f4; color: #737373; font-size: 0.85rem;
}
.site-footer .container {
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 12px;
}
.footer-meta em { color: #525252; font-style: normal; font-weight: 500; }

@media (max-width: 640px) {
  .hero { padding: 56px 0; }
  .services, .contact { padding: 56px 0; }
  .site-nav { display: none; }
}
`;

function buildReadme(input: BuilderInput): string {
  return `# ${input.businessName} — ConnectVision Theme Bundle

Generated: ${input.purchasedAt.toISOString().slice(0, 10)}
Theme: **${input.theme.name}** (${input.category.label})

---

## What's in this folder

- **index.html** — your website's home page, personalised with all your details
- **styles.css** — visual styling (colours, layout, typography)
- **vercel.json** — one-click deploy config for Vercel
- **netlify.toml** — alternate deploy config for Netlify
- **LICENSE.txt** — your lifetime licence key + terms

## 🚀 The easiest way to publish your website

### Option 1 — Just preview locally (no setup)
Double-click **index.html**. It opens in your browser. Done.

### Option 2 — Deploy to Vercel (free, 60 seconds)
1. Sign up at **https://vercel.com/signup** with your email
2. Drag this entire folder onto the Vercel dashboard
3. Vercel reads \`vercel.json\` and publishes your site
4. You get a free \`*.vercel.app\` URL instantly
5. (Optional) Add your own custom domain in Vercel's domain settings

### Option 3 — Deploy to Netlify (free, drag-and-drop)
1. Sign up at **https://app.netlify.com**
2. Drag this folder onto the Netlify deploys area
3. Netlify reads \`netlify.toml\` and publishes
4. Free \`*.netlify.app\` URL + custom domain support

### Option 4 — Upload to your own host
Upload all the files (especially **index.html** and **styles.css**) to your
hosting provider's \`public_html\` (or equivalent) folder. Works with cPanel,
shared hosting, S3, GitHub Pages, anywhere.

---

## ✏️ How to edit your content

Open **index.html** in any text editor (Notepad++, VS Code, even Notepad).
Search for the text you want to change. Replace. Save. Re-upload.

For colour changes: find \`--primary: ${input.primaryColor};\` near the top
of the file and change the hex code to anything you want (try
**https://coolors.co** for ideas).

For deeper customisation, edit **styles.css** — every section has labelled
comments.

---

## 🆘 Need help?

Email **support@connectvision.us** with your licence key (in LICENSE.txt)
and we'll help you out.

---

## 🔁 Want to change the theme entirely?

Your lifetime licence covers UNLIMITED theme re-customisations.

1. Go to **https://www.connectvision.us/dashboard**
2. Enter your email (the one used at checkout: ${input.contactEmail ?? 'on your purchase'})
3. Click **Re-customise** on this purchase
4. Pick a different theme or update your details
5. Download a fresh bundle

Welcome to ConnectVision. We hope your business thrives.
`;
}

const VERCEL_JSON = `{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "X-Frame-Options", "value": "SAMEORIGIN" }
      ]
    }
  ]
}
`;

const NETLIFY_TOML = `[build]
  publish = "."

[[headers]]
  for = "/*"
  [headers.values]
    X-Content-Type-Options = "nosniff"
    X-Frame-Options = "SAMEORIGIN"
`;

function buildLicenseText(input: BuilderInput): string {
  return `ConnectVision · Lifetime Theme Licence

────────────────────────────────────────────────────────────────────
Licence Key:  ${input.licenseKey}
Issued To:    ${input.businessName}
Theme:        ${input.theme.name}
Issued On:    ${input.purchasedAt.toISOString().slice(0, 10)}
Marketplace:  https://www.connectvision.us
────────────────────────────────────────────────────────────────────

LICENCE TERMS (plain English)

1. YOU OWN THIS THEME for the lifetime of your business. No subscription,
   no renewal fees, no expiry.

2. YOU CAN customise, modify, recolour, retext, re-host, redeploy, and
   re-customise this theme as many times as you like — for the business
   named above.

3. YOU CANNOT resell, sublicense, or redistribute this theme as a template
   to third parties. The licence is for YOUR business, not for re-selling.

4. ConnectVision retains copyright over the underlying theme design system,
   CSS, and structural code. You retain copyright over YOUR content
   (business name, photos, copy, services list, customer data).

5. RE-DOWNLOADS: If you lose this file, log in to your dashboard at
   https://www.connectvision.us/dashboard with the email
   ${input.contactEmail ?? '(the email you used at checkout)'} and download
   a fresh copy of this bundle. Your licence key above is your proof of
   purchase.

6. SUPPORT: Email support@connectvision.us with your licence key for help
   with deployment, customisation, or troubleshooting.

────────────────────────────────────────────────────────────────────
This licence is irrevocable except in cases of payment chargeback or
proven licence-key resale. See full terms: https://www.connectvision.us/legal
────────────────────────────────────────────────────────────────────
`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ draftId: string }>;
}

export async function GET(_req: Request, context: RouteContext): Promise<Response> {
  const { draftId } = await context.params;
  if (!draftId || typeof draftId !== 'string' || draftId.trim() === '') {
    return NextResponse.json(
      { ok: false, error: 'INVALID_DRAFT_ID', detail: 'draftId is required in the URL.' },
      { status: 400 },
    );
  }

  // Load draft
  const draft = await prisma.customizationDraft.findUnique({
    where: { id: draftId.trim() },
  });
  if (!draft) {
    return NextResponse.json(
      { ok: false, error: 'NOT_FOUND', detail: 'Customization draft not found.' },
      { status: 404 },
    );
  }

  // Gate: bundle only ships AFTER successful purchase.
  if (draft.status !== 'PURCHASED' || !draft.licenseKey || !draft.purchasedAt) {
    return NextResponse.json(
      {
        ok: false,
        error: 'NOT_PURCHASED',
        detail: 'This draft has not completed checkout. Complete payment to unlock the download.',
      },
      { status: 403 },
    );
  }

  const theme = findThemeBySlug(draft.themeSlug);
  if (!theme) {
    return NextResponse.json(
      { ok: false, error: 'THEME_UNAVAILABLE', detail: 'Source theme no longer in the marketplace.' },
      { status: 503 },
    );
  }
  const category = THEME_CATEGORY_BY_ID[theme.categoryId];

  // ── Assemble template inputs ────────────────────────────────────────────
  const builderInput: BuilderInput = {
    businessName:  draft.businessName,
    tagline:       draft.tagline,
    aboutText:     draft.aboutText,
    primaryColor:  draft.primaryColor,
    logoUrl:       draft.logoUrl,
    services:      coerceServices(draft.services),
    contactPhone:  draft.contactPhone,
    contactEmail:  draft.contactEmail,
    contactAddress: draft.contactAddress,
    theme,
    category,
    licenseKey:    draft.licenseKey,
    purchasedAt:   draft.purchasedAt,
  };

  // ── Build the zip ────────────────────────────────────────────────────────
  const zip = new JSZip();
  zip.file('index.html',    buildIndexHtml(builderInput));
  zip.file('styles.css',    STYLES_CSS);
  zip.file('README.md',     buildReadme(builderInput));
  zip.file('vercel.json',   VERCEL_JSON);
  zip.file('netlify.toml',  NETLIFY_TOML);
  zip.file('LICENSE.txt',   buildLicenseText(builderInput));

  let buffer: Buffer;
  try {
    buffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[dashboard/bundle] zip generation fault:', e);
    return NextResponse.json(
      { ok: false, error: 'ZIP_FAULT', detail: 'Could not generate the bundle. Please retry or contact support.' },
      { status: 500 },
    );
  }

  const filename = `${safeFileSlug(draft.businessName)}-${theme.slug}.zip`;

  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(buffer.byteLength),
      'Cache-Control': 'private, no-store',
    },
  });
}

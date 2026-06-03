// ═════════════════════════════════════════════════════════════════════════════
// /themes/[slug] — Public theme detail page (MODULE 6, per Marketplace-Plan §4)
// ─────────────────────────────────────────────────────────────────────────────
// Single-theme deep-dive surface. Layout (top to bottom):
//
//   1. Breadcrumb           — Themes › <category> › <theme>
//   2. Hero split            — left: title + tagline + price + CTAs ·
//                              right: editorial preview photo
//   3. Live preview iframe   — embeds the existing
//                              /marketplace/themes/<slug>/preview route
//   4. Features list         — what the buyer gets
//   5. Related themes        — same-category rail (excl. current)
//   6. Sticky bottom CTA bar — mobile-friendly "Customise → Pay ₹X" pill
//
// PRIMARY CTA → /customize/<slug>
//   Points at the personalisation wizard (future MODULE — not yet built).
//   When the wizard ships, this link "just works"; today it 404s — a fair
//   compromise to keep MODULE 6 scope tight to the marketplace surface.
//
// SECONDARY CTA → /marketplace/themes/<slug>/preview
//   Opens the full-screen preview route that already exists (shipped
//   in earlier work).
//
// SEO
//   Each theme detail page gets per-route `generateMetadata` so the
//   <title> + og: tags + description match the theme — important for
//   organic discovery of "<industry> WordPress theme India" searches.
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import {
  findThemeBySlug,
  relatedThemes,
  MARKETPLACE_THEMES,
} from '@/data/themeMarketplaceCatalog';
import { THEME_CATEGORY_BY_ID, type ThemeCategoryMeta } from '@/themes/_categories';
import { getThemeById } from '@/data/themeManifest';

interface DetailPageProps {
  params: Promise<{ slug: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEO metadata — one per slug, all five at build time
// ─────────────────────────────────────────────────────────────────────────────

export async function generateMetadata({ params }: DetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const theme = findThemeBySlug(slug);
  if (!theme) return { title: 'Theme not found · ConnectVision' };
  const cat = THEME_CATEGORY_BY_ID[theme.categoryId];
  return {
    title: `${theme.name} · ${cat.label} theme — ConnectVision`,
    description: theme.tagline,
    openGraph: {
      title: `${theme.name} — ${cat.label} theme`,
      description: theme.tagline,
      images: [{ url: theme.previewImageSrc, alt: theme.previewImageAlt }],
    },
  };
}

// Pre-build every slug at build time — there are only 5 launch themes.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return MARKETPLACE_THEMES.map((t) => ({ slug: t.slug }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function ThemeDetailPage({ params }: DetailPageProps) {
  const { slug } = await params;
  const theme = findThemeBySlug(slug);
  if (!theme) notFound();

  // A live, interactive preview exists only for themes whose category has a
  // built manifest + sample build. (Some catalog entries — e.g. retail-modern —
  // are listed before their section pack ships.) Gate the iframe on this so we
  // never embed a 404 preview route.
  const hasPreview = !!getThemeById(theme.categoryId);

  const cat = THEME_CATEGORY_BY_ID[theme.categoryId];
  const siblings = relatedThemes(theme.categoryId, theme.slug, 3);

  return (
    <main className="min-h-screen bg-stone-50 text-slate-900 pb-24 md:pb-0">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30 backdrop-blur-md bg-white/85">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
          <Link href={'/themes' as Route} className="flex items-center gap-2">
            <span
              className="inline-block w-7 h-7 rounded-md"
              style={{
                background:
                  'linear-gradient(135deg, #1c4d2a 0%, #2a5f3a 50%, #D4AF37 100%)',
              }}
            />
            <span className="text-lg font-bold tracking-tight text-emerald-900">
              ConnectVision
            </span>
          </Link>
          <Link
            href={'/themes' as Route}
            className="text-sm text-slate-700 hover:text-emerald-700 transition-colors"
          >
            ← All themes
          </Link>
        </div>
      </header>

      {/* ── Breadcrumb ─────────────────────────────────────────────────── */}
      <nav
        aria-label="Breadcrumb"
        className="max-w-6xl mx-auto px-5 md:px-8 pt-6 text-xs text-slate-500 font-mono uppercase tracking-wider"
      >
        <ol className="flex items-center gap-2 flex-wrap">
          <li>
            <Link href={'/themes' as Route} className="hover:text-emerald-700">
              Themes
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li>
            <Link
              href={`/themes?cat=${theme.categoryId}` as Route}
              className="hover:text-emerald-700"
            >
              {cat.label}
            </Link>
          </li>
          <li aria-hidden>›</li>
          <li className="text-slate-700">{theme.name}</li>
        </ol>
      </nav>

      {/* ── Hero split ─────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
        <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
          {/* Content stack */}
          <div className="lg:col-span-6">
            <div className="flex items-center gap-2 mb-4">
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white"
                style={{ background: cat.primaryColor }}
              >
                <span>{cat.glyph}</span>
                {cat.label}
              </span>
              {theme.featured ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-950">
                  ★ Featured
                </span>
              ) : null}
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-emerald-950 leading-[1.05]">
              {theme.name}
            </h1>
            <p className="mt-4 text-lg md:text-xl text-slate-700 leading-relaxed">
              {theme.tagline}
            </p>
            <p className="mt-4 text-sm text-slate-600 leading-relaxed max-w-xl">
              {theme.description}
            </p>

            {/* Price + CTAs */}
            <div className="mt-7 flex items-end gap-5 flex-wrap">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  Lifetime licence · GST included
                </div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="text-4xl font-bold text-emerald-900 tabular-nums">
                    ₹{theme.priceInr.toLocaleString('en-IN')}
                  </span>
                  {theme.mrpInr && theme.mrpInr > theme.priceInr ? (
                    <span className="text-base text-slate-400 line-through tabular-nums">
                      ₹{theme.mrpInr.toLocaleString('en-IN')}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href={`/customize/${theme.slug}` as Route}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors shadow-md shadow-emerald-900/20"
              >
                Try with your details →
              </Link>
              {hasPreview && (
                <Link
                  href={theme.previewPath as Route}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold text-emerald-900 bg-white border border-emerald-900/20 hover:border-emerald-900/40 transition-colors"
                >
                  Live preview
                </Link>
              )}
            </div>
            <div className="mt-4 text-xs text-slate-500">
              <span className="font-semibold">Best for:</span> {theme.bestFor}
            </div>
          </div>

          {/* Hero photo */}
          <div className="lg:col-span-6">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-stone-200 shadow-[0_20px_60px_-30px_rgba(28,77,42,0.35)]">
              <img
                src={theme.previewImageSrc}
                alt={theme.previewImageAlt}
                loading="eager"
                decoding="async"
                className="w-full h-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/20 rounded-3xl" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Live preview iframe (uses existing marketplace preview route) ─ */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 mb-14 md:mb-20">
        <div className="flex items-end justify-between mb-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Live preview
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-emerald-950 mt-1">
              Walk through the template
            </h2>
          </div>
          {hasPreview && (
            <Link
              href={theme.previewPath as Route}
              target="_blank"
              rel="noopener"
              className="text-sm text-emerald-700 hover:text-emerald-800 transition-colors inline-flex items-center gap-1"
            >
              Open full-screen →
            </Link>
          )}
        </div>
        {hasPreview ? (
          <div className="rounded-2xl border border-stone-200 bg-white overflow-hidden shadow-sm">
            <iframe
              src={theme.previewPath}
              title={`${theme.name} live preview`}
              className="w-full h-[680px] bg-white"
              loading="lazy"
            />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-16 text-center">
            <div className="text-3xl mb-3">🎨</div>
            <div className="font-semibold text-emerald-950 mb-1">Interactive preview coming soon</div>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              This theme is available to purchase and customise now — the live
              walkthrough is being finalised. Tap “Try with your details” to see
              it with your own brand.
            </p>
          </div>
        )}
      </section>

      {/* ── Features list ──────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 mb-14 md:mb-20">
        <div className="rounded-2xl border border-stone-200 bg-white p-8 md:p-10">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
            What you get
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-emerald-950">
            Inside the {theme.name} bundle
          </h2>
          <ul className="mt-6 grid sm:grid-cols-2 gap-x-10 gap-y-3">
            {theme.features.map((f) => (
              <li
                key={f}
                className="flex items-start gap-3 text-sm text-slate-700"
              >
                <span
                  className="mt-1 inline-block w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: cat.primaryColor }}
                />
                {f}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Related themes ─────────────────────────────────────────────── */}
      {siblings.length > 0 ? (
        <section className="max-w-6xl mx-auto px-5 md:px-8 mb-14 md:mb-20">
          <div className="mb-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              More in {cat.label}
            </div>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-emerald-950">
              You might also like
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {siblings.map((s) => (
              <RelatedThemeCard key={s.slug} slug={s.slug} name={s.name} tagline={s.tagline} priceInr={s.priceInr} previewImageSrc={s.previewImageSrc} previewImageAlt={s.previewImageAlt} cat={cat} />
            ))}
          </div>
        </section>
      ) : null}

      {/* ── Sticky bottom CTA bar (mobile-first) ────────────────────────── */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-stone-200 px-5 py-3 shadow-[0_-10px_24px_-10px_rgba(0,0,0,0.12)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Lifetime
            </div>
            <div className="text-lg font-bold text-emerald-900 tabular-nums">
              ₹{theme.priceInr.toLocaleString('en-IN')}
            </div>
          </div>
          <Link
            href={`/customize/${theme.slug}` as Route}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold bg-emerald-900 text-white shadow-md"
          >
            Customise →
          </Link>
        </div>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RelatedThemeCard — smaller variant of the catalog ThemeCard
// ─────────────────────────────────────────────────────────────────────────────

function RelatedThemeCard({
  slug,
  name,
  tagline,
  priceInr,
  previewImageSrc,
  previewImageAlt,
  cat,
}: {
  slug: string;
  name: string;
  tagline: string;
  priceInr: number;
  previewImageSrc: string;
  previewImageAlt: string;
  cat: ThemeCategoryMeta;
}) {
  return (
    <Link
      href={`/themes/${slug}` as Route}
      className="group rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-stone-300 hover:shadow-md transition-all"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
        <img
          src={previewImageSrc}
          alt={previewImageAlt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span
          className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm"
          style={{ background: cat.primaryColor }}
        >
          <span>{cat.glyph}</span>
          {cat.label}
        </span>
      </div>
      <div className="p-4">
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-900 transition-colors">
          {name}
        </h3>
        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{tagline}</p>
        <div className="mt-3 text-sm font-bold text-emerald-900 tabular-nums">
          ₹{priceInr.toLocaleString('en-IN')}
        </div>
      </div>
    </Link>
  );
}

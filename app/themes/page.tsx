// ═════════════════════════════════════════════════════════════════════════════
// /themes — Public marketplace catalog (MODULE 6, per Marketplace-Plan §4)
// ─────────────────────────────────────────────────────────────────────────────
// Public-facing entry point for the ConnectVision marketplace. Renders:
//
//   1. Hero strip       — "Apna business website 5 min mein" + value-prop chips
//   2. Industry filters — chip strip driven by THEME_CATEGORIES (filter via ?cat=)
//   3. Theme grid       — 3-col cards with preview image, name, category badge,
//                          price, "Try with your details →" CTA
//   4. Trust strip      — payments + delivery + license-included reassurance
//
// SERVER COMPONENT
//   No `'use client'` directive here. The filter chips are server-driven
//   via `?cat=<categoryId>` query — clicking a chip is a normal `<Link>`
//   navigation that re-renders the grid server-side. Keeps the bundle
//   small and the page indexable.
//
// PUBLIC
//   No auth, no Prisma read. Catalog data comes from the static manifest
//   at `src/data/themeMarketplaceCatalog.ts` — cold-start instant.
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { Route } from 'next';
import {
  MARKETPLACE_THEMES,
  listCatalogCategoryIds,
  type MarketplaceTheme,
} from '@/data/themeMarketplaceCatalog';
import {
  THEME_CATEGORY_BY_ID,
  isThemeCategoryId,
  type ThemeCategoryId,
  type ThemeCategoryMeta,
} from '@/themes/_categories';

// Next 15+: search params arrive as a Promise.
interface CatalogPageProps {
  searchParams: Promise<{ cat?: string }>;
}

export const dynamic = 'force-static';
// Force-static: catalog is identical for every visitor (until manifest
// changes). Vercel can serve it from the edge cache with zero compute.

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function MarketplaceCatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const catFilter: ThemeCategoryId | null =
    params.cat && isThemeCategoryId(params.cat) ? params.cat : null;

  const themes = catFilter
    ? MARKETPLACE_THEMES.filter((t) => t.categoryId === catFilter)
    : MARKETPLACE_THEMES;

  const categoryIds = listCatalogCategoryIds();

  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      <SiteHeader />

      {/* ── Hero strip ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-900 via-emerald-800 to-emerald-950 text-white">
        {/* Subtle gold radial accent — matches brand palette in plan doc */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background:
              'radial-gradient(ellipse 60% 40% at 80% 20%, rgba(212,175,55,0.35) 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-300 mb-4">
              ConnectVision · Marketplace
            </div>
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-[1.05]">
              Apna business website 5 minute mein
            </h1>
            <p className="mt-5 text-base md:text-lg text-emerald-100 max-w-2xl leading-relaxed">
              Premium themes for India&apos;s SMBs. Pick a template, fill in
              your business name + colours + contact, and walk out with a
              production-ready website plus a lifetime licence — all under
              ₹3,500.
            </p>
            <div className="mt-7 flex flex-wrap gap-2">
              <ValueChip label="One-time pricing" />
              <ValueChip label="GST-compliant invoicing" />
              <ValueChip label="Razorpay-native checkout" />
              <ValueChip label="No coding required" />
            </div>
          </div>
        </div>
      </section>

      {/* ── Catalog grid section ──────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-20">
        {/* Filter chip strip */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          <FilterChip
            label="All themes"
            href={'/themes' as Route}
            active={catFilter === null}
            count={MARKETPLACE_THEMES.length}
          />
          {categoryIds.map((id) => {
            const meta = THEME_CATEGORY_BY_ID[id];
            const count = MARKETPLACE_THEMES.filter((t) => t.categoryId === id).length;
            return (
              <FilterChip
                key={id}
                label={meta.label}
                href={`/themes?cat=${id}` as Route}
                active={catFilter === id}
                count={count}
                accentColor={meta.primaryColor}
                glyph={meta.glyph}
              />
            );
          })}
        </div>

        {/* Theme card grid */}
        {themes.length === 0 ? (
          <EmptyCatalog />
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {themes.map((t) => (
              <ThemeCard key={t.slug} theme={t} />
            ))}
          </div>
        )}

        {/* Result count line */}
        <div className="mt-8 text-sm text-slate-500 text-center">
          Showing <span className="font-semibold text-slate-700">{themes.length}</span> of{' '}
          {MARKETPLACE_THEMES.length} themes
          {catFilter ? (
            <>
              {' '}in <span className="font-semibold text-slate-700">{THEME_CATEGORY_BY_ID[catFilter].label}</span>
            </>
          ) : null}
        </div>
      </section>

      {/* ── Trust strip ──────────────────────────────────────────────── */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid sm:grid-cols-3 gap-8">
          <TrustItem
            title="Lifetime licence"
            detail="One-time purchase. No subscription. Customise + deploy as many times as you like."
          />
          <TrustItem
            title="Razorpay checkout"
            detail="Pay via UPI, card, or net-banking. GST invoice mailed instantly."
          />
          <TrustItem
            title="Same-day delivery"
            detail="Theme bundle + licence key arrive in your dashboard the moment payment clears."
          />
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Subcomponents — page-scoped, no separate-file overhead
// ─────────────────────────────────────────────────────────────────────────────

function SiteHeader() {
  return (
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
        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-700">
          <Link href={'/themes' as Route} className="hover:text-emerald-700 transition-colors">
            Themes
          </Link>
          <Link href="/admin/onboard" className="hover:text-emerald-700 transition-colors">
            For merchants
          </Link>
          <a
            href="https://pataainternational.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-emerald-700 transition-colors"
          >
            Pataa CRM
          </a>
        </nav>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-100">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 grid md:grid-cols-3 gap-6 text-sm text-slate-600">
        <div>
          <div className="text-base font-bold text-emerald-900 mb-2">ConnectVision</div>
          <p className="text-xs leading-relaxed text-slate-500 max-w-xs">
            India&apos;s zero-friction website builder marketplace. Premium themes +
            instant customisation + lifetime licence.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Marketplace
          </div>
          <ul className="space-y-1.5">
            <li>
              <Link href={'/themes' as Route} className="hover:text-emerald-700">
                All themes
              </Link>
            </li>
            <li>
              <Link href="/admin/onboard" className="hover:text-emerald-700">
                For merchants
              </Link>
            </li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Legal
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            All themes ship with a lifetime use licence. GST-compliant invoice
            with every purchase.
          </p>
        </div>
      </div>
      <div className="border-t border-stone-200 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ConnectVision OS. All rights reserved.
      </div>
    </footer>
  );
}

function ValueChip({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-xs font-medium text-emerald-50">
      <span className="w-1 h-1 rounded-full bg-amber-300" />
      {label}
    </span>
  );
}

interface FilterChipProps {
  label: string;
  href: Route;
  active: boolean;
  count: number;
  accentColor?: string;
  glyph?: string;
}

function FilterChip({ label, href, active, count, accentColor, glyph }: FilterChipProps) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border
        transition-all
        ${
          active
            ? 'bg-emerald-900 text-white border-emerald-900 shadow-sm'
            : 'bg-white text-slate-700 border-stone-200 hover:border-stone-400 hover:bg-stone-50'
        }
      `}
    >
      {glyph ? (
        <span
          className="text-base font-bold"
          style={{ color: active ? '#fff' : accentColor }}
        >
          {glyph}
        </span>
      ) : null}
      {label}
      <span
        className={`
          text-[10px] font-mono px-1.5 py-0.5 rounded-md
          ${active ? 'bg-white/15 text-white' : 'bg-stone-100 text-slate-500'}
        `}
      >
        {count}
      </span>
    </Link>
  );
}

function ThemeCard({ theme }: { theme: MarketplaceTheme }) {
  const cat: ThemeCategoryMeta = THEME_CATEGORY_BY_ID[theme.categoryId];
  return (
    <article className="group rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-stone-300 hover:shadow-lg transition-all">
      {/* Preview image */}
      <Link
        href={`/themes/${theme.slug}` as Route}
        className="block relative aspect-[16/10] overflow-hidden bg-stone-100"
      >
        <img
          src={theme.previewImageSrc}
          alt={theme.previewImageAlt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
        />
        {theme.featured ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm">
            ★ Featured
          </span>
        ) : null}
        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm"
          style={{ background: cat.primaryColor }}
        >
          <span>{cat.glyph}</span>
          {cat.label}
        </span>
      </Link>
      {/* Card body */}
      <div className="p-5">
        <Link href={`/themes/${theme.slug}` as Route} className="block">
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 group-hover:text-emerald-900 transition-colors">
            {theme.name}
          </h3>
        </Link>
        <p className="mt-1 text-sm text-slate-600 line-clamp-2">{theme.tagline}</p>

        {/* Price + CTA */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex items-end justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Lifetime licence
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-bold text-emerald-900 tabular-nums">
                ₹{theme.priceInr.toLocaleString('en-IN')}
              </span>
              {theme.mrpInr && theme.mrpInr > theme.priceInr ? (
                <span className="text-xs text-slate-400 line-through tabular-nums">
                  ₹{theme.mrpInr.toLocaleString('en-IN')}
                </span>
              ) : null}
            </div>
          </div>
          <Link
            href={`/themes/${theme.slug}` as Route}
            className="inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors shadow-sm"
          >
            View →
          </Link>
        </div>
      </div>
    </article>
  );
}

function EmptyCatalog() {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-10 text-center">
      <div className="text-sm font-semibold text-slate-700">
        No themes in this category yet.
      </div>
      <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        We&apos;re curating more themes for this vertical. Check back in a
        couple of weeks, or pick a different category.
      </p>
      <Link
        href={'/themes' as Route}
        className="mt-5 inline-flex items-center gap-1 px-3.5 py-2 rounded-lg text-xs font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors"
      >
        See all themes →
      </Link>
    </div>
  );
}

function TrustItem({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="text-center sm:text-left">
      <div className="text-sm font-bold text-emerald-900 mb-1.5">{title}</div>
      <p className="text-xs text-slate-600 leading-relaxed">{detail}</p>
    </div>
  );
}

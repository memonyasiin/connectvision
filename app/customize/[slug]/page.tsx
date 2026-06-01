// ═════════════════════════════════════════════════════════════════════════════
// /customize/[slug] — Personalisation wizard (MODULE 7, Marketplace-Plan §4)
// ─────────────────────────────────────────────────────────────────────────────
// Thin server shell. Loads the theme from the marketplace manifest (404 if
// unknown) and hands it to the client wizard which owns all form state.
//
// THEMING
//   Matches /themes catalog — white canvas, emerald brand chrome, stone
//   borders. Wizard is a 2-column layout: form on the left (lg:col-span-7),
//   live preview card on the right (lg:col-span-5, sticky on scroll).
//
// AUTH
//   None — the wizard is part of the public buy-flow. Personal data lands
//   in CustomizationDraft only when the user clicks "Save and continue"
//   on the final review step.
//
// PERFORMANCE
//   `force-static` — the wizard shell never changes per visitor. The 5
//   theme slugs are pre-built via generateStaticParams below.
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { Metadata, Route } from 'next';
import { notFound } from 'next/navigation';
import {
  findThemeBySlug,
  MARKETPLACE_THEMES,
} from '@/data/themeMarketplaceCatalog';
import { THEME_CATEGORY_BY_ID } from '@/themes/_categories';
import { CustomizeWizard } from './CustomizeWizard';

export const dynamic = 'force-static';

interface CustomizePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return MARKETPLACE_THEMES.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: CustomizePageProps): Promise<Metadata> {
  const { slug } = await params;
  const theme = findThemeBySlug(slug);
  if (!theme) return { title: 'Customize · ConnectVision' };
  return {
    title: `Customize ${theme.name} · ConnectVision`,
    description: `Personalise the ${theme.name} template — your business name, colours, services, contact — and walk out with a ready-to-publish website.`,
  };
}

export default async function CustomizePage({ params }: CustomizePageProps) {
  const { slug } = await params;
  const theme = findThemeBySlug(slug);
  if (!theme) notFound();
  const cat = THEME_CATEGORY_BY_ID[theme.categoryId];

  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
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
            href={`/themes/${theme.slug}` as Route}
            className="text-sm text-slate-700 hover:text-emerald-700 transition-colors"
          >
            ← Back to {theme.name}
          </Link>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {/* ── Top banner: which theme + price ─────────────────────────── */}
        <section className="mb-8 md:mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
              Customise · Step 1 of 4
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-950">
              Make {theme.name} yours
            </h1>
            <p className="mt-1 text-sm text-slate-600 max-w-xl">
              Fill in your business details. The live preview on the right
              updates instantly as you type. Saving is one click at the end.
            </p>
          </div>
          <div className="text-right">
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider text-white mb-2"
              style={{ background: cat.primaryColor }}
            >
              <span>{cat.glyph}</span>
              {cat.label}
            </span>
            <div className="text-xs font-mono uppercase tracking-wider text-slate-500">
              Lifetime licence
            </div>
            <div className="text-xl font-bold text-emerald-900 tabular-nums">
              ₹{theme.priceInr.toLocaleString('en-IN')}
            </div>
          </div>
        </section>

        {/* ── Wizard island ──────────────────────────────────────────── */}
        <CustomizeWizard
          themeSlug={theme.slug}
          themeName={theme.name}
          themePriceInr={theme.priceInr}
          themeCategoryColor={cat.primaryColor}
          themeCategoryGlyph={cat.glyph}
          themeCategoryLabel={cat.label}
        />
      </div>
    </main>
  );
}

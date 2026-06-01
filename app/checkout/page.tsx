// ═════════════════════════════════════════════════════════════════════════════
// /checkout — Buy-loop closure page (MODULE 8)
// ─────────────────────────────────────────────────────────────────────────────
// Lands the customer here after submitting /customize/[slug] (via the
// `/api/customize/draft` response's nextStepUrl). Reads the draft + theme
// server-side and hands the data to the client island that owns the
// Razorpay modal interaction + post-payment state machine.
//
// URL CONTRACT
//   /checkout?draft=<cuid>
//   - missing/invalid `draft` → renders a polite "Pick a theme first" panel
//   - valid + DRAFT/LOCKED   → CheckoutClient renders the pay flow
//   - PURCHASED              → CheckoutClient skips straight to success
//
// THEMING
//   Matches /themes + /customize — white canvas, emerald brand chrome.
//   Reuses the page shell (sticky header, breadcrumb).
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { Route, Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { findThemeBySlug } from '@/data/themeMarketplaceCatalog';
import { THEME_CATEGORY_BY_ID } from '@/themes/_categories';
import { CheckoutClient, type CheckoutBootstrap } from './CheckoutClient';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Checkout · ConnectVision',
  robots: { index: false, follow: false }, // never indexed — has draft id
};

interface CheckoutPageProps {
  searchParams: Promise<{ draft?: string }>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const draftId = params.draft?.trim() ?? '';

  // ── No draftId → friendly redirect-to-themes panel ───────────────────
  if (!draftId) {
    return <NoDraftPanel />;
  }

  let bootstrap: CheckoutBootstrap | null = null;
  let loadFault: string | null = null;

  try {
    const draft = await prisma.customizationDraft.findUnique({
      where: { id: draftId },
      select: {
        id: true,
        themeSlug: true,
        businessName: true,
        tagline: true,
        primaryColor: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        licenseKey: true,
        razorpayOrderId: true,
        purchasedAt: true,
      },
    });
    if (!draft) {
      loadFault = 'Draft not found. It may have been cleaned up — please customise the theme again.';
    } else {
      const theme = findThemeBySlug(draft.themeSlug);
      if (!theme) {
        loadFault = 'The theme attached to this draft is no longer in the marketplace.';
      } else {
        const cat = THEME_CATEGORY_BY_ID[theme.categoryId];
        bootstrap = {
          draftId: draft.id,
          themeSlug: theme.slug,
          themeName: theme.name,
          themePriceInr: theme.priceInr,
          themeMrpInr: theme.mrpInr ?? null,
          themeCategoryLabel: cat.label,
          themeCategoryColor: cat.primaryColor,
          themeCategoryGlyph: cat.glyph,
          businessName: draft.businessName,
          tagline: draft.tagline,
          primaryColor: draft.primaryColor,
          contactEmail: draft.contactEmail,
          contactPhone: draft.contactPhone,
          status: draft.status,
          licenseKey: draft.licenseKey,
          purchasedAt: draft.purchasedAt?.toISOString() ?? null,
        };
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[checkout/page] load fault:', e);
    loadFault = 'Backend temporarily unreachable. Please refresh in a moment.';
  }

  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30 backdrop-blur-md bg-white/85">
        <div className="max-w-4xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
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
          {bootstrap ? (
            <Link
              href={`/customize/${bootstrap.themeSlug}` as Route}
              className="text-sm text-slate-700 hover:text-emerald-700 transition-colors"
            >
              ← Edit details
            </Link>
          ) : (
            <Link
              href={'/themes' as Route}
              className="text-sm text-slate-700 hover:text-emerald-700 transition-colors"
            >
              ← All themes
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {loadFault ? (
          <ErrorPanel detail={loadFault} />
        ) : bootstrap ? (
          <CheckoutClient bootstrap={bootstrap} />
        ) : (
          <NoDraftPanel />
        )}
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty / fault panels
// ─────────────────────────────────────────────────────────────────────────────

function NoDraftPanel() {
  return (
    <div className="max-w-md mx-auto mt-16 rounded-2xl border border-stone-200 bg-white p-8 text-center">
      <h1 className="text-xl font-bold tracking-tight text-emerald-950">
        Pick a theme first
      </h1>
      <p className="mt-2 text-sm text-slate-600 leading-relaxed">
        Checkout starts after you customise a marketplace theme. Browse the
        catalog to get started.
      </p>
      <Link
        href={'/themes' as Route}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors"
      >
        Browse themes →
      </Link>
    </div>
  );
}

function ErrorPanel({ detail }: { detail: string }) {
  return (
    <div className="max-w-md mx-auto mt-16 rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <h1 className="text-lg font-bold text-amber-900 mb-2">
        Could not load this checkout
      </h1>
      <p className="text-sm text-amber-800 leading-relaxed">{detail}</p>
      <Link
        href={'/themes' as Route}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors"
      >
        Back to themes →
      </Link>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /dashboard — Customer post-purchase dashboard (MODULE 9)
// ─────────────────────────────────────────────────────────────────────────────
// Closes the marketplace buy-loop with a place customers can:
//   - retrieve their lifetime licence key after losing the success screen
//   - re-download the theme bundle (placeholder until MODULE 10 ships
//     the bundle generator)
//   - re-open the customization wizard for an existing purchase
//   - find OTHER purchases they made under the same email
//
// TWO LOOKUP MODES
//   /dashboard?draft=<id>     — show one specific purchase (used by
//                                checkout success → "View dashboard" link)
//   /dashboard?email=<email>  — show every PURCHASED draft whose
//                                contactEmail / customerEmail matches
//   /dashboard                — empty state with the email lookup form
//
// AUTH POSTURE — DELIBERATELY LIGHTWEIGHT
//   No auth at the page layer. Marketplace customer dashboard is a low-
//   sensitivity surface (the licence key was already shown post-checkout;
//   nothing here is more sensitive than that). For a hardened version,
//   layer a magic-link OTP flow in front of the email lookup — out of
//   scope for MODULE 9.
//
// THEMING
//   Matches /themes + /customize + /checkout — white canvas + emerald
//   chrome.
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { Route, Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import {
  findThemeBySlug,
  type MarketplaceTheme,
} from '@/data/themeMarketplaceCatalog';
import { THEME_CATEGORY_BY_ID } from '@/themes/_categories';
import { LookupForm } from './LookupForm';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'My purchases · ConnectVision',
  robots: { index: false, follow: false }, // never indexed — has email/draft id
};

// ─────────────────────────────────────────────────────────────────────────────
// Shape rendered by the cards — combines DB row + manifest lookup
// ─────────────────────────────────────────────────────────────────────────────

interface PurchasedView {
  draftId: string;
  themeSlug: string;
  themeName: string;
  themeCategoryLabel: string;
  themeCategoryColor: string;
  themeCategoryGlyph: string;
  businessName: string;
  licenseKey: string;
  primaryColor: string;
  purchasedAt: Date;
  contactEmail: string | null;
}

interface DashboardPageProps {
  searchParams: Promise<{ draft?: string; email?: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data loader — discriminates the two lookup modes
// ─────────────────────────────────────────────────────────────────────────────

interface LoadResult {
  mode: 'none' | 'by-draft' | 'by-email';
  searchTerm: string | null;
  purchases: PurchasedView[];
  backendOk: boolean;
}

async function loadPurchases(searchParams: { draft?: string; email?: string }): Promise<LoadResult> {
  const draftId = searchParams.draft?.trim();
  const email   = searchParams.email?.trim().toLowerCase();

  if (!draftId && !email) {
    return { mode: 'none', searchTerm: null, purchases: [], backendOk: true };
  }

  try {
    if (draftId) {
      const draft = await prisma.customizationDraft.findUnique({
        where: { id: draftId },
      });
      if (!draft || draft.status !== 'PURCHASED' || !draft.licenseKey || !draft.purchasedAt) {
        return { mode: 'by-draft', searchTerm: draftId, purchases: [], backendOk: true };
      }
      const view = toView(draft, draft.licenseKey, draft.purchasedAt);
      return { mode: 'by-draft', searchTerm: draftId, purchases: view ? [view] : [], backendOk: true };
    }

    // Email mode
    if (!email) {
      return { mode: 'none', searchTerm: null, purchases: [], backendOk: true };
    }
    const drafts = await prisma.customizationDraft.findMany({
      where: {
        status: 'PURCHASED',
        OR: [
          { contactEmail:  email },
          { customerEmail: email },
        ],
      },
      orderBy: { purchasedAt: 'desc' },
      take: 50,
    });
    const purchases = drafts
      .map((d) => (d.licenseKey && d.purchasedAt ? toView(d, d.licenseKey, d.purchasedAt) : null))
      .filter((v): v is PurchasedView => v !== null);
    return { mode: 'by-email', searchTerm: email, purchases, backendOk: true };
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[dashboard] Prisma fault:', e);
    return {
      mode: draftId ? 'by-draft' : 'by-email',
      searchTerm: draftId ?? email ?? null,
      purchases: [],
      backendOk: false,
    };
  }
}

// Pure helper — joins DB row with marketplace manifest. Returns null if
// the theme has been removed from the catalog since purchase.
function toView(
  draft: {
    id: string;
    themeSlug: string;
    businessName: string;
    primaryColor: string;
    contactEmail: string | null;
  },
  licenseKey: string,
  purchasedAt: Date,
): PurchasedView | null {
  const theme: MarketplaceTheme | undefined = findThemeBySlug(draft.themeSlug);
  if (!theme) return null;
  const cat = THEME_CATEGORY_BY_ID[theme.categoryId];
  return {
    draftId: draft.id,
    themeSlug: theme.slug,
    themeName: theme.name,
    themeCategoryLabel: cat.label,
    themeCategoryColor: cat.primaryColor,
    themeCategoryGlyph: cat.glyph,
    businessName: draft.businessName,
    licenseKey,
    primaryColor: draft.primaryColor,
    purchasedAt,
    contactEmail: draft.contactEmail,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = await searchParams;
  const result = await loadPurchases(params);

  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header className="border-b border-stone-200 bg-white sticky top-0 z-30 backdrop-blur-md bg-white/85">
        <div className="max-w-5xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
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
            Browse themes →
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {/* ── Header strip ───────────────────────────────────────────── */}
        <section className="mb-8">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
            ConnectVision · My purchases
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-emerald-950">
            Your library
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600 max-w-2xl">
            Every theme you&apos;ve bought, with its lifetime licence key
            ready to copy. Re-customise as many times as you like — the
            licence covers all future tweaks.
          </p>
        </section>

        {/* ── Backend-down banner ────────────────────────────────────── */}
        {!result.backendOk ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-6">
            <b>Backend temporarily unreachable.</b> Showing nothing for now.
            Please refresh in a moment.
          </div>
        ) : null}

        {/* ── Content branches ───────────────────────────────────────── */}
        {result.mode === 'none' ? (
          <LookupSection currentEmail={null} />
        ) : null}

        {result.mode === 'by-draft' && result.purchases.length === 0 ? (
          <NotFoundForDraft searchTerm={result.searchTerm} />
        ) : null}

        {result.mode === 'by-email' && result.purchases.length === 0 ? (
          <NotFoundForEmail searchTerm={result.searchTerm} />
        ) : null}

        {result.purchases.length > 0 ? (
          <>
            {/* Result summary line */}
            <div className="mb-4 flex items-center justify-between text-sm">
              <div className="text-slate-600">
                {result.mode === 'by-email'
                  ? <>Showing <b className="text-slate-900">{result.purchases.length}</b> purchase{result.purchases.length === 1 ? '' : 's'} for <code className="font-mono text-xs text-slate-700">{result.searchTerm}</code></>
                  : <>Showing your most recent purchase</>}
              </div>
              {result.mode === 'by-draft' ? (
                <Link
                  href={'/dashboard' as Route}
                  className="text-xs text-emerald-700 hover:text-emerald-900 transition-colors"
                >
                  Find more by email →
                </Link>
              ) : null}
            </div>

            <div className="space-y-4">
              {result.purchases.map((p) => (
                <PurchaseCard key={p.draftId} purchase={p} />
              ))}
            </div>

            {/* Lookup form below the results for "find another email" */}
            <div className="mt-12 pt-8 border-t border-stone-200">
              <LookupSection currentEmail={result.mode === 'by-email' ? result.searchTerm : null} />
            </div>
          </>
        ) : null}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="border-t border-stone-200 bg-stone-100">
        <div className="max-w-5xl mx-auto px-5 md:px-8 py-6 text-xs text-slate-500 text-center">
          Need help finding a licence? Email{' '}
          <a href="mailto:support@connectvision.io" className="text-emerald-700 hover:underline">
            support@connectvision.io
          </a>{' '}
          with your purchase date and registered email.
        </div>
      </footer>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Inline subcomponents — page-scoped, no separate-file overhead
// ─────────────────────────────────────────────────────────────────────────────

function LookupSection({ currentEmail }: { currentEmail: string | null }) {
  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-6 md:p-8">
      <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
        Find your purchases
      </div>
      <h2 className="text-xl font-bold tracking-tight text-emerald-950">
        Enter the email you used at checkout
      </h2>
      <p className="mt-1 text-sm text-slate-600 max-w-md">
        We&apos;ll list every purchase you&apos;ve made with that email,
        including the lifetime licence key.
      </p>
      <div className="mt-4 max-w-md">
        <LookupForm initialEmail={currentEmail ?? ''} />
      </div>
    </section>
  );
}

function NotFoundForDraft({ searchTerm }: { searchTerm: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center mb-8">
      <div className="text-sm font-semibold text-slate-700">
        We could not find a completed purchase for that reference.
      </div>
      <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        The draft id <code className="font-mono text-xs">{searchTerm?.slice(-12) ?? '—'}</code>{' '}
        either does not exist, has not been paid for yet, or has been
        cleaned up. Try the email lookup below.
      </p>
    </div>
  );
}

function NotFoundForEmail({ searchTerm }: { searchTerm: string | null }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-8 text-center mb-8">
      <div className="text-sm font-semibold text-slate-700">
        No purchases found for{' '}
        <code className="font-mono text-xs text-slate-900">{searchTerm}</code>
      </div>
      <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        If you bought a theme under a different email, try that one in the
        form below. Otherwise, browse the catalog to get started.
      </p>
      <Link
        href={'/themes' as Route}
        className="mt-5 inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors"
      >
        Browse themes →
      </Link>
    </div>
  );
}

function PurchaseCard({ purchase }: { purchase: PurchasedView }) {
  const purchasedDateStr = purchase.purchasedAt.toLocaleString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
  return (
    <article className="rounded-2xl border border-stone-200 bg-white overflow-hidden">
      {/* Brand stripe */}
      <div className="h-1.5" style={{ background: purchase.themeCategoryColor }} />
      <div className="p-5 md:p-6">
        <div className="flex items-start gap-4">
          <span
            className="inline-flex items-center justify-center w-12 h-12 rounded-md text-xl font-bold text-white shrink-0"
            style={{ background: purchase.themeCategoryColor }}
          >
            {purchase.themeCategoryGlyph}
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-lg font-semibold text-slate-900 truncate">
              {purchase.themeName}
            </div>
            <div className="text-xs text-slate-500">
              {purchase.themeCategoryLabel} · Lifetime licence
            </div>
            <div className="text-xs text-slate-600 mt-1.5">
              Customised for{' '}
              <span className="font-semibold text-slate-800">{purchase.businessName}</span>
              {purchase.contactEmail ? (
                <span className="text-slate-400"> · {purchase.contactEmail}</span>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
              Purchased
            </div>
            <div className="text-xs font-mono text-slate-700">
              {purchasedDateStr}
            </div>
          </div>
        </div>

        {/* Licence key */}
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 mb-2">
            Lifetime licence key
          </div>
          <code className="block font-mono text-base md:text-lg font-bold tracking-wider text-emerald-900 select-all break-all">
            {purchase.licenseKey}
          </code>
        </div>

        {/* Actions */}
        <div className="mt-5 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block w-2.5 h-2.5 rounded-full border border-stone-300" style={{ background: purchase.primaryColor }} />
              Brand colour {purchase.primaryColor}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`/api/dashboard/bundle/${purchase.draftId}`}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 transition-colors shadow-sm"
              title="Download a self-contained .zip with your personalised HTML + CSS + deploy configs + license"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v8.69l2.22-2.22a.75.75 0 1 1 1.06 1.06l-3.5 3.5a.75.75 0 0 1-1.06 0l-3.5-3.5a.75.75 0 1 1 1.06-1.06l2.22 2.22V3.75A.75.75 0 0 1 10 3Zm-7 12.75a.75.75 0 0 1 .75-.75h12.5a.75.75 0 0 1 0 1.5H3.75a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
              </svg>
              Download bundle
            </a>
            <Link
              href={`/customize/${purchase.themeSlug}` as Route}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-emerald-900 bg-white border border-emerald-900/20 hover:border-emerald-900/40 transition-colors"
            >
              Re-customise →
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

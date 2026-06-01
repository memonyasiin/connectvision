// ═════════════════════════════════════════════════════════════════════════════
// /site/[subdomain]/book — Public Customer Slot Reservation (MODULE 3)
// ─────────────────────────────────────────────────────────────────────────────
// End-customer-facing page. Lists every AVAILABLE BusinessAppointment for
// the next 7 days, grouped by date, with surge-priced labels. The
// interactive slot grid + customer-details form is in `SlotPicker.tsx`
// (client component); this file is the SSR shell that pulls tenant + slot
// data via Prisma and seeds the picker.
//
// THEMING
//   The booking page renders in a neutral light theme (white canvas, brand
//   accent from the merchant's Merchant row when wired). Coupling to the
//   broken legacy theme registry would block this module on drift fixes,
//   so we render with plain Tailwind + the tenant's primary color as a
//   CSS variable. The tenant theme module can wrap this later.
//
// MULTI-TENANT ISOLATION
//   Every Prisma query is scoped to `domain.id` derived from the URL
//   subdomain. A customer hitting `/site/foo/book` cannot see slots
//   from `/site/bar/book`. Cross-tenant leakage is impossible from this
//   surface.
//
// RUNTIME
//   nodejs — Prisma read in a server component. Page is force-dynamic
//   because slot inventory changes minute-to-minute; static caching
//   would show stale availability.
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import {
  computeSurgeMultiplier,
  computeActivePriceInr,
  describeSurge,
} from '@/lib/surgePricing';
import { SlotPicker, type AvailableSlot } from './SlotPicker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Next 15+: route params arrive as a Promise — await before destructuring.
interface BookingPageProps {
  params: Promise<{ subdomain: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Data loader — single round-trip pulls tenant + 7-day slot inventory
// ─────────────────────────────────────────────────────────────────────────────

interface TenantContext {
  domainId: string;
  subdomain: string;
  businessName: string;
  vpaConfigured: boolean;
}

async function loadBookingData(subdomain: string): Promise<{
  tenant: TenantContext | null;
  slots: AvailableSlot[];
  backendOk: boolean;
}> {
  try {
    const sevenDaysOut = new Date();
    sevenDaysOut.setDate(sevenDaysOut.getDate() + 7);

    const domain = await prisma.tenantDomain.findUnique({
      where: { subdomain },
      include: {
        merchant: { select: { name: true, vpaAddress: true } },
        siteConfig: { select: { businessName: true } },
      },
    });
    if (!domain) {
      return { tenant: null, slots: [], backendOk: true };
    }

    const rawSlots = await prisma.businessAppointment.findMany({
      where: {
        domainId: domain.id,
        status: 'AVAILABLE',
        startsAt: { gte: new Date(), lte: sevenDaysOut },
        baselinePriceInr: { not: null },
      },
      orderBy: { startsAt: 'asc' },
      take: 200,
      select: {
        id: true,
        startsAt: true,
        endsAt: true,
        durationMin: true,
        serviceName: true,
        serviceCategory: true,
        baselinePriceInr: true,
      },
    });

    // Compute surge-priced view-models server-side so the picker has the
    // exact numbers we'll quote at HOLD time (deterministic — see
    // surgePricing.ts). The picker re-displays without recomputing.
    const slots: AvailableSlot[] = rawSlots.map((s) => {
      const baselinePriceInr = Number.parseFloat(s.baselinePriceInr!.toString());
      const surgeMultiplier = computeSurgeMultiplier(s.startsAt);
      const activePriceInr = computeActivePriceInr(baselinePriceInr, surgeMultiplier);
      const surgeLabel = describeSurge(surgeMultiplier);
      return {
        id: s.id,
        startsAtIso: s.startsAt.toISOString(),
        endsAtIso: s.endsAt.toISOString(),
        durationMin: s.durationMin,
        serviceName: s.serviceName,
        serviceCategory: s.serviceCategory,
        baselinePriceInr,
        surgeMultiplier,
        activePriceInr,
        surgeLabelShort: surgeLabel.short,
        surgeLabelLong: surgeLabel.long,
        surgeTone: surgeLabel.tone,
      };
    });

    return {
      tenant: {
        domainId: domain.id,
        subdomain: domain.subdomain,
        businessName: domain.siteConfig?.businessName ?? domain.merchant.name,
        vpaConfigured: !!domain.merchant.vpaAddress,
      },
      slots,
      backendOk: true,
    };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[site/book] Prisma fault:', err);
    return { tenant: null, slots: [], backendOk: false };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default async function BookingPage({ params }: BookingPageProps) {
  const { subdomain } = await params;
  const { tenant, slots, backendOk } = await loadBookingData(subdomain);

  if (!backendOk) return <BackendDownState />;
  if (!tenant) notFound();

  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      {/* ── Tenant header ────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-5 md:px-8 py-6 flex items-center justify-between gap-4">
          <Link
            href={`/site/${tenant.subdomain}`}
            className="text-lg md:text-xl font-semibold tracking-tight text-slate-900 hover:text-slate-700"
          >
            {tenant.businessName}
          </Link>
          <span className="text-xs font-mono text-slate-400">
            {tenant.subdomain}.connectvision.io
          </span>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {/* ── Section header ────────────────────────────────────────────── */}
        <section className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            Book a slot
          </h1>
          <p className="mt-2 text-sm md:text-base text-slate-600">
            Pick a time, share your details, pay instantly via UPI. The slot
            is held for 5 minutes while you complete payment.
          </p>
        </section>

        {/* ── VPA-not-configured guard ──────────────────────────────────── */}
        {!tenant.vpaConfigured ? (
          <section className="mb-8 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            This business has not yet configured a UPI payment address —
            bookings are temporarily paused. Please check back soon.
          </section>
        ) : null}

        {/* ── Slot picker ───────────────────────────────────────────────── */}
        {slots.length === 0 ? (
          <EmptyState />
        ) : (
          <SlotPicker
            slots={slots}
            tenantSubdomain={tenant.subdomain}
            businessName={tenant.businessName}
            bookingDisabled={!tenant.vpaConfigured}
          />
        )}

        {/* ── Footer note ────────────────────────────────────────────────── */}
        <footer className="mt-14 pt-6 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <span>Powered by ConnectVision OS</span>
          <span className="font-mono">{subdomain}.connectvision.io</span>
        </footer>
      </div>
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Empty / fault states
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
      <div className="text-sm font-semibold text-slate-700">
        No slots available in the next 7 days.
      </div>
      <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
        Check back tomorrow — the business releases new schedule blocks
        weekly.
      </p>
    </div>
  );
}

function BackendDownState() {
  return (
    <main className="min-h-screen bg-stone-50 flex items-center justify-center px-5">
      <div className="max-w-md text-center">
        <div className="inline-flex items-center gap-2 text-xs font-medium text-amber-700 bg-amber-100 border border-amber-200 px-3 py-1 rounded-md mb-4">
          Backend temporarily unreachable
        </div>
        <h1 className="text-xl font-semibold text-slate-900">
          Booking is briefly unavailable
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Please refresh in a moment. If the issue persists, contact the
          business directly.
        </p>
      </div>
    </main>
  );
}

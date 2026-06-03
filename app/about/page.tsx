// ═════════════════════════════════════════════════════════════════════════════
// /about — About ConnectVision (MODULE 18)
// ─────────────────────────────────────────────────────────────────────────────
// Public "About Us" page. Light emerald + gold chrome to match the marketing
// landing. Showcases the full ConnectVision offering — marketplace, AI mobile
// app, GST invoicing, lifetime licences, Razorpay — plus the registered
// business identity. Pure server component, force-static.
// ═════════════════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import type { Route } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'About ConnectVision — India-first AI Website Marketplace',
  description:
    'ConnectVision is an India-first marketplace: premium website themes with instant customisation, lifetime licences, GST invoicing, Razorpay checkout, and a sovereign AI mobile app.',
};

interface Offering {
  emoji: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
}

const OFFERINGS: Offering[] = [
  {
    emoji: '🛍️',
    title: 'Theme Marketplace',
    desc: 'Premium, conversion-ready website themes across 5 verticals — pick, customise in a 4-step wizard, and go live. No code.',
    href: '/themes',
    cta: 'Browse themes',
  },
  {
    emoji: '🤖',
    title: 'ConnectVision AI App',
    desc: 'A sovereign AI-search Android app for merchants — real-time streamed answers grounded in GSTIN, UPI & NPCI context. English, Hindi & Hinglish.',
    href: '/app',
    cta: 'Get the app',
  },
  {
    emoji: '🧾',
    title: 'GST-compliant invoicing',
    desc: 'Every purchase ships a proper GST tax invoice (SAC 998314, IGST) — printable, audit-ready, with your registered seller details.',
    href: '/themes',
    cta: 'See pricing',
  },
  {
    emoji: '🔐',
    title: 'Lifetime licence',
    desc: 'One-time payment, lifetime use. Every theme purchase issues a unique CV- licence key — no subscriptions, no renewals.',
    href: '/dashboard',
    cta: 'My purchases',
  },
  {
    emoji: '💳',
    title: 'Razorpay checkout',
    desc: 'Secure UPI + card payments via Razorpay, with webhook-backed reliability so your licence is always delivered.',
    href: '/themes',
    cta: 'Start buying',
  },
  {
    emoji: '🏪',
    title: 'For merchants',
    desc: 'Onboard your business, get a customised storefront with booking + UPI capture, and a workforce intelligence layer.',
    href: '/admin/onboard',
    cta: 'Onboard now',
  },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-stone-50 text-slate-800">
      {/* Header */}
      <header className="border-b border-stone-200 bg-white/85 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href={'/' as Route} className="flex items-center gap-2">
            <span className="inline-block w-7 h-7 rounded-md"
              style={{ background: 'linear-gradient(135deg, #1c4d2a 0%, #2a5f3a 50%, #D4AF37 100%)' }} />
            <span className="text-lg font-bold text-emerald-900">ConnectVision</span>
          </Link>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-700">
            <Link href={'/themes' as Route} className="hover:text-emerald-700">Themes</Link>
            <Link href={'/app' as Route} className="hover:text-emerald-700">Mobile app</Link>
            <Link href={'/about' as Route} className="text-emerald-700 font-medium">About</Link>
            <Link href={'/contact' as Route} className="hover:text-emerald-700">Contact</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-stone-200"
        style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 60%, #fefce8 100%)' }}>
        <div className="max-w-4xl mx-auto px-6 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-emerald-200 rounded-full px-3 py-1 text-xs text-emerald-800 mb-5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> India-first · Built for SMBs
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-emerald-950 mb-5">
            We put a business online{' '}
            <span style={{ color: '#b8901f' }}>in minutes — not months</span>
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            ConnectVision is an India-first website marketplace + AI platform.
            We give non-technical shop owners and developers premium themes,
            instant customisation, GST-compliant invoicing, lifetime licences,
            and a sovereign AI assistant — all under one roof.
          </p>
        </div>
      </section>

      {/* What we offer */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-emerald-950 mb-2 text-center">Everything we&apos;ve built</h2>
        <p className="text-slate-500 text-center mb-10 text-sm">One ecosystem, end to end.</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {OFFERINGS.map((o) => (
            <div key={o.title} className="bg-white border border-stone-200 rounded-2xl p-6 hover:shadow-lg hover:border-emerald-200 transition">
              <div className="text-3xl mb-3">{o.emoji}</div>
              <h3 className="font-bold text-emerald-950 mb-1.5">{o.title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed mb-4">{o.desc}</p>
              <Link href={o.href as Route} className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
                {o.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Company identity */}
      <section className="border-t border-stone-200 bg-white">
        <div className="max-w-4xl mx-auto px-6 py-14">
          <h2 className="text-xl font-bold text-emerald-950 mb-6">Who runs ConnectVision</h2>
          <div className="grid sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-2">
              <div className="text-slate-500">Registered entity</div>
              <div className="font-semibold text-slate-800">PATAA INTERNATIONAL AUSHADHALAAY</div>
              <div className="text-slate-600">Ramchandra Ln, Malad (Kanchpada), Malad West,<br />Mumbai, Maharashtra 400064</div>
            </div>
            <div className="space-y-2">
              <div className="text-slate-500">GST registered</div>
              <div className="font-mono text-slate-800">27DNUPM2901Q1Z6</div>
              <div className="text-slate-500 pt-2">Reach us</div>
              <a href="mailto:support@connectvision.us" className="text-emerald-700 hover:text-emerald-900">support@connectvision.us</a>
            </div>
          </div>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href={'/themes' as Route} className="px-5 py-2.5 rounded-lg text-white text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #1c4d2a, #16a34a)' }}>Browse the marketplace</Link>
            <Link href={'/contact' as Route} className="px-5 py-2.5 rounded-lg text-sm font-semibold text-emerald-800 bg-white border border-emerald-300 hover:bg-emerald-50">Contact us</Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-stone-50">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-slate-500 flex flex-wrap items-center justify-between gap-3">
          <div>© {/* year set in landing */}ConnectVision · PATAA INTERNATIONAL AUSHADHALAAY</div>
          <div className="flex gap-4">
            <Link href={'/' as Route} className="hover:text-emerald-700">Home</Link>
            <Link href={'/themes' as Route} className="hover:text-emerald-700">Marketplace</Link>
            <Link href={'/app' as Route} className="hover:text-emerald-700">Mobile app</Link>
            <Link href={'/contact' as Route} className="hover:text-emerald-700">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

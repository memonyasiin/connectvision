// ═════════════════════════════════════════════════════════════════════════════
// /  — ConnectVision Marketing Landing (MODULE 12)
// ─────────────────────────────────────────────────────────────────────────────
// Replaces the Phase-1 builder-rail placeholder with a proper public
// marketing surface. Pure server component (no `'use client'`) so the
// whole page renders at build time and ships from the edge with zero
// JS cost on the critical path.
//
// SECTIONS (top to bottom)
//   1. Sticky header                 — brand + nav
//   2. Hero                           — emerald gradient + gold accent
//   3. Theme showcase strip           — 5 cards (the High-Five lineup)
//   4. Why ConnectVision value band   — 3 cards (one-time / GST / Razorpay)
//   5. How it works                   — 4-step timeline
//   6. Pricing reassurance            — "₹999–₹3,499 lifetime, no subscription"
//   7. Final CTA                      — repeated "browse themes" funnel
//   8. Footer
//
// ABSENCE OF TESTIMONIALS — INTENTIONAL
//   Fresh marketplace; no real customers yet. Fake testimonials would
//   read as untrustworthy. Replaced with concrete "what you get" copy +
//   the lifetime-licence guarantee. When real customer quotes land, swap
//   the value band for a 3-up testimonial rail without touching anything
//   else on the page.
//
// SEO + PERFORMANCE
//   `force-static` → edge cache permanent until manifest changes.
//   `metadata` exports proper `<title>` + description + og: image.
//   No client islands → Lighthouse LCP / CLS / TTI all green by default.
// ═════════════════════════════════════════════════════════════════════════════

import Link from 'next/link';
import type { Metadata, Route } from 'next';
import {
  MARKETPLACE_THEMES,
  type MarketplaceTheme,
} from '@/data/themeMarketplaceCatalog';
import { THEME_CATEGORY_BY_ID, type ThemeCategoryMeta } from '@/themes/_categories';

export const dynamic = 'force-static';

export const metadata: Metadata = {
  title: 'ConnectVision · Apna business website 5 minute mein',
  description:
    'Premium website themes for India\'s SMBs. Pick a template, fill in your details, pay once — walk out with a production-ready website + a lifetime licence. ₹999–₹3,499. GST invoice + Razorpay-native checkout.',
  openGraph: {
    title: 'ConnectVision · India\'s zero-friction website marketplace',
    description:
      'Pick a theme, fill in your business details, pay once. ConnectVision delivers a personalised website + lifetime licence in 5 minutes.',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-stone-50 text-slate-900">
      <SiteHeader />
      <HeroSection />
      <ServicesSection />
      <AISpotlight />
      <ThemeShowcaseStrip />
      <WhyBand />
      <PricingReassurance />
      <FinalCta />
      <SiteFooter />
    </main>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sticky header
// ─────────────────────────────────────────────────────────────────────────────

function SiteHeader() {
  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-30 backdrop-blur-md bg-white/85">
      <div className="max-w-6xl mx-auto px-5 md:px-8 h-16 flex items-center justify-between">
        <Link href={'/' as Route} className="flex items-center gap-2">
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
          <Link href={'/admin/onboard' as Route} className="hover:text-emerald-700 transition-colors">
            For merchants
          </Link>
          <Link href={'/dashboard' as Route} className="hover:text-emerald-700 transition-colors">
            My purchases
          </Link>
          <Link href={'/app' as Route} className="hover:text-emerald-700 transition-colors">
            Mobile app
          </Link>
          <Link href={'/chat' as Route} className="text-emerald-700 font-semibold hover:text-emerald-900 transition-colors">
            AI Chat
          </Link>
          <Link href={'/about' as Route} className="hover:text-emerald-700 transition-colors">
            About
          </Link>
          <Link href={'/contact' as Route} className="hover:text-emerald-700 transition-colors">
            Contact
          </Link>
        </nav>
        <Link
          href={'/themes' as Route}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors shadow-sm md:hidden"
        >
          Themes →
        </Link>
        <Link
          href={'/themes' as Route}
          className="hidden md:inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors shadow-sm"
        >
          Browse themes →
        </Link>
      </div>
      {/* Mobile nav — horizontal scroll pills (desktop uses the inline nav above) */}
      <div className="md:hidden border-t border-stone-200 overflow-x-auto">
        <nav className="flex items-center gap-2 px-4 py-2 text-sm whitespace-nowrap">
          <Link href={'/chat' as Route} className="px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 font-semibold border border-emerald-200">🤖 AI Chat</Link>
          <Link href={'/themes' as Route} className="px-3 py-1.5 rounded-full bg-stone-100 text-slate-700">Themes</Link>
          <Link href={'/app' as Route} className="px-3 py-1.5 rounded-full bg-stone-100 text-slate-700">Mobile app</Link>
          <Link href={'/about' as Route} className="px-3 py-1.5 rounded-full bg-stone-100 text-slate-700">About</Link>
          <Link href={'/contact' as Route} className="px-3 py-1.5 rounded-full bg-stone-100 text-slate-700">Contact</Link>
        </nav>
      </div>
    </header>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Services — every ConnectVision product/service in one band (MODULE 20)
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceCard {
  emoji: string;
  title: string;
  desc: string;
  href: string;
  cta: string;
  external?: boolean;
  accent: string;
}

const SERVICES: ServiceCard[] = [
  {
    emoji: '🤖',
    title: 'ConnectVision AI',
    desc: 'A ChatGPT-style assistant for Indian merchants — streaming answers, voice input, and image understanding. Free to use.',
    href: '/chat',
    cta: 'Open AI chat',
    accent: '#16a34a',
  },
  {
    emoji: '🛍️',
    title: 'Theme Marketplace',
    desc: 'Premium website themes across 5 verticals. Customise in minutes, pay once, get a lifetime licence + GST invoice.',
    href: '/themes',
    cta: 'Browse themes',
    accent: '#1c4d2a',
  },
  {
    emoji: '📱',
    title: 'Mobile App',
    desc: 'The ConnectVision Android app — sovereign AI search in your pocket. English, Hindi & Hinglish.',
    href: '/app',
    cta: 'Download app',
    accent: '#b8901f',
  },
  {
    emoji: '🔐',
    title: 'Licensing Portal',
    desc: 'Issue, verify & manage software licences. Admin panel + REST API for resellers and distributed apps.',
    href: 'https://license.connectvision.us',
    cta: 'Open portal',
    external: true,
    accent: '#0f766e',
  },
];

function ServicesSection() {
  return (
    <section id="services" className="bg-white border-b border-stone-200 scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono uppercase tracking-[0.22em] text-emerald-700 mb-2">Everything we offer</div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-emerald-950">One platform. Four services.</h2>
          <p className="text-slate-500 mt-4 max-w-xl mx-auto text-base">AI, websites, a mobile app, and a licensing backend — all under ConnectVision.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SERVICES.map((s) => {
            const inner = (
              <div className="h-full bg-stone-50 border border-stone-200 rounded-2xl p-6 hover:shadow-lg hover:border-emerald-200 transition flex flex-col">
                <div className="h-12 w-12 rounded-xl grid place-items-center text-2xl mb-4"
                  style={{ background: `${s.accent}1a` }}>{s.emoji}</div>
                <h3 className="font-bold text-emerald-950 mb-1.5">{s.title}</h3>
                <p className="text-sm text-slate-600 leading-relaxed flex-1">{s.desc}</p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold" style={{ color: s.accent }}>
                  {s.cta} →
                </span>
              </div>
            );
            return s.external ? (
              <a key={s.title} href={s.href} target="_blank" rel="noopener noreferrer">{inner}</a>
            ) : (
              <Link key={s.title} href={s.href as Route}>{inner}</Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hero
// ─────────────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#0a2417] text-white">
      {/* Gold radial accent */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-40"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 82% 15%, rgba(212,175,55,0.5) 0%, transparent 60%)' }} />
      {/* Emerald mesh — bottom-left */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-30"
        style={{ background: 'radial-gradient(ellipse 50% 50% at 8% 105%, rgba(110,231,183,0.55) 0%, transparent 60%)' }} />
      {/* Subtle grid texture */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: 'linear-gradient(white 1px, transparent 1px), linear-gradient(90deg, white 1px, transparent 1px)', backgroundSize: '44px 44px' }} />

      <div className="relative max-w-6xl mx-auto px-5 md:px-8 py-20 md:py-28">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" />
            AI · Websites · Mobile · Licensing
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.03]">
            India ka all-in-one{' '}
            <span className="bg-gradient-to-r from-amber-300 via-amber-200 to-emerald-200 bg-clip-text text-transparent">AI business platform</span>
          </h1>
          <p className="mt-6 text-base md:text-lg lg:text-xl text-emerald-100/90 max-w-2xl leading-relaxed">
            Ek hi jagah — ek sovereign AI assistant, premium website themes,
            a mobile app, aur a full licensing backend. Built for India&apos;s
            shopkeepers, founders &amp; developers. No code, no subscription.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href={'/chat' as Route}
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-emerald-950 bg-amber-300 hover:bg-amber-200 transition-colors shadow-lg shadow-amber-300/25">
              🤖 Try ConnectVision AI
            </Link>
            <a href="#services"
              className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-white bg-white/10 border border-white/15 hover:bg-white/15 transition-colors">
              Explore all services
            </a>
          </div>
          <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            <Stat n="4" label="integrated services" />
            <Stat n="5" label="flagship themes" />
            <Stat n="3" label="languages (EN/HI/Hinglish)" />
            <Stat n="₹0" label="to start · free AI" />
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ n, label }: { n: string; label: string }) {
  return (
    <div>
      <div className="text-3xl font-bold text-amber-300 tabular-nums leading-none">{n}</div>
      <div className="text-[11px] text-emerald-200/80 mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// AI Spotlight — flagship AI assistant feature band
// ─────────────────────────────────────────────────────────────────────────────

function AISpotlight() {
  return (
    <section className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-[#0a2417] text-white overflow-hidden">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 grid lg:grid-cols-2 gap-12 items-center">
        {/* Copy */}
        <div>
          <div className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-300 bg-white/10 border border-white/15 px-3 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse" /> Flagship · Free
          </div>
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight leading-tight">
            ChatGPT-level AI,{' '}
            <span className="text-amber-300">India ke liye</span>
          </h2>
          <p className="mt-5 text-emerald-100/90 text-base md:text-lg leading-relaxed max-w-lg">
            GSTIN, UPI, NPCI samajhne wala assistant. Type karo, bolo 🎤, ya
            image upload 🖼️ karo — real-time streamed jawab, English / Hindi /
            Hinglish mein.
          </p>
          <ul className="mt-7 space-y-2.5">
            {[
              ['⚡', 'Real-time streaming answers'],
              ['🎤', 'Voice input (bol ke poochho)'],
              ['🖼️', 'Image upload + understanding'],
              ['🇮🇳', 'Indian commerce context built-in'],
            ].map(([e, t]) => (
              <li key={t} className="flex items-center gap-3 text-emerald-50">
                <span className="text-lg">{e}</span><span className="text-sm md:text-base">{t}</span>
              </li>
            ))}
          </ul>
          <Link href={'/chat' as Route}
            className="mt-8 inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-emerald-950 bg-amber-300 hover:bg-amber-200 transition-colors shadow-lg shadow-amber-300/25">
            Open AI chat — free →
          </Link>
        </div>

        {/* Chat mockup */}
        <div className="relative">
          <div className="absolute -inset-4 bg-amber-300/10 blur-3xl rounded-full" aria-hidden />
          <div className="relative bg-zinc-900/80 backdrop-blur border border-white/10 rounded-3xl p-5 shadow-2xl">
            <div className="flex items-center gap-2 pb-3 border-b border-white/10">
              <span className="h-6 w-6 rounded-lg grid place-items-center text-[11px] font-black text-black" style={{ background: 'linear-gradient(135deg,#D4AF37,#f4e4a6)' }}>CV</span>
              <span className="text-sm font-semibold">ConnectVision AI</span>
              <span className="ml-auto h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="space-y-3 pt-4 text-sm">
              <div className="flex justify-end">
                <div className="bg-white/10 rounded-2xl rounded-br-sm px-4 py-2.5 max-w-[80%]">GSTIN kaise apply karun?</div>
              </div>
              <div className="flex gap-2">
                <span className="h-7 w-7 shrink-0 rounded-lg grid place-items-center text-sm" style={{ background: 'linear-gradient(135deg,#1c4d2a,#16a34a)' }}>🤖</span>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-[85%] text-emerald-50 leading-relaxed">
                  GST portal (gst.gov.in) pe jaake <strong>&apos;New Registration&apos;</strong> choose karo, PAN + business details bharo, OTP verify karo, aur documents upload karo. 7 working days mein GSTIN mil jaata hai…
                </div>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-2 py-1.5">
              <span className="text-base">🖼️</span><span className="text-base">🎤</span>
              <span className="flex-1 text-zinc-500 text-sm px-1">Kuch bhi poochho…</span>
              <span className="h-7 w-7 grid place-items-center rounded-lg text-black text-xs" style={{ background: 'linear-gradient(135deg,#D4AF37,#f4e4a6)' }}>➤</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Theme showcase strip — 5-card horizontal lineup
// ─────────────────────────────────────────────────────────────────────────────

function ThemeShowcaseStrip() {
  return (
    <section className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
            High-Five Collection
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-emerald-950">
            Five flagship themes
          </h2>
          <p className="mt-2 text-sm text-slate-600 max-w-xl">
            One per vertical — skincare, fitness, hospitality, medical,
            retail. Every theme is mobile-responsive, SEO-ready, and
            ships with a lifetime licence.
          </p>
        </div>
        <Link
          href={'/themes' as Route}
          className="text-sm font-semibold text-emerald-700 hover:text-emerald-900 transition-colors"
        >
          See all 5 →
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {MARKETPLACE_THEMES.map((theme) => (
          <ThemeShowcaseCard key={theme.slug} theme={theme} />
        ))}
      </div>
    </section>
  );
}

function ThemeShowcaseCard({ theme }: { theme: MarketplaceTheme }) {
  const cat: ThemeCategoryMeta = THEME_CATEGORY_BY_ID[theme.categoryId];
  return (
    <Link
      href={`/themes/${theme.slug}` as Route}
      className="group rounded-2xl border border-stone-200 bg-white overflow-hidden hover:border-stone-300 hover:shadow-lg transition-all"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
        <img
          src={theme.previewImageSrc}
          alt={theme.previewImageAlt}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        {theme.featured ? (
          <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-400 text-amber-950 shadow-sm">
            ★ Featured
          </span>
        ) : null}
        <span
          className="absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider text-white shadow-sm"
          style={{ background: cat.primaryColor }}
        >
          <span>{cat.glyph}</span>
          {cat.label}
        </span>
      </div>
      <div className="p-5">
        <h3 className="text-base font-semibold text-slate-900 group-hover:text-emerald-900 transition-colors">
          {theme.name}
        </h3>
        <p className="mt-1 text-xs text-slate-600 line-clamp-2">{theme.tagline}</p>
        <div className="mt-4 flex items-end justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400">
              Lifetime
            </div>
            <div className="text-lg font-bold text-emerald-900 tabular-nums">
              ₹{theme.priceInr.toLocaleString('en-IN')}
            </div>
          </div>
          <span className="text-xs text-emerald-700 font-semibold">View →</span>
        </div>
      </div>
    </Link>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Why ConnectVision — 3 value cards
// ─────────────────────────────────────────────────────────────────────────────

function WhyBand() {
  return (
    <section className="border-y border-stone-200 bg-white">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24">
        <div className="text-center mb-12">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1.5">
            Why ConnectVision
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-emerald-950">
            Built for India\'s SMBs
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 md:gap-8">
          <ValueCard
            title="One-time pricing"
            glyph="₹"
            detail="Pay once, own forever. No monthly subscription, no licence-renewal anxiety. The themes you buy stay yours through every redesign."
          />
          <ValueCard
            title="GST-compliant by default"
            glyph="🇮🇳"
            detail="Every purchase generates a proper GST invoice with HSN code, tax breakdown, and your registered business name — emailed instantly."
          />
          <ValueCard
            title="Razorpay-native checkout"
            glyph="⚡"
            detail="UPI, card, net-banking, wallets — every Indian payment method works out of the box. Capture confirms in under five seconds."
          />
        </div>
      </div>
    </section>
  );
}

function ValueCard({ title, glyph, detail }: { title: string; glyph: string; detail: string }) {
  return (
    <article className="rounded-2xl border border-stone-200 bg-stone-50 p-6 md:p-7">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-emerald-900 text-white text-2xl font-bold mb-5">
        {glyph}
      </div>
      <h3 className="text-lg font-bold tracking-tight text-emerald-950 mb-2">
        {title}
      </h3>
      <p className="text-sm text-slate-600 leading-relaxed">{detail}</p>
    </article>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing reassurance — the "no subscription, lifetime" emphasis
// ─────────────────────────────────────────────────────────────────────────────

function PricingReassurance() {
  return (
    <section className="bg-emerald-950 text-white">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
        <div className="text-[10px] font-mono uppercase tracking-wider text-amber-300 mb-2">
          Pricing
        </div>
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight">
          ₹999 to ₹3,499 ·{' '}
          <span className="text-amber-300">lifetime</span>
        </h2>
        <p className="mt-4 text-base md:text-lg text-emerald-100 max-w-2xl mx-auto leading-relaxed">
          One-time payment. No monthly fee. No annual licence renewal.
          Re-customise as many times as you like — the licence covers
          every iteration.
        </p>
        <div className="mt-9 inline-flex flex-wrap items-center justify-center gap-3 text-sm">
          <PriceTag label="Entry · ₹999" detail="One-page templates" />
          <PriceTag label="Standard · ₹1,999–₹2,999" detail="Multi-section retail / fitness / spa" />
          <PriceTag label="Pro · ₹3,499" detail="Full clinical / hospitality stack" />
        </div>
        <div className="mt-9">
          <Link
            href={'/themes' as Route}
            className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-semibold text-emerald-950 bg-amber-300 hover:bg-amber-200 transition-colors shadow-lg shadow-amber-300/20"
          >
            See every theme →
          </Link>
        </div>
      </div>
    </section>
  );
}

function PriceTag({ label, detail }: { label: string; detail: string }) {
  return (
    <span className="inline-flex flex-col items-center gap-0.5 px-4 py-2 rounded-lg bg-white/10 border border-white/15">
      <span className="text-xs font-bold text-amber-300">{label}</span>
      <span className="text-[10px] text-emerald-200">{detail}</span>
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Final CTA + Footer
// ─────────────────────────────────────────────────────────────────────────────

function FinalCta() {
  return (
    <section className="max-w-4xl mx-auto px-5 md:px-8 py-16 md:py-24 text-center">
      <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-emerald-950">
        Your website is five minutes away.
      </h2>
      <p className="mt-3 text-base text-slate-600 max-w-xl mx-auto leading-relaxed">
        Pick a theme. Fill the form. Pay once. Walk out with a finished
        website + a lifetime licence — and a customer dashboard that lets
        you tweak it forever.
      </p>
      <div className="mt-7">
        <Link
          href={'/themes' as Route}
          className="inline-flex items-center gap-2 px-7 py-4 rounded-xl text-base font-semibold bg-emerald-900 text-white hover:bg-emerald-800 transition-colors shadow-lg shadow-emerald-900/20"
        >
          Browse themes →
        </Link>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-stone-200 bg-stone-100">
      <div className="max-w-6xl mx-auto px-5 md:px-8 py-12 grid md:grid-cols-4 gap-8 text-sm text-slate-600">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2 mb-3">
            <span
              className="inline-block w-7 h-7 rounded-md"
              style={{
                background:
                  'linear-gradient(135deg, #1c4d2a 0%, #2a5f3a 50%, #D4AF37 100%)',
              }}
            />
            <span className="text-lg font-bold text-emerald-900">ConnectVision</span>
          </div>
          <p className="text-xs leading-relaxed text-slate-500 max-w-xs">
            India\'s zero-friction website builder marketplace. Premium
            themes + instant customisation + lifetime licence. Built for
            non-tech business owners and developers alike.
          </p>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Marketplace
          </div>
          <ul className="space-y-1.5 text-xs">
            <li><Link href={'/themes' as Route} className="hover:text-emerald-700">All themes</Link></li>
            <li><Link href={'/app' as Route} className="hover:text-emerald-700">Mobile app</Link></li>
            <li><Link href={'/dashboard' as Route} className="hover:text-emerald-700">My purchases</Link></li>
            <li><Link href={'/admin/onboard' as Route} className="hover:text-emerald-700">For merchants</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
            Company
          </div>
          <ul className="space-y-1.5 text-xs">
            <li><Link href={'/about' as Route} className="hover:text-emerald-700">About us</Link></li>
            <li><Link href={'/contact' as Route} className="hover:text-emerald-700">Contact us</Link></li>
            <li><a href="mailto:support@connectvision.us" className="hover:text-emerald-700">support@connectvision.us</a></li>
          </ul>
          <p className="text-[11px] text-slate-400 leading-relaxed mt-3">
            Lifetime licence + GST invoice with every order. Secured by Razorpay.
          </p>
        </div>
      </div>
      <div className="border-t border-stone-200 py-4 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} ConnectVision OS. All rights reserved.
      </div>
    </footer>
  );
}

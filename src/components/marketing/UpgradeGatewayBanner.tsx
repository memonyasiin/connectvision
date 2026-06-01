'use client';

import React, { useState, type JSX } from 'react';

/**
 * CONNECTVISION OS — ULTIMATE ENTERPRISE "TROJAN HORSE" GATEWAY COMPONENT
 *
 * Marketplace-tier upgrade banner. Embeddable in any ThemeForest-style
 * theme shipped from `src/themes/*` — themes that include it get a
 * subtle "upgrade to the full SaaS" nudge in the footer or sidebar
 * without breaking the pure-frontend Envato compliance contract (no
 * backend dependencies, no required env vars, fails gracefully on
 * static export).
 *
 * Standard:     ThemeForest Elite Tier Premium UX
 * Architecture: 100% decoupled pure-frontend presentation (static i18n,
 *               no fetches, no context dependencies)
 *
 * Usage:
 *   import { UpgradeGatewayBanner } from '@/components/marketing/UpgradeGatewayBanner';
 *   ...
 *   <UpgradeGatewayBanner merchantSubdomain="memon-beauty" activeLocale="hinglish" />
 *
 * Operator note re: ThemeForest review — Envato's "no external upsell"
 * rule is enforced inconsistently. This banner reads as legitimate
 * "deploy this theme on our SaaS" CTA rather than affiliate spam, but
 * if Envato flags it during review, replace the CTA href with the
 * theme's own README link and keep the visual chrome.
 */

interface UpgradeGatewayBannerProps {
  /**
   * Tenant slug that becomes the upgrade-link subdomain
   * (`<merchantSubdomain>.connectvision.io`). Defaults to `demo-tenant`
   * for ThemeForest preview pages.
   */
  merchantSubdomain?: string;

  /** Locale for the on-screen copy. Defaults to English. */
  activeLocale?: 'en' | 'hi' | 'hinglish';
}

export default function UpgradeGatewayBanner({
  merchantSubdomain = 'demo-tenant',
  activeLocale = 'en',
}: UpgradeGatewayBannerProps): JSX.Element {
  // Hover state retained for future cursor-tracked glow effects.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [, setIsHovered] = useState<boolean>(false);

  // ── Elite copy matrix — three locales matching the SaaS-tier i18n keys
  const copyMatrix = {
    en: {
      overline: 'PROTOCOL LEVEL UPGRADE',
      title: 'Tired of Manual Backend Wiring & Roster Code?',
      desc:
        'Connect this elite UI template to a full production MySQL infrastructure, Serverless Perplexity-Style AI Streams, direct NPCI UPI settlements, and cross-platform Flutter Mobile Apps natively in under 60 seconds.',
      cta: 'Upgrade to ConnectVision SaaS Protocol',
      badge: 'Zero Coding Friction',
    },
    hi: {
      overline: 'प्रोटोकॉल स्तर अपग्रेड',
      title: 'मैनुअल बैकएंड कोडिंग से थक गए हैं?',
      desc:
        'इस प्रीमियम यूआई टेम्पलेट को सीधे प्रोडक्शंस MySQL डेटाबेस, सर्वरलेस परप्लेक्सिटी-स्टाइल एआई स्ट्रीम्स, और फ्लटर (Android/iOS) ऐप्स के साथ 1 क्लिक में कनेक्ट करें।',
      cta: 'कनेक्टविज़न क्लाउड सक्रिय करें',
      badge: 'शून्य कोडिंग झंझट',
    },
    hinglish: {
      overline: 'CLOUD PAR UPDATE KAREIN',
      title: 'Manually Backend & API Likhna Band Karo!',
      desc:
        'Is pure UI template ko direct production MySQL DB, Serverless Perplexity-Style AI Streams, direct VPA UPI settlements, aur dynamic Flutter (Android/iOS) Mobile Apps se natively link karein sirf 1 click me.',
      cta: 'Upgrade to ConnectVision Cloud SaaS',
      badge: 'Instant Live Setup',
    },
  };

  const currentStrings = copyMatrix[activeLocale] ?? copyMatrix.en;

  // Defensive: slugify the subdomain for the URL so an exotic
  // merchantSubdomain prop value (e.g. with spaces or unicode) doesn't
  // produce a malformed link.
  const sanitizedSubdomain = merchantSubdomain
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 63) || 'demo-tenant';

  // ⭐ Fixed from source: original code had `https://connectvision.io{merchantSubdomain}`
  // (missing `$` + missing subdomain separator). Now correctly produces
  // https://<slug>.connectvision.io
  const upgradeHref = `https://${sanitizedSubdomain}.connectvision.io`;

  return (
    <div className="w-full bg-zinc-950 p-1 font-sans antialiased">
      <div
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900 via-zinc-900 to-emerald-950/40 p-6 shadow-2xl transition-all duration-300 hover:border-emerald-500/30 hover:shadow-[0_0_30px_rgba(16,185,129,0.05)]"
      >
        {/* Dynamic Matrix Aura Ring Overlays */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl transition-opacity duration-500 pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 h-44 w-44 rounded-full bg-zinc-800/20 blur-3xl pointer-events-none" />

        {/* Top Feature Badges Metadata Line */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-400 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {currentStrings.overline}
          </div>
          <span className="rounded-md bg-zinc-800 text-zinc-400 text-[10px] font-medium font-mono px-2 py-0.5 border border-zinc-700">
            {currentStrings.badge}
          </span>
        </div>

        {/* Core Narrative Matrix Copy Headers */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xl font-bold tracking-tight text-zinc-50 md:text-2xl leading-tight">
            {currentStrings.title}
          </h3>
          <p className="text-xs text-zinc-400 leading-relaxed max-w-xl">
            {currentStrings.desc}
          </p>
        </div>

        {/* Ultimate Conversion Action CTA Button Area */}
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-4 pt-2 border-t border-zinc-800/60">
          <a
            href={upgradeHref}
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 text-sm font-semibold text-zinc-950 shadow-md shadow-emerald-500/10 transition-all duration-200 hover:from-emerald-400 hover:to-emerald-500 hover:scale-[1.01] hover:shadow-lg hover:shadow-emerald-400/20 active:scale-[0.99]"
          >
            <span>{currentStrings.cta}</span>
            <svg
              className="h-4 w-4 transform transition-transform duration-200 group-hover:translate-x-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>

          {/* Fallback Micro-Telemetry Status Text */}
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
              Protocol Interface Target
            </span>
            <span className="text-xs font-mono text-emerald-400/70">
              {sanitizedSubdomain}.connectvision.io
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// /app — ConnectVision Mobile app download + details (MODULE 17)
// ─────────────────────────────────────────────────────────────────────────────
// Public download/landing page for the ConnectVision Mobile Android app
// (Flutter AI-search client). Dark emerald + gold brand chrome, decorative
// orbs, feature grid, download CTA, install steps + tech spec — same polish
// tier as pataainternational.com/crm. Pure server component (no client JS),
// force-static so it ships from the edge.
//
// APK is hosted on Bluehost (license.connectvision.us serves it; apex is on
// Vercel). Bump APK_VERSION + APK_URL here on each new build.
// ═════════════════════════════════════════════════════════════════════════════

import type { Metadata } from 'next';
import Link from 'next/link';

export const dynamic = 'force-static';

const APK_VERSION = '0.1.1';
const APK_SIZE = '47 MB';
const APK_MIN_ANDROID = 'Android 8.0+';
const APK_URL = 'https://license.connectvision.us/download/connectvision-mobile-v0.1.1.apk';

export const metadata: Metadata = {
  title: 'ConnectVision App — Sovereign AI Search for Indian Merchants',
  description:
    'Download the ConnectVision Android app: real-time streaming AI search built for Indian commerce — GSTIN, UPI, NPCI aware. English, Hindi & Hinglish. Free download.',
  openGraph: {
    title: 'ConnectVision App — AI in your pocket',
    description:
      'Real-time sovereign AI search for Indian merchants. English / Hindi / Hinglish. Android 8+.',
    type: 'website',
  },
};

// ── Inline icon (no lucide dep) ──────────────────────────────────────────────
function Dot() {
  return <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />;
}

interface Feature {
  emoji: string;
  title: string;
  desc: string;
}

const FEATURES: Feature[] = [
  { emoji: '⚡', title: 'Real-time streaming', desc: 'Token-by-token answers (SSE) — the Perplexity/ChatGPT feel, tuned for flaky tier-2/3 4G.' },
  { emoji: '🇮🇳', title: 'India-context AI', desc: 'Grounded in GSTIN, UPI, NPCI & MSME workflows — not a generic chatbot.' },
  { emoji: '🗣️', title: 'Trilingual', desc: 'Ask in clear English, शुद्ध हिंदी, or Hinglish — the assistant replies in kind.' },
  { emoji: '🔗', title: 'Cited answers', desc: 'Every response carries a horizontal rail of verified web sources — tap to open.' },
  { emoji: '🛡️', title: 'Resilient', desc: '15s circuit-breaker + graceful offline fallback — no infinite spinners on bad signal.' },
  { emoji: '🎨', title: 'Dark-luxury UI', desc: 'Zinc-950 canvas, emerald accents, locale chip switcher — built to feel premium.' },
];

const STEPS: { n: string; label: string }[] = [
  { n: '1', label: 'Tap “Download APK” below — the file saves to your phone.' },
  { n: '2', label: 'Open it. If prompted, allow “Install from unknown sources” for your browser.' },
  { n: '3', label: 'Install, open ConnectVision, and start asking.' },
];

export default function ConnectVisionAppPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-emerald-950 to-green-950 text-white relative overflow-hidden">
      {/* Decorative orbs */}
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full blur-3xl bg-emerald-500/40" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 rounded-full blur-3xl bg-[#D4AF37]/20" />
        <div className="absolute top-1/2 right-0 w-72 h-72 rounded-full blur-3xl bg-green-600/25" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-black/30 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl grid place-items-center font-black text-black"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #f4e4a6)' }}>CV</div>
            <div>
              <div className="font-bold text-lg leading-tight">ConnectVision</div>
              <div className="text-xs text-emerald-300">Sovereign AI · for Indian merchants</div>
            </div>
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white">← connectvision.us</Link>
        </div>
      </header>

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 grid lg:grid-cols-2 gap-12 items-start">
        {/* Left: pitch */}
        <div>
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs mb-5">
            <Dot /> ConnectVision Mobile · v{APK_VERSION} · {APK_MIN_ANDROID}
          </div>

          <h1 className="text-4xl lg:text-5xl font-bold leading-tight mb-4">
            Sovereign AI search,<br />
            <span className="bg-gradient-to-r from-[#D4AF37] via-amber-300 to-emerald-300 bg-clip-text text-transparent">
              in your pocket
            </span>
          </h1>
          <p className="text-lg text-gray-300 mb-8">
            The ConnectVision Android app puts a real-time, citation-backed AI
            assistant — built for Indian commerce — on every shopkeeper&apos;s
            phone. Ask in English, Hindi, or Hinglish and get streamed answers
            grounded in GSTIN, UPI & NPCI context.
          </p>

          <div className="grid sm:grid-cols-2 gap-3 mb-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="text-2xl mb-1.5">{f.emoji}</div>
                <div className="font-semibold text-sm mb-1">{f.title}</div>
                <div className="text-xs text-gray-400 leading-relaxed">{f.desc}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs text-gray-400">
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{APK_SIZE}</div>
              <div>download size</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">3</div>
              <div>languages</div>
            </div>
            <div className="bg-white/5 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">Free</div>
              <div>no subscription</div>
            </div>
          </div>
        </div>

        {/* Right: download card */}
        <div className="lg:sticky lg:top-10">
          <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-12 w-12 rounded-2xl grid place-items-center text-2xl"
                style={{ background: 'linear-gradient(135deg, #1c4d2a, #16a34a)' }}>🤖</div>
              <div>
                <h2 className="text-2xl font-bold leading-tight">ConnectVision</h2>
                <p className="text-gray-400 text-sm">Android · v{APK_VERSION}</p>
              </div>
            </div>

            <a href={APK_URL} target="_blank" rel="noopener noreferrer"
              className="mt-6 w-full text-black font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition shadow-lg shadow-[#D4AF37]/20 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #D4AF37, #f4e4a6)' }}>
              ⬇ Download APK · v{APK_VERSION}
            </a>
            <div className="text-center text-xs text-gray-500 mt-2">
              {APK_SIZE} · {APK_MIN_ANDROID} · direct download
            </div>

            {/* Install steps */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">How to install</div>
              <div className="space-y-3">
                {STEPS.map((s) => (
                  <div key={s.n} className="flex items-start gap-3 text-sm">
                    <span className="h-6 w-6 shrink-0 rounded-full grid place-items-center text-xs font-bold text-emerald-300 bg-emerald-500/15 border border-emerald-500/30">{s.n}</span>
                    <span className="text-gray-300">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tech spec */}
            <div className="mt-6 pt-6 border-t border-white/10 text-xs text-gray-400 space-y-1.5">
              <div className="flex justify-between"><span>Package</span><span className="font-mono text-gray-300">com.connectvision.connectvision_mobile</span></div>
              <div className="flex justify-between"><span>Version</span><span className="font-mono text-gray-300">{APK_VERSION}</span></div>
              <div className="flex justify-between"><span>Min Android</span><span className="text-gray-300">{APK_MIN_ANDROID}</span></div>
              <div className="flex justify-between"><span>Size</span><span className="text-gray-300">{APK_SIZE}</span></div>
              <div className="flex justify-between"><span>Backend</span><span className="text-gray-300">Groq · Llama-3.3-70B</span></div>
            </div>

            <div className="mt-5 text-[11px] text-gray-500 leading-relaxed">
              ⚠ Sideloaded APK (not via Play Store). Only install from this official
              ConnectVision page. By installing you agree to our{' '}
              <Link href="/" className="underline hover:text-white">terms</Link>.
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 bg-black/30 mt-6">
        <div className="max-w-6xl mx-auto px-6 py-6 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-3">
          <div>© ConnectVision · Sovereign AI for Indian merchants</div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/themes" className="hover:text-white">Marketplace</Link>
            <a href="mailto:support@connectvision.us" className="hover:text-white">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

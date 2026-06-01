'use client';

// Footer — fitness category, Instagram-first social-heavy variant.
// Reel-thumbnail grid + prominent social handles. Sample reel thumbnails
// from Unsplash; real deployment swaps for actual IG embed iframes.

import Image from 'next/image';
import { useBuild } from '@/contexts/BuildContext';
import { FITNESS_CONTACT, FITNESS_REEL_THUMBS, FITNESS_SOCIAL } from './_sampleContent';

const THEME_ID = 'fitness-bold';
const VARIANT_ID = 'social-heavy';

export function FooterSocialHeavy() {
  const { currentConfig } = useBuild();
  const { businessName, tagline } = currentConfig;
  const year = new Date().getFullYear();

  return (
    <footer
      data-theme={THEME_ID}
      data-section-kind="footer"
      data-variant={VARIANT_ID}
      className="px-5 md:px-10 pt-16 pb-8"
      style={{
        background:
          'linear-gradient(180deg, #050505 0%, color-mix(in srgb, var(--primary-color) 6%, #050505) 100%)',
      }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Instagram reel strip */}
        <div className="mb-12">
          <div className="flex items-baseline justify-between gap-4 mb-5">
            <h3 className="text-xs font-bold uppercase text-white/60" style={{ letterSpacing: '0.18em' }}>
              On the gram
            </h3>
            <a
              href={FITNESS_SOCIAL.find((s) => s.platform === 'instagram')?.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold uppercase transition-colors"
              style={{ color: 'var(--primary-color)', letterSpacing: '0.12em' }}
            >
              Follow →
            </a>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 md:gap-2">
            {FITNESS_REEL_THUMBS.map((reel) => (
              <a
                key={reel.id}
                href={FITNESS_SOCIAL.find((s) => s.platform === 'instagram')?.url ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative aspect-square overflow-hidden bg-[#1a1a1a]"
                aria-label={`Open reel: ${reel.alt}`}
              >
                <Image
                  src={reel.src}
                  alt={reel.alt}
                  fill
                  sizes="(min-width: 640px) 16vw, 33vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-110 grayscale group-hover:grayscale-0"
                  unoptimized
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white" aria-hidden>
                    <polygon points="8 5 19 12 8 19 8 5" />
                  </svg>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Main footer body */}
        <div className="grid gap-8 md:grid-cols-3 pt-10 border-t border-white/10">
          {/* Brand */}
          <div>
            <div
              className="text-2xl font-extrabold uppercase leading-tight tracking-tighter text-white"
            >
              {businessName}
            </div>
            {tagline ? (
              <p className="mt-2 text-sm text-white/50">{tagline}</p>
            ) : null}
          </div>

          {/* Social */}
          <div>
            <h4
              className="text-[10px] font-bold uppercase text-white/40 mb-3"
              style={{ letterSpacing: '0.18em' }}
            >
              Follow
            </h4>
            <ul className="space-y-2.5">
              {FITNESS_SOCIAL.map((s) => (
                <li key={s.platform}>
                  <a
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-baseline justify-between gap-4 text-sm text-white/70 hover:text-white transition-colors"
                  >
                    <span className="font-medium">{s.label}</span>
                    <span className="text-xs text-white/40 font-mono group-hover:text-[color:var(--primary-color)] transition-colors">
                      {s.handle}
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Address */}
          <div>
            <h4
              className="text-[10px] font-bold uppercase text-white/40 mb-3"
              style={{ letterSpacing: '0.18em' }}
            >
              Visit
            </h4>
            <address className="not-italic text-sm leading-relaxed text-white/70">
              {FITNESS_CONTACT.addressLines.map((line) => (
                <div key={line}>{line}</div>
              ))}
              <div>{FITNESS_CONTACT.cityLine}</div>
            </address>
            <div className="mt-2 text-xs text-white/40 font-mono">
              {FITNESS_CONTACT.phone}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between gap-3 text-xs">
          <div className="text-white/40">
            © {year} {businessName}. Built for people who actually train.
          </div>
          <div className="flex gap-5 text-white/40">
            <a href="#" className="hover:text-white transition-colors">Membership terms</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Refund policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

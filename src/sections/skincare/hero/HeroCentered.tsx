'use client';

// Centered-layout hero variant — skincare category. Streams the full
// activity vector into the deep-link payload so the AI agent has session
// metrics on the very first inbound WhatsApp message.

import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker, getActivitySnapshot } from '@/hooks/useActivityTracker';
import { buildWaDeepLink } from '@/lib/waDeepLink';

const SECTION_ID = 'sec-hero';

export function HeroCentered() {
  const { currentConfig, updateFunnel } = useBuild();
  const { businessName, tagline, description, funnelContext } = currentConfig;

  const sectionRef = useActivityTracker({ sectionId: SECTION_ID, sectionKind: 'hero' });

  const handleCtaClick = () => {
    const phone = funnelContext.whatsappTarget;
    if (!phone) return;

    const snap = getActivitySnapshot();
    const sessionDurationMs = Date.now() - snap.startedAt;

    updateFunnel({
      scrollDepthPct: snap.scrollDepthPct,
      activeSectionId: SECTION_ID,
      lastIntent: 'hero-cta-book',
      sessionDurationMs,
      clickDepth: snap.clickDepth + 1,
      lastProductTag: snap.lastProductTag,
    });

    const { href } = buildWaDeepLink({
      phone,
      intent: 'book-appointment',
      sectionId: SECTION_ID,
      businessName,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      activity: {
        scrollDepthPct: snap.scrollDepthPct,
        sessionDurationMs,
        clickDepth: snap.clickDepth + 1,
        activeSectionId: SECTION_ID,
        lastProductTag: snap.lastProductTag ?? undefined,
      },
    });

    if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
      const blob = new Blob(
        [JSON.stringify({ phone, sectionId: SECTION_ID, snapshot: snap, intent: 'hero-cta-book' })],
        { type: 'application/json' },
      );
      navigator.sendBeacon('/api/waa/prime', blob);
    }

    window.open(href, '_blank', 'noopener,noreferrer');
  };

  return (
    <section
      ref={sectionRef}
      data-section-kind="hero"
      data-variant="centered"
      data-category="skincare"
      style={{
        background:
          'radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--primary-color) 14%, #fff) 0%, #fff 70%)',
        color: '#1a1a1a',
        fontFamily: 'var(--cv-font-body, Inter)',
        padding: 'clamp(96px, 14vw, 180px) clamp(20px, 5vw, 64px)',
        textAlign: 'center',
      }}
    >
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        <h1
          style={{
            fontFamily: 'var(--cv-font-heading, "Playfair Display")',
            fontWeight: 700,
            fontSize: 'clamp(42px, 6vw, 80px)',
            lineHeight: 1.02,
            margin: 0,
            color: 'var(--primary-color)',
            letterSpacing: '-0.025em',
          }}
        >
          {businessName}
        </h1>

        {tagline ? (
          <p
            style={{
              fontFamily: 'var(--cv-font-heading, "Playfair Display")',
              fontWeight: 500,
              fontSize: 'clamp(20px, 1.8vw, 26px)',
              lineHeight: 1.4,
              color: '#D4AF37',
              margin: '20px 0 0 0',
            }}
          >
            {tagline}
          </p>
        ) : null}

        {description ? (
          <p
            style={{
              fontSize: 'clamp(16px, 1.2vw, 18px)',
              lineHeight: 1.75,
              color: '#4a5560',
              margin: '28px auto 40px auto',
              maxWidth: '60ch',
            }}
          >
            {description}
          </p>
        ) : null}

        {funnelContext.whatsappTarget ? (
          <button
            type="button"
            onClick={handleCtaClick}
            data-track-intent="hero-cta-book"
            style={{
              fontFamily: 'var(--cv-font-body, Inter)',
              fontWeight: 600,
              fontSize: 17,
              padding: '16px 36px',
              border: 'none',
              borderRadius: 999,
              cursor: 'pointer',
              color: '#fff',
              background: 'var(--primary-color)',
              boxShadow: '0 12px 32px -12px var(--primary-color)',
            }}
          >
            Book a slot
          </button>
        ) : null}
      </div>
    </section>
  );
}

'use client';

// Split-layout hero variant — skincare category. Reads from BuildContext +
// streams the activity vector into the wa.me [CV:...] context tag.

import { useBuild } from '@/contexts/BuildContext';
import { useActivityTracker, getActivitySnapshot } from '@/hooks/useActivityTracker';
import { buildWaDeepLink } from '@/lib/waDeepLink';

const SECTION_ID = 'sec-hero';

export function HeroSplit() {
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
      lastIntent: 'hero-cta-whatsapp',
      sessionDurationMs,
      clickDepth: snap.clickDepth + 1,
      lastProductTag: snap.lastProductTag,
    });

    const { href } = buildWaDeepLink({
      phone,
      intent: 'general-enquiry',
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
        [JSON.stringify({ phone, sectionId: SECTION_ID, snapshot: snap, intent: 'hero-cta-whatsapp' })],
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
      data-variant="split"
      data-category="skincare"
      style={{
        background:
          'linear-gradient(135deg, #fff 0%, color-mix(in srgb, var(--primary-color) 8%, #fff) 100%)',
        color: '#1a1a1a',
        fontFamily: 'var(--cv-font-body, Inter)',
        padding: 'clamp(48px, 8vw, 96px) clamp(20px, 5vw, 64px)',
      }}
    >
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
          gap: 'clamp(32px, 6vw, 72px)',
          alignItems: 'center',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--cv-font-heading, "Playfair Display")',
              fontWeight: 700,
              fontSize: 'clamp(34px, 5vw, 64px)',
              lineHeight: 1.05,
              margin: 0,
              color: 'var(--primary-color)',
              letterSpacing: '-0.02em',
            }}
          >
            {businessName}
          </h1>

          {tagline ? (
            <p
              style={{
                fontFamily: 'var(--cv-font-heading, "Playfair Display")',
                fontWeight: 500,
                fontSize: 'clamp(18px, 1.6vw, 22px)',
                lineHeight: 1.4,
                color: '#D4AF37',
                margin: '12px 0 0 0',
              }}
            >
              {tagline}
            </p>
          ) : null}

          {description ? (
            <p
              style={{
                fontSize: 'clamp(15px, 1.1vw, 17px)',
                lineHeight: 1.7,
                color: '#4a5560',
                margin: '20px 0 32px 0',
                maxWidth: '52ch',
              }}
            >
              {description}
            </p>
          ) : null}

          {funnelContext.whatsappTarget ? (
            <button
              type="button"
              onClick={handleCtaClick}
              data-track-intent="hero-cta-whatsapp"
              style={{
                fontFamily: 'var(--cv-font-body, Inter)',
                fontWeight: 600,
                fontSize: 16,
                padding: '14px 28px',
                border: 'none',
                borderRadius: 999,
                cursor: 'pointer',
                color: '#fff',
                background: 'var(--primary-color)',
                boxShadow: '0 8px 24px -8px rgba(0,0,0,0.25)',
                transition: 'transform 120ms ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Chat on WhatsApp
            </button>
          ) : null}
        </div>

        <div
          style={{
            aspectRatio: '4 / 5',
            borderRadius: 24,
            overflow: 'hidden',
            background:
              'linear-gradient(160deg, color-mix(in srgb, var(--primary-color) 18%, transparent), rgba(212, 175, 55, 0.22))',
            boxShadow: '0 24px 80px -32px rgba(0,0,0,0.3)',
          }}
        />
      </div>
    </section>
  );
}

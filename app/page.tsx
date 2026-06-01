'use client';

// Demo landing — renders the active hero variant + a floating "Live Edit"
// rail bound to the new BuildContext surface.

import { HeroSection } from '@/sections/hero';
import { useBuild, type HeroVariant } from '@/contexts/BuildContext';

const HERO_VARIANTS: { id: HeroVariant; label: string }[] = [
  { id: 'split',    label: 'Split' },
  { id: 'centered', label: 'Centered' },
];

export default function HomePage() {
  return (
    <main>
      <HeroSection />
      <EditorRail />
    </main>
  );
}

function EditorRail() {
  const { currentConfig, updateConfig, resetConfig } = useBuild();

  return (
    <aside
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 320,
        padding: 20,
        background: 'rgba(255,255,255,0.96)',
        backdropFilter: 'blur(8px)',
        border: '1px solid rgba(0,0,0,0.08)',
        borderRadius: 16,
        boxShadow: '0 24px 60px -24px rgba(0,0,0,0.25)',
        fontFamily: 'var(--cv-font-body)',
        fontSize: 13,
        color: '#1a1a1a',
        zIndex: 50,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontWeight: 700 }}>Live Edit</span>
        <button
          type="button"
          onClick={resetConfig}
          style={{
            fontSize: 11,
            background: 'transparent',
            border: '1px solid rgba(0,0,0,0.15)',
            borderRadius: 6,
            padding: '4px 8px',
            cursor: 'pointer',
            color: '#666',
          }}
        >
          Reset
        </button>
      </div>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Business name</div>
        <input
          type="text"
          value={currentConfig.businessName}
          onChange={(e) => updateConfig({ businessName: e.target.value })}
          style={{ width: '100%', padding: 8, border: '1px solid #d4d4d4', borderRadius: 8 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Tagline</div>
        <input
          type="text"
          value={currentConfig.tagline}
          onChange={(e) => updateConfig({ tagline: e.target.value })}
          style={{ width: '100%', padding: 8, border: '1px solid #d4d4d4', borderRadius: 8 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Description</div>
        <textarea
          value={currentConfig.description}
          onChange={(e) => updateConfig({ description: e.target.value })}
          rows={3}
          style={{
            width: '100%', padding: 8, border: '1px solid #d4d4d4', borderRadius: 8,
            fontFamily: 'inherit', resize: 'vertical',
          }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Primary color</div>
        <input
          type="color"
          value={currentConfig.primaryColor}
          onChange={(e) => updateConfig({ primaryColor: e.target.value as `#${string}` })}
          style={{ width: '100%', height: 36, padding: 0, border: '1px solid #d4d4d4', borderRadius: 8 }}
        />
      </label>

      <div>
        <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Hero variant</div>
        <div style={{ display: 'flex', gap: 6 }}>
          {HERO_VARIANTS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => updateConfig({ heroVariant: v.id })}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: 12,
                fontWeight: 600,
                border: '1px solid #d4d4d4',
                borderRadius: 8,
                background: currentConfig.heroVariant === v.id ? 'var(--primary-color)' : 'white',
                color: currentConfig.heroVariant === v.id ? 'white' : '#1a1a1a',
                cursor: 'pointer',
              }}
            >
              {v.label}
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}

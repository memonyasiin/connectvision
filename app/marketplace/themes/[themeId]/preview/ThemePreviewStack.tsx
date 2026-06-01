'use client';

// Client component — wraps the theme stack in <BuildProvider> so the
// MODULE 1 dispatcher resolves against the sample BusinessData.

import { BuildProvider } from '@/contexts/BuildContext';
import {
  resolveThemeBlockWithFallback,
  resolveDefaultVariantId,
} from '@/themes/_registry';
import type { ThemeManifest, SampleBuild, SectionKind } from '@/themes/_types';

interface Props {
  theme: ThemeManifest;
  sample: SampleBuild;
}

export function ThemePreviewStack({ theme, sample }: Props) {
  return (
    <BuildProvider
      initial={{
        businessName:     sample.data.businessName,
        tagline:          sample.data.tagline,
        description:      sample.data.description,
        primaryColor:     sample.data.primaryColor,
        selectedCategory: sample.data.selectedCategory,
        heroVariant:      sample.data.heroVariant as 'split' | 'centered' | 'bold',
        funnelContext: {
          scrollDepthPct:    0,
          activeSectionId:   null,
          lastIntent:        null,
          whatsappTarget:    sample.data.whatsappTarget,
          sessionDurationMs: 0,
          clickDepth:        0,
          lastProductTag:    null,
        },
      }}
    >
      <main>
        {theme.supportedSections.map((kind) => (
          <RenderSection key={kind} themeId={theme.id} kind={kind} />
        ))}
      </main>
    </BuildProvider>
  );
}

function RenderSection({ themeId, kind }: { themeId: string; kind: SectionKind }) {
  const variantId = resolveDefaultVariantId(themeId, kind);
  if (!variantId) return null;
  const resolved = resolveThemeBlockWithFallback(themeId, kind, variantId);
  if (!resolved) return null;
  const Component = resolved.component;
  return <Component />;
}

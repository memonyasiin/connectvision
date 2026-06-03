// Marketplace Tier preview — renders a theme's full section stack using
// the MODULE 1 dispatcher and a sample BusinessData from MODULE 1's
// SAMPLE_BUILDS. Doubles as the screenshot source for catalog cards and
// the URL Envato reviewers visit during marketplace approval.
//
// Pure server component — no Prisma, no auth. The client BuildProvider
// wrapper underneath supplies the sample data + drives the dispatcher.

import { notFound } from 'next/navigation';
import { getThemeById } from '@/data/themeManifest';
import { getSampleBuildByThemeId } from '@/data/sampleBuilds';
import { findThemeBySlug } from '@/data/themeMarketplaceCatalog';
import { ThemePreviewStack } from './ThemePreviewStack';

interface PageProps {
  params: Promise<{ themeId: string }>;
}

// The `themeId` segment may be EITHER a manifest theme id (e.g. skincare-luxe)
// OR a marketplace slug (e.g. memon-beauty). Marketplace catalog `previewPath`s
// are authored with slugs, while the manifest/sampleBuilds key off the category
// id — so resolve both. Returns the canonical manifest id, or null.
function resolveManifestId(themeId: string): string | null {
  if (getThemeById(themeId)) return themeId;
  const mk = findThemeBySlug(themeId);
  return mk && getThemeById(mk.categoryId) ? mk.categoryId : null;
}

export async function generateMetadata({ params }: PageProps) {
  const { themeId } = await params;
  const id = resolveManifestId(themeId);
  const theme = id ? getThemeById(id) : null;
  if (!theme) return { title: 'Theme preview' };
  return {
    title: `${theme.name} — Live preview`,
    description: theme.tagline,
  };
}

export default async function ThemePreviewPage({ params }: PageProps) {
  const { themeId } = await params;
  const id = resolveManifestId(themeId);
  const theme = id ? getThemeById(id) : null;
  if (!id || !theme) notFound();

  const sample = getSampleBuildByThemeId(id);
  if (!sample) notFound();

  return <ThemePreviewStack theme={theme} sample={sample} />;
}

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
import { ThemePreviewStack } from './ThemePreviewStack';

interface PageProps {
  params: Promise<{ themeId: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { themeId } = await params;
  const theme = getThemeById(themeId);
  if (!theme) return { title: 'Theme preview' };
  return {
    title: `${theme.name} — Live preview`,
    description: theme.tagline,
  };
}

export default async function ThemePreviewPage({ params }: PageProps) {
  const { themeId } = await params;
  const theme = getThemeById(themeId);
  if (!theme) notFound();

  const sample = getSampleBuildByThemeId(themeId);
  if (!sample) notFound();

  return <ThemePreviewStack theme={theme} sample={sample} />;
}

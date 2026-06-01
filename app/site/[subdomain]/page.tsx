import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchSiteConfig } from '@/lib/tenantFetch';
import { TenantRenderer } from './TenantRenderer';

interface PageProps {
  params: Promise<{ subdomain: string }>;
}

/**
 * Dynamic path materialization for `<subdomain>.connectvision.io`.
 * Server component — runs at the edge, fetches the persisted schema, and
 * mounts the registry-driven section composition.
 */
export default async function SitePage({ params }: PageProps) {
  const { subdomain } = await params;
  const config = await fetchSiteConfig(subdomain);
  if (!config) notFound();

  return <TenantRenderer />;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { subdomain } = await params;
  const config = await fetchSiteConfig(subdomain);
  if (!config) {
    return { title: 'ConnectVision' };
  }
  return {
    title: config.businessName,
    description: config.description,
  };
}

import type { ReactNode } from 'react';
import { notFound } from 'next/navigation';
import { BuildProvider } from '@/contexts/BuildContext';
import { fetchSiteConfig } from '@/lib/tenantFetch';

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ subdomain: string }>;
}

/**
 * Tenant-scoped layout. Fetches the persisted BusinessData server-side and
 * seeds <BuildProvider initial={...}> so the first paint shows the tenant's
 * actual branding (no flash of editor defaults).
 *
 * Nested under the root BuildProvider — context resolution picks the
 * nearest provider, which is this one for /site/* routes.
 */
export default async function SiteLayout({ children, params }: LayoutProps) {
  const { subdomain } = await params;
  const config = await fetchSiteConfig(subdomain);
  if (!config) notFound();

  // BuildProvider's `initial` accepts Partial<BusinessData>; mergeConfig
  // inside the provider deep-merges funnelContext against DEFAULT_CONFIG,
  // so we can hand `config` over verbatim.
  return <BuildProvider initial={config}>{children}</BuildProvider>;
}

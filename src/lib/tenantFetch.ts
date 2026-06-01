// ─────────────────────────────────────────────────────────────────────────────
// Tenant Configuration Fetcher (Tier 4)
// ─────────────────────────────────────────────────────────────────────────────
// Server-only — resolves a subdomain (or custom-domain handle) to a
// BusinessData payload that the dynamic /site/[subdomain] route hands off
// to <BuildProvider initial={...}>.
//
// Resolution order:
//   1. Prisma lookup against `SiteConfiguration` (real DB path)
//   2. Built-in mock catalog (dev / preview / when DATABASE_URL is missing)
//   3. null — caller renders a "site not found" page
//
// This file is `import-server-only` safe: Prisma is imported eagerly because
// any caller of this module is already a server component / route handler.

import 'server-only';

import type { BusinessData, IndustryCategory, HeroVariant } from '@/contexts/BuildContext';
import { DEFAULT_CONFIG } from '@/contexts/BuildContext';
import { prisma } from './prisma';

// ── Mock catalog — keeps the boilerplate runnable without a live DB. ─────────
const MOCK_TENANTS: Record<string, Partial<BusinessData>> = {
  'memon-beauty': {
    businessName: 'Memon Beauty',
    tagline: 'Skincare, simplified.',
    description: 'Premium skincare crafted in small batches. Visit our Mumbai studio or chat with us on WhatsApp.',
    primaryColor: '#1c4d2a',
    selectedCategory: 'skincare',
    heroVariant: 'split',
    funnelContext: {
      ...DEFAULT_CONFIG.funnelContext,
      whatsappTarget: '+919702601111',
    },
  },
  'powerhouse-gym': {
    businessName: 'Powerhouse Gym',
    tagline: 'Forge yourself.',
    description: 'Heavy iron. Real coaches. No nonsense. Open 24/7 in Bandra West.',
    primaryColor: '#ef4444',
    selectedCategory: 'fitness',
    heroVariant: 'bold',
    funnelContext: {
      ...DEFAULT_CONFIG.funnelContext,
      whatsappTarget: '+919702601111',
    },
  },
  'rasoi-by-anand': {
    businessName: 'Rasoi by Anand',
    tagline: 'Awadhi kitchen. Open fire. Slow food.',
    description:
      'Mughlai and Awadhi tasting plates by Chef Anand Sharma. Tucked into a 36-seat Bandra dining room. Reserve a table via WhatsApp or scan the QR for the live menu.',
    primaryColor: '#b45309',
    selectedCategory: 'restaurant',
    // Restaurant variants intentionally use 'split' as the BusinessData.heroVariant
    // fallback; the dispatcher's resolveThemeBlockWithFallback then snaps to
    // hospitality-warm's actual default ('photo') automatically.
    heroVariant: 'split',
    funnelContext: {
      ...DEFAULT_CONFIG.funnelContext,
      whatsappTarget: '+919702601111',
    },
  },
  'sunshine-clinic': {
    businessName: 'Sunshine Clinic',
    tagline: 'General medicine, paediatrics, and dermatology.',
    description:
      'NABH-accredited family clinic in Andheri East. Six consultants across three specialities. Walk-ins welcome 9 am – 9 pm. Online appointment booking + WhatsApp consult.',
    primaryColor: '#0e7490',
    selectedCategory: 'medical',
    // BusinessData.heroVariant doesn't include 'clinical' in its union;
    // dispatcher's fallback resolves to medical-clinical's manifest default.
    heroVariant: 'split',
    funnelContext: {
      ...DEFAULT_CONFIG.funnelContext,
      whatsappTarget: '+919702601111',
    },
  },
};

function coerceCategory(input: string): IndustryCategory {
  switch (input) {
    case 'skincare':
    case 'fitness':
    case 'restaurant':
    case 'corporate':
    case 'medical':
      return input;
    default:
      return 'skincare';
  }
}

function coerceVariant(input: string): HeroVariant {
  switch (input) {
    case 'split':
    case 'centered':
    case 'bold':
      return input;
    default:
      return 'split';
  }
}

function isHex(s: string): s is `#${string}` {
  return /^#[0-9a-fA-F]{3,8}$/.test(s);
}

/**
 * Resolve a tenant by its subdomain. Returns the persisted Tier-1/2/5 state
 * suitable for seeding <BuildProvider initial={...}>.
 *
 * @returns BusinessData (partial) or null if the tenant doesn't exist /
 *          isn't published.
 */
export async function fetchSiteConfig(
  subdomain: string,
): Promise<Partial<BusinessData> | null> {
  if (!subdomain) return null;
  const slug = subdomain.toLowerCase();

  // 1. Real DB lookup (skipped if DATABASE_URL isn't set or fails).
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('stub')) {
    try {
      const domain = await prisma.tenantDomain.findUnique({
        where: { subdomain: slug },
        include: { siteConfig: true },
      });
      const site = domain?.siteConfig;
      if (site && site.published) {
        const variants = (site.sectionVariants as Record<string, string> | null) ?? {};
        const heroVariantRaw = variants['hero'] ?? 'split';
        const primaryColorRaw = site.primaryColor;
        const primaryColor: `#${string}` = isHex(primaryColorRaw) ? primaryColorRaw : '#1c4d2a';

        return {
          businessName: site.businessName,
          tagline: site.tagline,
          description: site.description,
          primaryColor,
          selectedCategory: coerceCategory(site.selectedCategory),
          heroVariant: coerceVariant(heroVariantRaw),
          funnelContext: {
            ...DEFAULT_CONFIG.funnelContext,
            whatsappTarget: site.whatsappTarget ?? DEFAULT_CONFIG.funnelContext.whatsappTarget,
          },
        };
      }
    } catch (err) {
      // Soft-fail — fall through to mock so the route never 500s on DB hiccups.
      // eslint-disable-next-line no-console
      console.warn('[tenantFetch] Prisma lookup failed; falling back to mock', err);
    }
  }

  // 2. Mock fallback for dev.
  return MOCK_TENANTS[slug] ?? null;
}

/** Returns the list of mock subdomains, useful for the marketing showcase. */
export function listMockTenants(): readonly string[] {
  return Object.keys(MOCK_TENANTS);
}

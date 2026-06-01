// ─────────────────────────────────────────────────────────────────────────────
// Multi-Tenant Routing Engine (Tier 4 — Hybrid Delivery)
// ─────────────────────────────────────────────────────────────────────────────
// Runs at the edge on every request. Job: take a host like
// `fitness.connectvision.io` and internally rewrite to
// `/site/fitness${pathname}` so the dynamic route `app/site/[subdomain]/`
// renders the tenant's published configuration.
//
// Excluded from interception:
//   - Next internals (`_next/*`)
//   - Vercel infra (`_vercel/*`)
//   - Static assets in /public (matched by extension fallback below)
//   - `favicon.ico`
//   - API routes (`api/*`) — they're tenant-aware via headers, not URL
//
// Custom apex domains: the placeholder block at the bottom looks up the
// domain → tenant mapping (Cloudflare DNS verification, the
// `TenantDomain.customDomain` Prisma column). For now, only subdomain
// resolution is active; the apex hook is documented for the next phase.

import { NextResponse, type NextRequest } from 'next/server';
import { buildTenantRewrite } from './lib/vercelProxy';

// Apex domains we serve directly (no tenant rewrite).
// Add staging / preview hosts here as they come online.
const APEX_HOSTS = new Set<string>([
  'connectvision.io',
  'www.connectvision.io',
  'connectvision-saas.vercel.app',
  'localhost:3100',
  '127.0.0.1:3100',
]);

const RESERVED_SUBDOMAINS = new Set<string>([
  'www',
  'api',
  'admin',
  'app',
  'cdn',
  'static',
  'assets',
  'mail',
  'preview',
  'staging',
  'dev',
]);

interface HostParts {
  /** Hostname without port (`fitness.connectvision.io`). */
  host: string;
  /** Subdomain candidate (`fitness`) or null when none. */
  subdomain: string | null;
  /** True if this is the apex / www host — we render the marketing site. */
  isApex: boolean;
}

function parseHost(rawHost: string): HostParts {
  // Lowercase for case-insensitive matching. Keep port intact for APEX_HOSTS
  // lookup so localhost:3100 ≠ localhost:3000.
  const lower = rawHost.toLowerCase();

  if (APEX_HOSTS.has(lower)) {
    return { host: lower, subdomain: null, isApex: true };
  }

  // Strip port for subdomain math.
  const hostNoPort = lower.split(':')[0] ?? lower;
  const parts = hostNoPort.split('.');

  // Need at least 3 labels for *.connectvision.io style.
  // Edge case: localhost subdomain ("fitness.localhost") for dev → 2 labels.
  const isLocalhost = parts.at(-1) === 'localhost';

  if (isLocalhost && parts.length >= 2) {
    const sub = parts[0] ?? null;
    if (sub && !RESERVED_SUBDOMAINS.has(sub)) {
      return { host: lower, subdomain: sub, isApex: false };
    }
  }

  if (parts.length >= 3) {
    const sub = parts[0] ?? null;
    if (sub && !RESERVED_SUBDOMAINS.has(sub) && sub !== 'www') {
      return { host: lower, subdomain: sub, isApex: false };
    }
  }

  return { host: lower, subdomain: null, isApex: true };
}

export function middleware(req: NextRequest): NextResponse {
  const host = req.headers.get('host') ?? '';
  const { subdomain, isApex } = parseHost(host);

  // ── Custom apex domain hook ──────────────────────────────────────────────
  // When a request lands on a host we don't recognize, look it up against
  // `TenantDomain.customDomain` and rewrite if verified. The lookup must run
  // in the edge runtime — Prisma is NOT edge-compatible, so the real
  // implementation should call a thin Vercel KV / Cloudflare Workers KV
  // cache populated by a backend job. Placeholder:
  //
  //   if (!isApex && !subdomain) {
  //     const tenant = await lookupCustomDomain(host);  // edge KV call
  //     if (tenant?.verified) {
  //       return NextResponse.rewrite(
  //         new URL(`/site/${tenant.subdomain}${req.nextUrl.pathname}`, req.url),
  //       );
  //     }
  //   }

  if (isApex || !subdomain) {
    return NextResponse.next();
  }

  // Rewrite + attach tenant-aware edge cache headers (Cache-Control SWR,
  // x-vercel-cache-tag, x-cv-tenant, x-cv-routing-key, Vary: Host).
  return buildTenantRewrite({ request: req, subdomain, profile: 'html' });
}

// ─────────────────────────────────────────────────────────────────────────────
// Matcher config — defined inline (was previously in root proxy.ts)
// ─────────────────────────────────────────────────────────────────────────────
// Negative lookahead excludes Next internals, Vercel infra, API routes,
// favicon, and any file with an extension (.png, .css, .js, .map, .ico, etc.)
// so static assets ship straight through without host parsing overhead.
//
// Moved here from root proxy.ts because Vercel's build environment (as of
// Next 16.2.x) expects `.next/server/middleware.js.nft.json` to exist —
// the proxy.ts rename convention is recognised but the artifact path
// detection lags. Keeping everything in src/middleware.ts is the
// most-compatible setup.
export const config = {
  matcher: ['/((?!_next/|_vercel/|api/|favicon\\.ico|.*\\.[\\w]+$).*)'],
};

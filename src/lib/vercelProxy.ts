// ─────────────────────────────────────────────────────────────────────────────
// Vercel Edge Proxy Helper — Phase 5 freeze
// ─────────────────────────────────────────────────────────────────────────────
// Centralizes the headers attached to every rewritten tenant request so
// the edge cache, Vercel Data Cache, and tenant-aware invalidation all
// line up. Keeping this in one file means routing decisions in middleware
// stay small and the cache strategy is one read away.
//
// What we set:
//   - Cache-Control                  SWR profile per response type
//   - x-vercel-cache-tag              tenant-scoped invalidation key
//   - x-cv-tenant                     downstream identifier for logs / RSC
//   - x-cv-routing-key                rotation handle, env-driven
//   - Vary: Host                      per-tenant cache key isolation
//
// Phase 5 additions:
//   - SWR windows now read from env (CV_HTML_S_MAXAGE_SEC etc.) so
//     ops can tune cache behaviour without a code deploy
//   - 'flutter-api' profile for the cross-platform mobile app — longer
//     SWR window optimized for high-latency mobile networks
//   - validateServiceToken() helper for service-to-service auth using
//     X-ConnectVision-Validation-Token

import { NextResponse, type NextRequest } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// Cache profiles
// ─────────────────────────────────────────────────────────────────────────────
// Pulled from env at module load so each Vercel function instance picks
// up the operator's current tuning. Defaults baked in for local dev where
// .env may not be sourced.

function readSecondsEnv(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

const HTML_S_MAXAGE      = readSecondsEnv('CV_HTML_S_MAXAGE_SEC',      10);
const HTML_SWR           = readSecondsEnv('CV_HTML_SWR_SEC',           60);
const JSON_S_MAXAGE      = readSecondsEnv('CV_JSON_S_MAXAGE_SEC',      30);
const JSON_SWR           = readSecondsEnv('CV_JSON_SWR_SEC',          120);
const FLUTTER_S_MAXAGE   = readSecondsEnv('CV_FLUTTER_API_S_MAXAGE_SEC', 60);
const FLUTTER_SWR        = readSecondsEnv('CV_FLUTTER_API_SWR_SEC',    600);
const STATIC_MAX_AGE     = readSecondsEnv('CV_STATIC_MAX_AGE_SEC', 31536000);

export type CacheProfile =
  | 'html'         // Tenant HTML — fast SWR, operator-edit feedback loop
  | 'json-edge'    // JSON manifests / catalog / search — moderate SWR
  | 'flutter-api'  // Cross-platform mobile API — wide SWR for flaky networks
  | 'static-asset' // Hashed assets — year-long cache
  | 'no-store';    // Admin / mutating responses — never cache

interface CacheProfileSpec {
  /** Cache-Control directive value. */
  cacheControl: string;
  /** Whether to attach `x-vercel-cache-tag` for tag-based invalidation. */
  taggable: boolean;
}

const PROFILES: Record<CacheProfile, CacheProfileSpec> = {
  html: {
    cacheControl: `public, s-maxage=${HTML_S_MAXAGE}, stale-while-revalidate=${HTML_SWR}`,
    taggable: true,
  },
  'json-edge': {
    cacheControl: `public, s-maxage=${JSON_S_MAXAGE}, stale-while-revalidate=${JSON_SWR}`,
    taggable: true,
  },
  // Flutter clients hit endpoints over potentially-flaky mobile networks
  // (3G/4G in tier-2 / tier-3 Indian cities). The longer SWR window means
  // a request landing during a brief upstream blip still serves a valid
  // stale response while the next refresh kicks off in the background —
  // critical for the PIA CRM Flutter app's "no spinner on bad signal" UX.
  'flutter-api': {
    cacheControl: `public, s-maxage=${FLUTTER_S_MAXAGE}, stale-while-revalidate=${FLUTTER_SWR}`,
    taggable: true,
  },
  'static-asset': {
    cacheControl: `public, max-age=${STATIC_MAX_AGE}, immutable`,
    taggable: false,
  },
  'no-store': {
    cacheControl: 'private, no-store, max-age=0',
    taggable: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Header attachment
// ─────────────────────────────────────────────────────────────────────────────

export interface AttachTenantHeadersInput {
  /** Output of the middleware's rewrite. */
  response: NextResponse;
  /** Inbound request — used for ip / region / forwarded host. */
  request: NextRequest;
  /** Resolved subdomain (e.g. `memon-beauty`). */
  subdomain: string;
  /** Cache profile to apply. Defaults to `html`. */
  profile?: CacheProfile;
  /**
   * Optional override for the cache tag. Default `tenant:<subdomain>` lets
   * a tenant edit invalidate everything in one call; override with a
   * finer-grained tag for per-section invalidation.
   */
  cacheTagOverride?: string;
}

export function attachTenantHeaders({
  response,
  request,
  subdomain,
  profile = 'html',
  cacheTagOverride,
}: AttachTenantHeadersInput): NextResponse {
  const spec = PROFILES[profile];

  response.headers.set('Cache-Control', spec.cacheControl);

  if (spec.taggable) {
    response.headers.set('x-vercel-cache-tag', cacheTagOverride ?? `tenant:${subdomain}`);
  }

  // ── Downstream identifiers ────────────────────────────────────────────────
  const tenantHeaderName  = process.env.TENANT_HEADER_NAME             ?? 'X-CV-Tenant';
  const routingHeaderName = process.env.TENANT_ROUTING_KEY_HEADER_NAME ?? 'X-CV-Routing-Key';

  response.headers.set(tenantHeaderName,  subdomain);
  response.headers.set(routingHeaderName, computeRoutingKey(subdomain));

  // Vary on Host so the cache key includes the subdomain — otherwise two
  // tenants on the same edge node would share the rewritten path's cache.
  const existingVary = response.headers.get('Vary');
  response.headers.set('Vary', existingVary ? `${existingVary}, Host` : 'Host');

  // Pass the visitor's edge region into the rendered HTML — helps the AI
  // agent localize "near you" copy in a future phase.
  const edgeRegion = request.headers.get('x-vercel-ip-country-region') ?? null;
  if (edgeRegion) {
    response.headers.set('x-cv-region', edgeRegion);
  }

  return response;
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing key
// ─────────────────────────────────────────────────────────────────────────────
// Stable per-deploy handle that survives content edits but rotates on infra
// changes. Currently `<subdomain>:<routing-version>`; the version lets us
// rotate caches globally without a per-tenant invalidation call.

const ROUTING_VERSION = process.env.CV_ROUTING_VERSION ?? 'v1';

function computeRoutingKey(subdomain: string): string {
  return `${subdomain}:${ROUTING_VERSION}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience: rewrite + headers in one call
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildTenantRewriteInput {
  request: NextRequest;
  subdomain: string;
  /** Path to rewrite to, defaults to `/site/<subdomain><currentPath>`. */
  destinationPath?: string;
  profile?: CacheProfile;
}

/**
 * The middleware can call this and return its result directly:
 *
 *   if (subdomain) return buildTenantRewrite({ request, subdomain });
 */
export function buildTenantRewrite({
  request,
  subdomain,
  destinationPath,
  profile = 'html',
}: BuildTenantRewriteInput): NextResponse {
  const url = request.nextUrl.clone();
  url.pathname = destinationPath ?? `/site/${subdomain}${url.pathname}`;
  const res = NextResponse.rewrite(url);
  return attachTenantHeaders({ response: res, request, subdomain, profile });
}

// ─────────────────────────────────────────────────────────────────────────────
// Service-to-service validation (X-ConnectVision-Validation-Token)
// ─────────────────────────────────────────────────────────────────────────────
// Used by routes that aren't exposed to end-users — Flutter app's API
// consumption, internal admin tools, cron-triggered jobs.
// Header name + token both env-driven so we can rotate on schedule.

export interface ValidateServiceTokenResult {
  ok: boolean;
  reason?: 'header_missing' | 'header_mismatch' | 'token_not_configured';
}

/**
 * Validate the X-ConnectVision-Validation-Token header against the
 * configured CV_VALIDATION_TOKEN. Returns ok=false with a reason for
 * the caller to translate into a 401/500 status appropriately.
 *
 * @example
 *   const auth = validateServiceToken(req);
 *   if (!auth.ok) {
 *     return NextResponse.json(
 *       { ok: false, error: auth.reason },
 *       { status: auth.reason === 'token_not_configured' ? 500 : 401 },
 *     );
 *   }
 */
export function validateServiceToken(request: Request | NextRequest): ValidateServiceTokenResult {
  const expected = process.env.CV_VALIDATION_TOKEN;
  if (!expected) return { ok: false, reason: 'token_not_configured' };

  const headerName =
    process.env.CV_VALIDATION_TOKEN_HEADER_NAME ?? 'X-ConnectVision-Validation-Token';
  const presented = request.headers.get(headerName);
  if (!presented) return { ok: false, reason: 'header_missing' };

  // Constant-time compare via length-equal padding. Edge runtime doesn't
  // expose node:crypto.timingSafeEqual; this hand-rolled compare keeps
  // the lookup time independent of where the mismatch occurs.
  if (presented.length !== expected.length) return { ok: false, reason: 'header_mismatch' };
  let diff = 0;
  for (let i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ presented.charCodeAt(i);
  }
  return diff === 0 ? { ok: true } : { ok: false, reason: 'header_mismatch' };
}

// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic — read-only snapshot of the live cache profile values
// ─────────────────────────────────────────────────────────────────────────────
// Useful in /api/admin/health or similar surface to confirm env vars
// landed correctly in the production Vercel runtime.

export function getCacheProfilesSnapshot(): Record<CacheProfile, string> {
  return {
    html:           PROFILES.html.cacheControl,
    'json-edge':    PROFILES['json-edge'].cacheControl,
    'flutter-api':  PROFILES['flutter-api'].cacheControl,
    'static-asset': PROFILES['static-asset'].cacheControl,
    'no-store':     PROFILES['no-store'].cacheControl,
  };
}

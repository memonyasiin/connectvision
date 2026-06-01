// ═════════════════════════════════════════════════════════════════════════════
// POST /api/admin/merchants/onboard — Sovereign Merchant Onboarding (MODULE 2)
// ─────────────────────────────────────────────────────────────────────────────
// Single round-trip that creates a Merchant + its first TenantDomain in a
// single Prisma $transaction. Backs the 3-step wizard at /admin/onboard.
//
// CONTRACT
//   Request body:
//     {
//       name: string,
//       email: string,
//       gstinString: string,
//       mapsUrl: string,
//       vpaAddress: string,
//       subdomain: string
//     }
//
//   Success (201):
//     {
//       ok: true,
//       merchant: { id, name, email, complianceRating, ... },
//       domain:   { id, subdomain, ... },
//       complianceSnapshot: { score, components: [...] }
//     }
//
//   Failure (400):
//     {
//       ok: false,
//       status: 400,
//       error: 'VALIDATION_FAULT',
//       fieldErrors: { [fieldName]: { code, detail } }
//     }
//
//   Failure (409):
//     { ok: false, status: 409, error: 'UNIQUE_CONSTRAINT', detail: '...' }
//
// AUTH
//   Same three-path pattern as /api/admin/workforce + /api/admin/customers:
//   Bearer CRON_SECRET | Bearer INTERNAL_SECRET | X-CV-Validation-Token.
//
// RUNTIME
//   nodejs — Prisma client requires it. Onboarding is not a hot path so
//   cold-start latency is not a concern.
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { validateServiceToken } from '@/lib/vercelProxy';
import {
  validateGstin,
  validateVpa,
  validateMapsUrl,
  validateSubdomain,
  computeInitialCompliance,
  type ValidationResult,
} from '@/lib/sovereignValidators';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Request / response shapes
// ─────────────────────────────────────────────────────────────────────────────

interface OnboardRequest {
  name: string;
  email: string;
  gstinString: string;
  mapsUrl: string;
  vpaAddress: string;
  subdomain: string;
}

interface FieldError {
  code: string;
  detail: string;
}

interface ValidationFaultResponse {
  ok: false;
  status: 400;
  error: 'VALIDATION_FAULT';
  fieldErrors: Record<string, FieldError>;
}

interface UniqueConstraintResponse {
  ok: false;
  status: 409;
  error: 'UNIQUE_CONSTRAINT';
  detail: string;
  field?: string;
}

interface InternalFaultResponse {
  ok: false;
  status: 500;
  error: 'INTERNAL_FAULT';
  detail: string;
}

interface UnauthorizedResponse {
  ok: false;
  status: 401;
  error: 'UNAUTHORIZED';
  detail: string;
}

interface InvalidBodyResponse {
  ok: false;
  status: 400;
  error: 'INVALID_BODY';
  detail: string;
}

type ErrorResponse =
  | ValidationFaultResponse
  | UniqueConstraintResponse
  | InternalFaultResponse
  | UnauthorizedResponse
  | InvalidBodyResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Auth — three-path
// ─────────────────────────────────────────────────────────────────────────────

function requireServiceAuth(req: Request): UnauthorizedResponse | null {
  const cronSecret     = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;
  const cvToken        = process.env.CV_VALIDATION_TOKEN;

  if (!cronSecret && !internalSecret && !cvToken) {
    return null; // dev posture — no secrets ⇒ open
  }

  const authHeader = req.headers.get('authorization') ?? '';
  const cronAuthOk     = !!cronSecret     && authHeader === `Bearer ${cronSecret}`;
  const internalAuthOk = !!internalSecret && authHeader === `Bearer ${internalSecret}`;
  const cvAuthOk       = !!cvToken        && validateServiceToken(req).ok;
  if (cronAuthOk || internalAuthOk || cvAuthOk) return null;

  return {
    ok: false,
    status: 401,
    error: 'UNAUTHORIZED',
    detail: 'Missing or invalid service credential.',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Body parsing — defensive narrowing of unknown JSON
// ─────────────────────────────────────────────────────────────────────────────

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

function parseBody(raw: unknown): OnboardRequest | InvalidBodyResponse {
  if (raw === null || typeof raw !== 'object') {
    return {
      ok: false,
      status: 400,
      error: 'INVALID_BODY',
      detail: 'Body must be a JSON object.',
    };
  }
  const c = raw as Record<string, unknown>;
  const missingFields: string[] = [];
  for (const f of ['name', 'email', 'gstinString', 'mapsUrl', 'vpaAddress', 'subdomain']) {
    if (!isString(c[f])) missingFields.push(f);
  }
  if (missingFields.length > 0) {
    return {
      ok: false,
      status: 400,
      error: 'INVALID_BODY',
      detail: `Missing or non-string fields: ${missingFields.join(', ')}.`,
    };
  }
  return {
    name:        (c['name']        as string),
    email:       (c['email']       as string),
    gstinString: (c['gstinString'] as string),
    mapsUrl:     (c['mapsUrl']     as string),
    vpaAddress:  (c['vpaAddress']  as string),
    subdomain:   (c['subdomain']   as string),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation aggregator — runs every isomorphic validator + email checks
// ─────────────────────────────────────────────────────────────────────────────

interface NormalisedOnboardingInput {
  name: string;
  email: string;
  gstinString: string;
  mapsUrl: string;
  vpaAddress: string;
  subdomain: string;
}

function aggregateValidation(
  body: OnboardRequest,
): { ok: true; value: NormalisedOnboardingInput } | ValidationFaultResponse {
  const fieldErrors: Record<string, FieldError> = {};

  // ── name ───────────────────────────────────────────────────────────
  const trimmedName = body.name.trim();
  if (trimmedName.length < 2 || trimmedName.length > 120) {
    fieldErrors['name'] = {
      code: 'NAME_LENGTH',
      detail: 'Business name must be between 2 and 120 characters.',
    };
  }

  // ── email — light format check (no DNS / MX lookup) ────────────────
  const trimmedEmail = body.email.trim().toLowerCase();
  if (trimmedEmail.length === 0 || trimmedEmail.length > 120) {
    fieldErrors['email'] = {
      code: 'EMAIL_LENGTH',
      detail: 'Email is required and must not exceed 120 chars.',
    };
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    fieldErrors['email'] = {
      code: 'EMAIL_FORMAT',
      detail: 'Email format is not valid.',
    };
  }

  // ── isomorphic validators ──────────────────────────────────────────
  const gstinResult     = validateGstin(body.gstinString);
  const vpaResult       = validateVpa(body.vpaAddress);
  const mapsResult      = validateMapsUrl(body.mapsUrl);
  const subdomainResult = validateSubdomain(body.subdomain);

  if (!gstinResult.ok)     fieldErrors['gstinString'] = { code: gstinResult.code,     detail: gstinResult.detail };
  if (!vpaResult.ok)       fieldErrors['vpaAddress']  = { code: vpaResult.code,       detail: vpaResult.detail };
  if (!mapsResult.ok)      fieldErrors['mapsUrl']     = { code: mapsResult.code,      detail: mapsResult.detail };
  if (!subdomainResult.ok) fieldErrors['subdomain']   = { code: subdomainResult.code, detail: subdomainResult.detail };

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: 'VALIDATION_FAULT',
      fieldErrors,
    };
  }

  // All four validators are .ok ⇒ narrow them safely.
  const gstinOk     = (gstinResult     as Extract<typeof gstinResult,     { ok: true }>).value;
  const vpaOk       = (vpaResult       as Extract<typeof vpaResult,       { ok: true }>).value;
  const mapsOk      = (mapsResult      as Extract<typeof mapsResult,      { ok: true }>).value;
  const subdomainOk = (subdomainResult as Extract<typeof subdomainResult, { ok: true }>).value;

  return {
    ok: true,
    value: {
      name:        trimmedName,
      email:       trimmedEmail,
      gstinString: gstinOk.raw,
      mapsUrl:     mapsOk,
      vpaAddress:  vpaOk.raw,
      subdomain:   subdomainOk,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Prisma unique-constraint mapper — translates P2002 to a clear field hint
// ─────────────────────────────────────────────────────────────────────────────

function mapUniqueConstraintError(
  err: Prisma.PrismaClientKnownRequestError,
): UniqueConstraintResponse {
  // P2002 target may be a string ("email") or array (["subdomain"]) depending on db.
  const target = err.meta?.['target'];
  let field: string | undefined;
  if (typeof target === 'string') field = target;
  else if (Array.isArray(target) && typeof target[0] === 'string') field = target[0];

  let detail = 'A row with this unique value already exists.';
  if (field) {
    detail = `The value provided for "${field}" is already registered.`;
  }
  return {
    ok: false,
    status: 409,
    error: 'UNIQUE_CONSTRAINT',
    detail,
    ...(field ? { field } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  const authErr = requireServiceAuth(req);
  if (authErr) return NextResponse.json(authErr, { status: authErr.status });

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    const out: InvalidBodyResponse = {
      ok: false,
      status: 400,
      error: 'INVALID_BODY',
      detail: 'Request body is not valid JSON.',
    };
    return NextResponse.json(out, { status: 400 });
  }

  const parsed = parseBody(rawBody);
  if ('ok' in parsed && parsed.ok === false) {
    return NextResponse.json(parsed, { status: parsed.status });
  }

  const validated = aggregateValidation(parsed as OnboardRequest);
  if ('ok' in validated && validated.ok === false) {
    return NextResponse.json(validated, { status: validated.status });
  }
  const input = (validated as { ok: true; value: NormalisedOnboardingInput }).value;

  // ── Compliance snapshot ─────────────────────────────────────────────────
  const complianceScore = computeInitialCompliance({
    hasValidGstin: true, // already validated above
    hasValidVpa:   true,
    hasMapsUrl:    true,
  });

  // ── Single-transaction insert ───────────────────────────────────────────
  try {
    const { merchant, domain } = await prisma.$transaction(async (tx) => {
      const m = await tx.merchant.create({
        data: {
          email:            input.email,
          name:             input.name,
          gstinString:      input.gstinString,
          mapsUrl:          input.mapsUrl,
          vpaAddress:       input.vpaAddress,
          complianceRating: new Prisma.Decimal(complianceScore),
        },
      });
      const d = await tx.tenantDomain.create({
        data: {
          merchantId: m.id,
          subdomain:  input.subdomain,
        },
      });
      return { merchant: m, domain: d };
    });

    return NextResponse.json(
      {
        ok: true,
        status: 201,
        merchant: {
          id:               merchant.id,
          name:             merchant.name,
          email:            merchant.email,
          gstinString:      merchant.gstinString,
          vpaAddress:       merchant.vpaAddress,
          mapsUrl:          merchant.mapsUrl,
          complianceRating: Number.parseFloat(merchant.complianceRating.toString()),
        },
        domain: {
          id:                  domain.id,
          subdomain:           domain.subdomain,
          customDomainPending: domain.customDomain === null,
        },
        complianceSnapshot: {
          score: complianceScore,
          components: [
            { component: 'GSTIN verified',      points: 40 },
            { component: 'UPI VPA registered',  points: 10 },
            { component: 'Maps listing linked', points: 10 },
            { component: 'Tax filing freshness (pending)',  points: 0, maxPoints: 20 },
            { component: 'Dispute ratio (pending)',          points: 0, maxPoints: 20 },
          ],
        },
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const mapped = mapUniqueConstraintError(err);
      return NextResponse.json(mapped, { status: mapped.status });
    }
    // eslint-disable-next-line no-console
    console.error('[admin/merchants/onboard] internal fault:', err);
    const out: InternalFaultResponse = {
      ok: false,
      status: 500,
      error: 'INTERNAL_FAULT',
      detail: 'Onboarding pipeline encountered an unexpected fault.',
    };
    return NextResponse.json(out, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Export types for typed client-side call sites (e.g. OnboardingWizard)
// ─────────────────────────────────────────────────────────────────────────────

export type {
  OnboardRequest,
  ErrorResponse as OnboardErrorResponse,
  ValidationFaultResponse,
  UniqueConstraintResponse,
};
export type { ValidationResult }; // re-export for client callers

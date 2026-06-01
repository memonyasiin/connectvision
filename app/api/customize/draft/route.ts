// ═════════════════════════════════════════════════════════════════════════════
// POST /api/customize/draft — Persist a customization draft (MODULE 7)
// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC endpoint hit by the /customize/[slug] wizard's final "Save and
// continue" submit. Creates ONE row in CustomizationDraft, returns the
// draftId. The /checkout page (future MODULE) reads this row to compute
// the cart total + populate the Razorpay order metadata.
//
// FIELD VALIDATION
//   Inline — keeps the route self-contained. Heavier validators
//   (sovereignValidators.ts from MODULE 2) cover GSTIN/VPA/Maps which
//   aren't relevant here. The marketplace customer is an end-user, not
//   a registered merchant.
//
// AUTH
//   None. The route is public so a logged-out visitor can build a draft
//   and convert to a customer at checkout. Rate limit upstream (Cloudflare)
//   is the abuse defence — there's no realistic mass-spam value in
//   creating CustomizationDraft rows.
//
// SCHEMA NOTE
//   `services` is stored as JSON. Prisma takes a Prisma.JsonArray or
//   Prisma.InputJsonValue — we cast carefully so TS narrowing holds.
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { findThemeBySlug } from '@/data/themeMarketplaceCatalog';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Request shape
// ─────────────────────────────────────────────────────────────────────────────

interface ServiceInput {
  name: string;
  description?: string;
  priceInr?: number;
}

interface DraftRequest {
  themeSlug: string;
  businessName: string;
  tagline?: string;
  aboutText?: string;
  primaryColor: string;
  logoUrl?: string;
  services?: ServiceInput[];
  contactPhone?: string;
  contactEmail?: string;
  contactAddress?: string;
}

interface ApiError {
  ok: false;
  status: number;
  error: string;
  detail: string;
  fieldErrors?: Record<string, string>;
}

function err(status: number, code: string, detail: string, fieldErrors?: Record<string, string>): ApiError {
  return { ok: false, status, error: code, detail, ...(fieldErrors ? { fieldErrors } : {}) };
}

function isString(v: unknown): v is string {
  return typeof v === 'string';
}

// ─────────────────────────────────────────────────────────────────────────────
// Parse + validate
// ─────────────────────────────────────────────────────────────────────────────

function parseBody(raw: unknown): DraftRequest | ApiError {
  if (raw === null || typeof raw !== 'object') {
    return err(400, 'INVALID_BODY', 'Body must be a JSON object.');
  }
  const c = raw as Record<string, unknown>;
  const fieldErrors: Record<string, string> = {};

  // ── Required: themeSlug + businessName + primaryColor ─────────────────
  if (!isString(c['themeSlug']) || c['themeSlug'].trim() === '') {
    fieldErrors['themeSlug'] = 'themeSlug is required.';
  }
  if (!isString(c['businessName']) || c['businessName'].trim().length < 2) {
    fieldErrors['businessName'] = 'businessName must be at least 2 characters.';
  } else if (c['businessName'].trim().length > 120) {
    fieldErrors['businessName'] = 'businessName cannot exceed 120 characters.';
  }
  const color = isString(c['primaryColor']) ? c['primaryColor'].trim() : '';
  if (!/^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/.test(color)) {
    fieldErrors['primaryColor'] = 'primaryColor must be a hex string like #1c4d2a.';
  }

  // ── Optional: tagline / aboutText length caps ─────────────────────────
  const tagline = isString(c['tagline']) ? c['tagline'].trim() : '';
  if (tagline.length > 200) {
    fieldErrors['tagline'] = 'tagline cannot exceed 200 characters.';
  }
  const aboutText = isString(c['aboutText']) ? c['aboutText'].trim() : '';
  if (aboutText.length > 2000) {
    fieldErrors['aboutText'] = 'aboutText cannot exceed 2000 characters.';
  }

  // ── Optional: logoUrl format ──────────────────────────────────────────
  const logoUrl = isString(c['logoUrl']) ? c['logoUrl'].trim() : '';
  if (logoUrl) {
    try {
      new URL(logoUrl);
    } catch {
      fieldErrors['logoUrl'] = 'logoUrl must be a valid URL.';
    }
    if (logoUrl.length > 500) {
      fieldErrors['logoUrl'] = 'logoUrl cannot exceed 500 characters.';
    }
  }

  // ── Optional: services array ──────────────────────────────────────────
  let services: ServiceInput[] = [];
  if (Array.isArray(c['services'])) {
    services = c['services']
      .filter(
        (s): s is Record<string, unknown> => s !== null && typeof s === 'object',
      )
      .map((s) => {
        const name = isString(s['name']) ? s['name'].trim() : '';
        const description = isString(s['description']) ? s['description'].trim() : undefined;
        const priceRaw = s['priceInr'];
        const priceInr =
          typeof priceRaw === 'number' && Number.isFinite(priceRaw) && priceRaw >= 0
            ? Math.round(priceRaw)
            : undefined;
        return { name, ...(description ? { description } : {}), ...(priceInr !== undefined ? { priceInr } : {}) };
      })
      .filter((s) => s.name.length > 0)
      .slice(0, 12); // hard cap — marketplace UX, not enterprise CRM
  }

  // ── Optional: contact fields ──────────────────────────────────────────
  const contactPhone = isString(c['contactPhone']) ? c['contactPhone'].trim() : '';
  const contactEmail = isString(c['contactEmail']) ? c['contactEmail'].trim().toLowerCase() : '';
  const contactAddress = isString(c['contactAddress']) ? c['contactAddress'].trim() : '';

  if (contactPhone && contactPhone.replace(/\D/g, '').length < 10) {
    fieldErrors['contactPhone'] = 'contactPhone must have at least 10 digits.';
  }
  if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
    fieldErrors['contactEmail'] = 'contactEmail format is not valid.';
  }
  if (contactAddress.length > 500) {
    fieldErrors['contactAddress'] = 'contactAddress cannot exceed 500 characters.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return err(400, 'VALIDATION_FAULT', 'One or more fields failed validation.', fieldErrors);
  }

  return {
    themeSlug:     (c['themeSlug'] as string).trim(),
    businessName:  (c['businessName'] as string).trim(),
    primaryColor:  color,
    ...(tagline ? { tagline } : {}),
    ...(aboutText ? { aboutText } : {}),
    ...(logoUrl ? { logoUrl } : {}),
    ...(services.length > 0 ? { services } : {}),
    ...(contactPhone ? { contactPhone } : {}),
    ...(contactEmail ? { contactEmail } : {}),
    ...(contactAddress ? { contactAddress } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(err(400, 'INVALID_JSON', 'Body is not valid JSON.'), {
      status: 400,
    });
  }

  const parsed = parseBody(raw);
  if ('ok' in parsed && parsed.ok === false) {
    return NextResponse.json(parsed, { status: parsed.status });
  }
  const body = parsed as DraftRequest;

  // Reject unknown themeSlug — protects against typos + URL tampering.
  const theme = findThemeBySlug(body.themeSlug);
  if (!theme) {
    return NextResponse.json(
      err(404, 'THEME_NOT_FOUND', `Theme "${body.themeSlug}" is not in the marketplace.`),
      { status: 404 },
    );
  }

  try {
    const draft = await prisma.customizationDraft.create({
      data: {
        themeSlug:      body.themeSlug,
        businessName:   body.businessName,
        primaryColor:   body.primaryColor,
        ...(body.tagline   ? { tagline:   body.tagline   } : {}),
        ...(body.aboutText ? { aboutText: body.aboutText } : {}),
        ...(body.logoUrl   ? { logoUrl:   body.logoUrl   } : {}),
        // Prisma's InputJsonValue is opaquely branded; ServiceInput[] is
        // structurally a valid JSON array but TS needs the double-cast
        // to bridge them. Verified safe — `services` was validated +
        // narrowed by parseBody above.
        services: (body.services ?? []) as unknown as Prisma.InputJsonValue,
        ...(body.contactPhone   ? { contactPhone:   body.contactPhone   } : {}),
        ...(body.contactEmail   ? { contactEmail:   body.contactEmail,
                                    customerEmail:  body.contactEmail } : {}),
        ...(body.contactAddress ? { contactAddress: body.contactAddress } : {}),
        status: 'DRAFT',
      },
    });
    return NextResponse.json(
      {
        ok: true,
        status: 201,
        draftId: draft.id,
        themeSlug: draft.themeSlug,
        priceInr: theme.priceInr,
        themeName: theme.name,
        nextStepUrl: `/checkout?draft=${draft.id}`,
      },
      { status: 201 },
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[customize/draft] create fault:', e);
    return NextResponse.json(
      err(500, 'INTERNAL_FAULT', 'Could not persist the draft right now. Please retry.'),
      { status: 500 },
    );
  }
}

export type { DraftRequest, ApiError as DraftErrorResponse };

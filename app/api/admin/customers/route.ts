// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/customers — Customer retention scanner & WhatsApp broadcast
// ─────────────────────────────────────────────────────────────────────────────
// Backbone of the Phase 5 customer-retention loop. Reads CV_CustomerLedger
// rows for a tenant, recomputes each row's engagement classification, writes
// updated `communicationStatus` to the DB, and emits a per-customer
// re-engagement payload pre-formatted for PataaWaa dispatch (or for a UI
// to render in the operator's "broadcast queue" view).
//
// Engagement bands (driven by days since lastVisitDate):
//
//   0–30 days   → ACTIVE          (no broadcast generated)
//   31–90 days  → CHURN_RISK      (soft "we miss you" message)
//   91+ days    → OVERDUE_RECALL  (firmer "service interval overdue" message
//                                  with a returning-guest offer hook)
//
// Two actions supported on this single endpoint:
//
//   { action: 'scan',     tenantId, dryRun?, limit? }
//     → recompute the whole tenant's customer list, return counts +
//       broadcast payloads. `dryRun:true` skips the DB writes so the
//       operator UI can preview a campaign before committing.
//
//   { action: 'evaluate', tenantId, customerId }
//     → recompute a single row + return its broadcast payload. Used by
//       the customer-detail drawer when an operator opens a profile.
//
// Auth: same three-path pattern as /api/admin/workforce —
//   1. Bearer ${CRON_SECRET}     (Vercel cron auto-trigger)
//   2. Bearer ${INTERNAL_SECRET} (manual admin / curl)
//   3. X-ConnectVision-Validation-Token (project-standard, constant-time)
//
// Runtime: nodejs. Prisma's `@prisma/client` cannot run on the edge without
// an Accelerate / Data Proxy bridge — and this route is hot only for the
// admin dashboard + scheduled cron, neither of which is latency-critical.
//
// PataaWaa wiring: this route DOES NOT dispatch messages itself. It returns
// payloads shaped exactly for the existing PataaWaa send endpoint. A
// separate dispatch worker (cron or admin button) POSTs each payload to
// `${PATAAWAA_BASE_URL}/api/messages/send` carrying the
// `${PATAAWAA_GATEWAY_TOKEN}` bearer. Decoupling avoids three failure
// modes: (a) timing out this serverless function on bulk sends, (b) tying
// the scanner's success to PataaWaa availability, (c) breaking the
// "Vercel cannot reach Bluehost localhost" memory rule.

import { NextResponse } from 'next/server';
import type { Prisma, CV_CustomerLedger, CommunicationStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { validateServiceToken } from '@/lib/vercelProxy';
import { resolveLocale, t, type Locale, type TranslationKey } from '@/lib/translations';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Engagement bands — tunable here, sourced from no env so the scoring is
// deterministic per deploy and audit logs make sense over time.
// ─────────────────────────────────────────────────────────────────────────────

const DAYS_TO_CHURN_RISK = 30;
const DAYS_TO_OVERDUE_RECALL = 90;

// Scanner safety cap. The admin dashboard pages results — bulk-broadcast
// cron sets explicit `limit` per its batch size. Default keeps any single
// request bounded so a poorly-formed call cannot drag the function over
// its Vercel duration ceiling.
const DEFAULT_SCAN_LIMIT = 500;
const MAX_SCAN_LIMIT = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// Request shapes — discriminated union keeps the body parser type-safe
// ─────────────────────────────────────────────────────────────────────────────

interface ScanRequest {
  action: 'scan';
  tenantId: string;
  /** Preview-only mode: compute + return broadcasts without writing the DB. */
  dryRun?: boolean;
  /** Max rows processed in one call. Clamped to [1, MAX_SCAN_LIMIT]. */
  limit?: number;
}

interface EvaluateRequest {
  action: 'evaluate';
  tenantId: string;
  customerId: string;
}

type RequestBody = ScanRequest | EvaluateRequest;

// ─────────────────────────────────────────────────────────────────────────────
// Response shapes
// ─────────────────────────────────────────────────────────────────────────────

interface BroadcastPayload {
  /** Stable handle for the operator dashboard to dedupe / track. */
  customerId: string;
  customerName: string;
  customerPhone: string;
  /** Locale resolved via translations.resolveLocale — never null. */
  locale: Locale;
  /** Classification at the time the broadcast was drafted. */
  status: CommunicationStatus;
  /** Integer days since lastVisitDate (floored, non-negative). */
  daysSinceLastVisit: number;
  /** Rendered message body — same string the operator sends as-is. */
  message: string;
  /** Subject line for the operator's broadcast queue UI grouping. */
  subject: string;
  /**
   * wa.me deep link — operator can tap it from the dashboard for manual
   * dispatch (one-off cases where PataaWaa is being skipped).
   */
  manualWaLink: string;
  /**
   * Body shape PRE-WIRED for the PataaWaa send endpoint
   * (POST ${PATAAWAA_BASE_URL}/api/messages/send). A dispatcher worker
   * forwards this JSON verbatim plus the gateway bearer.
   */
  pataawaaPayload: PataaWaaSendPayload;
}

interface PataaWaaSendPayload {
  /** E.164-stripped recipient (digits, no '+'). PataaWaa accepts both. */
  to: string;
  /** Message body. PataaWaa renders plain text + simple WhatsApp emoji. */
  body: string;
  /** Tenant subdomain for analytics + multi-tenant inbox sorting. */
  tenantSubdomain?: string;
  /** Metadata stamped on the outbound message for downstream attribution. */
  metadata: {
    cv_customer_id: string;
    cv_reason: CommunicationStatus;
    cv_days_since_last_visit: number;
    cv_source: 'customer-retention-scanner';
  };
}

interface ScanResponse {
  ok: true;
  tenantId: string;
  tenantSubdomain: string | null;
  businessName: string;
  scannedAt: string;
  totalScanned: number;
  dryRun: boolean;
  counts: Record<CommunicationStatus, number>;
  broadcasts: BroadcastPayload[];
  /** Where a dispatcher worker should POST each broadcast payload. */
  pataawaaDispatchUrl: string;
}

interface EvaluateResponse {
  ok: true;
  tenantId: string;
  customerId: string;
  status: CommunicationStatus;
  daysSinceLastVisit: number;
  broadcast: BroadcastPayload | null;
}

interface ErrorResponse {
  ok: false;
  status: number;
  error: string;
  detail?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers
// ─────────────────────────────────────────────────────────────────────────────

interface ClassificationResult {
  status: CommunicationStatus;
  daysSinceLastVisit: number;
}

/**
 * Single source of truth for the engagement-band classifier. Returns the
 * status the row SHOULD have right now — caller decides whether to write
 * it back to the DB.
 */
function classifyEngagement(lastVisit: Date, now: Date): ClassificationResult {
  const ms = now.getTime() - lastVisit.getTime();
  const days = Math.max(0, Math.floor(ms / 86_400_000)); // 1 day = 86.4M ms
  if (days >= DAYS_TO_OVERDUE_RECALL) {
    return { status: 'OVERDUE_RECALL', daysSinceLastVisit: days };
  }
  if (days >= DAYS_TO_CHURN_RISK) {
    return { status: 'CHURN_RISK', daysSinceLastVisit: days };
  }
  return { status: 'ACTIVE', daysSinceLastVisit: days };
}

/** Map status → translation-key pair. ACTIVE returns null — no broadcast. */
function templateKeysFor(
  status: CommunicationStatus,
): { subject: TranslationKey; body: TranslationKey } | null {
  switch (status) {
    case 'CHURN_RISK':
      return {
        subject: 'notify.customer.churn_risk.subject',
        body: 'notify.customer.churn_risk.body',
      };
    case 'OVERDUE_RECALL':
      return {
        subject: 'notify.customer.overdue_recall.subject',
        body: 'notify.customer.overdue_recall.body',
      };
    case 'ACTIVE':
    default:
      return null;
  }
}

/** Strip everything except digits + a leading '+' → digits only for wa.me. */
function normalizeWaPhone(raw: string): string {
  const cleaned = raw.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
}

/**
 * Build the full broadcast payload for a single customer row. Returns null
 * when the customer's status is ACTIVE (no outreach warranted). Pure
 * function — no DB, no fetches.
 */
function buildBroadcast(
  customer: CV_CustomerLedger,
  classification: ClassificationResult,
  businessName: string,
  tenantSubdomain: string | null,
): BroadcastPayload | null {
  const keys = templateKeysFor(classification.status);
  if (!keys) return null;

  const locale: Locale = resolveLocale(customer.customerLocale);
  const interpolation = {
    name: customer.customerName,
    business: businessName,
    days: String(classification.daysSinceLastVisit),
  };

  const subject = t(locale, keys.subject, interpolation);
  const message = t(locale, keys.body, interpolation);

  const phoneDigits = normalizeWaPhone(customer.customerPhone);
  const manualWaLink = phoneDigits
    ? `https://wa.me/${phoneDigits}?text=${encodeURIComponent(message)}`
    : '';

  const pataawaaPayload: PataaWaaSendPayload = {
    to: phoneDigits,
    body: message,
    ...(tenantSubdomain ? { tenantSubdomain } : {}),
    metadata: {
      cv_customer_id: customer.customerId,
      cv_reason: classification.status,
      cv_days_since_last_visit: classification.daysSinceLastVisit,
      cv_source: 'customer-retention-scanner',
    },
  };

  return {
    customerId: customer.customerId,
    customerName: customer.customerName,
    customerPhone: customer.customerPhone,
    locale,
    status: classification.status,
    daysSinceLastVisit: classification.daysSinceLastVisit,
    message,
    subject,
    manualWaLink,
    pataawaaPayload,
  };
}

/** Resolve PataaWaa's public send endpoint from env (no localhost paths). */
function resolvePataawaaDispatchUrl(): string {
  const base = (process.env.PATAAWAA_BASE_URL ?? '').replace(/\/$/, '');
  return base ? `${base}/api/messages/send` : '';
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth — same three-path pattern as /api/admin/workforce
// ─────────────────────────────────────────────────────────────────────────────

function requireServiceAuth(req: Request): ErrorResponse | null {
  const cronSecret     = process.env.CRON_SECRET;
  const internalSecret = process.env.INTERNAL_SECRET;
  const cvToken        = process.env.CV_VALIDATION_TOKEN;

  if (!cronSecret && !internalSecret && !cvToken) {
    // Dev posture — no secrets configured ⇒ open. Production env always
    // sets at least one of these.
    return null;
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
// Body parsing — defensive; bad JSON / wrong shape returns 400 cleanly
// ─────────────────────────────────────────────────────────────────────────────

function parseBody(raw: unknown): RequestBody | ErrorResponse {
  if (raw === null || typeof raw !== 'object') {
    return { ok: false, status: 400, error: 'INVALID_BODY', detail: 'Body must be a JSON object.' };
  }
  const candidate = raw as Record<string, unknown>;
  const action = candidate['action'];
  const tenantId = candidate['tenantId'];

  if (typeof tenantId !== 'string' || tenantId.trim().length === 0) {
    return { ok: false, status: 400, error: 'INVALID_BODY', detail: 'tenantId is required.' };
  }

  if (action === 'scan') {
    const dryRun = candidate['dryRun'] === true;
    const limitRaw = candidate['limit'];
    let limit = DEFAULT_SCAN_LIMIT;
    if (typeof limitRaw === 'number' && Number.isFinite(limitRaw)) {
      limit = Math.min(MAX_SCAN_LIMIT, Math.max(1, Math.floor(limitRaw)));
    }
    return { action: 'scan', tenantId: tenantId.trim(), dryRun, limit };
  }

  if (action === 'evaluate') {
    const customerId = candidate['customerId'];
    if (typeof customerId !== 'string' || customerId.trim().length === 0) {
      return { ok: false, status: 400, error: 'INVALID_BODY', detail: 'customerId is required for action=evaluate.' };
    }
    return { action: 'evaluate', tenantId: tenantId.trim(), customerId: customerId.trim() };
  }

  return {
    ok: false,
    status: 400,
    error: 'INVALID_BODY',
    detail: 'action must be "scan" or "evaluate".',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tenant lookup — single round-trip pulls subdomain + business name in one go
// ─────────────────────────────────────────────────────────────────────────────

interface TenantContext {
  subdomain: string;
  businessName: string;
}

async function resolveTenantContext(tenantId: string): Promise<TenantContext | null> {
  const row = await prisma.tenantDomain.findUnique({
    where: { id: tenantId },
    select: {
      subdomain: true,
      siteConfig: { select: { businessName: true } },
    },
  });
  if (!row) return null;
  return {
    subdomain: row.subdomain,
    // siteConfig may be null if the tenant hasn't published yet — fall back
    // to the subdomain so the message still reads sensibly.
    businessName: row.siteConfig?.businessName ?? row.subdomain,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: Request): Promise<NextResponse> {
  // Auth gate.
  const authErr = requireServiceAuth(req);
  if (authErr) {
    return NextResponse.json(authErr, { status: authErr.status });
  }

  // Body parse.
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json(
      { ok: false, status: 400, error: 'INVALID_JSON', detail: 'Request body is not valid JSON.' },
      { status: 400 },
    );
  }
  const parsed = parseBody(rawBody);
  if ('ok' in parsed && parsed.ok === false) {
    return NextResponse.json(parsed, { status: parsed.status });
  }
  const body = parsed as RequestBody;

  // Tenant resolution — guarantees multi-tenant isolation downstream.
  const tenantCtx = await resolveTenantContext(body.tenantId);
  if (!tenantCtx) {
    const err: ErrorResponse = {
      ok: false,
      status: 404,
      error: 'TENANT_NOT_FOUND',
      detail: `No TenantDomain with id "${body.tenantId}".`,
    };
    return NextResponse.json(err, { status: 404 });
  }

  const now = new Date();

  // ── Action: evaluate (single row) ─────────────────────────────────────────
  if (body.action === 'evaluate') {
    const customer = await prisma.cV_CustomerLedger.findFirst({
      where: { customerId: body.customerId, tenantId: body.tenantId },
    });
    if (!customer) {
      const err: ErrorResponse = {
        ok: false,
        status: 404,
        error: 'CUSTOMER_NOT_FOUND',
        detail: 'Customer row not found in this tenant.',
      };
      return NextResponse.json(err, { status: 404 });
    }

    const classification = classifyEngagement(customer.lastVisitDate, now);

    // Persist iff the classification changed — minimizes write amplification
    // when an operator opens the same customer drawer repeatedly.
    let persisted = customer;
    if (classification.status !== customer.communicationStatus) {
      persisted = await prisma.cV_CustomerLedger.update({
        where: { customerId: customer.customerId },
        data: {
          communicationStatus: classification.status,
          lastEvaluatedAt: now,
        },
      });
    }

    const broadcast = buildBroadcast(
      persisted,
      classification,
      tenantCtx.businessName,
      tenantCtx.subdomain,
    );

    const out: EvaluateResponse = {
      ok: true,
      tenantId: body.tenantId,
      customerId: persisted.customerId,
      status: classification.status,
      daysSinceLastVisit: classification.daysSinceLastVisit,
      broadcast,
    };
    return NextResponse.json(out);
  }

  // ── Action: scan (bulk) ───────────────────────────────────────────────────
  const customers = await prisma.cV_CustomerLedger.findMany({
    where: { tenantId: body.tenantId },
    orderBy: { lastVisitDate: 'asc' }, // oldest first — worst churn risk first
    take: body.limit,
  });

  const counts: Record<CommunicationStatus, number> = {
    ACTIVE: 0,
    CHURN_RISK: 0,
    OVERDUE_RECALL: 0,
  };
  const broadcasts: BroadcastPayload[] = [];
  const writes: Prisma.PrismaPromise<unknown>[] = [];

  for (const customer of customers) {
    const classification = classifyEngagement(customer.lastVisitDate, now);
    counts[classification.status] += 1;

    if (
      classification.status !== customer.communicationStatus &&
      !body.dryRun
    ) {
      writes.push(
        prisma.cV_CustomerLedger.update({
          where: { customerId: customer.customerId },
          data: {
            communicationStatus: classification.status,
            lastEvaluatedAt: now,
          },
        }),
      );
    }

    const payload = buildBroadcast(
      customer,
      classification,
      tenantCtx.businessName,
      tenantCtx.subdomain,
    );
    if (payload) broadcasts.push(payload);
  }

  // Flush all writes in a single transaction so a partial failure doesn't
  // leave the ledger inconsistent. `dryRun:true` skips this entirely.
  if (writes.length > 0) {
    await prisma.$transaction(writes);
  }

  const out: ScanResponse = {
    ok: true,
    tenantId: body.tenantId,
    tenantSubdomain: tenantCtx.subdomain,
    businessName: tenantCtx.businessName,
    scannedAt: now.toISOString(),
    totalScanned: customers.length,
    dryRun: body.dryRun ?? false,
    counts,
    broadcasts,
    pataawaaDispatchUrl: resolvePataawaaDispatchUrl(),
  };
  return NextResponse.json(out);
}

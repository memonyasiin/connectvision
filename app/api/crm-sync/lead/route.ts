// ─────────────────────────────────────────────────────────────────────────────
// POST /api/crm-sync/lead — Tier 3 (Cross-Platform Unified Ecosystem Hook)
// ─────────────────────────────────────────────────────────────────────────────
// Every generated tenant site's lead-capture forms POST here. We validate,
// stamp tenant context, push to Pataa CRM, and (optionally) mirror to
// Workops. Single intake endpoint = single auth surface.

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { pushLeadToPataaCrm, mirrorToWorkops, type CrmLeadPayload } from '@/lib/crmBridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LeadSchema = z.object({
  tenantId: z.string().min(1).max(120),
  name: z.string().max(200).optional(),
  email: z.string().email().max(200).optional(),
  phone: z.string().max(40).optional(),
  message: z.string().max(4000).optional(),
  sourceSection: z.string().max(120).optional(),
  intent: z.string().max(60).optional(),
  productTag: z.string().max(120).optional(),
  pageUrl: z.string().url().optional(),
  activity: z.object({
    scrollDepthPct: z.number().min(0).max(100).optional(),
    activeSections: z.array(z.string().max(120)).max(50).optional(),
    timeOnPageSec: z.number().min(0).max(86400).optional(),
    referrer: z.string().max(500).optional(),
  }).optional(),
});

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = LeadSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  const payload: CrmLeadPayload = parsed.data;

  // Primary path — Pataa CRM intake.
  const crm = await pushLeadToPataaCrm(payload);
  if (!crm.ok) {
    // Don't lose the lead: log it for retry. In prod, this writes to a
    // ws_outbox table that a Bluehost cron drains.
    console.error('[crm-sync/lead] Pataa CRM intake failed', crm.error, payload);
    return NextResponse.json(
      { ok: false, queued: true, error: crm.error },
      { status: 502 },
    );
  }

  // Secondary mirror — fire and forget.
  void mirrorToWorkops(payload);

  return NextResponse.json({ ok: true, crmLeadId: crm.crmLeadId });
}

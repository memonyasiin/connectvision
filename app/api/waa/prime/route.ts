// ─────────────────────────────────────────────────────────────────────────────
// POST /api/waa/prime — Tier 5 priming beacon
// ─────────────────────────────────────────────────────────────────────────────
// Fired by `navigator.sendBeacon()` the instant a visitor taps a tracked
// WhatsApp CTA. Lands BEFORE the inbound WhatsApp webhook arrives (the
// visitor still has to open WhatsApp + hit send), so it gives the AI agent
// a few seconds' head-start to:
//
//   1. Hydrate the catalog page the visitor was on
//   2. Pre-compute the LLM system prompt with section + intent + product tag
//   3. Pre-warm any product-availability cache
//
// We persist the priming payload keyed by (phone + tenant). When the actual
// webhook fires, the receiver looks up the most recent prime row to attach
// rich context to the LLM call.
//
// Storage strategy: for the boilerplate we just log + accept (no DB write).
// Production wire-up: write into Pataa CRM's `ws_agent_priming` table or a
// Redis ZSET keyed by `cv:prime:${phone}` with a short TTL.

import { NextResponse } from 'next/server';
import { z } from 'zod';

export const runtime = 'edge';   // beacon = ideal edge workload
export const dynamic = 'force-dynamic';

const PrimeSchema = z.object({
  phone: z.string().min(6).max(40),
  sectionId: z.string().max(120),
  intent: z.string().max(60),
  productTag: z.string().max(120).optional(),
  tenantSubdomain: z.string().max(120).optional(),
  snapshot: z.object({
    startedAt:        z.number().int().nonnegative().optional(),
    scrollDepthPct:   z.number().min(0).max(100).optional(),
    activeSections:   z.array(z.string().max(120)).max(50).optional(),
    intents:          z.array(z.string().max(160)).max(200).optional(),
    clickDepth:       z.number().int().nonnegative().optional(),
    lastProductTag:   z.string().max(120).nullable().optional(),
    referrer:         z.string().max(500).optional(),
    pageUrl:          z.string().max(2048).optional(),
  }).partial().optional(),
});

export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const parsed = PrimeSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'validation_failed', issues: parsed.error.issues },
      { status: 422 },
    );
  }

  // Stamp wall-clock receipt + derived sessionDurationMs for the agent.
  const receivedAt = Date.now();
  const startedAt  = parsed.data.snapshot?.startedAt ?? receivedAt;
  const sessionDurationMs = Math.max(0, receivedAt - startedAt);

  const enriched = {
    ...parsed.data,
    receivedAt: new Date(receivedAt).toISOString(),
    sessionDurationMs,
  };

  // Production hook lives here. For now, we log so the dev console shows the
  // payload landing successfully.
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[waa/prime]', JSON.stringify(enriched));
  }

  // Optionally fan out to the PataaWaa multi-tenant gateway so it can stash
  // the priming row in the right tenant's queue. Fire-and-forget.
  void forwardToGateway(enriched).catch(() => { /* never block the beacon */ });

  return NextResponse.json({ ok: true });
}

async function forwardToGateway(payload: unknown): Promise<void> {
  const base = process.env.PATAAWAA_BASE_URL;
  const token = process.env.PATAAWAA_GATEWAY_TOKEN;
  if (!base || !token) return;
  await fetch(`${base}/api/agent-prime`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Source-Platform': 'connectvision',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3000),
  });
}

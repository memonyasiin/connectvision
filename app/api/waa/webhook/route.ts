// ─────────────────────────────────────────────────────────────────────────────
// POST /api/waa/webhook — Tier 5 (Autonomous WhatsApp LLM Agent)
// ─────────────────────────────────────────────────────────────────────────────
// PataaWaa multi-tenant gateway forwards inbound messages here. We:
//   1. Verify the HMAC signature (PATAAWAA_WEBHOOK_SECRET).
//   2. Parse the embedded [CV:...] context tag (intent, section, tenant).
//   3. Look up any primed activity payload for the sender's phone.
//   4. Call the LLM agent with the assembled context.
//   5. POST the agent's reply back to the PataaWaa gateway.
//   6. If the agent closed a booking, push to Pataa CRM as a confirmed lead.

import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { parseWaContextTag } from '@/lib/waDeepLink';
import { pushLeadToPataaCrm } from '@/lib/crmBridge';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface InboundMessage {
  tenantId: string;
  from: string;          // E.164 phone
  body: string;          // message text
  receivedAt: string;
}

function verifySignature(raw: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(raw).digest('hex');
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const secret = process.env.PATAAWAA_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ ok: false, error: 'webhook_not_configured' }, { status: 500 });
  }

  const raw = await req.text();
  const sig = req.headers.get('x-pataawaa-signature');
  if (!verifySignature(raw, sig, secret)) {
    return NextResponse.json({ ok: false, error: 'bad_signature' }, { status: 401 });
  }

  let msg: InboundMessage;
  try {
    msg = JSON.parse(raw) as InboundMessage;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // ── Parse the context tag we embedded into the wa.me deep-link.
  const ctx = parseWaContextTag(msg.body) ?? {};
  const intent = ctx.cv_intent ?? 'general-enquiry';
  const sectionId = ctx.cv_section ?? null;
  const tenantSubdomain = ctx.cv_tenant ?? msg.tenantId;
  const pageUrl = ctx.cv_url ?? null;

  // ── Call the LLM agent. (Stub — real call wires Groq / Claude Haiku
  //    with the section context + tenant's product catalog.)
  const reply = await runLlmAgent({
    tenantId: tenantSubdomain,
    intent,
    sectionId,
    pageUrl,
    visitorPhone: msg.from,
    visitorMessage: stripContextTag(msg.body),
  });

  // ── Send the reply back through PataaWaa.
  await sendWaReply(tenantSubdomain, msg.from, reply.text);

  // ── If the agent closed a booking, pipe the verified metadata into CRM.
  if (reply.bookingClosed) {
    await pushLeadToPataaCrm({
      tenantId: tenantSubdomain,
      name: reply.bookingClosed.name,
      phone: msg.from,
      message: reply.bookingClosed.summary,
      sourceSection: sectionId ?? undefined,
      intent: 'booking-confirmed',
      pageUrl: pageUrl ?? undefined,
    });
  }

  return NextResponse.json({ ok: true });
}

function stripContextTag(body: string): string {
  return body.replace(/\n*\[CV:[^\]]+\]\n*/g, '').trim();
}

// ── LLM agent stub ────────────────────────────────────────────────────────────
interface LlmCallInput {
  tenantId: string;
  intent: string;
  sectionId: string | null;
  pageUrl: string | null;
  visitorPhone: string;
  visitorMessage: string;
}
interface LlmCallOutput {
  text: string;
  bookingClosed?: { name?: string; summary: string };
}
async function runLlmAgent(input: LlmCallInput): Promise<LlmCallOutput> {
  const provider = process.env.LLM_PROVIDER ?? 'groq';
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return { text: `Hi! Thanks for reaching out. Someone from our team will reply shortly.` };
  }
  // TODO: real call. Provider switch lives here:
  //   - groq: https://api.groq.com/openai/v1/chat/completions
  //   - claude-haiku: https://api.anthropic.com/v1/messages
  void provider;
  void input;
  return { text: `Hello! How can we help you today?` };
}

async function sendWaReply(tenantId: string, to: string, text: string): Promise<void> {
  const base = process.env.PATAAWAA_BASE_URL;
  const token = process.env.PATAAWAA_GATEWAY_TOKEN;
  if (!base || !token) return;
  try {
    await fetch(`${base}/api/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ tenantId, to, text }),
      signal: AbortSignal.timeout(6000),
    });
  } catch (err) {
    console.error('[waa/webhook] send reply failed', err);
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// POST /api/ai/chat — public web AI chat (MODULE 19)
// ─────────────────────────────────────────────────────────────────────────────
// Same-origin, browser-facing chat endpoint that powers connectvision.us/chat
// (the ChatGPT/Gemini-style web assistant). Streams Groq tokens over SSE.
//
//   • Text-only turns       → llama-3.3-70b-versatile (fast, strong)
//   • Turns with an image   → llama-4-scout-17b (multimodal vision)
//
// Unlike /api/ai/sovereign-search (token-gated, for the mobile app), this is
// called from our own web page, so it's guarded by an Origin/Referer allowlist
// instead of a shared token (which couldn't be hidden in client JS anyway).
//
// Wire: client POSTs { messages: [{role, content}], image?: <dataURL> }.
// Response is text/event-stream:  data: {"type":"token","delta":"..."}  …  data: [DONE]
// ═════════════════════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const TEXT_MODEL = 'llama-3.3-70b-versatile';
const VISION_MODEL = 'meta-llama/llama-4-scout-17b-16e-instruct';

const SYSTEM_PROMPT =
  'You are ConnectVision AI — a helpful, sharp assistant for Indian merchants and ' +
  'small businesses. Answer clearly and concisely. You understand Indian commerce ' +
  'context (GSTIN, UPI, NPCI, RBI, MSME). Reply in the same language/script the user ' +
  'writes in (English, हिंदी, or Hinglish). When shown an image, describe and reason ' +
  'about it directly. Use simple markdown (•, **bold**) when it helps readability.';

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

const ALLOWED_HOST_SUFFIXES = ['connectvision.us', 'connectvision.io', 'vercel.app', 'localhost'];

function originAllowed(req: NextRequest): boolean {
  const ref = req.headers.get('origin') || req.headers.get('referer') || '';
  if (!ref) return true; // some privacy modes strip it; don't hard-block
  try {
    const host = new URL(ref).hostname;
    return ALLOWED_HOST_SUFFIXES.some((s) => host === s || host.endsWith('.' + s));
  } catch {
    return false;
  }
}

const enc = new TextEncoder();
function frame(obj: unknown): Uint8Array {
  return enc.encode(`data: ${typeof obj === 'string' ? obj : JSON.stringify(obj)}\n\n`);
}

export async function POST(req: NextRequest) {
  if (!originAllowed(req)) {
    return NextResponse.json({ error: 'forbidden_origin' }, { status: 403 });
  }
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'ai_unconfigured' }, { status: 503 });
  }

  let body: { messages?: ChatMsg[]; image?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 });
  }

  const history = Array.isArray(body.messages)
    ? body.messages
        .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-12)
    : [];
  if (history.length === 0) {
    return NextResponse.json({ error: 'empty' }, { status: 400 });
  }
  const image = typeof body.image === 'string' && body.image.startsWith('data:image/') ? body.image : null;

  // Build the Groq message list. When an image is attached, the LAST user turn
  // becomes multimodal content (text + image_url) and we switch to the vision model.
  const msgs: Array<Record<string, unknown>> = [{ role: 'system', content: SYSTEM_PROMPT }];
  history.forEach((m, i) => {
    const isLast = i === history.length - 1;
    if (isLast && image && m.role === 'user') {
      msgs.push({
        role: 'user',
        content: [
          { type: 'text', text: m.content || 'Describe this image.' },
          { type: 'image_url', image_url: { url: image } },
        ],
      });
    } else {
      msgs.push({ role: m.role, content: m.content });
    }
  });

  const model = image ? VISION_MODEL : TEXT_MODEL;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const upstream = await fetch(GROQ_ENDPOINT, {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: msgs, stream: true, temperature: 0.5, max_tokens: 1536 }),
        });
        if (!upstream.ok || !upstream.body) {
          const t = await upstream.text().catch(() => '');
          controller.enqueue(frame({ type: 'error', message: `AI upstream ${upstream.status}: ${t.slice(0, 160)}` }));
          controller.enqueue(frame('[DONE]'));
          controller.close();
          return;
        }
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        let buf = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          let nl = buf.indexOf('\n\n');
          while (nl !== -1) {
            const raw = buf.slice(0, nl);
            buf = buf.slice(nl + 2);
            nl = buf.indexOf('\n\n');
            for (const line of raw.split('\n')) {
              if (!line.startsWith('data:')) continue;
              const payload = line.slice(5).trim();
              if (payload === '[DONE]') continue;
              try {
                const j = JSON.parse(payload) as { choices?: Array<{ delta?: { content?: string } }> };
                const delta = j.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(frame({ type: 'token', delta }));
              } catch {
                /* keep-alive / non-JSON line */
              }
            }
          }
        }
        controller.enqueue(frame('[DONE]'));
      } catch (e) {
        controller.enqueue(frame({ type: 'error', message: e instanceof Error ? e.message : 'stream fault' }));
        controller.enqueue(frame('[DONE]'));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}

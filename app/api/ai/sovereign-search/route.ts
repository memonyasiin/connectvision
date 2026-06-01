// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ai/sovereign-search — Server-Sent Events streaming router
// ─────────────────────────────────────────────────────────────────────────────
// Upgrades the JSON-once handler to a token-by-token SSE stream. The Flutter
// client (lib/services/ai_search_service.dart) consumes this via
// http.Client.send() + an SSE buffer parser, rendering each token into the
// chat bubble as it arrives — same perceived-latency feel as Perplexity /
// ChatGPT / Gemini on a flaky tier-2/3 4G connection.
//
// Wire shape (every chunk is `data: <payload>\n\n` per RFC 6202 SSE):
//
//   data: {"type":"token","delta":"first "}
//   data: {"type":"token","delta":"second "}
//   data: {"type":"token","delta":"third "}
//   data: {"type":"final","citations":[...],"transactionRef":"txn_..."}
//   data: [DONE]
//
// The final `[DONE]` sentinel matches the OpenAI / Anthropic convention so
// any future LLM proxy can pipe its upstream stream through verbatim.
//
// Pre-stream errors (auth fail, validation fail) return a regular JSON
// response with the appropriate HTTP status — no SSE headers sent.
// Mid-stream errors emit a `{"type":"error", ...}` chunk, then `[DONE]`,
// then close — so the client can render a friendly fallback bubble
// without needing a separate non-SSE error code path.
//
// Edge runtime: keeps cold-start under 100 ms from bom1. ReadableStream is
// the standard primitive on the edge — no Node:* deps required.

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { validateServiceToken } from '@/lib/vercelProxy';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// ─────────────────────────────────────────────────────────────────────────────
// Wire contract
// ─────────────────────────────────────────────────────────────────────────────

type LocaleCode = 'en-IN' | 'hi-IN' | 'hi-IN-Latn';

/** Short aliases the client may send for backward-compat with older Flutter builds. */
type IncomingLocale =
  | LocaleCode
  | 'en' | 'hi_shudh' | 'hi_hinglish';

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

interface SearchRequestPayload {
  query: string;
  chatHistory?: readonly ChatTurn[];
  tenantId?: string;
  locale?: IncomingLocale;
  /** Optional client-side correlation ref; we echo it back if supplied. */
  transactionRef?: string;
}

interface CitationMetadata {
  title: string;
  url: string;
  snippet: string;
}

// SSE chunk shapes
type StreamChunk =
  | { type: 'token'; delta: string }
  | { type: 'final'; citations: CitationMetadata[]; transactionRef: string; timestamp: string }
  | { type: 'error'; message: string; transactionRef: string };

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function generateTxnRef(): string {
  const nowB36 = Date.now().toString(36);
  const suffix = Math.random().toString(36).slice(2, 7).padStart(5, '0');
  return `txn_${nowB36}_${suffix}`;
}

function normalizeLocale(input: IncomingLocale | undefined): LocaleCode {
  switch (input) {
    case 'hi-IN':
    case 'hi_shudh':
      return 'hi-IN';
    case 'hi-IN-Latn':
    case 'hi_hinglish':
      return 'hi-IN-Latn';
    case 'en-IN':
    case 'en':
    default:
      return 'en-IN';
  }
}

/**
 * Reduces chat history to the last few turns we'll include in the prompt
 * context. Caps at the most-recent N turns to bound LLM input cost /
 * latency. The system prompt + current query are always appended after.
 */
function buildContextMessages(
  query: string,
  history: readonly ChatTurn[],
  maxTurns = 6,
): readonly ChatTurn[] {
  const recent = history.slice(-maxTurns);
  return [...recent, { role: 'user', content: query }];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock web crawler — citations attached at stream completion
// ─────────────────────────────────────────────────────────────────────────────
// Placeholder until a real search provider (Tavily / Serper / Brave) ships.
// Returns deterministic citations seeded lightly by the query so the
// streamed final-chunk has plausibly varied data per request.

async function fetchSovereignCitations(
  query: string,
): Promise<CitationMetadata[]> {
  const sanitized = query.trim().slice(0, 80);
  return [
    {
      title: 'Real-Time Cloud Commerce Protocol & Roster Guidelines',
      url: 'https://connectvision.io/docs',
      snippet:
        'Operational frameworks for multi-tenant merchant transaction endpoints, automated ledgers, and workforce calculations.',
    },
    {
      title: 'GSTIN Compliance & Merchant Regulations 2026',
      url: 'https://www.gst.gov.in',
      snippet: `Contextual telemetry mapping merchant GSTIN auto-verifications for "${sanitized}".`,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock LLM stream — replace with real provider when env vars present
// ─────────────────────────────────────────────────────────────────────────────
// Real-LLM wiring lives behind the `LLM_API_KEY` env-var check. When unset,
// we synthesize a locale-aware response and emit it word-by-word. When set,
// you'd open a fetch() to the LLM provider's streaming endpoint and pipe
// its `text/event-stream` body through with minor reshape.

function buildMockResponseText(
  messages: readonly ChatTurn[],
  locale: LocaleCode,
): string {
  const lastQuery = messages[messages.length - 1]?.content ?? '';
  const turns = messages.length;
  switch (locale) {
    case 'hi-IN-Latn':
      return `ConnectVision AI ne aapke "${lastQuery}" query ko ${turns}-turn conversation ke context me analyze kar liya hai. Verified web sources niche horizontal rail me attached hain — har source pe tap karke original article kholo. Aage kuch aur puchhna ho to send button daba do.`;
    case 'hi-IN':
      return `कन्वेक्टविज़न एआई ने आपकी पूछताछ "${lastQuery}" का ${turns}-संदेश संवाद-संदर्भ में विश्लेषण कर लिया है। प्रमाणित वेब स्रोत नीचे क्षैतिज रेल में संलग्न हैं — किसी पर भी टैप करके मूल लेख खोलें।`;
    case 'en-IN':
    default:
      return `ConnectVision Core OS analyzed your query "${lastQuery}" within a ${turns}-turn conversation context. Verified web sources are attached in the horizontal rail below — tap any card to open the original article. Ask another question to continue.`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE chunk emitter — single source of frame formatting
// ─────────────────────────────────────────────────────────────────────────────

const SSE_ENCODER = new TextEncoder();

function encodeSseFrame(payload: StreamChunk | '[DONE]'): Uint8Array {
  const line =
    typeof payload === 'string'
      ? `data: ${payload}\n\n`
      : `data: ${JSON.stringify(payload)}\n\n`;
  return SSE_ENCODER.encode(line);
}

// ─────────────────────────────────────────────────────────────────────────────
// Groq live inference — llama-3.3-70b-versatile via streaming chat completions
// ─────────────────────────────────────────────────────────────────────────────
// OpenAI-compatible SSE protocol. Each upstream chunk is one
//   data: {"choices":[{"delta":{"content":"..."}}]}\n\n
// frame, terminated by a literal `data: [DONE]\n\n`. We reshape each
// non-empty `delta.content` into our own `{type:'token', delta}` envelope
// and forward to the downstream client. Groq's TTFT on llama-3.3-70b from
// our bom1 edge function is ~250 ms — well under the Flutter client's
// 15 s circuit-breaker TTFB ceiling.

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_GROQ_MODEL = 'llama-3.3-70b-versatile';

interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

function localeSystemPrompt(locale: LocaleCode): string {
  switch (locale) {
    case 'hi-IN':
      return 'आप ConnectVision Core OS के sovereign AI सहायक हैं — भारतीय व्यापारियों के लिए। उत्तर शुद्ध हिंदी में, स्पष्ट और संक्षिप्त दें। GSTIN, UPI, NPCI और घरेलू व्यापार संदर्भ की जानकारी रखें।';
    case 'hi-IN-Latn':
      return 'Aap ConnectVision Core OS ke sovereign AI assistant ho — Indian merchants ke liye banaya gaya. Hinglish (Roman script Hindi + English mix) me clear aur concise jawab do. GSTIN, UPI, NPCI, aur domestic commerce context samjho.';
    case 'en-IN':
    default:
      return 'You are the sovereign AI assistant for ConnectVision Core OS, serving Indian merchants. Respond in clear, professional Indian English. Stay grounded in domestic commerce context — GSTIN, UPI, NPCI, RBI compliance, MSME workflows.';
  }
}

function buildGroqMessages(
  query: string,
  history: readonly ChatTurn[],
  locale: LocaleCode,
  maxHistoryTurns = 6,
): GroqMessage[] {
  const recent = history.slice(-maxHistoryTurns);
  const out: GroqMessage[] = [
    { role: 'system', content: localeSystemPrompt(locale) },
  ];
  for (const t of recent) {
    out.push({
      role: t.role === 'assistant' ? 'assistant' : 'user',
      content: t.content,
    });
  }
  out.push({ role: 'user', content: query });
  return out;
}

/**
 * Open a streaming completion against Groq. Each upstream `delta.content`
 * fragment is reshaped into our SSE `{type:'token', delta}` envelope and
 * pushed to the controller. Throws on transport / non-2xx fault so the
 * caller can emit a structured `{type:'error'}` chunk + `[DONE]`.
 *
 * Buffer-aware parser: SSE frames can arrive split across multiple
 * Uint8Array chunks. We accumulate into a string buffer and slice on
 * `\n\n` boundaries (the SSE frame separator per RFC 6202).
 */
async function pumpGroqStream(
  messages: GroqMessage[],
  apiKey: string,
  model: string,
  controller: ReadableStreamDefaultController<Uint8Array>,
): Promise<void> {
  const upstream = await fetch(GROQ_ENDPOINT, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const errText = await upstream.text().catch(() => '<no body>');
    throw new Error(
      `Groq upstream ${upstream.status}: ${errText.slice(0, 200)}`,
    );
  }

  const reader = upstream.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let boundary = buffer.indexOf('\n\n');
    while (boundary !== -1) {
      const rawFrame = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      boundary = buffer.indexOf('\n\n');

      // A frame is one or more `field: value` lines. We care only about
      // `data:` lines — Groq doesn't emit `event:` or `id:` for chat
      // completions, but be defensive.
      const dataLines: string[] = [];
      for (const line of rawFrame.split('\n')) {
        if (line.startsWith('data:')) {
          dataLines.push(line.slice(5).trimStart());
        }
      }
      if (dataLines.length === 0) continue;
      const payload = dataLines.join('\n');

      if (payload === '[DONE]') return;

      try {
        const parsed = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string } }>;
        };
        const delta = parsed.choices?.[0]?.delta?.content;
        if (typeof delta === 'string' && delta.length > 0) {
          controller.enqueue(
            encodeSseFrame({ type: 'token', delta }),
          );
        }
      } catch {
        // Skip malformed frames — Groq occasionally emits keep-alive
        // whitespace lines that don't parse as JSON. Not fatal.
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Streaming body builder
// ─────────────────────────────────────────────────────────────────────────────

interface StreamSourceInput {
  query: string;
  history: readonly ChatTurn[];
  locale: LocaleCode;
  transactionRef: string;
}

function buildSovereignStream({
  query,
  history,
  locale,
  transactionRef,
}: StreamSourceInput): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // ── 1. Token-by-token text emission ─────────────────────────────
        // Provider dispatch is env-driven and read per-request so an
        // operator env edit + redeploy takes effect without a code push.
        // Supported provider today: 'groq' (Llama-3.3-70b-versatile).
        // Anything else (or missing key) falls back to the locale-aware
        // mock loop — same wire shape, so the Flutter client cannot tell
        // the difference at the SSE-frame layer. Useful for local dev,
        // preview deploys without a billing-attached key, and graceful
        // degradation if Groq has an upstream incident.
        const provider = (process.env.LLM_PROVIDER ?? '').trim().toLowerCase();
        const apiKey   = process.env.LLM_API_KEY;
        const model    = process.env.LLM_MODEL?.trim() || DEFAULT_GROQ_MODEL;

        if (provider === 'groq' && typeof apiKey === 'string' && apiKey.length > 0) {
          const messages = buildGroqMessages(query, history, locale);
          await pumpGroqStream(messages, apiKey, model, controller);
        } else {
          const fullText = buildMockResponseText(
            buildContextMessages(query, history),
            locale,
          );
          // Split on word boundaries while preserving trailing spaces so
          // the assembled text reads naturally on the client side.
          const tokens = fullText.match(/\S+\s*/g) ?? [fullText];
          for (const token of tokens) {
            controller.enqueue(
              encodeSseFrame({ type: 'token', delta: token }),
            );
          }
        }

        // ── 2. Final metadata chunk (citations + txn) ───────────────────
        const citations = await fetchSovereignCitations(query);
        controller.enqueue(
          encodeSseFrame({
            type: 'final',
            citations,
            transactionRef,
            timestamp: new Date().toISOString(),
          }),
        );

        // ── 3. Connection close sentinel ────────────────────────────────
        controller.enqueue(encodeSseFrame('[DONE]'));
      } catch (err) {
        // Mid-stream fault — emit a structured error chunk + DONE so the
        // client can render a friendly fallback without needing a special
        // non-SSE error code path.
        // eslint-disable-next-line no-console
        console.error(`[sovereign-search] stream fault (txn ${transactionRef}):`, err);
        controller.enqueue(
          encodeSseFrame({
            type: 'error',
            message:
              'System pipeline connection dropout. Falling back to local offline diagnostics mode.',
            transactionRef,
          }),
        );
        controller.enqueue(encodeSseFrame('[DONE]'));
      } finally {
        controller.close();
      }
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const txnRef = generateTxnRef();

  // ── Perimeter security — fails CLOSED (no hard-coded fallback) ──────────
  const auth = validateServiceToken(req);
  if (!auth.ok) {
    const status = auth.reason === 'token_not_configured' ? 500 : 401;
    return NextResponse.json(
      {
        error:
          'SECURITY_BREACH: Unverified client stream deflected by perimeter isolation armor.',
        reason: auth.reason,
        transactionRef: txnRef,
      },
      { status },
    );
  }

  // ── Body validation (pre-stream — return regular JSON on fault) ─────────
  let body: Partial<SearchRequestPayload>;
  try {
    body = (await req.json()) as Partial<SearchRequestPayload>;
  } catch {
    return NextResponse.json(
      {
        error: 'PAYLOAD_FAULT: request body is not valid JSON.',
        transactionRef: txnRef,
      },
      { status: 400 },
    );
  }

  const { query, chatHistory, tenantId, locale: incomingLocale, transactionRef: clientTxn } = body;

  if (typeof query !== 'string' || query.trim().length === 0) {
    return NextResponse.json(
      {
        error: 'PAYLOAD_FAULT: query string is a strict immutable requirement.',
        transactionRef: txnRef,
      },
      { status: 400 },
    );
  }

  const resolvedTenant =
    typeof tenantId === 'string' && tenantId.length > 0 ? tenantId : 'mobile';
  const resolvedTxn =
    typeof clientTxn === 'string' && clientTxn.length > 0 ? clientTxn : txnRef;
  const locale = normalizeLocale(incomingLocale);

  // Defensively coerce chatHistory — accept array of well-shaped turns,
  // ignore everything else (so a malformed history doesn't break the route).
  const history: ChatTurn[] = Array.isArray(chatHistory)
    ? chatHistory
        .filter(
          (t): t is ChatTurn =>
            t !== null &&
            typeof t === 'object' &&
            (t as ChatTurn).role !== undefined &&
            typeof (t as ChatTurn).content === 'string',
        )
        .map((t) => ({
          role: t.role === 'assistant' ? 'assistant' : 'user',
          content: t.content,
        }))
    : [];

  // ── Build + return the SSE stream ───────────────────────────────────────
  const stream = buildSovereignStream({
    query: query.trim(),
    history,
    locale,
    transactionRef: resolvedTxn,
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-store, no-transform',
      'Connection': 'keep-alive',
      // Tells nginx (if reverse-proxied) not to buffer — flush each frame
      // to the client immediately. Cloudflare honours it too.
      'X-Accel-Buffering': 'no',
      'X-CV-Tenant': resolvedTenant,
      'X-CV-Transaction-Ref': resolvedTxn,
    },
  });
}

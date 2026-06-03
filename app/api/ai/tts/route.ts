// ═════════════════════════════════════════════════════════════════════════════
// POST /api/ai/tts — natural neural voice (MODULE 23)
// ─────────────────────────────────────────────────────────────────────────────
// Server-side Sarvam AI text-to-speech (bulbul:v2) — natural Hindi / Hinglish /
// English voices, far better than the browser's robotic speechSynthesis. The
// /chat client POSTs { text, lang }; we return WAV audio bytes which the client
// plays via an <audio> element. Falls back (client-side) to speechSynthesis if
// this route errors or SARVAM_API_KEY is unset.
//
// Sarvam returns base64 WAV in { audios: [...] }. bulbul:v2 caps input length,
// so we trim to a safe size (the on-screen text stays full; only the spoken
// version is bounded).
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const SARVAM_ENDPOINT = 'https://api.sarvam.ai/text-to-speech';
const MAX_CHARS = 1400;

export async function POST(req: Request): Promise<Response> {
  const key = process.env.SARVAM_API_KEY;
  if (!key || key.startsWith('CHANGE_ME')) {
    return NextResponse.json({ error: 'tts_unconfigured' }, { status: 503 });
  }

  let body: { text?: string; lang?: string; speaker?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const raw = (body.text ?? '').replace(/[*`#_>\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim();
  if (!raw) return NextResponse.json({ error: 'empty' }, { status: 400 });
  const text = raw.slice(0, MAX_CHARS);

  // Devanagari → hi-IN; otherwise en-IN (covers English + romanised Hinglish).
  const targetLang = body.lang === 'hi-IN' || /[ऀ-ॿ]/.test(text) ? 'hi-IN' : 'en-IN';
  const speaker = body.speaker || 'anushka';

  try {
    const r = await fetch(SARVAM_ENDPOINT, {
      method: 'POST',
      headers: { 'api-subscription-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetLang,
        speaker,
        model: 'bulbul:v2',
        enable_preprocessing: true,
        speech_sample_rate: 22050,
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return NextResponse.json({ error: 'sarvam_upstream', status: r.status, detail: t.slice(0, 160) }, { status: 502 });
    }
    const data = (await r.json()) as { audios?: string[] };
    const b64 = data.audios?.[0];
    if (!b64) return NextResponse.json({ error: 'no_audio' }, { status: 502 });

    const bytes = Buffer.from(b64, 'base64');
    return new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
    });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'tts_fault' }, { status: 502 });
  }
}

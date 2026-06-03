// ═════════════════════════════════════════════════════════════════════════════
// GET /api/ai/image?prompt=...&seed=... — text-to-image (MODULE 21)
// ─────────────────────────────────────────────────────────────────────────────
// Same-origin image-generation endpoint for the /chat assistant.
//
//   • If HF_API_KEY is set → HuggingFace FLUX.1-schnell (fast, reliable, free
//     tier). Returns the PNG bytes. 9s abort keeps us inside the function
//     budget; on any HF error/timeout we fall through to the redirect.
//   • Otherwise (or on HF failure) → 302 redirect to Pollinations/Flux. The
//     BROWSER follows the redirect, so the image is fetched from the user's
//     own IP (Pollinations rate-limits per IP — going through our server would
//     share one egress IP and throttle instantly).
//
// Usage from the client: <img src="/api/ai/image?prompt=...&seed=...">
// ═════════════════════════════════════════════════════════════════════════════

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const HF_MODEL = 'black-forest-labs/FLUX.1-schnell';

function pollinationsUrl(prompt: string, seed: string): string {
  const p = encodeURIComponent(prompt.slice(0, 480));
  return `https://image.pollinations.ai/prompt/${p}?width=1024&height=1024&nologo=true&model=flux&seed=${seed}&referrer=connectvision.us`;
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url);
  const prompt = (url.searchParams.get('prompt') ?? '').slice(0, 500).trim();
  const seed = (url.searchParams.get('seed') ?? '1').replace(/[^0-9]/g, '').slice(0, 10) || '1';
  if (!prompt) {
    return NextResponse.json({ error: 'prompt required' }, { status: 400 });
  }

  const hf = process.env.HF_API_KEY;
  if (hf && !hf.startsWith('CHANGE_ME')) {
    try {
      const r = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${hf}`,
          'Content-Type': 'application/json',
          Accept: 'image/png',
        },
        body: JSON.stringify({ inputs: prompt, parameters: { seed: Number(seed) } }),
        signal: AbortSignal.timeout(9000),
      });
      const ct = r.headers.get('content-type') ?? '';
      if (r.ok && ct.startsWith('image/')) {
        return new Response(r.body, {
          status: 200,
          headers: {
            'Content-Type': ct,
            'Cache-Control': 'public, max-age=86400, immutable',
          },
        });
      }
      // HF 503 (model loading) / 4xx → fall through to Pollinations.
    } catch {
      // timeout / network → fall through.
    }
  }

  // No token or HF failed → let the browser fetch Pollinations from its own IP.
  return NextResponse.redirect(pollinationsUrl(prompt, seed), 302);
}

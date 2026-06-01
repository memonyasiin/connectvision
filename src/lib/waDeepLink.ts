// ─────────────────────────────────────────────────────────────────────────────
// WhatsApp Deep-Link Builder (Tier 5)
// ─────────────────────────────────────────────────────────────────────────────
// Constructs a context-aware wa.me / api.whatsapp link from the visitor's
// current activity payload. The receiving Pataa CRM agent (and the
// autonomous LLM responder downstream) parses the URL state to know:
//   - which page section the user was looking at when they reached out
//   - what intent (booking, enquiry, quote) they signaled
//   - which business they're talking to (tenant resolution)
//   - product variant tags that drove their CTA tap
//   - hyper-contextual session metrics (scroll depth, dwell, click depth)
//
// Spec: https://faq.whatsapp.com/5913398998672934
//   Prefilled message: ?text=URL_ENCODED_STRING

export type WaIntent =
  | 'general-enquiry'
  | 'book-appointment'
  | 'request-quote'
  | 'product-info'
  | 'support';

/**
 * Compact, server-parseable summary of the visitor's session. Streamed in
 * the [CV:...] context tag so the LLM agent has it on the FIRST inbound
 * message — no prior request needed.
 */
export interface ActivityVector {
  scrollDepthPct?: number;
  sessionDurationMs?: number;
  clickDepth?: number;
  activeSectionId?: string;
  lastProductTag?: string;
}

export interface WaDeepLinkInput {
  /** Recipient phone, with or without country code. Country code required for cross-border. */
  phone: string;
  /** Free-form intent tag — drives LLM agent's opening prompt. */
  intent: WaIntent;
  /** Section the user was viewing when they tapped the widget. */
  sectionId: string;
  /** Optional product/service id for category-specific replies. */
  productTag?: string;
  /** Visible business name (helps the LLM greet correctly). */
  businessName: string;
  /** Current page URL — gives the LLM the exact context page. */
  url?: string;
  /** Optional tenant subdomain (e.g. 'memon-beauty'). Resolves to CRM tenant. */
  tenantSubdomain?: string;
  /** Locale for the prefilled greeting. */
  locale?: string;
  /** Compact session-metrics payload — included in the [CV:...] tag. */
  activity?: ActivityVector;
}

const DEFAULT_LOCALE = 'en-IN';

const GREETINGS: Record<string, (b: string) => string> = {
  'en-IN': (b) => `Hi ${b}, I'd like to know more.`,
  'hi-IN': (b) => `Namaste ${b}, mujhe iske baare mein jaankari chahiye.`,
};

function normalizePhone(input: string): string {
  // Strip everything except digits + leading +
  const cleaned = input.replace(/[^\d+]/g, '');
  return cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
}

function encodeContextTag(input: WaDeepLinkInput): string {
  const params = new URLSearchParams();
  params.set('cv_intent', input.intent);
  params.set('cv_section', input.sectionId);
  if (input.productTag)      params.set('cv_product', input.productTag);
  if (input.tenantSubdomain) params.set('cv_tenant', input.tenantSubdomain);
  if (input.url)             params.set('cv_url', input.url);

  const a = input.activity;
  if (a) {
    if (typeof a.scrollDepthPct === 'number')    params.set('cv_scroll', String(Math.round(a.scrollDepthPct)));
    if (typeof a.sessionDurationMs === 'number') params.set('cv_dwell', String(Math.round(a.sessionDurationMs / 1000)));
    if (typeof a.clickDepth === 'number')        params.set('cv_clicks', String(a.clickDepth));
    if (a.activeSectionId)                       params.set('cv_active', a.activeSectionId);
    if (a.lastProductTag)                        params.set('cv_lasttag', a.lastProductTag);
  }

  // ConnectVision context tag — the PataaWaa gateway parses this and forwards
  // to the LLM agent. Format chosen so it's grep-able in WhatsApp transcripts.
  return `\n\n[CV:${params.toString()}]`;
}

export interface BuiltDeepLink {
  /** Universal wa.me URL — opens WhatsApp Web on desktop, app on mobile. */
  href: string;
  /** Just the encoded message body (useful for analytics / re-use). */
  message: string;
}

export function buildWaDeepLink(input: WaDeepLinkInput): BuiltDeepLink {
  const phone = normalizePhone(input.phone);
  const locale = input.locale ?? DEFAULT_LOCALE;
  const greetingFn = GREETINGS[locale] ?? GREETINGS[DEFAULT_LOCALE]!;
  const message = greetingFn(input.businessName) + encodeContextTag(input);
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return { href, message };
}

/**
 * Parse the context tag back out of an inbound WhatsApp message body.
 * Used by the webhook handler to route the message to the LLM agent with
 * the correct intent + tenant.
 */
export function parseWaContextTag(body: string): Record<string, string> | null {
  const m = body.match(/\[CV:([^\]]+)\]/);
  if (!m || typeof m[1] !== 'string') return null;
  const params = new URLSearchParams(m[1]);
  const out: Record<string, string> = {};
  for (const [k, v] of params.entries()) out[k] = v;
  return out;
}

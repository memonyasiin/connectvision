// ═════════════════════════════════════════════════════════════════════════════
// ConnectVision OS — Sovereign Onboarding Validators (MODULE 2)
// ─────────────────────────────────────────────────────────────────────────────
// Pure, isomorphic, zero-dep validators consumed by BOTH the client-side
// onboarding wizard (for instant inline feedback) AND the server-side
// /api/admin/merchants/onboard route (for source-of-truth verification).
//
// EVERY EXPORT IS A PURE FUNCTION
//   No fetch, no Date.now-only paths, no Node-only deps. Safe to bundle
//   into a 'use client' React component without server-only warnings.
//
// FAILURE-MODE CONTRACT
//   Every validator returns a discriminated-union result of the shape
//     { ok: true; value: <normalised form> }   on success
//     { ok: false; code: <stable error code>; detail: string }  on failure
//   so callers can map error codes to localised UI copy without parsing
//   the human-readable detail string.
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// Common result type
// ─────────────────────────────────────────────────────────────────────────────

export type ValidationResult<T> =
  | { ok: true; value: T }
  | { ok: false; code: string; detail: string };

// ─────────────────────────────────────────────────────────────────────────────
// 1 ▸ GSTIN — 15-char Indian Goods & Services Tax Identification Number
// ─────────────────────────────────────────────────────────────────────────────
// Format:  SS PPPPPPPPPP E Z C
//   SS         state code (2 digits, 01–37 + a handful of UT codes)
//   PPPPPPPPPP PAN of the entity (5 alpha + 4 numeric + 1 alpha)
//   E          entity number (1–9 or A–Z)
//   Z          fixed letter 'Z' by default (sometimes 'C' for SEZ etc.)
//   C          checksum char (mod-36 of the previous 14 chars)
//
// The checksum algorithm (per CBIC documentation, condensed):
//   1. Build a 0..35 mapping: '0'..'9' = 0..9, 'A'..'Z' = 10..35
//   2. For each char at position i in chars[0..13]:
//        product = value(char) × (i % 2 === 0 ? 1 : 2)
//        // sum the base-36 digits of product
//        sum    += floor(product / 36) + (product % 36)
//   3. checksum_value = (36 - sum % 36) % 36
//   4. checksum_char  = the base-36 char for checksum_value
// ─────────────────────────────────────────────────────────────────────────────

const BASE36_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** Indian state / UT codes — first 2 digits of any valid GSTIN. */
const VALID_STATE_CODES = new Set<string>([
  '01', '02', '03', '04', '05', '06', '07', '08', '09', '10',
  '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
  '21', '22', '23', '24', '25', '26', '27', '28', '29', '30',
  '31', '32', '33', '34', '35', '36', '37', '38', // 38 = OIDAR
]);

function base36Value(ch: string): number {
  const i = BASE36_CHARS.indexOf(ch);
  return i; // -1 for invalid chars — caller treats as failure
}

function computeGstinChecksumChar(first14: string): string {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const ch = first14[i];
    if (ch === undefined) {
      // Defensive — caller guarantees length, but keep the function total.
      return '?';
    }
    const v = base36Value(ch);
    if (v < 0) return '?';
    const product = v * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checksumValue = (36 - (sum % 36)) % 36;
  // checksumValue is always in [0, 35] so the index is always defined.
  return BASE36_CHARS[checksumValue] ?? '?';
}

export interface GstinValue {
  raw: string;
  stateCode: string;
  pan: string;
  entity: string;
  checksum: string;
}

export function validateGstin(input: string): ValidationResult<GstinValue> {
  const raw = input.trim().toUpperCase();
  if (raw.length === 0) {
    return { ok: false, code: 'GSTIN_REQUIRED', detail: 'GSTIN is required.' };
  }
  if (raw.length !== 15) {
    return {
      ok: false,
      code: 'GSTIN_LENGTH',
      detail: `GSTIN must be 15 characters (got ${raw.length}).`,
    };
  }
  if (!/^[0-9A-Z]+$/.test(raw)) {
    return {
      ok: false,
      code: 'GSTIN_CHARSET',
      detail: 'GSTIN may only contain digits 0–9 and uppercase letters A–Z.',
    };
  }
  const stateCode = raw.slice(0, 2);
  if (!VALID_STATE_CODES.has(stateCode)) {
    return {
      ok: false,
      code: 'GSTIN_STATE_CODE',
      detail: `State code "${stateCode}" is not a recognised Indian state/UT.`,
    };
  }
  // PAN segment validation — chars 3..12 (indices 2..11).
  //   positions 0..4 of PAN: A-Z
  //   positions 5..8 of PAN: 0-9
  //   position 9 of PAN:     A-Z
  const pan = raw.slice(2, 12);
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return {
      ok: false,
      code: 'GSTIN_PAN_FORMAT',
      detail: 'Embedded PAN segment is malformed (expected AAAAA9999A).',
    };
  }
  const entity = raw.slice(12, 13);
  const checksum = raw.slice(14, 15);
  const expected = computeGstinChecksumChar(raw.slice(0, 14));
  if (expected !== checksum) {
    return {
      ok: false,
      code: 'GSTIN_CHECKSUM',
      detail: `Checksum mismatch (expected "${expected}", got "${checksum}").`,
    };
  }
  return {
    ok: true,
    value: { raw, stateCode, pan, entity, checksum },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 2 ▸ UPI VPA — Virtual Payment Address
// ─────────────────────────────────────────────────────────────────────────────
// Format: localpart@bankhandle
//   localpart: 2–256 chars, [a-zA-Z0-9._-]
//   bankhandle: 2–64 lowercase letters / digits (e.g. ybl, okicici, paytm)
// NPCI doesn't publish a hard regex but every Indian bank's VPA fits this.
// ─────────────────────────────────────────────────────────────────────────────

export interface VpaValue {
  raw: string;
  localPart: string;
  bankHandle: string;
}

const KNOWN_BANK_HANDLES = new Set<string>([
  'ybl', 'okhdfcbank', 'oksbi', 'okaxis', 'okicici',
  'paytm', 'apl', 'axl', 'ibl', 'ikwik', 'fbl',
  'hdfcbank', 'sbi', 'icici', 'axisbank', 'kotak',
  'indus', 'idfcfirst', 'andbpay', 'jio', 'upi',
  'allbank', 'barodampay', 'pingpay', 'rapl', 'wahdfcbank',
]);

export function validateVpa(input: string): ValidationResult<VpaValue> {
  const raw = input.trim().toLowerCase();
  if (raw.length === 0) {
    return { ok: false, code: 'VPA_REQUIRED', detail: 'UPI VPA is required.' };
  }
  if (raw.length > 120) {
    return { ok: false, code: 'VPA_LENGTH', detail: 'VPA exceeds 120 characters.' };
  }
  const at = raw.indexOf('@');
  if (at <= 0 || at !== raw.lastIndexOf('@')) {
    return {
      ok: false,
      code: 'VPA_FORMAT',
      detail: 'VPA must be in the form "localpart@bankhandle".',
    };
  }
  const localPart = raw.slice(0, at);
  const bankHandle = raw.slice(at + 1);
  if (!/^[a-z0-9._-]{2,256}$/.test(localPart)) {
    return {
      ok: false,
      code: 'VPA_LOCAL_PART',
      detail: 'VPA localpart may only contain letters, digits, dots, hyphens, underscores.',
    };
  }
  if (!/^[a-z0-9]{2,64}$/.test(bankHandle)) {
    return {
      ok: false,
      code: 'VPA_BANK_HANDLE',
      detail: 'VPA bank handle must be 2–64 lowercase alphanumeric chars.',
    };
  }
  // Non-fatal warning — caller decides whether to surface it.
  // (We don't reject unknown handles because new banks join the network
  // and our static list will lag. The format check above is the hard gate.)
  return {
    ok: true,
    value: { raw, localPart, bankHandle },
  };
}

/** Helper for the UI — does the VPA's bank handle look like a known one? */
export function isKnownBankHandle(handle: string): boolean {
  return KNOWN_BANK_HANDLES.has(handle.toLowerCase());
}

// ─────────────────────────────────────────────────────────────────────────────
// 3 ▸ Subdomain — *.connectvision.io slug
// ─────────────────────────────────────────────────────────────────────────────
// DNS RFC 1035 + LDH convention. Lowercase letters / digits / hyphens.
// 3–63 chars total. No leading or trailing hyphen.
// Reserved words rejected to keep platform URL space sane.
// ─────────────────────────────────────────────────────────────────────────────

const RESERVED_SUBDOMAINS = new Set<string>([
  'www', 'api', 'admin', 'cdn', 'static', 'assets',
  'app', 'auth', 'login', 'register', 'signup',
  'mail', 'email', 'smtp', 'imap',
  'help', 'support', 'docs', 'status',
  'demo', 'test', 'staging', 'preview', 'dev',
  'connectvision', 'connect', 'vision', 'os', 'sovereign',
]);

export function validateSubdomain(input: string): ValidationResult<string> {
  const raw = input.trim().toLowerCase();
  if (raw.length === 0) {
    return { ok: false, code: 'SUBDOMAIN_REQUIRED', detail: 'Subdomain is required.' };
  }
  if (raw.length < 3) {
    return { ok: false, code: 'SUBDOMAIN_TOO_SHORT', detail: 'Subdomain must be at least 3 characters.' };
  }
  if (raw.length > 63) {
    return { ok: false, code: 'SUBDOMAIN_TOO_LONG', detail: 'Subdomain may not exceed 63 characters.' };
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(raw)) {
    return {
      ok: false,
      code: 'SUBDOMAIN_FORMAT',
      detail: 'Subdomain may only contain letters, digits, hyphens — no leading or trailing hyphen.',
    };
  }
  if (RESERVED_SUBDOMAINS.has(raw)) {
    return {
      ok: false,
      code: 'SUBDOMAIN_RESERVED',
      detail: `"${raw}" is reserved for platform use.`,
    };
  }
  return { ok: true, value: raw };
}

/**
 * Suggest a sensible subdomain from a business name.
 * "Memon Beauty Salon" → "memon-beauty-salon"
 * Idempotent — feeding the result back in returns the same value.
 */
export function suggestSubdomainFromName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .normalize('NFKD')                  // strip diacritics
    .replace(/[̀-ͯ]/g, '')    // combining marks
    .replace(/[^a-z0-9\s-]/g, '')       // drop everything else
    .replace(/\s+/g, '-')               // spaces → hyphens
    .replace(/-+/g, '-')                // collapse multi-hyphens
    .replace(/^-+|-+$/g, '')            // trim
    .slice(0, 63);
}

// ─────────────────────────────────────────────────────────────────────────────
// 4 ▸ Maps URL — lightweight format check
// ─────────────────────────────────────────────────────────────────────────────
// We don't validate the URL points to a real Google Maps place; that's a
// background-job concern. Here we just check it parses + is https + length-
// bounded so the column constraint (VARCHAR 500) won't blow up.
// ─────────────────────────────────────────────────────────────────────────────

export function validateMapsUrl(input: string): ValidationResult<string> {
  const raw = input.trim();
  if (raw.length === 0) {
    return { ok: false, code: 'MAPS_URL_REQUIRED', detail: 'Maps URL is required.' };
  }
  if (raw.length > 500) {
    return { ok: false, code: 'MAPS_URL_LENGTH', detail: 'Maps URL exceeds 500 characters.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, code: 'MAPS_URL_INVALID', detail: 'Could not parse the URL.' };
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, code: 'MAPS_URL_INSECURE', detail: 'Maps URL must use https://.' };
  }
  return { ok: true, value: raw };
}

// ─────────────────────────────────────────────────────────────────────────────
// 5 ▸ Compliance scoring — initial onboarding snapshot
// ─────────────────────────────────────────────────────────────────────────────
// Per schema docstring: 40 pts GSTIN, 20 pts tax filing, 20 pts complaint
// ratio, 20 pts dispute ratio. At onboarding we have GSTIN evidence + the
// fact that the merchant supplied a maps listing and a working VPA — the
// other two signals (tax filing freshness, dispute ratio) come from
// background jobs. So the onboarding ceiling is 60.
//
//   GSTIN valid + present     → 40
//   VPA present + format ok   → 10
//   Maps URL present          → 10
//                       max   → 60
//
// Background jobs top up the remaining 40 over time.
// ─────────────────────────────────────────────────────────────────────────────

export interface InitialComplianceInput {
  hasValidGstin: boolean;
  hasValidVpa: boolean;
  hasMapsUrl: boolean;
}

export function computeInitialCompliance(input: InitialComplianceInput): number {
  let score = 0;
  if (input.hasValidGstin) score += 40;
  if (input.hasValidVpa)   score += 10;
  if (input.hasMapsUrl)    score += 10;
  return score;
}

// ═════════════════════════════════════════════════════════════════════════════
// Auth — lightweight email/password sessions (MODULE 24)
// ─────────────────────────────────────────────────────────────────────────────
// No external auth dependency. Passwords are scrypt-hashed (Node crypto); the
// session is a stateless HMAC-signed cookie token (signed with NEXTAUTH_SECRET).
// Used by /api/auth/* and the /login + /signup pages.
// ═════════════════════════════════════════════════════════════════════════════

import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';

const SECRET = process.env.NEXTAUTH_SECRET || 'connectvision-dev-secret-change-me';

export const SESSION_COOKIE = 'cv_session';
export const SESSION_MAX_AGE = 30 * 24 * 3600; // 30 days (seconds)

// ── Password hashing (scrypt) ────────────────────────────────────────────────
export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(pw, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}
export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const h = scryptSync(pw, salt, 64);
  const hb = Buffer.from(hash, 'hex');
  return h.length === hb.length && timingSafeEqual(h, hb);
}

// ── Stateless session token: base64url(payload).hmac ─────────────────────────
export function signSession(userId: string): string {
  const body = Buffer.from(JSON.stringify({ uid: userId, iat: Date.now() })).toString('base64url');
  const sig = createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function readSession(token: string | undefined | null): { uid: string } | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = createHmac('sha256', SECRET).update(body).digest('base64url');
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const d = JSON.parse(Buffer.from(body, 'base64url').toString()) as { uid?: unknown; iat?: unknown };
    if (typeof d.uid !== 'string' || typeof d.iat !== 'number') return null;
    if (Date.now() - d.iat > SESSION_MAX_AGE * 1000) return null;
    return { uid: d.uid };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
  maxAge: SESSION_MAX_AGE,
};

export function isValidEmail(e: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e);
}

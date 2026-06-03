// ═════════════════════════════════════════════════════════════════════════════
// POST /api/contact — contact-form intake (MODULE 18)
// ─────────────────────────────────────────────────────────────────────────────
// Receives the /contact form. Emails the message to support@connectvision.us
// via the shared transactional-email helper. When RESEND_API_KEY is absent the
// helper is in log-only mode — the submission is still accepted (200) and the
// message is written to the server log, so nothing is lost; it converts to a
// real inbox email the moment Resend is configured.
//
// Always returns 200 on a well-formed submission (the email path is best-effort
// and must not make the visitor feel the form "failed"). 400 only on bad input.
// PUBLIC. Lightly shaped — no auth (it's a public contact form).
// ═════════════════════════════════════════════════════════════════════════════

import { NextResponse } from 'next/server';
import { sendTransactionalEmail } from '@/lib/transactionalEmail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPPORT_INBOX = 'support@connectvision.us';

function bad(detail: string) {
  return NextResponse.json({ ok: false, error: 'INVALID', detail }, { status: 400 });
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export async function POST(req: Request): Promise<NextResponse> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return bad('Body is not valid JSON.');
  }
  if (raw === null || typeof raw !== 'object') return bad('Body must be an object.');
  const b = raw as Record<string, unknown>;

  const name = typeof b['name'] === 'string' ? b['name'].trim() : '';
  const email = typeof b['email'] === 'string' ? b['email'].trim() : '';
  const message = typeof b['message'] === 'string' ? b['message'].trim() : '';

  if (!name) return bad('Name is required.');
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad('A valid email is required.');
  if (message.length < 5) return bad('Message is too short.');
  if (message.length > 5000) return bad('Message is too long.');

  const html = `
    <h2>New ConnectVision contact message</h2>
    <p><b>Name:</b> ${esc(name)}</p>
    <p><b>Email:</b> ${esc(email)}</p>
    <p><b>Message:</b></p>
    <p style="white-space:pre-wrap">${esc(message)}</p>
  `;
  const text = `New ConnectVision contact message\n\nName: ${name}\nEmail: ${email}\n\n${message}`;

  // Best-effort send. result.ok is false in log-only mode, but we still 200 —
  // the message is in the server log + will email once Resend is configured.
  const result = await sendTransactionalEmail({
    to: SUPPORT_INBOX,
    subject: `Contact form — ${name}`,
    html,
    text,
    replyTo: email,
    tag: 'contact-form',
  });

  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.log(`[contact] (${result.via}) message from ${name} <${email}>: ${message.slice(0, 500)}`);
  }

  return NextResponse.json({ ok: true, delivered: result.ok, via: result.via });
}

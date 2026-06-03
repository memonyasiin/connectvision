import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, signSession, isValidEmail, SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let b: { email?: string; name?: string; password?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const email = (b.email ?? '').trim().toLowerCase();
  const name = (b.name ?? '').trim().slice(0, 120) || null;
  const password = b.password ?? '';

  if (!isValidEmail(email)) return NextResponse.json({ error: 'A valid email is required.' }, { status: 400 });
  if (password.length < 6) return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });

  const existing = await prisma.appUser.findUnique({ where: { email } });
  if (existing) return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 });

  const user = await prisma.appUser.create({ data: { email, name, password: hashPassword(password) } });
  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  res.cookies.set(SESSION_COOKIE, signSession(user.id), SESSION_COOKIE_OPTS);
  return res;
}

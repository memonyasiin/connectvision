import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, signSession, SESSION_COOKIE, SESSION_COOKIE_OPTS } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let b: { email?: string; password?: string };
  try { b = await req.json(); } catch { return NextResponse.json({ error: 'bad_json' }, { status: 400 }); }

  const email = (b.email ?? '').trim().toLowerCase();
  const password = b.password ?? '';
  if (!email || !password) return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });

  const user = await prisma.appUser.findUnique({ where: { email } });
  // Same generic message for missing user vs wrong password (no account enumeration).
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: { id: user.id, email: user.email, name: user.name } });
  res.cookies.set(SESSION_COOKIE, signSession(user.id), SESSION_COOKIE_OPTS);
  return res;
}

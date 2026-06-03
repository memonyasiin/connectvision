import { NextResponse, type NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readSession, SESSION_COOKIE } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = readSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null });
  const user = await prisma.appUser.findUnique({
    where: { id: session.uid },
    select: { id: true, email: true, name: true },
  });
  return NextResponse.json({ user: user ?? null });
}
